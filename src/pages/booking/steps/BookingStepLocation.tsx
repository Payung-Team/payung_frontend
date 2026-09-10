import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../../context/BookingContext';
import { GET_USER, GET_LATEST_BOOKING_ADDRESS } from '../../../graphql/queries';
import ThaiAddressSelector from '../../../components/ui/ThaiAddressSelector';
import MapPicker from '../MapPicker';

// ที่อยู่ที่เติมให้อัตโนมัติได้ — มาจากการจองครั้งล่าสุด ถ้ายังไม่เคยจองก็ใช้ที่อยู่ในโปรไฟล์
// (ที่กรอกไว้ตอน onboard) และถ้าไม่มีทั้งสองอย่างจะไม่แสดงปุ่มนี้เลย
interface PrefillAddress {
  source: 'booking' | 'profile';
  address: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

interface MeQueryResult {
  me?: {
    address?: string | null;
    province?: string | null;
    district?: string | null;
    subDistrict?: string | null;
    postalCode?: string | null;
  } | null;
}

interface LatestBookingResult {
  myBookingHistory?: {
    data?: {
      id: string;
      locationAddress?: string | null;
      locationLat?: number | null;
      locationLng?: number | null;
    }[];
  } | null;
}

export default function BookingStepLocation() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();

  const serviceLocation = bookingDraft?.serviceLocation || [];
  const needHome = serviceLocation.includes('at_home');
  const needOutside = serviceLocation.includes('accompany_outside');

  // At home address
  const [province, setProvince] = useState(bookingDraft?.locationDetails?.province || '');
  const [district, setDistrict] = useState(bookingDraft?.locationDetails?.district || '');
  const [subDistrict, setSubDistrict] = useState(
    bookingDraft?.locationDetails?.subDistrict || '',
  );
  const [postalCode, setPostalCode] = useState(
    bookingDraft?.locationDetails?.postalCode || '',
  );
  const [address, setAddress] = useState(
    bookingDraft?.locationDetails?.at_home?.address || '',
  );
  const [latA, setLatA] = useState(
    bookingDraft?.locationDetails?.at_home?.lat || 13.736717,
  );
  const [lngA, setLngA] = useState(
    bookingDraft?.locationDetails?.at_home?.lng || 100.560543,
  );

  // Accompany outside
  const [hospitalName, setHospitalName] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.hospitalName || '',
  );
  const [meetingPoint, setMeetingPoint] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.meetingPoint || '',
  );
  const [latB, setLatB] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.lat || 13.75633,
  );
  const [lngB, setLngB] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.lng || 100.501765,
  );

  const [error, setError] = useState<Record<string, string>>({});

  // Auto-save
  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      locationDetails: {
        province,
        district,
        subDistrict,
        postalCode,
        at_home: needHome ? { address, lat: latA, lng: lngA } : undefined,
        accompany_outside: needOutside
          ? { hospitalName, meetingPoint, lat: latB, lng: lngB }
          : undefined,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    province,
    district,
    subDistrict,
    postalCode,
    address,
    latA,
    lngA,
    hospitalName,
    meetingPoint,
    latB,
    lngB,
  ]);

  // แหล่งที่อยู่สำหรับเติมอัตโนมัติ — จองครั้งล่าสุดมาก่อน แล้วค่อยเป็นที่อยู่ในโปรไฟล์
  const { data: meData } = useQuery<MeQueryResult>(GET_USER, { fetchPolicy: 'cache-first' });
  const { data: latestBookingData } = useQuery<LatestBookingResult>(GET_LATEST_BOOKING_ADDRESS, {
    fetchPolicy: 'cache-and-network',
    skip: !needHome,
  });

  const prefill = useMemo<PrefillAddress | null>(() => {
    const latest = latestBookingData?.myBookingHistory?.data?.[0];
    if (latest?.locationAddress?.trim()) {
      return {
        source: 'booking',
        address: latest.locationAddress,
        lat: latest.locationLat ?? undefined,
        lng: latest.locationLng ?? undefined,
      };
    }
    const me = meData?.me;
    if (me?.address?.trim()) {
      return {
        source: 'profile',
        address: me.address,
        province: me.province ?? undefined,
        district: me.district ?? undefined,
        subDistrict: me.subDistrict ?? undefined,
        postalCode: me.postalCode ?? undefined,
      };
    }
    return null;
  }, [latestBookingData, meData]);

  const handleUseSavedAddress = () => {
    if (!prefill) return;
    setAddress(prefill.address);
    if (prefill.province) setProvince(prefill.province);
    if (prefill.district) setDistrict(prefill.district);
    if (prefill.subDistrict) setSubDistrict(prefill.subDistrict);
    if (prefill.postalCode) setPostalCode(prefill.postalCode);
    if (prefill.lat != null) setLatA(prefill.lat);
    if (prefill.lng != null) setLngA(prefill.lng);
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (needHome) {
      if (!province) errs.province = 'กรุณาเลือกจังหวัด';
      if (!district) errs.district = 'กรุณาเลือกอำเภอ/เขต';
      if (!address.trim()) errs.address = 'กรุณากรอกที่อยู่';
    }
    if (needOutside) {
      if (!hospitalName.trim()) errs.hospitalName = 'กรุณาระบุสถานที่ปลายทาง';
      if (!meetingPoint.trim()) errs.meetingPoint = 'กรุณาระบุจุดนัดพบ';
    }
    setError(errs);
    if (Object.keys(errs).length === 0) goToStep(4);
  };

  // Report missing required fields so the sticky "Next" button can disable itself
  useEffect(() => {
    const missing: string[] = [];
    if (needHome) {
      if (!province) missing.push('จังหวัด');
      if (!district) missing.push('อำเภอ/เขต');
      if (!address.trim()) missing.push('ที่อยู่');
    }
    if (needOutside) {
      if (!hospitalName.trim()) missing.push('สถานที่ปลายทาง');
      if (!meetingPoint.trim()) missing.push('จุดนัดพบ');
    }
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [
    needHome,
    needOutside,
    province,
    district,
    address,
    hospitalName,
    meetingPoint,
    setStepMissing,
  ]);

  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  return (
    <div className="space-y-4">
      {/* At home address */}
      {needHome && (
        <section className="bg-white p-6 rounded-2xl border border-gray-100 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">ที่อยู่ที่ให้ผู้ดูแลไป</h2>
            <p className="text-sm text-[#8A8C8E] mt-1 leading-relaxed">
              เลือกจังหวัด อำเภอ ตำบล ที่จะให้ผู้ดูแลเดินทางไป
            </p>
          </div>

          {/* Hero: เติมที่อยู่จากการจองล่าสุด หรือจากโปรไฟล์ — ไม่มีข้อมูลก็ไม่ต้องแสดง */}
          {prefill && (
            <button
              type="button"
              onClick={handleUseSavedAddress}
              className="w-full flex items-center gap-3 p-4 bg-[#F0FAF4] border border-[#52B69A]/40 rounded-xl text-left hover:bg-[#E6F5ED] transition cursor-pointer"
            >
              <span className="material-icons text-[#52B69A]">bookmark</span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-[#1B5C48]">
                  {prefill.source === 'booking'
                    ? 'ใช้ที่อยู่จากประวัติการจองครั้งล่าสุด'
                    : 'ใช้ที่อยู่จากประวัติส่วนตัว'}
                </span>
                <span className="block text-xs text-[#575859] mt-0.5 leading-snug">
                  {prefill.address}
                </span>
              </span>
              <span className="material-icons text-[#52B69A]">arrow_forward</span>
            </button>
          )}

          {/* Thai address selector */}
          <ThaiAddressSelector
            provinceValue={province}
            amphoeValue={district}
            districtValue={subDistrict}
            onProvinceChange={setProvince}
            onAmphoeChange={setDistrict}
            onDistrictChange={setSubDistrict}
            onZipcodeChange={setPostalCode}
            error={{ province: error.province, amphoe: error.district }}
          />

          {/* Address textarea */}
          <div>
            <label className="block text-sm font-bold text-[#575859] mb-2">
              บ้านเลขที่ / ซอย / ถนน
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="เช่น 123/45 ซอย 5 ถนนสุขุมวิท"
              className={`w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 resize-none ${
                error.address
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            {error.address && (
              <p className="mt-1 text-xs font-semibold text-red-600">{error.address}</p>
            )}
          </div>

          {/* Map */}
          <div>
            <p className="text-xs font-semibold text-[#8A8C8E] mb-2">
              ระบุพิกัดสถานที่ในแผนที่ (ลากหมุดสีเขียวเพื่อระบุตำแหน่งที่แน่นอน)
            </p>
            <MapPicker
              latA={latA}
              lngA={lngA}
              onChangeA={(newLat, newLng) => {
                setLatA(newLat);
                setLngA(newLng);
              }}
              latB={latB}
              lngB={lngB}
              onChangeB={(newLat, newLng) => {
                setLatB(newLat);
                setLngB(newLng);
              }}
              showPinB={needOutside}
            />
          </div>
        </section>
      )}

      {/* Accompany outside */}
      {needOutside && (
        <section className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">พาไปที่ไหน</h2>
            <p className="text-sm text-[#8A8C8E] mt-1">โรงพยาบาล คลินิก หรือสถานที่ปลายทาง</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#575859] mb-2">
              สถานที่ปลายทาง
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 material-icons text-[#AAB2BA] text-base pointer-events-none">
                local_hospital
              </span>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="เช่น รพ.รามาธิบดี, คลินิกเวชกรรม"
                className={`w-full p-3 pl-10 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                  error.hospitalName
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-[#E0E2E5] focus:ring-[#52B69A]'
                }`}
              />
            </div>
            {error.hospitalName && (
              <p className="mt-1 text-xs font-semibold text-red-600">{error.hospitalName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-[#575859] mb-2">
              จุดนัดพบ (ให้ผู้ดูแลหาคุณเจอ)
            </label>
            <input
              type="text"
              value={meetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              placeholder="เช่น ประตูหน้าอาคาร A ชั้น 1"
              className={`w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                error.meetingPoint
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            {error.meetingPoint && (
              <p className="mt-1 text-xs font-semibold text-red-600">{error.meetingPoint}</p>
            )}
          </div>

          {!needHome && (
            <div>
              <p className="text-xs font-semibold text-[#8A8C8E] mb-2">
                ระบุพิกัดจุดนัดพบในแผนที่
              </p>
              <MapPicker
                latA={latA}
                lngA={lngA}
                onChangeA={() => {}}
                latB={latB}
                lngB={lngB}
                onChangeB={(newLat, newLng) => {
                  setLatB(newLat);
                  setLngB(newLng);
                }}
                showPinB={true}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
