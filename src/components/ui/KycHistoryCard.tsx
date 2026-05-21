import { useMemo, useState } from 'react';

interface CaregiverDetail {
  id: string;
  fullName: string;
  createdAt: string | Date;
  kycSubmittedAt?: string | Date | null;
}

interface KycReview {
  id: string;
  action: string;
  reason?: string | null;
  reviewedBy: string;
  reviewedAt: string | Date;
  reviewerName?: string | null;
}

interface CaregiverEditLog {
  id: string;
  action: string;
  editorName?: string | null;
  createdAt: string | Date;
  fieldChanges?: Array<{ field: string; oldValue?: string; newValue?: string }> | null;
}

interface KycHistoryCardProps {
  caregiver?: CaregiverDetail | null;
  reviews?: KycReview[];
  editHistory?: CaregiverEditLog[];
  onlyKycLogs?: boolean;
  title?: string;
}

function formatThaiDateTime(value?: string | Date | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function KycHistoryCard({
  caregiver,
  reviews = [],
  editHistory = [],
  onlyKycLogs = false,
  title,
}: KycHistoryCardProps) {
  const displayTitle = title ?? (onlyKycLogs ? 'ประวัติการดำเนินการ' : 'ประวัติการแก้ไข');

  const historyItems = useMemo(() => {
    if (!caregiver) return [];

    const items: Array<{
      id: string;
      title: string;
      subtitle?: string | null;
      editor: string;
      date: Date;
      circleColorClass: string;
    }> = [];

    // ─── Pre-process: จับคู่ document_upload/delete กับ resubmit ที่ตามมา ───────
    // เรียง ascending เพื่อ build timeline ตามลำดับเวลา: upload/delete → resubmit
    const DOC_TYPE_LABEL: Record<string, string> = {
      id_card_front: 'บัตรประชาชน (ด้านหน้า)',
      id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
      certificate: 'ใบรับรองอบรม',
      id_card: 'บัตรประชาชน',
      photo: 'รูปถ่าย',
      license: 'ใบอนุญาต',
    };

    // Build legacy resubmitDocMap: ใช้สำหรับ backward compat กับ document_upload logs เก่าใน DB
    // (ใน format ใหม่ document changes จะอยู่ใน fieldChanges ของ resubmit log โดยตรงแล้ว)
    const sortedAsc = [...editHistory].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const resubmitDocMap = new Map<string, string[]>();
    let pendingLegacyUploads: string[] = [];
    for (const log of sortedAsc) {
      if (log.action === 'document_upload') {
        const change = log.fieldChanges?.find((f) => f.field === 'document');
        const rawType = change?.newValue || '';
        const docLabel = DOC_TYPE_LABEL[rawType] || rawType;
        if (docLabel) pendingLegacyUploads.push(docLabel);
      } else if (log.action === 'document_delete') {
        // ไม่เก็บ delete logs — ไม่แสดงการลบใน history
      } else if (log.action === 'resubmit') {
        resubmitDocMap.set(log.id, [...pendingLegacyUploads]);
        pendingLegacyUploads = [];
      }
    }


    // 1. Profile Creation Log (System action -> Blue circle)
    if (!onlyKycLogs && caregiver.createdAt) {
      items.push({
        id: 'creation',
        title: 'สร้างโปรไฟล์',
        subtitle: null,
        editor: 'โดย System',
        date: new Date(caregiver.createdAt),
        circleColorClass: 'bg-[#3B82F6]', // System -> Blue
      });
    }

    // 2. Admin Reviews (Admin actions -> Green or Red circle)
    reviews.forEach((r) => {
      const isRejected = r.action === 'rejected';
      items.push({
        id: `review-${r.id}`,
        title: isRejected ? 'ปฏิเสธเอกสาร KYC' : 'อนุมัติเอกสาร KYC',
        subtitle: r.reason ? `เหตุผล: ${r.reason}` : 'เหตุผล: -',
        editor: `โดย ${r.reviewerName || 'Admin'}`,
        date: new Date(r.reviewedAt),
        circleColorClass: isRejected ? 'bg-[#EF4444]' : 'bg-[#059669]', // Admin: Reject -> Red, Normal -> Green
      });
    });

    // 3. Edit logs (Caregiver actions -> Yellow circle)
    let hasSubmitLog = false;
    editHistory.forEach((log) => {
      let logTitle = '';
      let logSubtitle: string | null = null;
      let includeLog = true;

      if (log.action === 'first_submit') {
        logTitle = 'ส่งเอกสารยืนยันตัวตน';
        // แสดงเอกสารที่ submit จาก fieldChanges (format ใหม่)
        const submittedDocs = (log.fieldChanges ?? [])
          .filter((f) => f.field === 'document' && f.newValue)
          .map((f) => DOC_TYPE_LABEL[f.newValue!] || f.newValue!);
        logSubtitle = submittedDocs.length > 0 ? `เพิ่ม: ${submittedDocs.join(', ')}` : null;
        hasSubmitLog = true;
      } else if (log.action === 'resubmit') {
        logTitle = 'ส่งเอกสารยืนยันตัวตนใหม่';
        const parts: string[] = [];

        const FIELD_LABEL: Record<string, string> = {
          phone: 'เบอร์โทร',
          fullName: 'ชื่อ-นามสกุล',
          bio: 'แนะนำตัว',
          hourlyRate: 'อัตราค่าบริการ',
          experienceYears: 'ประสบการณ์',
          skills: 'ทักษะ',
          address: 'ที่อยู่',
          idCardNumber: 'เลขบัตรประชาชน',
          gender: 'เพศ',
          dateOfBirth: 'วันเกิด',
        };

        // Text field changes (exclude 'document' entries)
        const changedTextFields = (log.fieldChanges ?? [])
          .filter((f) => f.field !== 'document')
          .map((f) => FIELD_LABEL[f.field] || f.field);
        if (changedTextFields.length > 0) parts.push(`แก้ไข: ${changedTextFields.join(', ')}`);

        // Document changes: ใหม่ → จาก fieldChanges โดยตรง; เก่า (legacy) → จาก resubmitDocMap
        const docsFromFieldChanges = (log.fieldChanges ?? [])
          .filter((f) => f.field === 'document' && f.newValue)
          .map((f) => DOC_TYPE_LABEL[f.newValue!] || f.newValue!);
        const docsFromLegacy = resubmitDocMap.get(log.id) ?? [];
        const allUploadedDocs = [...new Set([...docsFromFieldChanges, ...docsFromLegacy])];
        if (allUploadedDocs.length > 0) parts.push(`เพิ่ม: ${allUploadedDocs.join(', ')}`);

        logSubtitle = parts.length > 0 ? parts.join(' | ') : null;
        hasSubmitLog = true;

      } else if (log.action === 'profile_edit') {
        if (onlyKycLogs) {
          includeLog = false;
        } else {
          if (log.fieldChanges && log.fieldChanges.length > 0) {
            const fieldMap: Record<string, string> = {
              phone: 'เบอร์โทร',
              fullName: 'ชื่อ-นามสกุล',
              bio: 'แนะนำตัว',
              hourlyRate: 'อัตราค่าบริการ',
              experienceYears: 'ประสบการณ์',
              skills: 'ทักษะ',
              address: 'ที่อยู่',
              idCardNumber: 'เลขบัตรประชาชน',
            };
            const changedFields = log.fieldChanges
              .map((f) => fieldMap[f.field] || f.field)
              .join(', ');
            logTitle = `แก้ไข: ${changedFields}`;
          } else {
            logTitle = 'แก้ไขข้อมูลส่วนตัว';
          }
        }
      } else if (log.action === 'document_upload' || log.action === 'document_delete') {
        // แสดงผลใน subtitle ของ resubmit entry แล้ว — ไม่แสดงเป็น item แยก
        includeLog = false;
      } else if (log.action === 'field_lock' || log.action === 'field_unlock') {
        if (onlyKycLogs) {
          includeLog = false;
        } else {
          const LOCK_FIELD_LABEL: Record<string, string> = {
            firstName: 'ชื่อจริง',
            lastName: 'นามสกุล',
            fullName: 'ชื่อ-นามสกุล',
            idCardNumber: 'เลขบัตรประชาชน',
            email: 'อีเมล',
            phone: 'เบอร์โทร',
          };
          const fieldName = log.fieldChanges?.[0]?.field ?? '';
          const fieldThai = LOCK_FIELD_LABEL[fieldName] || fieldName;
          logTitle = log.action === 'field_lock'
            ? `ล็อคฟิลด์: ${fieldThai}`
            : `ปลดล็อคฟิลด์: ${fieldThai}`;
        }
      } else if (log.action === 'admin_edit') {
        if (onlyKycLogs) {
          includeLog = false;
        } else {
          const ADMIN_FIELD_LABEL: Record<string, string> = {
            firstName: 'ชื่อจริง',
            lastName: 'นามสกุล',
            fullName: 'ชื่อ-นามสกุล',
            idCardNumber: 'เลขบัตรประชาชน',
            email: 'อีเมล',
            phone: 'เบอร์โทร',
          };
          if (log.fieldChanges && log.fieldChanges.length > 0) {
            const parts = log.fieldChanges.map((f) => {
              const label = ADMIN_FIELD_LABEL[f.field] || f.field;
              if (f.oldValue && f.newValue) return `${label}: ${f.oldValue} → ${f.newValue}`;
              return label;
            });
            logTitle = 'Admin แก้ไขข้อมูล';
            logSubtitle = parts.join(' | ');
          } else {
            logTitle = 'Admin แก้ไขข้อมูล';
          }
        }
      } else {
        if (onlyKycLogs) {
          includeLog = false;
        } else {
          logTitle = 'แก้ไขข้อมูล';
        }
      }

      if (includeLog) {
        const isAdminAction = log.action === 'field_lock' || log.action === 'field_unlock' || log.action === 'admin_edit';
        items.push({
          id: `edit-${log.id}`,
          title: logTitle,
          subtitle: logSubtitle,
          editor: isAdminAction
            ? `โดย ${log.editorName || 'Admin'}`
            : `โดย ${caregiver.fullName || log.editorName || 'Caregiver'}`,
          date: new Date(log.createdAt),
          circleColorClass: isAdminAction ? 'bg-[#7C3AED]' : 'bg-[#F59E0B]',
        });
      }
    });

    // Fallback: If no submit/resubmit edit logs exist, but caregiver has kycSubmittedAt, add the fallback submit log
    if (!hasSubmitLog && caregiver.kycSubmittedAt) {
      items.push({
        id: 'fallback-submit',
        title: 'ส่งเอกสาร KYC',
        subtitle: 'เหตุผล: -',
        editor: `โดย ${caregiver.fullName}`,
        date: new Date(caregiver.kycSubmittedAt),
        circleColorClass: 'bg-[#F59E0B]', // User/Caregiver -> Yellow
      });
    }

    // Sort descending by date
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [caregiver, reviews, editHistory, onlyKycLogs]);

  const [showAll, setShowAll] = useState(false);

  const ITEMS_LIMIT = 5;
  const displayedItems = showAll ? historyItems : historyItems.slice(0, ITEMS_LIMIT);
  const hasMore = historyItems.length > ITEMS_LIMIT;

  if (!caregiver) return null;

  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-base font-semibold leading-5 text-[#064E3B]">{displayTitle}</h3>
      <div className="mt-4 space-y-4">
        {displayedItems.length > 0 ? (
          displayedItems.map((item, idx) => (
            <div
              key={item.id}
              className={`flex gap-3 pb-3 ${
                idx === displayedItems.length - 1 && !hasMore ? '' : 'border-b border-[#F3F4F6]'
              }`}
            >
              {/* Colored Circle Status Indicator */}
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.circleColorClass}`} />
              
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-4 text-[#1F2937] truncate">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="mt-1 text-xs leading-5 text-[#6B7280]">
                    {item.subtitle}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] leading-[14px] text-[#9CA3AF]">
                  {item.editor}
                </p>
              </div>
              <time className="shrink-0 text-[10px] leading-3 text-[#9CA3AF]">
                {formatThaiDateTime(item.date)}
              </time>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">ไม่มีประวัติการดำเนินการ</p>
        )}

        {/* Show All / Collapse toggle button */}
        {hasMore && (
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="mt-1 w-full rounded-lg border border-[#E5E7EB] py-2 text-xs font-medium text-[#059669] transition-colors hover:bg-[#F0FDF4] hover:border-[#059669] cursor-pointer"
          >
            {showAll
              ? `ซ่อน (แสดง ${ITEMS_LIMIT} รายการล่าสุด)`
              : `แสดงทั้งหมด ${historyItems.length} รายการ`}
          </button>
        )}
      </div>
    </article>
  );
}
