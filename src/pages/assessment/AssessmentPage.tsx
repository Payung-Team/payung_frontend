import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import AssessmentLayout, { type AssessmentStepKey } from '../../components/assessment/AssessmentLayout';
import AdlStep from '../../components/assessment/AdlStep';
import FlagsStep from '../../components/assessment/FlagsStep';
import SummaryStep from '../../components/assessment/SummaryStep';
import SuccessView from '../../components/assessment/SuccessView';
import {
  EMPTY_FLAGS,
  adlQuestionId,
  flagsComplete,
  fromAssessment,
  missingAdlCodes,
  toSubmitInput,
  type AdlAnswers,
  type FlagsValue,
} from '../../components/assessment/assessmentForm';
import Spinner from '../../components/ui/Spinner';
import {
  ASSESSMENT_ERROR,
  CARE_RECIPIENT_ASSESSMENT,
  SUBMIT_CARE_RECIPIENT_ASSESSMENT,
  type CareRecipientAssessment,
  type CareRecipientAssessmentData,
  type SubmitCareRecipientAssessmentData,
  type SubmitCareRecipientAssessmentVars,
} from '../../graphql/assessment';
import { extractGraphQLErrorCode } from '../../lib/apolloErrors';
import { useAssessmentStrings, type AdlCode, type AssessmentStrings } from '../../lib/assessmentStrings';
import {
  BOOKING_RESUME_STEP,
  SELF_RECIPIENT_ALIAS,
  parseAssessmentEntry,
  safeReturnTo,
  type AssessmentEntry,
} from '../../lib/assessmentNav';
import { fetchCareRecipients, type CareRecipientSummary } from '../../lib/careRecipientsApi';
import { takePendingJoinPath } from '../family/joinRedirect';
import { useAuth } from '../../context/AuthContext';

type FormStep = Exclude<AssessmentStepKey, 'done'>;

function parseStep(value: string | null): FormStep {
  return value === 'flags' || value === 'summary' ? value : 'adl';
}

/** error จาก API เป็นข้อความที่บอกว่าต้องทำอะไรต่อ — ห้ามโชว์ message ดิบหรือ log ค่า (ข้อมูลสุขภาพ) */
function saveErrorMessage(s: AssessmentStrings, err: unknown): string {
  switch (extractGraphQLErrorCode(err)) {
    case ASSESSMENT_ERROR.INCOMPLETE:
      return s.errIncomplete;
    case ASSESSMENT_ERROR.ANSWER_INVALID:
      return s.errAnswerInvalid;
    case ASSESSMENT_ERROR.FLAG_INVALID:
      return s.errFlagInvalid;
    case ASSESSMENT_ERROR.FLAGS_CONFLICT:
      return s.errFlagsConflict;
    case ASSESSMENT_ERROR.ACCESS_DENIED:
      return s.errAccessDenied;
    default:
      return CombinedGraphQLErrors.is(err) ? s.errUnknown : s.errNetwork;
  }
}

type RecipientState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; recipient: CareRecipientSummary | null };

/**
 * /assessment/:careRecipientId?from=onboarding|booking|profile&returnTo=/path — S08 · PYG-610
 *
 * หน้าเดียวใช้ทั้ง 3 ทางเข้า (ต่อจาก Onboarding, ถูกกันตอนจอง, แก้ไขจากโปรไฟล์)
 * ต่างกันที่ค่าเริ่มต้น (แก้ไข = คำตอบเดิม) และปลายทางหลังบันทึก
 *
 * ★ ประเมินได้เฉพาะโปรไฟล์ที่ผู้ใช้เป็นเจ้าของ (ตรงกับสิทธิ์ของ BE) — หาไม่เจอในลิสต์ = ไม่มีสิทธิ์
 */
export default function AssessmentPage() {
  const s = useAssessmentStrings();
  const navigate = useNavigate();
  const { careRecipientId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const entry = parseAssessmentEntry(searchParams.get('from'));
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  const [recipientState, setRecipientState] = useState<RecipientState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCareRecipients()
      .then((list) => {
        if (!cancelled) {
          const found =
            careRecipientId === SELF_RECIPIENT_ALIAS
              ? list.find((r) => r.isSelf)
              : list.find((r) => r.id === careRecipientId);
          setRecipientState({ status: 'ready', recipient: found ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) setRecipientState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [careRecipientId, reloadKey]);

  const recipient = recipientState.status === 'ready' ? recipientState.recipient : null;
  // Onboarding ซ้ำ (เช่น หลังถอนความยินยอม) แต่มีแบบประเมินอยู่แล้ว → ไม่ต้องทำซ้ำ ไปหน้าหลักเลย
  const skipForOnboarding = entry === 'onboarding' && recipient?.hasAssessment === true;

  // แบบประเมินเดิม (null = ยังไม่เคยประเมิน) — network-only เพื่อให้แก้ไขจากค่าล่าสุดเสมอ
  //   ใช้ recipient.id ไม่ใช่ค่าใน URL เพราะ URL อาจเป็น alias 'self'
  const assessmentQuery = useQuery<CareRecipientAssessmentData>(CARE_RECIPIENT_ASSESSMENT, {
    variables: { careRecipientId: recipient?.id ?? '' },
    skip: !recipient || skipForOnboarding,
    fetchPolicy: 'network-only',
  });

  // ★ ออกได้ครั้งเดียว — takePendingJoinPath อ่านแล้วลบ ถ้าเรียกซ้ำ (StrictMode รัน effect สองรอบ)
  //   รอบสองจะได้ null แล้วพาไปหน้าหลักทับปลายทาง /join ที่ถูกต้อง
  const exitedRef = useRef(false);
  const exit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (entry === 'onboarding') {
      // สมัครจากลิงก์เชิญกลุ่ม → กลับไป /join ต่อ (ย้ายมาจาก goToHome ของหน้า Onboarding)
      navigate(takePendingJoinPath() ?? '/patient-home', { replace: true });
    } else if (entry === 'booking') {
      navigate('/booking/new', { replace: true, state: { resumeStep: BOOKING_RESUME_STEP } });
    } else {
      navigate(returnTo ?? '/patient-home', { replace: true });
    }
  }, [entry, navigate, returnTo]);

  useEffect(() => {
    if (skipForOnboarding) exit();
  }, [skipForOnboarding, exit]);

  const retry = () => {
    if (recipientState.status === 'error') {
      setRecipientState({ status: 'loading' });
      setReloadKey((k) => k + 1);
    } else {
      void assessmentQuery.refetch();
    }
  };

  const queryCode = assessmentQuery.error ? extractGraphQLErrorCode(assessmentQuery.error) : undefined;
  const notFound =
    (recipientState.status === 'ready' && !recipient) || queryCode === ASSESSMENT_ERROR.ACCESS_DENIED;
  const failed = recipientState.status === 'error' || (!!assessmentQuery.error && !notFound);
  const loading =
    recipientState.status === 'loading' ||
    skipForOnboarding ||
    (!!recipient && !assessmentQuery.data && !assessmentQuery.error);

  if (notFound || failed || loading || !recipient || !assessmentQuery.data) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#F6FAF9] px-4"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-2xl border border-[#E0E2E5] bg-white p-8 text-center">
          {notFound || failed ? (
            <>
              <p role="alert" className="m-0 text-lg leading-7 text-[#1A1A1A]">
                {notFound ? s.notFound : s.loadFailed}
              </p>
              <div className="flex w-full flex-wrap gap-3">
                {failed && (
                  <button
                    type="button"
                    onClick={retry}
                    className="min-h-12 flex-1 cursor-pointer rounded-xl bg-[#2F8466] px-5 font-bold text-white"
                  >
                    {s.retry}
                  </button>
                )}
                <button
                  type="button"
                  onClick={exit}
                  className="min-h-12 flex-1 cursor-pointer rounded-xl border-2 border-[#C9CBCE] bg-white px-5 font-semibold text-[#1A1A1A]"
                >
                  {entry === 'booking' ? s.successCtaBooking : s.goHome}
                </button>
              </div>
            </>
          ) : (
            <>
              <Spinner />
              <p className="m-0 text-base text-[#575859]" role="status">
                {s.loading}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <AssessmentFlow
      key={recipient.id}
      entry={entry}
      recipient={recipient}
      initial={assessmentQuery.data.careRecipientAssessment}
      onExit={exit}
    />
  );
}

function AssessmentFlow({
  entry,
  recipient,
  initial,
  onExit,
}: {
  entry: AssessmentEntry;
  recipient: CareRecipientSummary;
  initial: CareRecipientAssessment | null;
  onExit: () => void;
}) {
  const s = useAssessmentStrings();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // แก้ไขจากโปรไฟล์ = เปิดพร้อมคำตอบเดิม (AC8)
  const [answers, setAnswers] = useState<AdlAnswers>(() => (initial ? fromAssessment(initial).answers : {}));
  const [flags, setFlags] = useState<FlagsValue>(() => (initial ? fromAssessment(initial).flags : EMPTY_FLAGS));
  const [dirty, setDirty] = useState(false);
  const [adlTried, setAdlTried] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [result, setResult] = useState<CareRecipientAssessment | null>(null);
  const savingRef = useRef(false);

  const [submit, { loading: saving }] = useMutation<
    SubmitCareRecipientAssessmentData,
    SubmitCareRecipientAssessmentVars
  >(SUBMIT_CARE_RECIPIENT_ASSESSMENT);

  // ขั้นอยู่ใน URL — ปุ่มย้อนกลับของ browser พาไปขั้นก่อนหน้าโดยคำตอบยังอยู่ (component ไม่ถูก remount)
  //   เปิด URL ข้ามขั้น (เช่น รีเฟรชที่ขั้นสรุป ซึ่งคำตอบหายไปแล้ว) → กลับไปขั้นแรกที่ยังไม่ครบ
  const requested = parseStep(searchParams.get('step'));
  const adlDone = missingAdlCodes(answers).length === 0;
  const step: FormStep =
    requested !== 'adl' && !adlDone ? 'adl' : requested === 'summary' && !flagsComplete(flags) ? 'flags' : requested;
  const viewStep: AssessmentStepKey = result ? 'done' : step;

  const goStep = (next: FormStep) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'adl') params.delete('step');
        else params.set('step', next);
        return params;
      },
      { preventScrollReset: true },
    );
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [viewStep]);

  // E1: ไม่เก็บคำตอบค้าง — เตือนก่อนปิดแท็บ/รีเฟรชระหว่างกรอก
  useEffect(() => {
    if (!dirty || result) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, result]);

  const leave = async () => {
    // Onboarding: ยังไม่ทำแบบประเมิน = สมัครไม่เสร็จ ไปหน้าหลักไม่ได้ (PatientOnboardingGuard เด้งกลับมา)
    //   ทางออกเดียวคือ logout — เหมือนปุ่มกลับไปหน้าสมัครของหน้า Onboarding ไม่งั้น GuestRoute เห็น session แล้วเด้ง
    if (entry === 'onboarding') {
      if (!window.confirm(s.leaveConfirmOnboarding)) return;
      setDirty(false);
      await logout();
      navigate('/login', { replace: true });
      return;
    }
    if (dirty && !window.confirm(s.leaveConfirm)) return;
    onExit();
  };

  const handleAnswer = (code: AdlCode, value: number | null) => {
    setDirty(true);
    setAnswers((prev) => ({ ...prev, [code]: value }));
  };

  const handleFlags = (next: FlagsValue) => {
    setDirty(true);
    setFlags(next);
  };

  const handleAdlNext = () => {
    const missing = missingAdlCodes(answers);
    if (missing.length === 0) {
      goStep('flags');
      return;
    }
    setAdlTried(true);
    // รอให้ error render ก่อน แล้วค่อยเลื่อน + ย้ายโฟกัสไปข้อแรกที่ยังไม่ตอบ (screen reader อ่านข้อนั้นต่อ)
    window.setTimeout(() => {
      const el = document.getElementById(adlQuestionId(missing[0]));
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el?.focus({ preventScroll: true });
    }, 0);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveError('');
    try {
      const { data } = await submit({ variables: { input: toSubmitInput(recipient.id, answers, flags) } });
      const saved = data?.submitCareRecipientAssessment;
      if (!saved) {
        setSaveError(s.errUnknown);
        return;
      }
      setResult(saved);
    } catch (err) {
      // คำตอบยังอยู่ใน state ครบ — ผู้ใช้กดบันทึกซ้ำได้ทันที
      setSaveError(saveErrorMessage(s, err));
    } finally {
      savingRef.current = false;
    }
  };

  const onBack = result
    ? undefined
    : step === 'adl'
      ? leave
      : () => goStep(step === 'summary' ? 'flags' : 'adl');

  return (
    <AssessmentLayout
      entry={entry}
      step={viewStep}
      subject={{ name: recipient.name, age: recipient.details?.age, isSelf: recipient.isSelf }}
      onBack={onBack}
    >
      {result ? (
        <SuccessView entry={entry} name={recipient.name} result={result} onContinue={onExit} />
      ) : step === 'adl' ? (
        <AdlStep
          answers={answers}
          showErrors={adlTried}
          onAnswer={handleAnswer}
          onBack={leave}
          onNext={handleAdlNext}
          backLabel={entry === 'onboarding' ? s.logoutOnboarding : undefined}
        />
      ) : step === 'flags' ? (
        <FlagsStep value={flags} onChange={handleFlags} onBack={() => goStep('adl')} onNext={() => goStep('summary')} />
      ) : (
        <SummaryStep
          entry={entry}
          answers={answers}
          flags={flags}
          saving={saving}
          errorMessage={saveError}
          onEditAdl={() => goStep('adl')}
          onEditFlags={() => goStep('flags')}
          onBack={() => goStep('flags')}
          onSave={handleSave}
        />
      )}
    </AssessmentLayout>
  );
}
