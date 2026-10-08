import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import PhoneEntryForm from '../../components/auth/PhoneEntryForm';
import PhoneOtpStep from '../../components/auth/PhoneOtpStep';
import { Icon } from '../../components/ui/Icon';
import PhoneInput from '../../components/ui/PhoneInput';
import Skeleton from '../../components/ui/Skeleton';
import { MY_PHONE_STATUS, type MyPhoneStatusData } from '../../graphql/phoneAuth';
import { usePhoneAuth } from '../../hooks/usePhoneAuth';
import { nationalDigits } from '../../lib/phone';
import { usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" };

/**
 * หน้า "เบอร์โทรศัพท์" ในการตั้งค่าบัญชี — PYG-604 (S07-AC6)
 *
 * ผู้ใช้เดิมที่ล็อกอินด้วยอีเมลผูกเบอร์เพิ่มกับบัญชี เพื่อใช้เบอร์เข้าสู่ระบบได้
 *   - มีเบอร์ในบัญชีแต่ยังไม่ยืนยัน (E1) → เติมเบอร์เดิมให้ ยืนยันต่อได้ทันที
 *   - ยืนยันแล้ว → แสดงสถานะอย่างเดียว การเปลี่ยนหรือถอดเบอร์ไม่อยู่ในขอบเขตของ story
 *
 * โครงหน้าใช้แบบเดียวกับหน้าความเป็นส่วนตัว (PrivacySettingsPage)
 */
export default function PhoneSettingsPage() {
  const s = usePhoneAuthStrings();
  const { link } = usePhoneAuth();
  const { data, loading, error, refetch } = useQuery<MyPhoneStatusData>(MY_PHONE_STATUS, {
    fetchPolicy: 'cache-and-network',
  });
  const [pendingDigits, setPendingDigits] = useState('');
  const [otp, setOtp] = useState<{ resendAfterSeconds: number } | null>(null);
  const [justLinked, setJustLinked] = useState(false);

  const me = data?.me;
  const savedDigits = nationalDigits(me?.phone);
  const verified = Boolean(me?.phoneVerified);

  let body;
  if (loading && !me) {
    body = (
      <div className="space-y-4">
        <Skeleton height={24} width={160} borderRadius="6px" />
        <Skeleton height={50} borderRadius="8px" />
        <Skeleton height={52} borderRadius="8px" />
      </div>
    );
  } else if (error && !me) {
    body = (
      <div role="alert">
        <p className="text-[15px] font-medium text-[#DC3545]">{s.settingsLoadFailed}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 h-12 cursor-pointer rounded-lg border border-[#E0E2E5] bg-white px-5 text-base font-bold text-[#575859] transition hover:bg-gray-50"
        >
          {s.retry}
        </button>
      </div>
    );
  } else if (otp) {
    body = (
      <PhoneOtpStep
        compact
        digits={pendingDigits}
        purpose="LINK"
        resendAfterSeconds={otp.resendAfterSeconds}
        onVerify={(code) => link(pendingDigits, code)}
        onVerified={() => {
          setOtp(null);
          setJustLinked(true);
          void refetch();
        }}
        onEditPhone={() => setOtp(null)}
        successMessage={s.otpVerified}
      />
    );
  } else {
    body = (
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold leading-7 text-[#0A0A0A]">{s.settingsTitle}</h2>
            <p className="mt-1 text-sm leading-[22px] text-[#717182]">{s.settingsLead}</p>
          </div>
          <span
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-[12px] font-semibold leading-5 ${
              verified ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FFFBEB] text-[#B8860B]'
            }`}
          >
            {verified ? s.statusVerified : s.statusUnverified}
          </span>
        </div>

        <div className="mt-6">
          {verified ? (
            <>
              <PhoneInput id="settings-phone" label={s.phoneLabel} value={savedDigits} onChange={() => {}} readOnly />
              {justLinked && (
                <p role="status" className="mt-4 flex items-start gap-2 text-sm font-semibold leading-[22px] text-[#2F8F74]">
                  <Icon name="check_circle" className="!text-[20px]" color="currentColor" />
                  {s.linkedSuccess}
                </p>
              )}
            </>
          ) : (
            <PhoneEntryForm
              purpose="LINK"
              inputId="settings-phone"
              hint={savedDigits ? s.phoneHintLinkExisting : s.phoneHintLinkNew}
              submitLabel={s.sendCode}
              initialDigits={pendingDigits || savedDigits}
              onRequested={(digits, resendAfterSeconds) => {
                setPendingDigits(digits);
                setOtp({ resendAfterSeconds });
              }}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-full bg-[#F6FAF9]" style={FONT}>
      <div className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-6 md:px-6 md:pb-10">
        <div className="rounded-xl border border-[rgba(0,0,0,0.1)] bg-white p-5 md:p-6">{body}</div>
      </div>
    </div>
  );
}
