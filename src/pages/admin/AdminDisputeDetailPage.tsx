import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import DisputeBookingInfoCard from '../../components/features/dispute/DisputeBookingInfoCard';
import EvidenceGrid from '../../components/features/dispute/EvidenceGrid';
import DisputePaymentHistory from '../../components/features/dispute/DisputePaymentHistory';
import DisputeResolutionPanel from '../../components/features/dispute/DisputeResolutionPanel';
import DisputeAuditTimeline from '../../components/features/dispute/DisputeAuditTimeline';
import DisputeInternalNotes from '../../components/features/dispute/DisputeInternalNotes';
import { findMockDispute, type InternalNote } from '../../components/features/dispute/disputeDetailMock';

// PYG-319 / PYG-321 — หน้ารายละเอียดคำร้อง (mock UI, ยังไม่ต่อ backend)
export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const dispute = useMemo(() => findMockDispute(id), [id]);

  // mock loading — จำลอง network latency เพื่อให้เห็น skeleton จริงตาม DoD ของ PYG-321
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<InternalNote[]>([]);

  useEffect(() => {
    setLoading(true);
    setNotes(dispute?.notes ?? []);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [dispute]);

  const addNote = (message: string) => {
    setNotes((prev) => [
      { id: `note-${Date.now()}`, author: 'Admin A', at: new Date().toISOString(), message },
      ...prev,
    ]);
    toast.success('บันทึกภายในเรียบร้อย (mock)');
  };

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
        ) : !dispute ? (
          <div className="mt-5 rounded-2xl border border-red-100 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Icon name="error_outline" variant="outlined" />
            </div>
            <h2 className="mt-4 text-base font-bold">ไม่พบคำร้องนี้</h2>
            <p className="mt-1 text-sm text-[#8A8C8E]">คำร้องอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
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
                // TODO: เรียก mutation resolveDispute เมื่อ backend พร้อม (PYG-320)
                onSubmit={() => toast.success('บันทึกผลการดำเนินการแล้ว (mock — ยังไม่ส่งไป backend)')}
              />
              <DisputeAuditTimeline events={dispute.timeline} />
              <DisputeInternalNotes notes={notes} onAddNote={addNote} />
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}
