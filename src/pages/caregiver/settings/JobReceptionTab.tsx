import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GET_CAREGIVER_PROFILE, SET_CAREGIVER_SEARCHABLE } from '../../../graphql/queries';
import { Icon } from '../../../components/ui/Icon';
import { useToast } from '../../../hooks/useToast';
import ThailandAddressSimple from 'thailand-address-simple';

type JobReceptionChecklistKey = 'profileVisible' | 'jobAlerts' | 'pauseAnytime';
type SlotType = 'morning' | 'afternoon' | 'evening';
type WeeklyAvailability = Record<number, Record<SlotType, boolean>>; // 0 = Mon, ..., 6 = Sun

interface ServiceFormats {
  homeCare: boolean;
  travelCare: boolean;
}

const LANGUAGES_LIST = [
  { id: 'thai', label: 'ภาษาไทย', flag: '🇹🇭', desc: 'ภาษาหลัก' },
  { id: 'english', label: 'English', flag: '🇺🇸', desc: 'สนทนาเบื้องต้น' },
  { id: 'chinese', label: 'ภาษาจีน', flag: '🇨🇳', desc: 'สนทนาเบื้องต้น' },
  { id: 'japanese', label: 'ภาษาญี่ปุ่น', flag: '🇯🇵', desc: 'สนทนาเบื้องต้น' },
  { id: 'korean', label: 'ภาษาเกาหลี', flag: '🇰🇷', desc: 'สนทนาเบื้องต้น' },
  { id: 'myanmar', label: 'ภาษาพม่า', flag: '🇲🇲', desc: 'สนทนาเบื้องต้น' },
  { id: 'lao', label: 'ภาษาลาว', flag: '🇱🇦', desc: 'สนทนาเบื้องต้น' },
  { id: 'cambodian', label: 'ภาษาเขมร', flag: '🇰🇭', desc: 'สนทนาเบื้องต้น' }
];

const DAYS = [
  { id: 0, name: 'จ.', label: 'วันจันทร์' },
  { id: 1, name: 'อ.', label: 'วันอังคาร' },
  { id: 2, name: 'พ.', label: 'วันพุธ' },
  { id: 3, name: 'พฤ.', label: 'วันพฤหัสบดี' },
  { id: 4, name: 'ศ.', label: 'วันศุกร์' },
  { id: 5, name: 'ส.', label: 'วันเสาร์' },
  { id: 6, name: 'อา.', label: 'วันอาทิตย์' }
];

const SLOTS: Array<{ key: SlotType; label: string; time: string }> = [
  { key: 'morning', label: 'เช้า', time: '06:00–12:00' },
  { key: 'afternoon', label: 'บ่าย', time: '12:00–18:00' },
  { key: 'evening', label: 'เย็น', time: '18:00–22:00' }
];

const SERVICE_TYPES = [
  { id: 'general', label: 'ดูแลทั่วไป', desc: 'พยุง / ทานข้าว / กิจวัตรประจำวัน' },
  { id: 'bedridden', label: 'ดูแลผู้ป่วยติดเตียง', desc: 'ดูแลผู้ป่วยช่วยเหลือตัวเองไม่ได้' },
  { id: 'physical', label: 'กายภาพบำบัด', desc: 'ช่วยออกกำลังกาย / กายภาพฟื้นฟู' },
  { id: 'medicine', label: 'ช่วยจัดยา/เวชภัณฑ์', desc: 'ช่วยเตือน / จัดยาตามแพทย์สั่ง' },
  { id: 'nursing', label: 'เฝ้าไข้/พยุงช่วยเหลือ', desc: 'ช่วยเหลือฟื้นฟูเบื้องต้น' }
];

export const JobReceptionTab: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  // --- Core Profile Queries & Mutations ---
  const { data: caregiverData, loading: caregiverLoading } = useQuery<{
    myCaregiverProfile: {
      id: string;
      kycStatus: string;
      isSearchable: boolean;
    };
  }>(GET_CAREGIVER_PROFILE);

  const [setCaregiverSearchable, { loading: updatingSearchable }] = useMutation(
    SET_CAREGIVER_SEARCHABLE,
  );

  const caregiver = caregiverData?.myCaregiverProfile;
  const serverIsSearchable = Boolean(caregiver?.isSearchable);
  const isKycVerified = caregiver?.kycStatus === 'verified';
  const isAcceptingJobs = Boolean(serverIsSearchable && isKycVerified);

  // --- Address Database (thailand-address-simple) ---
  const [addressDb, setAddressDb] = useState<ThailandAddressSimple | null>(null);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districtsInProvince, setDistrictsInProvince] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);

  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        districtDropdownRef.current &&
        !districtDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDistrictDropdownOpen(false);
      }
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Local Work Condition States ---
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability>({
    0: { morning: false, afternoon: false, evening: false },
    1: { morning: false, afternoon: false, evening: false },
    2: { morning: false, afternoon: false, evening: false },
    3: { morning: false, afternoon: false, evening: false },
    4: { morning: false, afternoon: false, evening: false },
    5: { morning: false, afternoon: false, evening: false },
    6: { morning: false, afternoon: false, evening: false }
  });

  const [serviceFormats, setServiceFormats] = useState<ServiceFormats>({
    homeCare: false,
    travelCare: false
  });

  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [province, setProvince] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number>(0);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const [hourlyRate, setHourlyRate] = useState<number>(0);

  // Saved snapshot copy for clear/reset operations and change tracking
  const [savedSnapshot, setSavedSnapshot] = useState<{
    weeklyAvailability: WeeklyAvailability;
    serviceFormats: ServiceFormats;
    selectedServiceTypes: string[];
    province: string;
    selectedDistricts: string[];
    maxDistance: number;
    selectedLanguages: string[];
    hourlyRate: number;
  } | null>(null);

  // Initialize Snapshot
  useEffect(() => {
    if (savedSnapshot === null) {
      setSavedSnapshot({
        weeklyAvailability,
        serviceFormats,
        selectedServiceTypes,
        province,
        selectedDistricts,
        maxDistance,
        selectedLanguages,
        hourlyRate
      });
    }
  }, []);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!savedSnapshot) return false;
    return (
      JSON.stringify(weeklyAvailability) !== JSON.stringify(savedSnapshot.weeklyAvailability) ||
      JSON.stringify(serviceFormats) !== JSON.stringify(savedSnapshot.serviceFormats) ||
      JSON.stringify(selectedServiceTypes.sort()) !== JSON.stringify(savedSnapshot.selectedServiceTypes.sort()) ||
      province !== savedSnapshot.province ||
      JSON.stringify(selectedDistricts.sort()) !== JSON.stringify(savedSnapshot.selectedDistricts.sort()) ||
      maxDistance !== savedSnapshot.maxDistance ||
      JSON.stringify(selectedLanguages.sort()) !== JSON.stringify(savedSnapshot.selectedLanguages.sort()) ||
      hourlyRate !== savedSnapshot.hourlyRate
    );
  }, [
    weeklyAvailability,
    serviceFormats,
    selectedServiceTypes,
    province,
    selectedDistricts,
    maxDistance,
    selectedLanguages,
    hourlyRate,
    savedSnapshot
  ]);

  // Load Thailand address DB
  useEffect(() => {
    const db = new ThailandAddressSimple();
    db.init().then(() => {
      setAddressDb(db);
      const provs = [...new Set(db.address.map((a: any) => a.province))].sort() as string[];
      setProvinces(provs);

      // Load districts for default province
      const defaultDistricts = [...new Set(
        db.address.filter((a: any) => a.province === province).map((a: any) => a.amphoe)
      )].sort() as string[];
      setDistrictsInProvince(defaultDistricts);
    });
  }, []);

  // Handle province change
  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    setSelectedDistricts([]);
    if (addressDb) {
      const dists = [...new Set(
        addressDb.address.filter((a: any) => a.province === newProvince).map((a: any) => a.amphoe)
      )].sort() as string[];
      setDistrictsInProvince(dists);
    }
  };

  const [jobReceptionChecklist, setJobReceptionChecklist] = useState<
    Record<JobReceptionChecklistKey, boolean>
  >({
    profileVisible: true,
    jobAlerts: true,
    pauseAnytime: true,
  });

  const [jobReceptionError, setJobReceptionError] = useState<string | null>(null);
  const [optimisticIsSearchable, setOptimisticIsSearchable] = useState<boolean | null>(null);

  const effectiveIsSearchable = optimisticIsSearchable ?? serverIsSearchable;
  const isAcceptingJobsDynamic = Boolean(effectiveIsSearchable && isKycVerified);

  // Styling helper classes
  const receptionCardClass = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'border-[#52B69A] bg-[#E8F5F1]'
      : 'border-[#E0E2E5] bg-[#F9FAFB]'
    : 'border-[#E0E2E5] bg-[#F9FAFB]';

  const receptionBadgeClass = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'bg-[#E0E2E5] text-[#8A8C8E] border border-transparent'
      : 'bg-[#E0E2E5] text-white'
    : 'bg-[#E0E2E5] text-white';

  const receptionToggleClass = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'bg-[#52B69A] cursor-pointer'
      : 'bg-[#E0E2E5] cursor-pointer'
    : 'cursor-not-allowed bg-[#E0E2E5]';

  const receptionStatusLabel = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'เปิดรับงาน'
      : 'ปิดรับงาน'
    : 'ยังไม่ยืนยัน';

  const receptionTitle = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'คุณกำลังรับงาน'
      : 'คุณปิดรับงานอยู่'
    : 'เปิดใช้งานการรับงาน';

  const receptionDescription = isKycVerified
    ? isAcceptingJobsDynamic
      ? 'ผู้ดูแลจะเห็นโปรไฟล์ของคุณและสามารถจองได้'
      : 'โปรไฟล์จะไม่แสดงในหน้าค้นหา'
    : 'พร้อมใช้งานหลังยืนยันตัวตน';

  // Toggle searchable state
  const handleToggleReception = async () => {
    if (!isKycVerified || updatingSearchable) {
      return;
    }

    const previousValue = isAcceptingJobsDynamic;
    const nextValue = !previousValue;

    setOptimisticIsSearchable(nextValue);
    setJobReceptionError(null);

    try {
      await setCaregiverSearchable({
        variables: { isSearchable: nextValue },
        refetchQueries: [{ query: GET_CAREGIVER_PROFILE }],
        awaitRefetchQueries: true,
      });
      setOptimisticIsSearchable(null);
      showSuccess(nextValue ? 'เปิดรับงานแล้ว' : 'ปิดรับงานแล้ว');
    } catch (error) {
      setOptimisticIsSearchable(previousValue);
      const fallbackMessage = 'ไม่สามารถอัปเดตสถานะการรับงานได้';
      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      setJobReceptionError(errorMessage || fallbackMessage);
      showError(fallbackMessage);
    }
  };

  const toggleJobReceptionChecklist = (key: JobReceptionChecklistKey) => {
    if (!isAcceptingJobsDynamic) {
      return;
    }
    setJobReceptionChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- Work Condition Actions ---

  // Weekly Calendar Handlers
  const isDayAllOpen = (dayId: number) => {
    const day = weeklyAvailability[dayId];
    return day.morning && day.afternoon && day.evening;
  };

  const toggleAllDay = (dayId: number) => {
    const allOpen = isDayAllOpen(dayId);
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayId]: {
        morning: !allOpen,
        afternoon: !allOpen,
        evening: !allOpen
      }
    }));
  };

  const toggleSlot = (dayId: number, slot: SlotType) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [slot]: !prev[dayId][slot]
      }
    }));
  };

  // Service formats toggle
  const toggleFormat = (key: keyof ServiceFormats) => {
    setServiceFormats(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Ensure at least one is selected
      if (!next.homeCare && !next.travelCare) {
        return prev;
      }
      return next;
    });
  };

  // Service types togglers
  const toggleServiceType = (id: string) => {
    setSelectedServiceTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAllServiceTypes = () => {
    setSelectedServiceTypes(SERVICE_TYPES.map(t => t.id));
  };

  const clearAllServiceTypes = () => {
    setSelectedServiceTypes([]);
  };

  // Communication languages toggler
  const toggleLanguage = (langId: string) => {
    setSelectedLanguages(prev =>
      prev.includes(langId) ? prev.filter(l => l !== langId) : [...prev, langId]
    );
  };

  // District toggler
  const toggleDistrict = (districtName: string) => {
    setSelectedDistricts(prev =>
      prev.includes(districtName)
        ? prev.filter(d => d !== districtName)
        : [...prev, districtName]
    );
  };

  // Hourly Rate calculations
  const platformFee = Math.round(hourlyRate * 0.1);
  const netEarnings = Math.max(0, hourlyRate - platformFee);

  // Form Save & Reset Handlers
  const handleSave = () => {
    const snapshot = {
      weeklyAvailability,
      serviceFormats,
      selectedServiceTypes,
      province,
      selectedDistricts,
      maxDistance,
      selectedLanguages,
      hourlyRate
    };
    setSavedSnapshot(snapshot);
    showSuccess('บันทึกการเปลี่ยนแปลงแล้ว');
  };

  const handleReset = () => {
    if (!savedSnapshot) return;
    setWeeklyAvailability(savedSnapshot.weeklyAvailability);
    setServiceFormats(savedSnapshot.serviceFormats);
    setSelectedServiceTypes(savedSnapshot.selectedServiceTypes);
    setProvince(savedSnapshot.province);
    setSelectedDistricts(savedSnapshot.selectedDistricts);
    setMaxDistance(savedSnapshot.maxDistance);
    setSelectedLanguages(savedSnapshot.selectedLanguages);
    setHourlyRate(savedSnapshot.hourlyRate);
    showSuccess('ล้างการเปลี่ยนแปลงการตั้งค่าแล้ว');
  };

  // Filtered district list
  const filteredDistricts = useMemo(() => {
    return districtsInProvince.filter(d =>
      d.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [districtsInProvince, districtSearch]);

  if (caregiverLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-white rounded-lg animate-pulse" />
      </div>
    );
  }

  // Determine if the form should be completely disabled
  // Form is disabled if either caregiver is not verified, OR searchable is OFF
  const isFormDisabled = !isKycVerified || !isAcceptingJobsDynamic;

  return (
    <div className="w-full max-w-[880px] mx-auto bg-[#F6FAF9] px-6 py-7 pb-32 flex flex-col gap-6" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

      {/* ═ KYC Status Banner ═ */}
      {!isKycVerified && (
        <div className="relative overflow-hidden rounded-xl border border-[#F2D2A4] bg-white p-5 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex items-center justify-between gap-4">
          <div className="absolute inset-y-0 left-0 w-2" />
          <div className="flex items-start gap-3 pl-2">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF6E8] text-[#E09721]">
              <Icon name="warning" variant="outlined" size="medium" color="currentColor" />
            </span>
            <div>
              <p className="text-[16px] font-bold text-[#0A0A0A]">ยืนยันตัวตน (KYC) ให้เสร็จสิ้นก่อน</p>
              <p className="text-[13px] text-[#717182] mt-0.5">คุณต้องยืนยันตัวตนก่อนจึงจะสามารถเปิดใช้งานการรับงานและตั้งค่าเวลาว่างได้</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/kyc')}
            className="rounded-lg bg-[#0D9488] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#0b7f74] cursor-pointer"
          >
            เริ่มยืนยันตัวตน
          </button>
        </div>
      )}

      {/* ═ Header 1 ═ */}
      <h1 className="text-[22px] font-bold text-[#1A1A1A]">เปิดใช้งานการรับงาน</h1>

      {/* ═ Toggle Card ═ */}
      <div className={`rounded-2xl border p-5 ${receptionCardClass} transition-colors duration-200`}>
        <div className="mb-3 flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white transition-colors duration-200 ${isAcceptingJobsDynamic ? 'bg-[#52B69A]' : 'bg-[#CCCCCC]'
            }`}>
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {receptionStatusLabel}
          </div>

          <button
            type="button"
            onClick={handleToggleReception}
            disabled={!isKycVerified || updatingSearchable}
            aria-label="สลับสถานะการรับงาน"
            className={`relative h-6 w-12 rounded-full transition-colors ${receptionToggleClass}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${isKycVerified && isAcceptingJobsDynamic ? 'left-6.5' : 'left-0.5'
                }`}
            />
          </button>
        </div>

        <h2 className="text-[20px] font-bold text-[#1A1A1A]">{receptionTitle}</h2>
        <p className="mt-1 text-[13px] text-[#575859]">{receptionDescription}</p>

        {isKycVerified && (
          <div className="mt-4 flex flex-col gap-2.5 pt-3 border-t border-[#E0E2E5]">
            {[
              { key: 'profileVisible' as const, label: 'โปรไฟล์แสดงในหน้าค้นหา' },
              { key: 'jobAlerts' as const, label: 'รับการแจ้งเตือนเมื่อมีงาน' },
              { key: 'pauseAnytime' as const, label: 'ปิดรับงานได้ทุกเมื่อ' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span className="text-[#DDDDDD] flex items-center">
                  <Icon
                    name={jobReceptionChecklist[item.key] && isAcceptingJobsDynamic ? 'check_circle' : 'check_circle'}
                    size="small"
                    color={jobReceptionChecklist[item.key] && isAcceptingJobsDynamic ? '#3A9A7E' : '#DDDDDD'}
                  />
                </span>
                <span className={`text-[13px] font-medium ${jobReceptionChecklist[item.key] && isAcceptingJobsDynamic ? 'text-[#1A1A1A]' : 'text-[#8A8C8E]'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {jobReceptionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
          {jobReceptionError}
        </p>
      )}

      {/* ═ Form Section Header ═ */}
      <div className="flex items-center justify-between border-t border-[#E0E2E5] pt-6 mt-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[18px] font-bold text-[#1A1A1A]">เงื่อนไขการทำงานและเวลาว่าง</h2>
            {isKycVerified && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                ยืนยันแล้ว
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#8A8C8E] mt-1">ตั้งเวลาและพื้นที่ที่คุณรับงาน การเปลี่ยนแปลงจะแสดงบนหน้าโปรไฟล์ของคุณ</p>
        </div>
      </div>

      {/* ═ Not Searchable Banner ═ */}
      {isKycVerified && !isAcceptingJobsDynamic && (
        <div className="relative overflow-hidden rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="absolute inset-y-0 left-0 w-2.5 " />
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sky-600 pl-1">
            <Icon name="info" variant="outlined" size="small" color="currentColor" />
          </span>
          <p className="text-[13px] font-medium text-sky-800">
            กรุณาเปิดสวิตช์ <b>"เปิดรับงาน"</b> ด้านบน เพื่อเริ่มการตั้งค่าเงื่อนไขการทำงานและเวลาว่างของคุณ
          </p>
        </div>
      )}

      {/* ═ Work Condition Settings Form ═ */}
      <div className={`flex flex-col gap-5 ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* CARD 1: ตารางเวลาว่างประจำสัปดาห์ */}
        <div className="bg-white border border-[#E0E2E5] rounded-[20px] p-6 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
              <Icon name="calendar_month" size="medium" color="currentColor" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">ตารางเวลาว่างประจำสัปดาห์</h3>
              <p className="text-[12px] text-[#8A8C8E] mt-0.5">แตะเพื่อเปิด/ปิดแต่ละช่วงเวลา หรือใช้ปุ่มเปิด/ปิดทั้งวัน</p>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="overflow-x-auto mt-2">
            <div className="min-w-[680px] grid grid-cols-8 gap-y-3.5 gap-x-2 pb-1">

              {/* Row Header (Empty corner slot) */}
              <div className="text-[12px] font-semibold text-[#575859] flex items-center h-8" />

              {/* Day Headers (Mon-Sun) */}
              {DAYS.map(day => (
                <div key={day.id} className="text-[12px] font-bold text-[#575859] text-center flex items-center justify-center h-8">
                  {day.name}
                </div>
              ))}

              {/* Row: เปิด/ปิดทั้งวัน */}
              <div className="text-[12px] font-bold text-[#1A1A1A] flex items-center h-8">
                เปิด/ปิดทั้งวัน
              </div>
              {DAYS.map(day => {
                const open = isDayAllOpen(day.id);
                return (
                  <button
                    type="button"
                    key={`all-day-${day.id}`}
                    onClick={() => toggleAllDay(day.id)}
                    className={`h-7.5 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${open
                        ? 'bg-[#E8F5F1] border-[#3A9A7E] text-[#3A9A7E] hover:bg-[#d5eeec]'
                        : 'bg-[#F0F1F3] border-[#E0E2E5] text-[#8A8C8E] hover:bg-[#e4e5e7]'
                      }`}
                  >
                    ตลอดวัน
                  </button>
                );
              })}

              {/* Rows: เช้า / บ่าย / เย็น */}
              {SLOTS.map(slot => (
                <React.Fragment key={slot.key}>
                  <div className="flex flex-col justify-center h-11">
                    <span className="text-[13px] font-bold text-[#1A1A1A] leading-tight">{slot.label}</span>
                    <span className="text-[10px] text-[#8A8C8E] font-mono leading-none mt-0.5">{slot.time}</span>
                  </div>

                  {DAYS.map(day => {
                    const active = weeklyAvailability[day.id][slot.key];
                    return (
                      <button
                        type="button"
                        key={`${slot.key}-${day.id}`}
                        onClick={() => toggleSlot(day.id, slot.key)}
                        className={`h-11 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${active
                            ? 'bg-[#E8F5F1] border-[#3A9A7E] text-[#3A9A7E] font-semibold hover:bg-[#d5eeec]'
                            : 'bg-white border-[#E0E2E5] text-[#CBCED4] hover:bg-gray-50'
                          }`}
                      >
                        {active ? (
                          <span className="text-[15px] font-bold">✓</span>
                        ) : (
                          <span className="text-[13px] text-[#CBCED4] font-medium">-</span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}

            </div>
          </div>
        </div>

        {/* CARD 2: ประเภทงานที่ฉันรับ */}
        <div className="bg-white border border-[#E0E2E5] rounded-[20px] p-6 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-5">

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
              <Icon name="medical_services" size="medium" color="currentColor" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">ประเภทงานที่ฉันรับ</h3>
              <p className="text-[12px] text-[#8A8C8E] mt-0.5">Tags เหล่านี้แสดงบน Public Profile และใช้ filter ในการค้นหา</p>
            </div>
          </div>

          {/* รูปแบบการให้บริการ */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[#52B69A] flex items-center">
                <Icon name="place" size="small" color="currentColor" />
              </span>
              <span className="text-[13px] font-bold text-[#1A1A1A]">รูปแบบการให้บริการ</span>
              <span className="text-[11px] text-[#8A8C8E]">(ต้องเลือกอย่างน้อย 1)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {[
                {
                  key: 'homeCare' as const,
                  title: 'ที่บ้านผู้ป่วย',
                  desc: 'ฉันเดินทางไปดูแลที่บ้านผู้ป่วย',
                  icon: 'home'
                },
                {
                  key: 'travelCare' as const,
                  title: 'พาออกนอกบ้าน',
                  desc: 'ฉันพาผู้ป่วยออกนอกบ้าน เช่น พบแพทย์ ทำธุระ',
                  icon: 'directions_walk'
                }
              ].map(format => {
                const active = serviceFormats[format.key];
                return (
                  <button
                    type="button"
                    key={format.key}
                    onClick={() => toggleFormat(format.key)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${active
                        ? 'bg-[#E8F5F1] border-[#3A9A7E] shadow-sm'
                        : 'bg-white border-[#E0E2E5] hover:bg-gray-50'
                      }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-[#3A9A7E] border-[#3A9A7E] text-white' : 'border-[#CBCED4] bg-white'
                        }`}>
                        {active && <span className="text-[10px] font-bold">✓</span>}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#8A8C8E]">
                          <Icon name={format.icon} size="small" color="currentColor" />
                        </span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{format.title}</span>
                      </div>
                      <p className="text-[11px] text-[#8A8C8E] mt-0.5 leading-tight">{format.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ประเภทบริการ */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[#52B69A] flex items-center">
                  <Icon name="checklist" size="small" color="currentColor" />
                </span>
                <span className="text-[13px] font-bold text-[#1A1A1A]">ประเภทบริการ</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllServiceTypes}
                  className="text-[11px] font-bold text-[#3A9A7E] hover:underline cursor-pointer"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearAllServiceTypes}
                  className="text-[11px] font-bold text-[#8A8C8E] hover:underline cursor-pointer"
                >
                  ล้างทั้งหมด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SERVICE_TYPES.map(type => {
                const active = selectedServiceTypes.includes(type.id);
                return (
                  <button
                    type="button"
                    key={type.id}
                    onClick={() => toggleServiceType(type.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${active
                        ? 'bg-[#E8F5F1] border-[#3A9A7E] shadow-sm'
                        : 'bg-white border-[#E0E2E5] hover:bg-gray-50'
                      }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <span className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-[#3A9A7E] border-[#3A9A7E] text-white' : 'border-[#CBCED4] bg-white'
                        }`}>
                        {active && <span className="text-[10px] font-bold">✓</span>}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-[#1A1A1A] block">{type.label}</span>
                      <p className="text-[11px] text-[#8A8C8E] mt-0.5 leading-tight">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* CARD 3: พื้นที่บริการ */}
        <div className="bg-white border border-[#E0E2E5] rounded-[20px] p-6 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
              <Icon name="place" size="medium" color="currentColor" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">พื้นที่บริการ</h3>
              <p className="text-[12px] text-[#8A8C8E] mt-0.5">ระบุจังหวัดและอำเภอที่คุณเดินทางไปให้บริการได้</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">

            {/* Province selector */}
            <div className="flex flex-col">
              <label htmlFor="select-province" className="text-[13px] font-bold text-[#1A1A1A] mb-1.5">จังหวัด</label>
              <div className="relative">
                <select
                  id="select-province"
                  value={province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#E0E2E5] rounded-xl px-3 py-2.5 pr-9 text-[13px] text-[#1A1A1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#3A9A7E] cursor-pointer"
                >
                  <option value="">— กรุณาเลือกจังหวัด —</option>
                  {provinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                  ▼
                </span>
              </div>
            </div>

            {/* Max distance travel input */}
            <div className="flex flex-col">
              <label htmlFor="max-distance" className="text-[13px] font-bold text-[#1A1A1A] mb-1.5">ระยะทางเดินทางสูงสุด</label>
              <div className="relative flex items-center">
                <input
                  id="max-distance"
                  type="number"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-[#E0E2E5] rounded-xl px-3.5 py-2.5 pr-20 text-[13px] text-[#1A1A1A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#3A9A7E]"
                />
                <span className="absolute right-3.5 text-[11px] font-bold text-[#8A8C8E] pointer-events-none">
                  กิโลเมตร
                </span>
              </div>
            </div>

          </div>

          {/* District multi-select with tags */}
          <div className="flex flex-col mt-2 relative">
            <label className="text-[13px] font-bold text-[#1A1A1A] mb-1.5">อำเภอ/เขต</label>

            {/* Tag List */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {selectedDistricts.map(dist => (
                <span
                  key={dist}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#E8F5F1] text-[#228B55]"
                >
                  {dist}
                  <button
                    type="button"
                    onClick={() => toggleDistrict(dist)}
                    className="text-[#3A9A7E] hover:text-[#1A5C3A] font-bold cursor-pointer"
                    aria-label={`ลบเขต ${dist}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedDistricts.length === 0 && (
                <span className="text-[12px] text-[#8A8C8E] italic py-1">ยังไม่มีเขตที่เลือก (เลือกอย่างน้อย 1)</span>
              )}
            </div>

            {/* Dropdown triggers */}
            <div className="relative" ref={districtDropdownRef}>
              <input
                type="text"
                placeholder="ค้นหาเขต/อำเภอในจังหวัด..."
                value={districtSearch}
                onFocus={() => setIsDistrictDropdownOpen(true)}
                onChange={(e) => {
                  setDistrictSearch(e.target.value);
                  setIsDistrictDropdownOpen(true);
                }}
                className="w-full bg-white border border-[#E0E2E5] rounded-xl px-3.5 py-2.5 pr-9 text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#3A9A7E]"
              />
              <button
                type="button"
                onClick={() => setIsDistrictDropdownOpen(!isDistrictDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs focus:outline-none cursor-pointer"
                aria-label="สลับเมนูแสดงรายชื่อเขต"
              >
                ▼
              </button>

              {/* Dropdown Options */}
              {isDistrictDropdownOpen && (
                <div className="absolute z-10 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-[#E0E2E5] rounded-xl shadow-lg p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-2 pb-1.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-[#8A8C8E] uppercase">พบ {filteredDistricts.length} เขต</span>
                    <button
                      type="button"
                      onClick={() => setIsDistrictDropdownOpen(false)}
                      className="text-[10px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                  {filteredDistricts.length === 0 ? (
                    <div className="text-[12px] text-[#8A8C8E] p-3 text-center">ไม่พบผลการค้นหา</div>
                  ) : (
                    filteredDistricts.map(dist => {
                      const checked = selectedDistricts.includes(dist);
                      return (
                        <button
                          type="button"
                          key={dist}
                          onClick={() => toggleDistrict(dist)}
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left w-full transition-colors text-[13px] cursor-pointer"
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-[#3A9A7E] border-[#3A9A7E] text-white' : 'border-[#CBCED4] bg-white'
                            }`}>
                            {checked && <span className="text-[9px] font-bold">✓</span>}
                          </span>
                          <span className={checked ? 'font-bold text-[#1A1A1A]' : 'text-[#575859]'}>{dist}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* CARD 4: ภาษาที่สื่อสารได้ */}
        <div className="bg-white border border-[#E0E2E5] rounded-[20px] p-6 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
              <Icon name="translate" size="medium" color="currentColor" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">ภาษาที่สื่อสารได้</h3>
              <p className="text-[12px] text-[#8A8C8E] mt-0.5">เลือกภาษาที่คุณสามารถสื่อสารกับผู้ป่วยและญาติได้</p>
            </div>
          </div>

          <div className="flex flex-col relative mt-2">
            {/* Tag List */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {selectedLanguages.map(langId => {
                const lang = LANGUAGES_LIST.find(l => l.id === langId);
                if (!lang) return null;
                return (
                  <span
                    key={langId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#E8F5F1] text-[#228B55]"
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    <button
                      type="button"
                      onClick={() => toggleLanguage(langId)}
                      className="text-[#3A9A7E] hover:text-[#1A5C3A] font-bold cursor-pointer"
                      aria-label={`ลบภาษา ${lang.label}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
              {selectedLanguages.length === 0 && (
                <span className="text-[12px] text-[#8A8C8E] italic py-1">ยังไม่มีภาษาที่เลือก (เลือกอย่างน้อย 1)</span>
              )}
            </div>

            {/* Dropdown triggers */}
            <div className="relative" ref={languageDropdownRef}>
              <input
                type="text"
                placeholder="ค้นหาภาษาที่สื่อสารได้..."
                value={languageSearch}
                onFocus={() => setIsLanguageDropdownOpen(true)}
                onChange={(e) => {
                  setLanguageSearch(e.target.value);
                  setIsLanguageDropdownOpen(true);
                }}
                className="w-full bg-white border border-[#E0E2E5] rounded-xl px-3.5 py-2.5 pr-9 text-[13px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#3A9A7E]"
              />
              <button
                type="button"
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs focus:outline-none cursor-pointer"
                aria-label="สลับเมนูแสดงรายชื่อภาษา"
              >
                ▼
              </button>

              {/* Dropdown Options */}
              {isLanguageDropdownOpen && (
                <div className="absolute z-10 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-[#E0E2E5] rounded-xl shadow-lg p-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-2 pb-1.5 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-[#8A8C8E] uppercase">พบ {LANGUAGES_LIST.filter(l => l.label.toLowerCase().includes(languageSearch.toLowerCase())).length} ภาษา</span>
                    <button
                      type="button"
                      onClick={() => setIsLanguageDropdownOpen(false)}
                      className="text-[10px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                  {LANGUAGES_LIST.filter(l => l.label.toLowerCase().includes(languageSearch.toLowerCase())).length === 0 ? (
                    <div className="text-[12px] text-[#8A8C8E] p-3 text-center">ไม่พบผลการค้นหา</div>
                  ) : (
                    LANGUAGES_LIST.filter(l => l.label.toLowerCase().includes(languageSearch.toLowerCase())).map(lang => {
                      const checked = selectedLanguages.includes(lang.id);
                      return (
                        <button
                          type="button"
                          key={lang.id}
                          onClick={() => toggleLanguage(lang.id)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left w-full transition-colors text-[13px] cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-[#3A9A7E] border-[#3A9A7E] text-white' : 'border-[#CBCED4] bg-white'
                              }`}>
                              {checked && <span className="text-[9px] font-bold">✓</span>}
                            </span>
                            <span className="text-[15px]">{lang.flag}</span>
                            <span className={checked ? 'font-bold text-[#1A1A1A]' : 'text-[#575859]'}>{lang.label}</span>
                          </div>
                          <span className="text-[10px] text-[#8A8C8E] font-medium">{lang.desc}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 5: อัตราค่าจ้าง */}
        <div className="bg-white border border-[#E0E2E5] rounded-[20px] p-6 shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
              <Icon name="payments" size="medium" color="currentColor" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A]">อัตราค่าจ้าง</h3>
              <p className="text-[12px] text-[#8A8C8E] mt-0.5">ระบุอัตราค่าจ้างและประมาณการรายได้สุทธิที่จะได้รับหลังหักค่าธรรมเนียม</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2">

            {/* Input field */}
            <div className="md:col-span-5 flex flex-col justify-center">
              <label htmlFor="hourly-rate-input" className="text-[13px] font-bold text-[#1A1A1A] mb-1.5">
                อัตราค่าบริการต่อชั่วโมง (บาท)
              </label>
              <div className="relative flex items-center">
                <input
                  id="hourly-rate-input"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-[#E0E2E5] rounded-xl px-3.5 py-3 pr-20 text-[14px] font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#3A9A7E]"
                />
                <span className="absolute right-3.5 text-[11px] font-bold text-[#8A8C8E] pointer-events-none">
                  บาท/ชม.
                </span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="md:col-span-7 bg-[#F9FAFB] border border-[#E0E2E5] rounded-xl p-4 flex flex-col gap-2.5">
              <p className="text-[11px] font-bold text-[#8A8C8E] uppercase tracking-wider">
                รายละเอียดประมาณการรายได้
              </p>

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#575859]">ค่าบริการที่เรียกเก็บจากคนไข้</span>
                <span className="font-semibold text-[#1A1A1A]">฿{hourlyRate} / ชม.</span>
              </div>

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#575859]">ค่าธรรมเนียมแพลตฟอร์ม (10%)</span>
                <span className="font-semibold text-red-500">- ฿{platformFee} / ชม.</span>
              </div>

              <div className="h-px bg-gray-200 my-1" />

              <div className="flex justify-between items-center">
                <span className="text-[13px] font-bold text-[#1A1A1A]">รายได้สุทธิที่คุณได้รับ</span>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#ECFDF5] text-[#047857] text-[14px] font-bold">
                  ฿{netEarnings} / ชม.
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ═ Floating Actions Bar ═ */}
      <div
        className={`fixed bottom-6 md:left-[calc(50%+125px)] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-[960px] z-50 bg-white/95 backdrop-blur-md border border-[#E0E2E5] rounded-2xl p-4 sm:p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 ease-in-out ${
          hasChanges && !isFormDisabled
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#EEF9F5] rounded-xl flex items-center justify-center text-[#3A9A7E] flex-shrink-0">
            <Icon name="info" variant="outlined" size="small" color="currentColor" />
          </div>
          <div className="flex flex-col">
            <p className="text-[13px] font-bold text-[#1A1A1A]">คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</p>
            <p className="text-[11px] text-[#8A8C8E]">
              การเปลี่ยนแปลงจะมีผลทันทีหลังจากกดบันทึก
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || isFormDisabled}
            className={`flex-1 sm:flex-initial rounded-xl border px-5 py-2.5 text-[13px] font-bold transition-colors ${
              !hasChanges || isFormDisabled
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50 cursor-pointer'
            }`}
          >
            ล้างการเปลี่ยนแปลง
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isFormDisabled}
            className={`flex-1 sm:flex-initial rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-colors ${
              !hasChanges || isFormDisabled
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#0D9488] hover:bg-[#0b7f74] cursor-pointer'
            }`}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>

    </div>
  );
};
