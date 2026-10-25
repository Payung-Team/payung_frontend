import { useEffect, useRef, useState } from 'react';
import { logGraphQLError } from '../../lib/logGraphQLError';
import type { ProfessionChangeRequest } from '../../graphql/professionChange';
import { PROFESSIONS, isProfession, professionErrorMessage, type Profession } from '../../lib/professions';
import { useProfessionChange, type LicenseFile } from './useProfessionChange';
import { fieldErrorsFromCodes } from './licenseDraft';
import { LICENSE_NUMBER_MAX_LENGTH, licenseErrorCodes } from '../../lib/license';
import { useLicenseStrings } from '../../lib/licenseStrings';
import ProfessionBadge from '../../components/ui/ProfessionBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ProfessionPicker from './ProfessionPicker';
import { kycDate, kycDateTime } from './kycDate';

/**
 * ขอเปลี่ยนวิชาชีพหลัง KYC อนุมัติแล้ว (PYG-556 · S01-AC6 · R5)
 * เปลี่ยนเป็นพยาบาล / นักกายภาพฯ ต้องแนบใบประกอบฯ (เลขที่ + วันหมดอายุ + ไฟล์) ทุกครั้ง (PYG-664 · BE PYG-663)
 *   แอดมินตรวจใบพร้อมคำขอ — อนุมัติคำขอ = อนุมัติใบ · ปฏิเสธคำขอ = ปฏิเสธใบ
 * ระหว่างรอตรวจ ฝั่ง Elder ยังเห็นวิชาชีพเดิม · ส่งคำขอได้ทีละ 1 คำขอ
 *
 * ข้อมูลมาจาก useProfessionChange (graphql/professionChange.ts)
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — ชุดเดียวกับ KycStep2
const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

interface FormErrors {
  profession?: string;
  licenseNumber?: string;
  expiresAt?: string;
  file?: string;
}

function todayYmd(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function thaiDate(value: string | null | undefined, withTime = false): string {
  return withTime ? kycDateTime(value) : kycDate(value);
}

function Flow({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ProfessionBadge profession={from} />
      <span className="material-icons text-[#94A3B8]" style={{ fontSize: 18 }} aria-hidden="true">arrow_forward</span>
      <ProfessionBadge profession={to} />
    </div>
  );
}

function FileRow({ file, onRemove }: { file: LicenseFile; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 border border-[#E2E8F0] rounded-xl bg-white px-3 py-2.5">
      <span className="material-icons-outlined text-[#DC2626]" style={{ fontSize: 26 }} aria-hidden="true">
        {file.fileName.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image'}
      </span>
      <span className="flex-1 min-w-0 text-[13.5px] font-semibold truncate">{file.fileName}</span>
      {file.previewUrl && (
        <a
          href={file.previewUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="ดูไฟล์"
          className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#475569] flex items-center justify-center hover:bg-[#E2E8F0]"
        >
          <span className="material-icons-outlined" style={{ fontSize: 18 }}>visibility</span>
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="ลบไฟล์"
          className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#475569] flex items-center justify-center hover:bg-[#E2E8F0] cursor-pointer"
        >
          <span className="material-icons-outlined" style={{ fontSize: 18 }}>delete</span>
        </button>
      )}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <span id={id} className="flex items-start gap-1 text-[12.5px] text-red-600 leading-snug">
      <span className="material-icons mt-px" style={{ fontSize: 15 }} aria-hidden="true">error_outline</span>
      {message}
    </span>
  );
}

export default function ProfessionChangeCard({
  caregiverId,
  currentProfession,
  onNotify,
}: {
  caregiverId: string;
  currentProfession: string | null | undefined;
  onNotify: (type: 'success' | 'error', message: string) => void;
}) {
  const {
    request, loading, submitting, cancelling,
    submit: submitRequest, cancel: cancelRequest, uploadLicense, discardLicense,
  } = useProfessionChange(caregiverId);

  const pending = request?.status === 'pending' ? request : null;
  const rejected = request?.status === 'rejected' ? request : null;

  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<LicenseFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const ls = useLicenseStrings();
  const targetMeta = isProfession(target) ? PROFESSIONS[target] : null;
  const licenseRequired = (p: Profession) => PROFESSIONS[p].requiresLicense;
  const needsLicense = isProfession(target) && licenseRequired(target);

  // เปิดฟอร์มแล้ว เลื่อนไปหาตัวเลือก
  useEffect(() => {
    if (editing) pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [editing]);

  function openForm(prefill?: ProfessionChangeRequest | null) {
    setTarget(prefill?.toProfession ?? '');
    setLicenseNumber(prefill?.licenseNumber ?? '');
    setExpiresAt(prefill?.licenseExpiresAt ? prefill.licenseExpiresAt.slice(0, 10) : '');
    // ใบของคำขอที่ถูกปฏิเสธถูกปฏิเสธไปพร้อมกัน ใช้ซ้ำไม่ได้ (BE: LICENSE_FILE_REQUIRED) — ต้องแนบไฟล์ใหม่
    setFile(null);
    setErrors({});
    setEditing(true);
  }

  // ลบเฉพาะไฟล์ที่อัปโหลดรอบนี้ — ไฟล์จากคำขอเดิมเป็นหลักฐานที่แอดมินเคยตรวจ ห้ามลบ
  const discardUploaded = (f: LicenseFile | null) => discardLicense(f);

  function closeForm() {
    void discardUploaded(file);
    setEditing(false);
    setErrors({});
  }

  async function handleFile(selected: File) {
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setErrors((e) => ({ ...e, file: 'รองรับเฉพาะ JPG, PNG, PDF' }));
      return;
    }
    if (selected.size > MAX_SIZE) {
      setErrors((e) => ({ ...e, file: 'ไฟล์ใหญ่เกิน 5 MB · ลองย่อขนาดแล้วอัปโหลดอีกครั้ง' }));
      return;
    }
    setUploading(true);
    setErrors((e) => ({ ...e, file: undefined }));
    try {
      const uploaded = await uploadLicense(selected);
      void discardUploaded(file);
      setFile(uploaded);
    } catch (err) {
      logGraphQLError('UploadProfessionalLicense', err);
      setErrors((e) => ({ ...e, file: 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่' }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!isProfession(target) || target === currentProfession) next.profession = 'กรุณาเลือกวิชาชีพใหม่';
    if (needsLicense) {
      if (!licenseNumber.trim()) next.licenseNumber = 'กรุณากรอกเลขใบประกอบวิชาชีพ';
      if (!expiresAt || expiresAt <= todayYmd()) next.expiresAt = 'กรุณาเลือกวันหมดอายุ (ต้องเป็นวันในอนาคต)';
      if (!file) next.file = 'กรุณาแนบไฟล์ใบประกอบวิชาชีพ';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    try {
      await submitRequest({
        profession: target,
        ...(needsLicense ? { licenseNumber: licenseNumber.trim(), licenseExpiresAt: expiresAt, licenseFile: file } : {}),
      });
      setConfirmSubmit(false);
      setEditing(false);
      setFile(null); // ไฟล์ผูกกับคำขอแล้ว ห้ามลบตอนปิดฟอร์ม
      onNotify('success', 'ส่งคำขอเปลี่ยนวิชาชีพแล้ว');
    } catch (err) {
      logGraphQLError('RequestProfessionChange', err);
      setConfirmSubmit(false);
      // error ของใบ (LICENSE_*) → ขึ้นใต้ช่องที่ต้องแก้ ข้อความจากไฟล์ข้อความกลางของใบประกอบฯ
      const codes = licenseErrorCodes(err);
      if (codes.length > 0) {
        setErrors((e) => ({ ...e, ...fieldErrorsFromCodes(codes, ls) }));
        onNotify('error', ls.apiError[codes[0]] ?? ls.errUnknown);
        return;
      }
      onNotify('error', professionErrorMessage(err) ?? 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function cancel() {
    if (!pending) return;
    try {
      await cancelRequest(pending.id);
      setConfirmCancel(false);
      onNotify('success', 'ยกเลิกคำขอแล้ว');
    } catch (err) {
      logGraphQLError('CancelProfessionChangeRequest', err);
      setConfirmCancel(false);
      onNotify('error', professionErrorMessage(err) ?? 'ยกเลิกคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  const fromLabel = isProfession(currentProfession) ? PROFESSIONS[currentProfession].label : '';
  const inputClass = (bad: boolean) =>
    `w-full h-[38px] px-3 border rounded-lg bg-white text-[14px] text-[#0A0A0A] focus:outline-none focus:ring-2 ${bad ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-[#52B69A]'}`;

  return (
    <div className="flex flex-col gap-4" style={font}>
      {/* วิชาชีพปัจจุบัน */}
      <div className="flex items-center justify-between gap-3 flex-wrap border border-[#E2E8F0] rounded-[14px] px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-[#717182]">วิชาชีพปัจจุบัน</span>
          {isProfession(currentProfession) ? <ProfessionBadge profession={currentProfession} /> : <span className="text-[14px]">-</span>}
        </div>
        <button
          type="button"
          onClick={() => openForm()}
          disabled={loading || editing || !!pending}
          className="text-[13px] font-semibold text-[#2D6A58] border border-[#2D6A58] rounded-lg px-3.5 py-1.5 hover:bg-[#F2F8F5] cursor-pointer disabled:text-[#9CA3AF] disabled:border-[#E5E7EB] disabled:bg-transparent disabled:cursor-not-allowed"
        >
          ขอเปลี่ยน
        </button>
      </div>

      {/* รอแอดมินตรวจ */}
      {pending && (
        <div role="status" className="flex flex-col gap-2.5 px-4 py-3.5 bg-[#FEF6E9] border border-[#BB7E1C] rounded-xl">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#0F172A]">
            <span className="material-icons text-[#F9A825]" style={{ fontSize: 20 }} aria-hidden="true">hourglass_top</span>
            รอแอดมินตรวจคำขอเปลี่ยนวิชาชีพ
          </div>
          <Flow from={pending.fromProfession} to={pending.toProfession} />
          {pending.licenseDocument && (
            <div className="flex flex-col gap-1">
              <FileRow file={{ docId: pending.licenseDocument.id, fileName: pending.licenseDocument.fileName, previewUrl: pending.licenseDocument.signedUrl }} />
              <span className="text-[12px] text-[#64748B]">
                เลขที่ {pending.licenseNumber ?? '-'} · หมดอายุ {thaiDate(pending.licenseExpiresAt)}
              </span>
            </div>
          )}
          {/* ระหว่างรอ รับงานด้วยวิชาชีพเดิมได้ (contract PYG-573 §1) */}
          <p className="text-[13px] text-[#334155] leading-relaxed">
            ส่งคำขอเมื่อ {thaiDate(pending.requestedAt, true)} ระหว่างนี้โปรไฟล์ยังแสดง "{PROFESSIONS[pending.fromProfession as Profession]?.label ?? fromLabel}"
            และคุณยังรับงานในฐานะ{PROFESSIONS[pending.fromProfession as Profession]?.label ?? fromLabel}ได้ตามปกติ
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={() => setConfirmCancel(true)} className="text-[13px] font-semibold text-[#B42318] px-1.5 py-1 hover:underline cursor-pointer">
              ยกเลิกคำขอ
            </button>
          </div>
        </div>
      )}

      {/* ไม่ผ่าน */}
      {rejected && !editing && (
        <div role="alert" className="flex flex-col gap-2.5 px-4 py-3.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#0F172A]">
            <span className="material-icons text-[#DC2626]" style={{ fontSize: 20 }} aria-hidden="true">cancel</span>
            คำขอเปลี่ยนวิชาชีพไม่ผ่าน
          </div>
          <Flow from={rejected.fromProfession} to={rejected.toProfession} />
          <p className="text-[13px] text-[#334155] leading-relaxed">
            เหตุผลจากแอดมิน: {rejected.rejectionReason || '-'} · ตรวจเมื่อ {thaiDate(rejected.reviewedAt)}
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={() => openForm(rejected)} className="px-4 py-2 rounded-lg bg-[#2D6A58] text-white text-[13px] font-bold hover:bg-[#255a4a] cursor-pointer">
              แก้ไขแล้วส่งใหม่
            </button>
          </div>
        </div>
      )}

      {/* ฟอร์มขอเปลี่ยน */}
      {editing && (
        <div className="flex flex-col gap-4">
          <ProfessionPicker
            ref={pickerRef}
            id="profession-change"
            label="เลือกวิชาชีพใหม่"
            value={target}
            onChange={(p) => { setTarget(p); setErrors((e) => ({ ...e, profession: undefined })); }}
            disabledValue={currentProfession ?? undefined}
            error={errors.profession}
            renderNote={(p) => (
              <span className="text-[12px] text-[#475569]">
                {licenseRequired(p) ? 'ต้องแนบใบประกอบวิชาชีพ' : 'ไม่ต้องแนบเอกสาร'}
              </span>
            )}
          />

          {targetMeta && !needsLicense && (
            <div className="flex gap-2 items-start text-[13.5px] text-[#334155] bg-[#F1F5F9] rounded-xl px-3.5 py-3 leading-normal">
              <span className="material-icons-outlined text-[#64748B]" style={{ fontSize: 18 }} aria-hidden="true">info</span>
              เปลี่ยนเป็น{targetMeta.label}ไม่ต้องแนบเอกสาร แต่ยังต้องรอแอดมินตรวจก่อนโปรไฟล์จะเปลี่ยน
            </div>
          )}

          {needsLicense && targetMeta && (
            <div className="flex flex-col gap-3.5 border border-[#F3D9A8] bg-[#FFFBF3] rounded-[14px] p-4">
              <div className="flex gap-2.5 items-start">
                <span className="material-icons-outlined text-[#B7791F]" style={{ fontSize: 22 }} aria-hidden="true">badge</span>
                <div>
                  <p className="text-[15px] font-semibold">ใบประกอบวิชาชีพ</p>
                  <p className="text-[12.5px] text-[#717182] leading-normal">{targetMeta.licenseName} · ทีมงานใช้ตรวจคำขอนี้</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <label htmlFor="license-number" className="text-[14px] font-medium text-gray-700">
                    เลขใบประกอบฯ <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="license-number"
                    value={licenseNumber}
                    onChange={(e) => { setLicenseNumber(e.target.value); setErrors((er) => ({ ...er, licenseNumber: undefined })); }}
                    maxLength={LICENSE_NUMBER_MAX_LENGTH}
                    placeholder="เช่น 5511223344"
                    aria-invalid={!!errors.licenseNumber || undefined}
                    aria-describedby={errors.licenseNumber ? 'license-number-error' : undefined}
                    className={inputClass(!!errors.licenseNumber)}
                  />
                  <FieldError id="license-number-error" message={errors.licenseNumber} />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <label htmlFor="license-expires" className="text-[14px] font-medium text-gray-700">
                    วันหมดอายุ <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="license-expires"
                    type="date"
                    value={expiresAt}
                    min={todayYmd(1)}
                    onChange={(e) => { setExpiresAt(e.target.value); setErrors((er) => ({ ...er, expiresAt: undefined })); }}
                    aria-invalid={!!errors.expiresAt || undefined}
                    aria-describedby={errors.expiresAt ? 'license-expires-error' : undefined}
                    className={inputClass(!!errors.expiresAt)}
                  />
                  <FieldError id="license-expires-error" message={errors.expiresAt} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span id="license-file-label" className="text-[14px] font-medium text-gray-700">
                  ไฟล์ใบประกอบฯ <span className="text-red-600" aria-hidden="true">*</span>
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  className="hidden"
                  aria-labelledby="license-file-label"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                />
                {file ? (
                  <FileRow file={file} onRemove={() => { void discardUploaded(file); setFile(null); }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className={`flex flex-col items-center gap-1 text-center rounded-xl border-[1.5px] border-dashed px-3.5 py-4 cursor-pointer disabled:cursor-wait ${errors.file ? 'border-red-400 bg-[#FEF2F2]' : 'border-[#CBD5E1] bg-white hover:border-[#2D6A58]'}`}
                  >
                    <span className={`material-icons-outlined text-[#2D6A58] ${uploading ? 'animate-spin' : ''}`} style={{ fontSize: 28 }} aria-hidden="true">
                      {uploading ? 'refresh' : 'upload_file'}
                    </span>
                    <span className="text-[14px] font-semibold">{uploading ? 'กำลังอัปโหลด...' : 'แตะเพื่อเลือกไฟล์'}</span>
                    <span className="text-[12px] text-[#717182]">JPG, PNG หรือ PDF ไม่เกิน 5 MB · เห็นชื่อ เลขที่ และวันหมดอายุชัดเจน</span>
                  </button>
                )}
                <FieldError id="license-file-error" message={errors.file} />
              </div>
            </div>
          )}

          {Object.values(errors).some(Boolean) && needsLicense && (
            <div role="alert" className="flex items-center gap-1.5 text-[13.5px] text-[#B42318] bg-[#FEF2F2] border border-[#FCA5A5] rounded-[10px] px-3 py-2.5">
              <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">error_outline</span>
              กรอกข้อมูลใบประกอบฯ ให้ครบ 3 ช่องก่อนส่งคำขอ
            </div>
          )}

          <div className="flex justify-end gap-2 flex-wrap">
            <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 cursor-pointer">
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => { if (validate()) setConfirmSubmit(true); }}
              className="px-6 py-2.5 rounded-lg bg-[#2D6A58] text-white text-sm font-bold hover:bg-[#255a4a] cursor-pointer disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
            >
              ส่งคำขอ
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmSubmit}
        isLoading={submitting}
        title="ยืนยันขอเปลี่ยนวิชาชีพ"
        iconName="swap_horiz"
        cancelText="กลับไปแก้ไข"
        confirmText="ส่งคำขอ"
        onClose={() => setConfirmSubmit(false)}
        onConfirm={submit}
        description={
          <div className="flex flex-col items-center gap-3 text-left">
            <Flow from={currentProfession ?? ''} to={target} />
            <ul className="list-disc pl-5 text-[14px] text-[#334155] flex flex-col gap-1">
              <li>ทีมงานจะตรวจคำขอ{needsLicense ? 'และใบประกอบฯ' : ''}ก่อนเปลี่ยนในโปรไฟล์ ปกติภายใน 1–2 วันทำการ</li>
              <li>ระหว่างรอ ผู้ใช้บริการยังเห็นวิชาชีพเดิมของคุณ</li>
              <li>ส่งคำขอได้ทีละ 1 คำขอ</li>
            </ul>
          </div>
        }
      />
      <ConfirmModal
        isOpen={confirmCancel}
        isLoading={cancelling}
        title="ยกเลิกคำขอเปลี่ยนวิชาชีพ?"
        iconName="close"
        iconBgColor="bg-[#DC2626]"
        confirmBtnBgColor="bg-[#DC2626]"
        confirmBtnHoverBgColor="hover:bg-[#B91C1C]"
        cancelText="ไม่ยกเลิก"
        confirmText="ยกเลิกคำขอ"
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
        description="วิชาชีพของคุณจะยังเป็นแบบเดิม ถ้าต้องการเปลี่ยนภายหลังต้องส่งคำขอใหม่"
      />
    </div>
  );
}
