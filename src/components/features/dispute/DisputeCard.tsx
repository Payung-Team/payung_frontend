import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface DisputeCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

// PYG-321 — เปลือกการ์ดร่วมของหน้า Dispute Detail (ขาว/ขอบ #F0F1F3/มุม 16)
export default function DisputeCard({ title, children, className }: DisputeCardProps) {
  return (
    <section className={cn('rounded-2xl border border-[#F0F1F3] bg-white p-5', className)}>
      <h2 className="text-[15px] font-bold text-[#1A1A1A]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DisputeField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#8A8C8E]">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-[#1A1A1A]">{children}</div>
    </div>
  );
}

// ลิงก์ข้ามไปหน้าอื่น — mock UI ยังไม่มีปลายทางจริง
export function DisputeLink({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-[13px] font-bold text-[#3B82F6] hover:underline"
    >
      {label}
    </button>
  );
}
