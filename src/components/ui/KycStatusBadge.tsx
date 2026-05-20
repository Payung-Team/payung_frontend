const config: Record<string, { text: string; className: string }> = {
  none:     { text: 'ยังไม่ยืนยันตัวตน',    className: 'bg-gray-100 text-gray-600' },
  pending:  { text: 'รอการตรวจสอบ',         className: 'bg-yellow-100 text-yellow-700' },
  verified: { text: 'ยืนยันตัวตนแล้ว ✓',   className: 'bg-green-100 text-green-700' },
  rejected: { text: 'การยืนยันถูกปฏิเสธ',   className: 'bg-red-100 text-red-700' },
};

export default function KycStatusBadge({ status }: { status?: string }) {
  const { text, className } = config[status ?? 'none'] ?? config.none;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}
