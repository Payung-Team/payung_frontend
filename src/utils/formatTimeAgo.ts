export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'วันนี้';
  if (days < 7) return `${days} วันก่อน`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} สัปดาห์ก่อน`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} เดือนก่อน`;
  return `${Math.floor(months / 12)} ปีก่อน`;
}
