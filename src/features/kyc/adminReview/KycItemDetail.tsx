import Icon from '../../../components/ui/Icon';
import ProfessionBadge from '../../../components/ui/ProfessionBadge';
import { drivingLicenseStatus } from '../../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../../lib/drivingLicenseStrings';
import { daysUntilBangkok, normalizeLicenseStatus, toBangkokYmd } from '../../../lib/license';
import { formatFileSize, formatLicenseDate, useLicenseStrings } from '../../../lib/licenseStrings';
import { PROFESSIONS, isProfession } from '../../../lib/professions';
import { skillLabel } from '../../../lib/skillLabels';
import { DrivingLicenseStatusPill } from '../DrivingLicenseStatusCard';
import { LicenseStatusPill } from '../LicenseStatusCard';
import { formatBirthDate, formatIdCard, formatPhone, formatThaiDateTime, genderLabel, splitName } from './format';
import type { ChecklistRow } from './useKycChecklist';
import type { AdminKycDetail } from './types';

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-[12.5px] font-medium leading-5 text-[#6B7280]">{label}</dt>
      <dd className="mt-0.5 break-words text-[14px] leading-[22px] text-[#111827]">{children || '-'}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h4 className="text-[13px] font-semibold leading-5 text-[#064E3B]">{title}</h4>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

function Checklist({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-lg bg-[#F9FAFB] px-4 py-3">
      <p className="text-[13px] font-semibold text-[#374151]">{title}</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-5 text-[#4B5563]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] leading-5 text-[#B91C1C]">
      <Icon name="block" style={{ fontSize: 17 }} />
      <span>{children}</span>
    </p>
  );
}

function PreviousReason({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="rounded-lg bg-[#FEF2F2] px-3 py-2">
      <p className="text-[12px] font-semibold text-[#B91C1C]">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-[#7F1D1D]">{reason}</p>
    </div>
  );
}

function Chips({ values, dashed }: { values: string[]; dashed?: boolean }) {
  if (values.length === 0) return <span>-</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12.5px] text-[#374151] ${dashed ? 'border border-dashed border-[#D1D5DB] bg-white' : 'bg-[#F3F4F6]'}`}
        >
          {v}
        </span>
      ))}
    </span>
  );
}

function expiryText(ymd: string, remaining: (d: number) => string, overdue: (d: number) => string) {
  if (!ymd) return '-';
  const days = daysUntilBangkok(ymd);
  return (
    <>
      {formatLicenseDate(ymd)}
      {Number.isFinite(days) && (
        <span className={`ml-1.5 text-[12.5px] ${days < 0 ? 'font-semibold text-[#B91C1C]' : 'text-[#6B7280]'}`}>
          · {days < 0 ? overdue(-days) : remaining(days)}
        </span>
      )}
    </>
  );
}

/**
 * รายละเอียดครบของรายการที่กำลังดู — วางใต้ตัวอย่างเอกสาร ให้แอดมินตัดสินได้โดยไม่ต้องเลื่อนไปหาข้อมูลที่อื่น
 */
export default function KycItemDetail({ row, detail }: { row: ChecklistRow; detail: AdminKycDetail }) {
  const ls = useLicenseStrings();
  const ds = useDrivingLicenseStrings();
  const { item } = row;
  const { caregiver } = detail;
  const profession = caregiver.profession ?? detail.profession ?? null;
  const name = splitName(caregiver.fullName);

  const fileBlock = item.kind !== 'info' && (
    <Block title="ไฟล์">
      {item.file ? (
        <Grid>
          <Field label="ชื่อไฟล์" wide>
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 break-all">{item.file.name}</span>
              {item.file.url && (
                <a
                  href={item.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-[#F3F4F6] px-2.5 text-[12.5px] font-semibold text-[#374151] hover:bg-gray-200"
                >
                  <Icon name="open_in_new" style={{ fontSize: 15 }} />
                  เปิดไฟล์ต้นฉบับ
                </a>
              )}
            </span>
          </Field>
          <Field label="ประเภท / ขนาด">
            {[item.file.mimeType, item.file.size ? formatFileSize(item.file.size) : null].filter(Boolean).join(' · ') || '-'}
          </Field>
          <Field label="อัปโหลดเมื่อ">{item.file.uploadedAt ? formatThaiDateTime(item.file.uploadedAt) : '-'}</Field>
        </Grid>
      ) : (
        <p className="text-[13.5px] text-[#9CA3AF]">ผู้ดูแลยังไม่ได้แนบไฟล์</p>
      )}
    </Block>
  );

  const identityCompare = (
    <Grid>
      <Field label="ชื่อ-นามสกุล">{caregiver.fullName}</Field>
      <Field label="เลขบัตรประชาชน">
        <span className="font-semibold tabular-nums">{formatIdCard(caregiver.idCardNumber)}</span>
      </Field>
      <Field label="วันเกิด">{formatBirthDate(caregiver.dateOfBirth)}</Field>
      <Field label="เพศ">{caregiver.gender ? genderLabel[caregiver.gender] ?? caregiver.gender : '-'}</Field>
      {caregiver.address ? <Field label="ที่อยู่" wide>{caregiver.address}</Field> : null}
    </Grid>
  );

  let body: React.ReactNode = null;

  if (item.kind === 'id_front') {
    body = (
      <>
        <Block title="ข้อมูลที่ผู้ดูแลกรอก — เทียบกับบัตร">{identityCompare}</Block>
        <Checklist title="สิ่งที่ต้องเทียบกับไฟล์" items={['ชื่อ-นามสกุล และเลขบัตร 13 หลักตรงกับที่กรอก', 'วันเกิดตรงกัน', 'บัตรยังไม่หมดอายุ และเห็นชัดทั้งใบ']} />
      </>
    );
  } else if (item.kind === 'selfie') {
    body = (
      <>
        <Block title="ข้อมูลที่ต้องเทียบ">
          <Grid>
            <Field label="ชื่อ-นามสกุล">{caregiver.fullName}</Field>
            <Field label="เลขบัตรประชาชน">
              <span className="font-semibold tabular-nums">{formatIdCard(caregiver.idCardNumber)}</span>
            </Field>
          </Grid>
        </Block>
        <Checklist title="สิ่งที่ต้องเทียบกับไฟล์" items={['เห็นใบหน้าชัด ไม่ถูกบัง', 'บัตรในรูปอ่านได้ และเป็นใบเดียวกับบัตรด้านหน้า', 'ใบหน้าตรงกับรูปในบัตร']} />
      </>
    );
  } else if (item.kind === 'license') {
    const license = detail.license ?? null;
    const status = license ? normalizeLicenseStatus(license.status) : null;
    const expiryYmd = toBangkokYmd(license?.expiresAt);
    const meta = isProfession(profession) ? PROFESSIONS[profession] : null;
    body = license ? (
      <>
        <Block title="ข้อมูลใบประกอบวิชาชีพ">
          <Grid>
            <Field label={ls.adminProfession}>{meta?.label ?? '-'}</Field>
            <Field label={ls.adminRequiredType}>{meta?.licenseName ?? '-'}</Field>
            <Field label={ls.adminNumber}>
              <span className="font-semibold tracking-wide">{license.licenseNumber ?? '-'}</span>
            </Field>
            <Field label={ls.adminExpiry}>{expiryText(expiryYmd, ls.adminRemaining, ls.adminOverdue)}</Field>
            <Field label="สถานะในระบบ">{status ? <LicenseStatusPill status={item.passBlockedReason && status === 'pending' ? 'expired' : status} /> : '-'}</Field>
          </Grid>
        </Block>
        {status === 'rejected' && license.rejectionReason && <PreviousReason label={ls.rejectedReasonLabel} reason={license.rejectionReason} />}
        {item.passBlockedReason && <Warning>{ls.adminExpiredBlocked(expiryYmd ? formatLicenseDate(expiryYmd) : '-')}</Warning>}
        {status === 'pending' && <Checklist title={ls.adminChecklistTitle} items={ls.adminChecklist} />}
      </>
    ) : (
      <p className="text-[13.5px] text-[#9CA3AF]">{ls.adminNoLicense} · วิชาชีพที่ระบุ: {meta?.label ?? '-'}</p>
    );
  } else if (item.kind === 'driving') {
    const info = detail.drivingLicense ?? null;
    const reviews = detail.drivingLicenseReviews ?? [];
    const expiryYmd = toBangkokYmd(info?.expiresAt);
    body = (
      <>
        <Block title="ข้อมูลใบขับขี่">
          <Grid>
            <Field label={ds.adminExpiryEntered}>{expiryText(expiryYmd, ds.adminRemaining, ds.adminOverdue)}</Field>
            <Field label="สถานะในระบบ"><DrivingLicenseStatusPill status={drivingLicenseStatus(info)} /></Field>
          </Grid>
        </Block>
        {info?.status === 'rejected' && info.rejectionReason && <PreviousReason label={ds.rejectedReasonLabel} reason={info.rejectionReason} />}
        {info?.isExpired && <Warning>{ds.adminExpiredBlocked(expiryYmd ? formatLicenseDate(expiryYmd) : '-')}</Warning>}
        {info?.status === 'pending' && !info.isExpired && <Checklist title={ds.adminChecklistTitle} items={ds.adminChecklist} />}
        <Block title={ds.adminHistory}>
          {reviews.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF]">{ds.adminHistoryEmpty}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg bg-[#F9FAFB] px-3 py-2 text-[13px] text-[#374151]">
                  <span className="font-semibold">{ds.adminHistoryAction[r.action] ?? r.action}</span>
                  <span className="text-[#6B7280]">
                    {' · '}{formatThaiDateTime(r.reviewedAt)}
                    {r.reviewerName ? ` · ${r.reviewerName}` : ''}
                  </span>
                  {r.reason && <p className="mt-0.5 text-[#7F1D1D]">{r.reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </Block>
      </>
    );
  } else if (item.kind === 'training') {
    body = (
      <Block title="ข้อมูลประกอบ">
        <Grid>
          <Field label="ประสบการณ์">{`${caregiver.experienceYears ?? 0} ปี`}</Field>
          {profession ? <Field label="วิชาชีพ"><ProfessionBadge profession={profession} /></Field> : null}
          <Field label="ทักษะการดูแล" wide><Chips values={caregiver.skills.map(skillLabel)} /></Field>
          {(caregiver.customSkills ?? []).length > 0 ? (
            <Field label="ทักษะอื่นๆ (ผู้ดูแลพิมพ์เอง)" wide><Chips values={caregiver.customSkills ?? []} dashed /></Field>
          ) : null}
        </Grid>
      </Block>
    );
  } else if (item.kind === 'info') {
    body = (
      <>
        <Block title="ข้อมูลส่วนตัวทั้งหมดที่ผู้ดูแลกรอก">
          <Grid>
            <Field label="ชื่อ">{name.firstName}</Field>
            <Field label="นามสกุล">{name.lastName}</Field>
            <Field label="เลขบัตรประชาชน">
              <span className="font-semibold tabular-nums">{formatIdCard(caregiver.idCardNumber)}</span>
            </Field>
            <Field label="เพศ">{caregiver.gender ? genderLabel[caregiver.gender] ?? caregiver.gender : '-'}</Field>
            <Field label="วันเกิด">{formatBirthDate(caregiver.dateOfBirth)}</Field>
            <Field label="ประสบการณ์">{`${caregiver.experienceYears ?? 0} ปี`}</Field>
            {profession ? <Field label="วิชาชีพ"><ProfessionBadge profession={profession} /></Field> : null}
            <Field label="อีเมล">{caregiver.email}</Field>
            <Field label="เบอร์โทรศัพท์">{formatPhone(caregiver.phone)}</Field>
            <Field label="ที่อยู่" wide>{caregiver.address}</Field>
            <Field label="ทักษะการดูแล" wide><Chips values={caregiver.skills.map(skillLabel)} /></Field>
            {(caregiver.customSkills ?? []).length > 0 ? (
              <Field label="ทักษะอื่นๆ (ผู้ดูแลพิมพ์เอง)" wide><Chips values={caregiver.customSkills ?? []} dashed /></Field>
            ) : null}
            {caregiver.bio ? <Field label="ประวัติโดยย่อ" wide>{caregiver.bio}</Field> : null}
          </Grid>
        </Block>
        <Checklist title="สิ่งที่ต้องตรวจ" items={['ชื่อ / เลขบัตร / วันเกิด ตรงกับบัตรประชาชน', 'อายุ เบอร์โทร และอีเมลสมเหตุสมผล', 'ทักษะและประวัติไม่มีข้อความไม่เหมาะสม']} />
      </>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4">
      {body}
      {fileBlock}
    </div>
  );
}
