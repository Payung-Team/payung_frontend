const SERVICE_TYPE_LABELS: Record<string, string> = {
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  physiotherapy: 'กายภาพบำบัด',
  medication: 'ช่วยจัดการยา',
  companion: 'เป็นเพื่อน/พูดคุย',
  nursing: 'พยาบาลวิชาชีพ',
  basic_care: 'ดูแลเบื้องต้น',
  elderly_care: 'ดูแลผู้สูงอายุ',
  home_health: 'สุขภาพที่บ้าน',
  patient_transport: 'รับส่งผู้ป่วย',
  post_surgery: 'หลังผ่าตัด',
};

/** Thai label for a backend service type code; falls back to the raw value for unknown codes. */
export function serviceTypeLabel(serviceType: string | null | undefined): string {
  if (!serviceType) return '—';
  return SERVICE_TYPE_LABELS[serviceType] ?? serviceType;
}
