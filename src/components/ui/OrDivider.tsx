export default function OrDivider() {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-[#E0E2E5]" />
      <span
        className="text-[#C6C8CB] text-sm"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        หรือ
      </span>
      <div className="flex-1 h-px bg-[#E0E2E5]" />
    </div>
  );
}
