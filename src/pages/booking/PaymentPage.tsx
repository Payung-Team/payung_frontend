import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import type { ConfirmedBooking, BookingRequest } from '../../context/BookingContext';
import { GET_MY_BOOKING, CREATE_PAYMENT, GET_PAYMENT_BY_BOOKING } from '../../graphql/queries';
import { mapGqlStatus } from '../../utils/bookingStatus';
import { loadOmiseJs } from '../../lib/omise-loader';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

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

const SERVICE_LOCATION_LABELS: Record<string, string> = {
  at_home: 'ที่บ้านและนอกสถานที่',
  accompany_outside: 'นอกสถานที่',
};

function computeEndTime(startTime: string, durationHours: number): string {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const endMin = sh * 60 + sm + Math.round(durationHours * 60);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  } catch { return ''; }
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    // Thai messages from our backend — use as-is
    if (/[฀-๿]/.test(msg)) return msg;
    // Common Omise English codes
    if (msg.includes('insufficient_fund'))    return 'ยอดเงินในบัตรไม่เพียงพอ';
    if (msg.includes('expired_card'))         return 'บัตรเครดิตหมดอายุ';
    if (msg.includes('invalid_security_code') || msg.includes('security code')) return 'รหัส CVV ไม่ถูกต้อง';
    if (msg.includes('stolen_or_lost'))       return 'บัตรถูกแจ้งว่าหายหรือถูกขโมย';
    if (msg.includes('failed_fraud_check'))   return 'การชำระเงินถูกปฏิเสธด้วยเหตุผลด้านความปลอดภัย';
    if (msg.includes('card_declined'))        return 'บัตรถูกปฏิเสธ กรุณาติดต่อธนาคาร';
    return msg;
  }
  return 'เกิดข้อผิดพลาดที่ไม่รู้จัก กรุณาลองใหม่';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGqlBooking(api: any): ConfirmedBooking {
  const idSuffix = String(api.id).toUpperCase().replaceAll('-', '').slice(-6);
  const startTime: string = api.startTime ?? '';
  const durationHours: number = api.durationHours ?? 0;
  const endTime = startTime && durationHours ? computeEndTime(startTime, durationHours) : '';
  const serviceLocations: ('at_home' | 'accompany_outside')[] = (api.serviceLocations ?? []).filter(
    (l: string) => l === 'at_home' || l === 'accompany_outside',
  );
  const tasks: { id: string; name: string }[] = (api.tasks ?? []).map((name: string) => ({ id: name, name }));

  const resolvedPatientName: string | undefined = api.patientName || api.careRecipientName || undefined;

  const draft: BookingRequest = {
    serviceTypes: api.serviceType ? [api.serviceType] : [],
    serviceLocation: serviceLocations,
    dateTime: { date: api.bookingDate ?? '', slot: api.timeSlot ?? '', startTime, endTime, duration: durationHours },
    locationDetails: { at_home: { address: api.locationAddress ?? '', lat: 0, lng: 0 } },
    jobDetails: { tasks, notes: api.notes ?? '' },
    estimatedCost: (() => {
      const base = api.estimatedCost ?? 0;
      const fee = Math.round(base * 0.1);
      return { hourlyRate: api.caregiver?.hourlyRate ?? 0, hours: durationHours, platformFee: fee, total: base + fee };
    })(),
    recipient: resolvedPatientName
      ? { type: 'member', patientDetails: { name: resolvedPatientName, age: 0 } }
      : { type: 'self' },
    contactPerson: (api.dayOfContactName || api.dayOfContactPhone || api.dayOfContactRelationship)
      ? {
          name: api.dayOfContactName ?? '',
          phone: api.dayOfContactPhone ?? '',
          relationship: api.dayOfContactRelationship ?? '',
        }
      : undefined,
  };

  return {
    id: api.id,
    ref: `REF-${idSuffix}`,
    caregiverId: api.caregiver?.id ?? '',
    caregiverName: api.caregiver?.fullName ?? '(รอจับคู่)',
    caregiverAvatarUrl: api.caregiver?.avatarUrl ?? null,
    caregiverHourlyRate: api.caregiver?.hourlyRate ?? 0,
    confirmedAt: api.createdAt ?? new Date().toISOString(),
    status: mapGqlStatus(api.status ?? ''),
    draft,
  };
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

type CardType = 'visa' | 'mastercard' | 'jcb' | 'amex' | null;

function detectCardType(number: string): CardType {
  const d = number.replace(/\s/g, '');
  if (!d) return null;
  if (d[0] === '4') return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^35/.test(d)) return 'jcb';
  return null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function OmiseLogo({ color = '#1A56DB', size = 'md' }: { color?: string; size?: 'sm' | 'md' }) {
  const fontSize = size === 'sm' ? 6.28 : 7.4;
  const dotSize = size === 'sm' ? 9 : 11;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <div style={{ width: dotSize, height: dotSize, background: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: Math.round(dotSize * 0.5), height: Math.round(dotSize * 0.5), background: '#FFFFFF', borderRadius: '50%' }} />
      </div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize, color, lineHeight: 1 }}>omise</span>
    </div>
  );
}

function MastercardIcon({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: size + 4, height: size }}>
      <div style={{ width: size, height: size, background: '#EB001B', opacity: 0.85, borderRadius: '50%', position: 'absolute', left: 0 }} />
      <div style={{ width: size, height: size, background: '#F79E1B', opacity: 0.85, borderRadius: '50%', position: 'absolute', left: size * 0.35 }} />
    </div>
  );
}

function CardTypeOverlay({ cardType }: { cardType: CardType }) {
  if (cardType === 'visa') {
    return (
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 13, color: '#1A1F71', letterSpacing: '-0.5px', lineHeight: 1 }}>
        VISA
      </span>
    );
  }
  if (cardType === 'mastercard') return <MastercardIcon size={22} />;
  if (cardType === 'jcb') {
    return (
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 12, color: '#003087', lineHeight: 1 }}>
        JCB
      </span>
    );
  }
  if (cardType === 'amex') {
    return (
      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: 11, color: '#006FCF', lineHeight: 1 }}>
        AMEX
      </span>
    );
  }
  return <span className="material-icons" style={{ fontSize: 18, color: '#D1D5DB' }}>credit_card</span>;
}

type PaymentMethod = 'card' | 'promptpay' | 'banking';

function PaymentMethodTab({ icon, label, active, onClick }: {
  icon: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, padding: '10px 4px', borderRadius: 10, border: active ? '0.8px solid #3B82F6' : 'none',
        background: active ? 'rgba(255,255,255,1)' : 'transparent',
        boxShadow: active ? '0px 1px 4px rgba(0,0,0,0.03)' : 'none',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <span className="material-icons" style={{ fontSize: 18, color: active ? '#3B82F6' : '#8A8C8E' }}>{icon}</span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: active ? '#3B82F6' : '#8A8C8E' }}>
        {label}
      </span>
    </button>
  );
}

function FieldLabel({ children, helper }: { children: React.ReactNode; helper?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859' }}>
        {children}
      </span>
      {helper && (
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 9, fontWeight: 700, color: '#8A8C8E' }}>{helper}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, boxSizing: 'border-box',
  padding: '0 14px', background: '#FFFFFF',
  border: '0.8px solid #E0E2E5', borderRadius: 8,
  fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, color: '#1A1A1A',
  outline: 'none',
};

function SummaryRow({ icon, label, value, bold = false }: { icon: string; label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        <span className="material-icons" style={{ fontSize: 14, color: '#B0B3B8', lineHeight: '21px' }}>{icon}</span>
      </div>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', width: 72, flexShrink: 0, lineHeight: '17px' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: bold ? 600 : 400, color: bold ? '#1A1A1A' : '#1A1A1A', lineHeight: '17px', flex: 1 }}>
        {value || '—'}
      </span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const stateBooking = location.state?.booking as ConfirmedBooking | undefined;

  const { data, loading } = useQuery(GET_MY_BOOKING, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const booking = useMemo<ConfirmedBooking | undefined>(() => {
    const gql = data as { myBooking?: Record<string, unknown> } | undefined;
    if (gql?.myBooking) return mapGqlBooking(gql.myBooking);
    return stateBooking;
  }, [data, stateBooking]);

  const [createPayment] = useMutation(CREATE_PAYMENT);

  const [method, setMethod] = useState<PaymentMethod>('card');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string | null>(null);
  const [promptPayActive, setPromptPayActive] = useState(false);

  // Poll every 3 s after PromptPay QR is generated — paymentByBooking actively
  // re-checks the charge with Omise and self-heals if the webhook never arrives
  // (e.g. Omise can't reach a local/dev backend), unlike paymentHistory which
  // only reads back rows already written to the DB.
  const { data: pollData } = useQuery(GET_PAYMENT_BY_BOOKING, {
    variables: { bookingId: id },
    skip: !promptPayActive || !id,
    pollInterval: 3000,
    fetchPolicy: 'network-only',
  });

  // Navigate to success as soon as the payment is confirmed
  useEffect(() => {
    const payment = (pollData as { paymentByBooking?: { paymentStatus?: string } } | undefined)?.paymentByBooking;
    if (payment?.paymentStatus === 'captured' && booking) {
      navigate('/booking/success', {
        state: { ref: booking.id, caregiverName: booking.caregiverName, paid: true },
      });
    }
  }, [pollData, booking, navigate]);

  // Restore existing pending PromptPay payment on mount/refresh
  useEffect(() => {
    const payment = (data as { myBooking?: { payment?: { id: string; paymentMethod: string; paymentStatus: string; qrCodeUrl?: string } } } | undefined)?.myBooking?.payment;
    if (payment) {
      if (payment.paymentMethod === 'promptpay' && payment.paymentStatus === 'pending') {
        setPromptPayActive(true);
        if (payment.qrCodeUrl) {
          setPromptPayQrUrl(payment.qrCodeUrl);
        }
      }
    }
  }, [data]);

  const cardType = detectCardType(cardNumber);

  if (loading && !booking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 40, color: '#52B69A', animation: 'spin 1s linear infinite' }}>refresh</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F6FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, color: '#8A8C8E' }}>ไม่พบข้อมูลการจอง</p>
      </div>
    );
  }

  const dt = booking.draft.dateTime;
  const est = booking.draft.estimatedCost;
  const svcTypes = booking.draft.serviceTypes ?? [];
  const svcTypeLabel = svcTypes.map((t) => SERVICE_TYPE_LABELS[t] ?? t).join(', ') || '—';
  const dateStr = dt?.date ? formatThaiDate(dt.date) : '—';
  const timeStr = dt?.startTime && dt?.endTime ? `${dt.startTime}–${dt.endTime} น.` : (dt?.slot ?? '—');
  const durationStr = dt?.duration ? `${dt.duration} ชั่วโมง` : '—';
  const locationStr = booking.draft.locationDetails?.at_home?.address
    || booking.draft.locationDetails?.accompany_outside?.hospitalName
    || '—';
  const svcLocationLabels = (booking.draft.serviceLocation ?? [])
    .map((l) => SERVICE_LOCATION_LABELS[l] ?? l).join(', ') || '—';
  const recipientName = booking.draft.recipient?.patientDetails?.name ?? 'ตัวเอง';
  const recipientAge = booking.draft.recipient?.patientDetails?.age;
  const recipientGender = booking.draft.recipient?.patientDetails?.gender;
  const conditions = booking.draft.recipient?.patientDetails?.conditions ?? [];
  const allergies = booking.draft.recipient?.patientDetails?.allergies;
  const tasks = booking.draft.jobDetails?.tasks ?? [];
  const contactPerson = booking.draft.contactPerson;

  const hourlyRate = est?.hourlyRate ?? booking.caregiverHourlyRate ?? 0;
  const hours = est?.hours ?? dt?.duration ?? 0;
  const serviceCost = hourlyRate * hours;
  const platformFee = est?.platformFee ?? Math.round(serviceCost * 0.1);
  const total = est?.total ?? serviceCost + platformFee;

  const cgInitial = booking.caregiverName?.charAt(0) ?? '?';

  const handleSubmit = async () => {
    if (isSubmitting || !booking || !id) return;
    if (method === 'promptpay' && promptPayQrUrl) return; // already waiting

    if (method === 'card') {
      if (!email.trim())                              { setPayError('กรุณากรอกอีเมลรับใบเสร็จ'); return; }
      if (cardNumber.replace(/\s/g, '').length < 16) { setPayError('กรุณากรอกหมายเลขบัตรให้ครบ 16 หลัก'); return; }
      if (!cardName.trim())                           { setPayError('กรุณากรอกชื่อบนบัตร'); return; }
      if (expiry.length < 5)                          { setPayError('กรุณากรอกวันหมดอายุในรูปแบบ MM/YY'); return; }
      if (cvv.length < 3)                             { setPayError('กรุณากรอก CVV / CVC'); return; }
    }

    setIsSubmitting(true);
    setPayError(null);

    try {
      if (method === 'card') {
        // Step 1: Load Omise.js SDK
        await loadOmiseJs();

        // Step 2: Tokenize — raw card data never reaches our server
        const omiseToken = await new Promise<string>((resolve, reject) => {
          const [mm, yy] = expiry.split('/');
          window.Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY as string);
          window.Omise.createToken(
            'card',
            {
              number:            cardNumber.replace(/\s/g, ''),
              name:              cardName,
              expiration_month:  parseInt(mm, 10),
              expiration_year:   2000 + parseInt(yy, 10),
              security_code:     cvv,
            },
            (statusCode, response) => {
              if (statusCode === 200) resolve(response.id);
              else reject(new Error(response.message ?? 'ข้อมูลบัตรไม่ถูกต้อง'));
            },
          );
        });

        // Step 3: Backend creates authorized hold
        const result = await createPayment({
          variables: { input: { bookingId: id, paymentMethod: 'credit_card', omiseToken } },
        });
        const mutationData = result.data as { createPayment?: { id: string } } | null;
        if (mutationData?.createPayment) {
          navigate('/booking/success', {
            state: { ref: booking.id, caregiverName: booking.caregiverName, paid: true },
          });
        }
      } else if (method === 'promptpay') {
        const result = await createPayment({
          variables: { input: { bookingId: id, paymentMethod: 'promptpay' } },
        });
        const mutationData = result.data as { createPayment?: { id?: string; qrCodeUrl?: string } } | null;
        const newPaymentId = mutationData?.createPayment?.id;
        const qrCodeUrl = mutationData?.createPayment?.qrCodeUrl;
        if (newPaymentId) {
          if (qrCodeUrl) {
            setPromptPayQrUrl(qrCodeUrl);
          }
          setPromptPayActive(true); // starts polling paymentByBooking
        } else {
          setPayError('ไม่ได้รับข้อมูลการชำระเงิน กรุณาลองใหม่');
        }
      }
    } catch (err: unknown) {
      setPayError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F6FAF9' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* Top banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', marginBottom: 20,
          background: '#EFF6FF', border: '0.8px solid #BFDBFE',
          boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 16,
        }}>
          <span className="material-icons" style={{ fontSize: 20, color: '#3B82F6', flexShrink: 0 }}>credit_card</span>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1D4ED8' }}>
            ผู้ดูแลตอบรับคำขอแล้ว – กรุณาชำระเงินเพื่อยืนยันการจอง
          </span>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Left Panel: Payment Form ── */}
          <div style={{
            flex: '1 1 580px', minWidth: 0,
            background: '#FFFFFF', border: '0.8px solid #E0E2E5',
            boxShadow: '0px 4px 16px rgba(0,0,0,0.05)', borderRadius: 20,
            padding: 32,
          }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => navigate(`/bookings/${booking.id}`, { state: { booking } })}
                style={{ width: 32, height: 32, border: '0.8px solid #E0E2E5', borderRadius: 16, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}
              >
                <span className="material-icons" style={{ fontSize: 18, color: '#1A1A1A' }}>arrow_back</span>
              </button>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                ชำระเงิน
              </span>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 14, color: '#6B7280' }}>lock</span>
                <OmiseLogo color="#1A56DB" size="md" />
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 4, display: 'flex', gap: 2, marginBottom: 24 }}>
              <PaymentMethodTab icon="credit_card" label="บัตร" active={method === 'card'} onClick={() => setMethod('card')} />
              <PaymentMethodTab icon="qr_code_2" label="PromptPay" active={method === 'promptpay'} onClick={() => setMethod('promptpay')} />
              <PaymentMethodTab icon="account_balance" label="Internet Banking" active={method === 'banking'} onClick={() => setMethod('banking')} />
            </div>

            {/* Card form */}
            {method === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Section header: card info + brands */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4, borderBottom: 'none' }}>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859' }}>ข้อมูลบัตร</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(['visa', 'mastercard', 'jcb'] as const).map((type) => {
                      const active = cardType === null || cardType === type;
                      return (
                        <div key={type} style={{ border: `0.8px solid ${active ? '#E5E7EB' : '#F0F1F3'}`, borderRadius: 4, padding: '0 6px', height: 20, display: 'flex', alignItems: 'center', opacity: active ? 1 : 0.3, transition: 'opacity 0.2s' }}>
                          {type === 'visa'       && <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 9, color: '#1A1F71' }}>VISA</span>}
                          {type === 'mastercard' && <MastercardIcon size={10} />}
                          {type === 'jcb'        && <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 8, color: '#003087' }}>JCB</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <FieldLabel>อีเมลรับใบเสร็จ</FieldLabel>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Card number */}
                <div>
                  <FieldLabel>หมายเลขบัตร</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                      style={{ ...inputStyle, fontFamily: "'Inter', sans-serif", letterSpacing: '0.7px', paddingRight: 48 }}
                    />
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                      <CardTypeOverlay cardType={cardType} />
                    </div>
                  </div>
                </div>

                {/* Card name */}
                <div>
                  <FieldLabel>ชื่อบนบัตร</FieldLabel>
                  <input
                    type="text"
                    placeholder="เช่น SOMSRI WONGDEE"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                  />
                </div>

                {/* Expiry + CVV */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FieldLabel>วันหมดอายุ</FieldLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      style={{ ...inputStyle, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <FieldLabel helper="?">CVV / CVC</FieldLabel>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      style={{ ...inputStyle, fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                </div>

                {/* Save card */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 4, cursor: 'pointer' }}>
                  <div style={{ paddingTop: 2 }}>
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#3B82F6' }}
                    />
                  </div>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 500, color: '#575859', lineHeight: '20px' }}>
                    บันทึกบัตรนี้สำหรับการชำระครั้งต่อไป (เข้ารหัสโดย Omise)
                  </span>
                </label>
              </div>
            )}

            {/* PromptPay */}
            {method === 'promptpay' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 16 }}>
                {promptPayQrUrl ? (
                  <>
                    <img
                      src={promptPayQrUrl}
                      alt="PromptPay QR Code"
                      style={{ width: 200, height: 200, border: '0.8px solid #E0E2E5', borderRadius: 12, display: 'block' }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', margin: '0 0 4px' }}>ยอดที่ต้องชำระ</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: '#3B82F6', margin: 0 }}>
                        ฿{total.toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FAF4', border: '0.8px solid #C6E8D6', borderRadius: 10, padding: '10px 16px' }}>
                      <span className="material-icons" style={{ fontSize: 16, color: '#52B69A', animation: 'spin 1.5s linear infinite' }}>refresh</span>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#1A7A4A' }}>
                        กำลังรอการยืนยันการชำระเงิน...
                      </span>
                    </div>
                    <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', textAlign: 'center', margin: 0 }}>
                      สแกน QR Code ด้วยแอปธนาคารของท่าน<br />
                      ระบบจะยืนยันอัตโนมัติเมื่อชำระเสร็จ
                    </p>
                  </>
                ) : (
                  <>
                    <span className="material-icons" style={{ fontSize: 56, color: '#E5E7EB', display: 'block' }}>qr_code_2</span>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>
                        ชำระผ่าน PromptPay
                      </p>
                      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', margin: 0 }}>
                        กดปุ่มด้านล่างเพื่อสร้าง QR Code แล้วสแกนด้วยแอปธนาคาร
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Internet Banking placeholder */}
            {method === 'banking' && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A8C8E' }}>
                <span className="material-icons" style={{ fontSize: 48, color: '#E5E7EB', display: 'block', marginBottom: 12 }}>account_balance</span>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, margin: 0 }}>Internet Banking</p>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, margin: '6px 0 0', color: '#B0B3B8' }}>(ฟีเจอร์นี้จะเปิดใช้งานเร็วๆ นี้)</p>
              </div>
            )}

            {/* Error banner */}
            {payError && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 14px', marginTop: 8, marginBottom: 4,
                background: '#FEF2F2', border: '0.8px solid #FECACA', borderRadius: 10,
              }}>
                <span className="material-icons" style={{ fontSize: 16, color: '#DC2626', flexShrink: 0, marginTop: 1 }}>error_outline</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#DC2626', lineHeight: '20px' }}>
                  {payError}
                </span>
              </div>
            )}

            {/* Submit section */}
            <div style={{ borderTop: '0.8px solid #F0F1F3', paddingTop: 16, marginTop: 16 }}>
              {!(method === 'promptpay' && promptPayQrUrl) && method !== 'banking' && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    width: '100%', height: 50,
                    background: isSubmitting ? '#93C5FD' : '#3B82F6',
                    boxShadow: '0px 4px 14px rgba(26,86,219,0.35)',
                    borderRadius: 12, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: isSubmitting ? 'wait' : 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 18, color: '#FFFFFF' }}>
                    {method === 'promptpay' ? 'qr_code_2' : 'lock'}
                  </span>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                    {isSubmitting
                      ? 'กำลังดำเนินการ...'
                      : method === 'promptpay'
                        ? `สร้าง QR Code ฿${total.toLocaleString()}`
                        : `ชำระเงิน ฿${total.toLocaleString()}`}
                  </span>
                </button>
              )}

              {/* Security footer */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 12 }}>
                <span className="material-icons" style={{ fontSize: 13, color: '#9CA3AF' }}>lock</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E' }}>
                  ข้อมูลบัตรถูกเข้ารหัส 256-bit SSL ·
                </span>
                <OmiseLogo color="#9CA3AF" size="sm" />
              </div>

              <p style={{ textAlign: 'center', fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: '6px 0 0' }}>
                ระบบจะส่ง OTP ยืนยันตัวตน (3D Secure) ผ่านแอปธนาคาร
              </p>
            </div>
          </div>

          {/* ── Right Panel: Booking Summary ── */}
          <div style={{
            flex: '0 0 460px', minWidth: 300,
            background: '#FFFFFF', border: '0.8px solid #E0E2E5',
            boxShadow: '0px 4px 16px rgba(0,0,0,0.05)', borderRadius: 20,
            overflow: 'hidden',
          }}>

            {/* Summary header */}
            <div style={{ background: '#F0FAF4', borderBottom: '0.8px solid #C6E8D6', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', letterSpacing: '0.7px', textTransform: 'uppercase' }}>
                  สรุปรายการจอง
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#8A8C8E', background: '#FFFFFF', border: '0.8px solid #E0E2E5', boxShadow: '0px 1px 4px rgba(0,0,0,0.03)', borderRadius: 4, padding: '3px 9px' }}>
                  {booking.ref}
                </span>
              </div>

              {/* Caregiver row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                  {booking.caregiverAvatarUrl ? (
                    <img src={booking.caregiverAvatarUrl} alt={booking.caregiverName} style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: '#009688', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>{cgInitial}</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, borderRadius: 8, background: '#10B981', border: '1.6px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 10, color: '#FFFFFF' }}>check</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
                    {booking.caregiverName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {booking.caregiverHourlyRate > 0 && (
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#8A8C8E' }}>
                        ฿{booking.caregiverHourlyRate.toLocaleString()}/ชม.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Patient section */}
            <div style={{ padding: '16px 24px', borderBottom: '0.8px solid #F0F1F3' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', letterSpacing: '0.7px', textTransform: 'uppercase', margin: '0 0 12px' }}>
                ผู้รับบริการ
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: 20, color: '#3B82F6' }}>elderly</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
                    {recipientName}
                  </p>
                  {(recipientAge || recipientGender) && (
                    <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>
                      {[recipientAge && `${recipientAge} ปี`, recipientGender].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Medical info */}
              {(conditions.length > 0 || allergies) && (
                <div style={{ marginTop: 12, background: '#FFF3E0', border: '0.8px solid #FFC570', borderRadius: 8, padding: '10px 12px' }}>
                  {conditions.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: allergies ? 6 : 0 }}>
                      <span className="material-icons" style={{ fontSize: 13, color: '#F08C00', marginTop: 1, flexShrink: 0 }}>monitor_heart</span>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#F08C00', lineHeight: '15px' }}>
                        โรคประจำตัว: {conditions.join(', ')}
                      </span>
                    </div>
                  )}
                  {allergies && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, borderTop: conditions.length > 0 ? '0.8px dashed #FFC570' : 'none', paddingTop: conditions.length > 0 ? 6 : 0 }}>
                      <span className="material-icons" style={{ fontSize: 13, color: '#DC2626', marginTop: 1, flexShrink: 0 }}>warning</span>
                      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#DC2626', lineHeight: '15px' }}>
                        แพ้ยา/อาหาร: {allergies}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact person */}
            {contactPerson?.name && (
              <div style={{ padding: '16px 24px', borderBottom: '0.8px solid #F0F1F3' }}>
                <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', letterSpacing: '0.7px', textTransform: 'uppercase', margin: '0 0 12px' }}>
                  ผู้ติดต่อในวันนัดหมาย
                </p>
                <SummaryRow icon="person" label="ชื่อ" value={contactPerson.name} bold />
                <SummaryRow icon="phone" label="โทรศัพท์" value={contactPerson.phone} bold />
                {contactPerson.relationship && (
                  <SummaryRow icon="people" label="ความสัมพันธ์" value={contactPerson.relationship} bold />
                )}
              </div>
            )}

            {/* Appointment details */}
            <div style={{ padding: '16px 24px', borderBottom: '0.8px solid #F0F1F3' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', letterSpacing: '0.7px', textTransform: 'uppercase', margin: '0 0 12px' }}>
                รายละเอียดนัดหมาย
              </p>
              <SummaryRow icon="medical_services" label="ประเภทบริการ" value={svcTypeLabel} bold />
              <SummaryRow icon="calendar_today" label="วันที่" value={dateStr} bold />
              <SummaryRow icon="schedule" label="เวลา" value={timeStr} bold />
              <SummaryRow icon="timelapse" label="ระยะเวลา" value={durationStr} bold />
              <SummaryRow icon="location_on" label="สถานที่" value={locationStr} bold />
              <SummaryRow icon="directions" label="รูปแบบ" value={svcLocationLabels} bold />

              {/* Care plan tags */}
              {tasks.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.8px solid #F0F1F3' }}>
                  <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#8A8C8E', letterSpacing: '0.55px', textTransform: 'uppercase', margin: '0 0 6px' }}>
                    แผนงานดูแล
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tasks.map((t) => (
                      <span key={t.id} style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#575859', background: '#F0F1F3', borderRadius: 9999, padding: '2px 8px', lineHeight: '15px' }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 10, fontWeight: 700, color: '#52B69A', letterSpacing: '0.7px', textTransform: 'uppercase', margin: '0 0 12px' }}>
                สรุปยอดชำระ
              </p>
              {hourlyRate > 0 && hours > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E' }}>
                    ค่าบริการผู้ดูแล (฿{hourlyRate.toLocaleString()} × {hours} ชม.)
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                    ฿{serviceCost.toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 12, borderBottom: '0.8px solid #F0F1F3' }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E' }}>
                  ค่าธรรมเนียมแพลตฟอร์ม (10%)
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                  ฿{platformFee.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                  รวมทั้งสิ้น
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: '#3B82F6' }}>
                  ฿{total.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
