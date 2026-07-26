interface DisputeProcessingOverlayProps {
  readonly title: string;
  readonly subtitle: string;
}

// PYG-320/321 — overlay ระหว่างรอผลลัพธ์ resolve (mock latency จนกว่า mutation จริงจะพร้อม)
export default function DisputeProcessingOverlay({ title, subtitle }: DisputeProcessingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(14,25,20,0.5)] px-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-[360px] rounded-2xl bg-white px-6 py-7 text-center shadow-2xl">
        <div
          aria-hidden="true"
          className="mx-auto h-[66px] w-[66px] animate-spin rounded-full border-4 border-[#52B69A] border-t-transparent"
        />
        <p className="mt-6 text-[15px] font-bold text-[#1A1A1A]">{title}</p>
        <p className="mt-2 text-[13px] text-[#8A8C8E]">{subtitle}</p>
      </div>
    </div>
  );
}
