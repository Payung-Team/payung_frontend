import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import DisputeBookingInfoCard from '../../components/features/dispute/DisputeBookingInfoCard';
import EvidenceGrid from '../../components/features/dispute/EvidenceGrid';
import DisputePaymentHistory from '../../components/features/dispute/DisputePaymentHistory';
import DisputeResolutionPanel, { type ResolutionPayload } from '../../components/features/dispute/DisputeResolutionPanel';
import DisputeResolveConfirmModal from '../../components/features/dispute/DisputeResolveConfirmModal';
import DisputeProcessingOverlay from '../../components/features/dispute/DisputeProcessingOverlay';
import DisputeAuditTimeline from '../../components/features/dispute/DisputeAuditTimeline';
import DisputeInternalNotes from '../../components/features/dispute/DisputeInternalNotes';
import { mapDetailResponse, type DisputeDetail } from '../../components/features/dispute/disputeDetailMapper';
import { RESOLUTION_OPERATION_LABEL } from '../../components/features/dispute/disputeMeta';
import {
  addDisputeNote,
  fetchDisputeDetail,
  resolveDispute,
  type ResolutionAction,
} from '../../lib/adminDisputeApi';

// FE ใช้ vocabulary 'no_refund' ทั่วหน้า → map เป็น REST ('reject') จุดเดียวก่อนยิง
const KIND_TO_RESOLUTION: Record<ResolutionPayload['kind'], ResolutionAction> = {
  full_refund: 'full_refund',
  partial_refund: 'partial_refund',
  no_refund: 'reject',
};

// PYG-319 / PYG-320 / PYG-321 — หน้ารายละเอียดคำร้อง (ต่อ backend REST + confirm modal/overlay ของ PYG-325)
export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ขั้นยืนยันก่อนยิงจริง (PYG-325): เก็บ payload ที่รอยืนยัน + สถานะระหว่างเรียก backend
  const [pendingResolution, setPendingResolution] = useState<ResolutionPayload | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvingKind, setResolvingKind] = useState<ResolutionPayload['kind'] | null>(null);

  // โหลด detail — แยกเป็นฟังก์ชันเพื่อให้ addNote/resolve เรียกซ้ำได้หลังทำสำเร็จ
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const raw = await fetchDisputeDetail(id);
      setDispute(mapDetailResponse(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายละเอียดคำร้องไม่สำเร็จ');
      setDispute(null);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const raw = await fetchDisputeDetail(id);
        if (!cancelled) setDispute(mapDetailResponse(raw));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'โหลดรายละเอียดคำร้องไม่สำเร็จ');
          setDispute(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddNote = async (message: string) => {
    if (!id) return;
    try {
      await addDisputeNote(id, message);
      await load();
      toast.success('บันทึกภายในเรียบร้อย');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกภายในไม่สำเร็จ');
    }
  };

  // ยืนยันจากโมดัลแล้ว → ยิง resolve จริง + refetch (แทน mock latency เดิมของ PYG-325)
  const handleResolveConfirmed = async (payload: ResolutionPayload) => {
    if (!id || isResolving) return;
    setPendingResolution(null);
    setResolvingKind(payload.kind);
    setIsResolving(true);
    try {
      await resolveDispute(id, {
        resolution: KIND_TO_RESOLUTION[payload.kind],
        amount: payload.kind === 'partial_refund' ? payload.amount : undefined,
        reason: payload.reason,
      });
      await load();
      toast.success('บันทึกผลการดำเนินการเรียบร้อย', undefined, 'dispute-toast');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ');
    } finally {
      setIsResolving(false);
      setResolvingKind(null);
    }
  };

  const resolvingTitle = resolvingKind === 'no_refund' ? 'กำลังบันทึกผลการดำเนินการ…' : 'กำลังดำเนินการกับ Omise…';
  const resolvingSubtitle = resolvingKind ? `${RESOLUTION_OPERATION_LABEL[resolvingKind]} · โปรดรอสักครู่` : '';

  return (
    <div className="bg-[#F6FAF9] text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* pl-[54px] บน lg = 16px padding ของ header + ปุ่ม hamburger 30px + gap 8px → หัวข้อรองตรงกับ title ใน AdminLayout */}
      <div className="w-full px-4 py-5 lg:pl-[54px] lg:pr-6">
        {/* Breadcrumb ในหน้า */}
        <nav className="flex flex-wrap items-center gap-2 text-[15px]">
          <Link to="/admin/disputes" className="text-[#8A8C8E] hover:underline">
            คำร้อง
          </Link>
          <span className="text-[#C6C8CB]">/</span>
          <span className="font-bold">รายละเอียดคำร้อง</span>
          {dispute && <span className="font-[Inter] text-[13px] font-bold text-[#3B82F6]">{dispute.displayId}</span>}
        </nav>

        {loading ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,646px)_minmax(0,462px)]">
            <div className="flex flex-col gap-5">
              <Skeleton height={319} borderRadius={16} />
              <Skeleton height={493} borderRadius={16} />
              <Skeleton height={191} borderRadius={16} />
            </div>
            <div className="flex flex-col gap-5">
              <Skeleton height={708} borderRadius={16} />
              <Skeleton height={327} borderRadius={16} />
              <Skeleton height={182} borderRadius={16} />
            </div>
          </div>
        ) : error || !dispute ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Icon name="error_outline" variant="outlined" />
            </div>
            <h2 className="mt-4 text-base font-bold">ไม่พบคำร้องนี้</h2>
            <p className="mt-1 text-sm text-[#8A8C8E]">{error || 'คำร้องอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง'}</p>
            <button
              type="button"
              onClick={() => navigate('/admin/disputes')}
              className="mt-5 inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#059669] px-4 text-sm font-bold text-white hover:bg-[#047857]"
            >
              กลับไปหน้ารายการคำร้อง
            </button>
          </div>
        ) : (
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,646px)_minmax(0,462px)]">
            <div className="flex min-w-0 flex-col gap-5">
              <DisputeBookingInfoCard dispute={dispute} />
              <EvidenceGrid files={dispute.evidence} />
              <DisputePaymentHistory payments={dispute.payments} />
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <DisputeResolutionPanel
                dispute={dispute}
                isSubmitting={isResolving || pendingResolution !== null}
                onSubmit={setPendingResolution}
              />
              <DisputeAuditTimeline events={dispute.timeline} />
              <DisputeInternalNotes notes={dispute.notes} onAddNote={handleAddNote} />
            </div>
          </div>
        )}
      </div>

      {dispute && pendingResolution && (
        <DisputeResolveConfirmModal
          dispute={dispute}
          payload={pendingResolution}
          onCancel={() => setPendingResolution(null)}
          onConfirm={() => handleResolveConfirmed(pendingResolution)}
        />
      )}
      {isResolving && <DisputeProcessingOverlay title={resolvingTitle} subtitle={resolvingSubtitle} />}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} position="top-right" />
    </div>
  );
}
