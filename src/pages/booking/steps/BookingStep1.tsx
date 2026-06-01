import { useState, useEffect, useMemo, useRef } from 'react';
import ThailandAddressSimple from 'thailand-address-simple';
import { useBooking } from '../../../context/BookingContext';
import type { BookingRequest } from '../../../context/BookingContext';
import { useToast } from '../../../hooks/useToast';
import MapPicker from '../MapPicker';


const BUSY_SLOTS: string[] = [];
const averageHourlyRate = 250;
const PREDEFINED_CONDITIONS = ['เบาหวาน', 'ความดันสูง', 'โรคหัวใจ', 'สมองเสื่อม'];

const thaiAddressDb = new ThailandAddressSimple();

const SAVED_PROFILE = {
  name: 'สมศรี วงศ์ดี',
  age: '65',
  nickname: 'คุณแม่',
  gender: 'หญิง' as const,
  weight: '58',
  height: '155',
  supportLevel: 'ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน',
  conditions: ['เบาหวาน', 'ความดันสูง'],
  medicines: 'ยาลดความดัน, ยาเบาหวาน',
  allergies: 'แพ้ยาเพนิซิลิน',
  bloodGroup: 'B',
  careInstructions: 'เพิ่งผ่าตัดเปลี่ยนสะโพกมา 2 สัปดาห์ ยังช่วยพยุงเดินค่อนข้างช้า จำเป็นต้องพลิกตัวสม่ำเสมอ...',
  regularHospital: 'รพ.รามาธิบดี',
  address: '123/45 ซอยลาดพร้าว 101 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240'
};

export default function BookingStep1() {
  const { bookingDraft, setBookingDraft, goToStep } = useBooking();
  const { success, error, warning } = useToast();

  const [addressDbReady, setAddressDbReady] = useState(false);

  useEffect(() => {
    thaiAddressDb.init().then(() => setAddressDbReady(true));
  }, []);

  // --- Step 1 States ---
  const [serviceLocation, setServiceLocation] = useState<('at_home' | 'accompany_outside')[]>(
    bookingDraft?.serviceLocation || ['at_home']
  );
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(
    bookingDraft?.serviceTypes || []
  );

  // Date & Time
  const [date, setDate] = useState(bookingDraft?.dateTime?.date || '');
  const [slot, setSlot] = useState(bookingDraft?.dateTime?.slot || '');
  const [startTime, setStartTime] = useState(bookingDraft?.dateTime?.startTime || '');
  const [duration, setDuration] = useState<number>(bookingDraft?.dateTime?.duration || 4);
  const [endTime, setEndTime] = useState(bookingDraft?.dateTime?.endTime || '');

  // Address & Map Coordinates
  const [province, setProvince] = useState(
    bookingDraft?.locationDetails?.province || ''
  );
  const [district, setDistrict] = useState(
    bookingDraft?.locationDetails?.district || ''
  );

  const provincesList = useMemo(() => {
    if (!addressDbReady) return [];
    return [...new Set(thaiAddressDb.address.map((a) => a.province))].sort();
  }, [addressDbReady]);

  const districtsList = useMemo(() => {
    if (!addressDbReady || !province) return [];
    return [
      ...new Set(
        thaiAddressDb.address
          .filter((a) => a.province === province)
          .map((a) => a.amphoe)
      )
    ].sort();
  }, [addressDbReady, province]);
  const [address, setAddress] = useState(
    bookingDraft?.locationDetails?.at_home?.address || ''
  );
  const [latA, setLatA] = useState(
    bookingDraft?.locationDetails?.at_home?.lat || 13.736717
  );
  const [lngA, setLngA] = useState(
    bookingDraft?.locationDetails?.at_home?.lng || 100.560543
  );
  const [hospitalName, setHospitalName] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.hospitalName || ''
  );
  const [meetingPoint, setMeetingPoint] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.meetingPoint || ''
  );
  const [latB, setLatB] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.lat || 13.756330
  );
  const [lngB, setLngB] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.lng || 100.501765
  );

  const [destinationQuery, setDestinationQuery] = useState(
    bookingDraft?.locationDetails?.accompany_outside?.hospitalName || ''
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Care Recipient Type
  const recipientType = 'self';

  // Detailed Patient Health Form States
  const [patientName, setPatientName] = useState(bookingDraft?.recipient?.patientDetails?.name || '');
  const [patientAge, setPatientAge] = useState(bookingDraft?.recipient?.patientDetails?.age?.toString() || '');
  const [patientNickname, setPatientNickname] = useState(bookingDraft?.recipient?.patientDetails?.nickname || '');
  const [patientGender, setPatientGender] = useState<'ชาย' | 'หญิง' | ''>(
    bookingDraft?.recipient?.patientDetails?.gender || ''
  );
  const [patientWeight, setPatientWeight] = useState(bookingDraft?.recipient?.patientDetails?.weight?.toString() || '');
  const [patientHeight, setPatientHeight] = useState(bookingDraft?.recipient?.patientDetails?.height?.toString() || '');
  const [patientSupportLevel, setPatientSupportLevel] = useState(
    bookingDraft?.recipient?.patientDetails?.supportLevel || 'ช่วยเหลือตัวเองได้ดี'
  );
  const [patientConditions, setPatientConditions] = useState<string[]>(() => {
    const draftConds = bookingDraft?.recipient?.patientDetails?.conditions || [];
    const hasOther = draftConds.some(c => !PREDEFINED_CONDITIONS.includes(c));
    const result = draftConds.filter(c => PREDEFINED_CONDITIONS.includes(c));
    if (hasOther) {
      result.push('อื่นๆ');
    }
    return result;
  });

  const [otherCondition, setOtherCondition] = useState<string>(() => {
    const draftConds = bookingDraft?.recipient?.patientDetails?.conditions || [];
    return draftConds.find(c => !PREDEFINED_CONDITIONS.includes(c)) || '';
  });

  const finalConditions = useMemo(() => {
    const conds = patientConditions.filter(c => c !== 'อื่นๆ');
    if (patientConditions.includes('อื่นๆ') && otherCondition.trim()) {
      conds.push(otherCondition.trim());
    }
    return conds;
  }, [patientConditions, otherCondition]);
  const [patientMedicines, setPatientMedicines] = useState(bookingDraft?.recipient?.patientDetails?.medicines || '');
  const [patientAllergies, setPatientAllergies] = useState(bookingDraft?.recipient?.patientDetails?.allergies || '');
  const [patientBloodGroup, setPatientBloodGroup] = useState(bookingDraft?.recipient?.patientDetails?.bloodGroup || '');
  const [patientCareInstructions, setPatientCareInstructions] = useState(
    bookingDraft?.recipient?.patientDetails?.careInstructions || ''
  );
  const [patientRegularHospital, setPatientRegularHospital] = useState(
    bookingDraft?.recipient?.patientDetails?.regularHospital || ''
  );
  const [saveForLater, setSaveForLater] = useState(true);

  // Inline Recipient Form for adding family member (removed)

  // Contact Person
  const [contactName, setContactName] = useState(
    bookingDraft?.contactPerson?.name || ''
  );
  const [contactPhone, setContactPhone] = useState(
    bookingDraft?.contactPerson?.phone || ''
  );
  const [contactRelationship, setContactRelationship] = useState(
    bookingDraft?.contactPerson?.relationship || ''
  );

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Geocoding Nominatim Search logic
  useEffect(() => {
    if (destinationQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (destinationQuery === hospitalName) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=th&q=${encodeURIComponent(
            destinationQuery
          )}`,
          {
            headers: {
              'Accept-Language': 'th,en',
              'User-Agent': 'PayungCaregiverApp/1.0'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error fetching geocoding data:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [destinationQuery, hospitalName]);

  // Click outside to close suggestions list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter Service Types invalid based on Location Selection
  const isAccompanyOnly = serviceLocation.length === 1 && serviceLocation.includes('accompany_outside');
  const serviceOptions = [
    { id: 'ดูแลทั่วไป', label: 'ดูแลทั่วไป', desc: 'ช่วยเหลือการดำเนินชีวิตประจำวันทั่วไป อาบน้ำ แต่งตัว คอยพยุงเดิน' },
    { id: 'ดูแลผู้ป่วยติดเตียง', label: 'ดูแลผู้ป่วยติดเตียง', desc: 'ดูแลผู้ป่วยช่วยเหลือตัวเองไม่ได้ พลิกตัว ป้องกันแผลกดทับ ดูแลสายยางให้อาหาร', disabled: isAccompanyOnly },
    { id: 'กายภาพบำบัด', label: 'กายภาพบำบัด', desc: 'ทำกายภาพบำบัดพื้นฐาน พาเดิน ออกกำลังกายเพื่อฟื้นฟูข้อต่อและกล้ามเนื้อ' },
    { id: 'ช่วยจัดการยา', label: 'ช่วยจัดการยา', desc: 'เตือนและจัดการยา ตรวจสอบการรับประทานยาตามแพทย์สั่งอย่างถูกต้อง' },
    { id: 'เป็นเพื่อน/พูดคุย', label: 'เป็นเพื่อน/พูดคุย', desc: 'พูดคุย ทำกิจกรรมร่วมกัน ลดความเหงา และส่งเสริมสุขภาพจิต' }
  ];

  // Auto calculate end time
  useEffect(() => {
    if (startTime && duration) {
      const [h, m] = startTime.split(':').map(Number);
      let endH = h + duration;
      if (endH >= 24) endH = endH - 24;
      const formatH = String(endH).padStart(2, '0');
      const formatM = String(m).padStart(2, '0');
      setEndTime(`${formatH}:${formatM}`);
    } else {
      setEndTime('');
    }
  }, [startTime, duration]);


  // If Bedridden was selected, and user changes location to accompany_outside only, remove Bedridden
  useEffect(() => {
    if (isAccompanyOnly && selectedServiceTypes.includes('ดูแลผู้ป่วยติดเตียง')) {
      setSelectedServiceTypes(prev => prev.filter(t => t !== 'ดูแลผู้ป่วยติดเตียง'));
      warning('เปลี่ยนประเภทบริการ: ระบบได้นำบริการ "ดูแลผู้ป่วยติดเตียง" ออกเนื่องจากไม่รองรับพิกัดภายนอกอย่างเดียว');
    }
  }, [isAccompanyOnly, selectedServiceTypes, warning]);

  // Proactively update duration in bookingDraft in the context so the cost estimator in the parent matches
  useEffect(() => {
    setBookingDraft(prev => ({
      ...prev,
      serviceLocation,
      serviceTypes: selectedServiceTypes,
      dateTime: {
        ...(prev?.dateTime || { date: '', slot: '', startTime: '', endTime: '' }),
        duration
      }
    }));
  }, [duration, serviceLocation, selectedServiceTypes, setBookingDraft]);

  const handleServiceTypeCheckbox = (serviceId: string) => {
    if (selectedServiceTypes.includes(serviceId)) {
      setSelectedServiceTypes(prev => prev.filter(item => item !== serviceId));
    } else {
      setSelectedServiceTypes(prev => [...prev, serviceId]);
    }
  };

  // Add Member Inline (removed)

  // Populate mock patient data
  const handleFetchProfileData = () => {
    setPatientName('สมศรี วงศ์ดี');
    setPatientAge('65');
    setPatientNickname('คุณแม่');
    setPatientGender('หญิง');
    setPatientWeight('58');
    setPatientHeight('155');
    setPatientSupportLevel('ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน');
    setPatientConditions(['เบาหวาน', 'ความดันสูง']);
    setOtherCondition('');
    setPatientMedicines('ยาลดความดัน, ยาเบาหวาน');
    setPatientAllergies('แพ้ยาเพนิซิลิน');
    setPatientBloodGroup('B');
    setPatientCareInstructions('เพิ่งผ่าตัดเปลี่ยนสะโพกมา 2 สัปดาห์ ยังช่วยพยุงเดินค่อนข้างช้า จำเป็นต้องพลิกตัวสม่ำเสมอ...');
    setPatientRegularHospital('รพ.รามาธิบดี');
    
    // Auto fill address if empty
    if (!address) {
      setAddress('123/45 ซอยลาดพร้าว 101 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240');
    }
    if (!province) {
      setProvince('กรุงเทพมหานคร');
    }
    if (!district) {
      setDistrict('บางกะปิ');
    }
    success('ดึงข้อมูลโปรไฟล์ผู้ป่วยเรียบร้อยแล้ว');
  };

  const handleConditionCheckbox = (cond: string) => {
    if (patientConditions.includes(cond)) {
      setPatientConditions(prev => prev.filter(c => c !== cond));
      if (cond === 'อื่นๆ') {
        setOtherCondition('');
      }
    } else {
      setPatientConditions(prev => [...prev, cond]);
    }
  };

  const handleToAddOtherCondition = () => {
    const val = otherCondition.trim();
    if (!val) return;
    setPatientConditions(prev => {
      if (prev.includes(val)) return prev;
      return [...prev.filter(c => c !== 'อื่นๆ'), val, 'อื่นๆ'];
    });
    setOtherCondition('');
    if (errors.otherCondition) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.otherCondition;
        return next;
      });
    }
  };

  const isTimeInSlot = (time: string, slotName: string) => {
    if (!time || !slotName) return true;
    const [h, m] = time.split(':').map(Number);
    const val = h + m / 60;
    if (slotName === 'morning') return val >= 8 && val <= 12;
    if (slotName === 'afternoon') return val >= 13 && val <= 17;
    if (slotName === 'evening') return val >= 18 && val <= 22;
    if (slotName === 'night') return val >= 22 || val <= 6;
    return true;
  };

  const handleStep1Submit = () => {
    const errs: Record<string, string> = {};
    if (serviceLocation.length === 0) errs.serviceLocation = 'กรุณาเลือกสถานที่ให้บริการ';
    if (selectedServiceTypes.length === 0) errs.serviceTypes = 'กรุณาเลือกประเภทบริการดูแลย่อยอย่างน้อย 1 ประเภท';
    
    if (!date) errs.date = 'กรุณาเลือกวันที่รับบริการ';
    if (!slot) {
      errs.slot = 'กรุณาเลือกช่วงเวลานัดหมาย';
    } else if (BUSY_SLOTS.includes(slot)) {
      errs.slot = 'ช่วงเวลานี้ไม่ว่าง กรุณาเลือกช่วงเวลาอื่น';
    }

    if (!startTime) {
      errs.startTime = 'กรุณาระบุเวลาเริ่ม';
    } else if (slot && !isTimeInSlot(startTime, slot)) {
      const slotLabels: Record<string, string> = {
        morning: 'ช่วงเช้า (08:00 - 12:00 น.)',
        afternoon: 'ช่วงบ่าย (13:00 - 17:00 น.)',
        evening: 'ช่วงเย็น (18:00 - 22:00 น.)',
        night: 'ช่วงดึก (22:00 - 06:00 น.)'
      };
      errs.startTime = `เวลาเริ่มต้นต้องอยู่ใน ${slotLabels[slot]}`;
    }

    if (serviceLocation.includes('at_home') || serviceLocation.includes('accompany_outside')) {
      if (!province) errs.province = 'กรุณาเลือกจังหวัด';
      if (!district) errs.district = 'กรุณาเลือกอำเภอ/เขต';
    }

    if (serviceLocation.includes('at_home')) {
      if (!address.trim()) errs.address = 'กรุณากรอกที่อยู่รับบริการ';
    }
    if (serviceLocation.includes('accompany_outside')) {
      if (!hospitalName.trim()) errs.hospitalName = 'กรุณาระบุสถานที่ปลายทาง';
      if (!meetingPoint.trim()) errs.meetingPoint = 'กรุณาระบุจุดนัดพบปลายทาง';
    }

    // Patient Form Validation
    if (!patientName.trim()) errs.patientName = 'กรุณากรอกชื่อ-นามสกุล คนไข้';
    if (!patientAge.trim()) errs.patientAge = 'กรุณากรอกอายุคนไข้';
    if (!patientGender) errs.patientGender = 'กรุณาเลือกเพศคนไข้';
    if (!patientWeight.trim()) errs.patientWeight = 'กรุณากรอกน้ำหนักคนไข้';
    if (!patientHeight.trim()) errs.patientHeight = 'กรุณากรอกส่วนสูงคนไข้';
    if (!patientSupportLevel) errs.patientSupportLevel = 'กรุณาเลือกระดับความสามารถในการช่วยเหลือตนเอง';
    if (!patientBloodGroup) errs.patientBloodGroup = 'กรุณาเลือกกรุ๊ปเลือด';
    if (patientConditions.includes('อื่นๆ') && !otherCondition.trim()) {
      errs.otherCondition = 'กรุณาระบุรายละเอียดเพิ่มเติม';
    }

    if (!contactName.trim()) errs.contactName = 'กรุณากรอกชื่อผู้ติดต่อ';
    if (!contactPhone.trim()) errs.contactPhone = 'กรุณากรอกเบอร์โทรศัพท์ผู้ติดต่อ';
    if (!contactRelationship.trim()) errs.contactRelationship = 'กรุณาระบุความสัมพันธ์ผู้ติดต่อ';

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      error('กรุณากรอกรายละเอียดในช่องที่จำเป็นให้ครบถ้วน');
      return;
    }

    // Generate Booking request draft
    const finalDraft: BookingRequest = {
      serviceLocation,
      serviceTypes: selectedServiceTypes,
      locationDetails: {
        province,
        district,
        at_home: serviceLocation.includes('at_home') ? { address, lat: latA, lng: lngA } : undefined,
        accompany_outside: serviceLocation.includes('accompany_outside') ? { hospitalName, meetingPoint, lat: latB, lng: lngB } : undefined
      },
      dateTime: {
        date,
        slot,
        startTime,
        duration,
        endTime
      },
      recipient: {
        type: recipientType,
        patientDetails: {
          name: patientName,
          age: Number(patientAge),
          nickname: patientNickname,
          gender: patientGender,
          weight: patientWeight ? Number(patientWeight) : undefined,
          height: patientHeight ? Number(patientHeight) : undefined,
          supportLevel: patientSupportLevel,
          conditions: finalConditions,
          medicines: patientMedicines,
          allergies: patientAllergies,
          bloodGroup: patientBloodGroup,
          careInstructions: patientCareInstructions,
          regularHospital: patientRegularHospital
        }
      },
      contactPerson: {
        name: contactName,
        phone: contactPhone,
        relationship: contactRelationship
      },
      jobDetails: bookingDraft?.jobDetails || {
        tasks: [],
        customTasks: [],
        notes: ''
      },
      estimatedCost: {
        hourlyRate: averageHourlyRate,
        hours: duration,
        platformFee: Math.round(averageHourlyRate * duration * 0.1),
        total: Math.round(averageHourlyRate * duration * 1.1)
      }
    };

    setBookingDraft(finalDraft);
    goToStep(2);
  };

  // Helper setter to handle recipient mapping relationship (removed)

  const isSameAsSaved = 
    patientName === SAVED_PROFILE.name &&
    patientAge === SAVED_PROFILE.age &&
    patientGender === SAVED_PROFILE.gender &&
    patientWeight === SAVED_PROFILE.weight &&
    patientHeight === SAVED_PROFILE.height &&
    patientSupportLevel === SAVED_PROFILE.supportLevel &&
    JSON.stringify([...finalConditions].sort()) === JSON.stringify([...SAVED_PROFILE.conditions].sort()) &&
    patientMedicines === SAVED_PROFILE.medicines &&
    patientAllergies === SAVED_PROFILE.allergies &&
    patientBloodGroup === SAVED_PROFILE.bloodGroup &&
    patientCareInstructions === SAVED_PROFILE.careInstructions &&
    patientRegularHospital === SAVED_PROFILE.regularHospital &&
    address === SAVED_PROFILE.address;

  const isFormBlank = 
    !patientName && 
    !patientAge && 
    !patientWeight && 
    !patientHeight && 
    !patientCareInstructions && 
    !patientMedicines && 
    !patientAllergies && 
    !patientRegularHospital && 
    !address;

  const showSaveCheckbox = !isSameAsSaved && !isFormBlank;

  return (
    <div className="space-y-6">
      
      {/* 1. Service Location */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-base font-bold text-[#1A1A1A] mb-4">สถานที่รับบริการ <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* At Home Card */}
          <div
            onClick={() => setServiceLocation(['at_home'])}
            className={`p-4 rounded-xl border-2 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[140px] ${
              serviceLocation.includes('at_home') && !serviceLocation.includes('accompany_outside')
                ? 'border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48]'
                : 'border-[#E0E2E5] hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <span className={`material-icons text-2xl ${serviceLocation.includes('at_home') && !serviceLocation.includes('accompany_outside') ? 'text-[#3A9A7E]' : 'text-[#8A8C8E]'}`}>home</span>
            </div>
            <h4 className="text-sm font-bold text-[#1A1A1A]">ดูแลที่บ้านผู้ป่วย</h4>
            <p className="text-xs text-[#8A8C8E] mt-1">ผู้ดูแลเดินทางไปดูแลผู้ป่วย ณ บ้านพักอาศัย</p>
          </div>

          {/* Accompany Outside Card */}
          <div
            onClick={() => setServiceLocation(['accompany_outside'])}
            className={`p-4 rounded-xl border-2 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[140px] ${
              serviceLocation.includes('accompany_outside') && !serviceLocation.includes('at_home')
                ? 'border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48]'
                : 'border-[#E0E2E5] hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <span className={`material-icons text-2xl ${serviceLocation.includes('accompany_outside') && !serviceLocation.includes('at_home') ? 'text-[#3A9A7E]' : 'text-[#8A8C8E]'}`}>local_hospital</span>
            </div>
            <h4 className="text-sm font-bold text-[#1A1A1A]">ร่วมเดินทางข้างนอก</h4>
            <p className="text-xs text-[#8A8C8E] mt-1">ผู้ดูแลติดตามและพยุงเดินดูแลข้างนอก เช่น ไปพบแพทย์</p>
          </div>

          {/* Both Card */}
          <div
            onClick={() => setServiceLocation(['at_home', 'accompany_outside'])}
            className={`p-4 rounded-xl border-2 transition cursor-pointer text-center flex flex-col items-center justify-center min-h-[140px] ${
              serviceLocation.includes('at_home') && serviceLocation.includes('accompany_outside')
                ? 'border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48]'
                : 'border-[#E0E2E5] hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <span className={`material-icons text-2xl ${serviceLocation.includes('at_home') && serviceLocation.includes('accompany_outside') ? 'text-[#3A9A7E]' : 'text-[#8A8C8E]'}`}>home_work</span>
            </div>
            <h4 className="text-sm font-bold text-[#1A1A1A]">ทั้งสองสถานที่</h4>
            <p className="text-xs text-[#8A8C8E] mt-1">ผู้ดูแลเดินทางไปดูแลทั้งที่บ้านและร่วมเดินทางภายนอก</p>
          </div>
        </div>
        {errors.serviceLocation && <p className="text-red-500 text-xs mt-2">{errors.serviceLocation}</p>}
      </div>

      {/* 2. Service Subtypes */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-4">
          <h3 className="text-base font-bold text-[#1A1A1A]">ประเภทการบริการดูแลย่อย <span className="text-red-500">*</span></h3>
          <p className="text-xs text-[#8A8C8E] mt-1">เลือกประเภทงานที่ต้องการให้ผู้ดูแลช่วยเหลือ (สามารถเลือกได้มากกว่า 1 ข้อ)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceOptions.map((opt) => (
            <div
              key={opt.id}
              onClick={() => !opt.disabled && handleServiceTypeCheckbox(opt.id)}
              className={`p-4 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                opt.disabled
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : selectedServiceTypes.includes(opt.id)
                  ? 'border-[#52B69A] bg-[#F0FAF4]'
                  : 'border-[#E0E2E5] hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedServiceTypes.includes(opt.id)}
                disabled={opt.disabled}
                onChange={() => {}}
                className="w-4 h-4 text-[#52B69A] border-gray-300 rounded focus:ring-[#52B69A] mt-1 pointer-events-none"
              />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#1A1A1A]">{opt.label}</h4>
                <p className="text-xs text-[#8A8C8E] mt-1">{opt.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {errors.serviceTypes && <p className="text-red-500 text-xs mt-2">{errors.serviceTypes}</p>}
      </div>

      {/* 3. Date & Time */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-base font-bold text-[#1A1A1A]">วันและเวลาให้บริการ <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date picker */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#575859]">วันที่ให้บริการ</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 pl-10 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
              />
              <span className="absolute left-3 top-3.5 material-icons text-[#AAB2BA] text-sm">calendar_today</span>
            </div>
            {errors.date && <p className="text-red-500 text-xs">{errors.date}</p>}
          </div>

          {/* Time Slot dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#575859]">ช่วงเวลานัดหมาย</label>
            <div className="relative">
              <select
                value={slot}
                onChange={(e) => {
                  const newSlot = e.target.value;
                  setSlot(newSlot);
                  const slotDefaults: Record<string, string> = {
                    morning: '08:00',
                    afternoon: '13:00',
                    evening: '18:00',
                    night: '22:00',
                  };
                  if (newSlot && slotDefaults[newSlot]) {
                    setStartTime(slotDefaults[newSlot]);
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.startTime;
                      delete next.slot;
                      return next;
                    });
                  } else {
                    setStartTime('');
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.startTime;
                      return next;
                    });
                  }
                }}
                className="w-full p-3 pr-10 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A] appearance-none"
              >
                <option value="">-- เลือกช่วงเวลา --</option>
                <option value="morning" disabled={BUSY_SLOTS.includes('morning')}>
                  ช่วงเช้า (08:00 - 12:00 น.) {BUSY_SLOTS.includes('morning') && '(ไม่ว่าง)'}
                </option>
                <option value="afternoon" disabled={BUSY_SLOTS.includes('afternoon')} className={BUSY_SLOTS.includes('afternoon') ? 'text-gray-300 bg-gray-50' : ''}>
                  ช่วงบ่าย (13:00 - 17:00 น.) {BUSY_SLOTS.includes('afternoon') && '(ไม่ว่าง)'}
                </option>
                <option value="evening" disabled={BUSY_SLOTS.includes('evening')}>
                  ช่วงเย็น (18:00 - 22:00 น.) {BUSY_SLOTS.includes('evening') && '(ไม่ว่าง)'}
                </option>
                <option value="night" disabled={BUSY_SLOTS.includes('night')} className={BUSY_SLOTS.includes('night') ? 'text-gray-300 bg-gray-50' : ''}>
                  ช่วงดึก (22:00 - 06:00 น.) {BUSY_SLOTS.includes('night') && '(ไม่ว่าง)'}
                </option>
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base pointer-events-none">
                keyboard_arrow_down
              </span>
            </div>
            {errors.slot && <p className="text-red-500 text-xs">{errors.slot}</p>}
          </div>
        </div>

        {/* Dynamic nested box for time start & hours picker */}
        {date && slot && (
          <div className="bg-[#F6FAF9] p-4 rounded-xl border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Time picker */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#575859]">ระบุเวลาเริ่มงาน</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartTime(val);
                    if (slot && val) {
                      if (!isTimeInSlot(val, slot)) {
                        const slotLabels: Record<string, string> = {
                          morning: 'ช่วงเช้า (08:00 - 12:00 น.)',
                          afternoon: 'ช่วงบ่าย (13:00 - 17:00 น.)',
                          evening: 'ช่วงเย็น (18:00 - 22:00 น.)',
                          night: 'ช่วงดึก (22:00 - 06:00 น.)'
                        };
                        setErrors(prev => ({
                          ...prev,
                          startTime: `เวลาเริ่มต้นต้องอยู่ใน ${slotLabels[slot]}`
                        }));
                      } else {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.startTime;
                          return next;
                        });
                      }
                    } else if (!val) {
                      setErrors(prev => ({
                        ...prev,
                        startTime: 'กรุณาระบุเวลาเริ่ม'
                      }));
                    } else {
                      setErrors(prev => {
                        const next = { ...prev };
                        delete next.startTime;
                        return next;
                      });
                    }
                  }}
                  className={`w-full p-3 border rounded-xl text-sm bg-white focus:outline-none ${
                    errors.startTime ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-1 focus:ring-[#52B69A]'
                  }`}
                />
                <span className="text-[11px] text-[#8A8C8E] block">ต้องมีเวลาทำบริการอย่างน้อย 2 ชม. ก่อนสิ้นสุดรอบ</span>
                {errors.startTime && <p className="text-red-500 text-xs">{errors.startTime}</p>}
              </div>

              {/* Duration select via buttons */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#575859]">ระยะเวลา (ชั่วโมง)</label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 6, 8].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                        duration === h
                          ? 'bg-[#52B69A] border-[#52B69A] text-white'
                          : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                      }`}
                    >
                      {h} ชม.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-3">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#575859]">เวลาสิ้นสุดอัตโนมัติ</label>
                <input
                  type="text"
                  disabled
                  value={endTime || '--:--'}
                  className="w-full p-3 border border-[#E0E2E5] bg-gray-100 text-[#8A8C8E] rounded-xl text-sm font-semibold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Location Details Section */}
      {(serviceLocation.includes('at_home') || serviceLocation.includes('accompany_outside')) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-base font-bold text-[#1A1A1A]">ที่อยู่ดูแลและจุดนัดพบภายนอก <span className="text-red-500">*</span></h3>

          {/* District & Province filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#575859]">จังหวัด <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={province}
                  disabled={!addressDbReady}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setDistrict('');
                  }}
                  className={`w-full p-3 pr-10 border rounded-xl text-sm bg-white focus:outline-none appearance-none ${
                    !addressDbReady ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' :
                    errors.province ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-1 focus:ring-[#52B69A]'
                  }`}
                >
                  <option value="">{addressDbReady ? '-- เลือกจังหวัด --' : 'กำลังโหลดข้อมูลจังหวัด...'}</option>
                  {provincesList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base pointer-events-none">
                  keyboard_arrow_down
                </span>
              </div>
              {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#575859]">อำเภอ/เขต <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!province || !addressDbReady}
                  className={`w-full p-3 pr-10 border rounded-xl text-sm bg-white focus:outline-none appearance-none ${
                    (!province || !addressDbReady) ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' :
                    errors.district ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-1 focus:ring-[#52B69A]'
                  }`}
                >
                  <option value="">-- เลือกอำเภอ/เขต --</option>
                  {districtsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base pointer-events-none">
                  keyboard_arrow_down
                </span>
              </div>
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
            </div>
          </div>

          {/* At Home Location address field */}
          {serviceLocation.includes('at_home') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <label className="block text-sm font-bold text-[#575859]">สถานที่ดูแล (ที่บ้าน)</label>
                <button
                  type="button"
                  onClick={() => {
                    setAddress(SAVED_PROFILE.address);
                    setProvince('กรุงเทพมหานคร');
                    setDistrict('บางกะปิ');
                    setLatA(13.736717);
                    setLngA(100.560543);
                    success('ใช้ข้อมูลที่อยู่จากประวัติส่วนตัวเรียบร้อยแล้ว');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#52B69A] text-[#52B69A] bg-white hover:bg-[#52B69A]/5 transition rounded-lg text-xs font-bold cursor-pointer"
                >
                  <span className="material-icons text-sm">home</span>
                  ใช้ที่อยู่จากประวัติส่วนตัว
                </button>
              </div>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="รายละเอียดที่อยู่ เช่น เลขที่บ้าน ซอย ถนน แขวง เขต รหัสไปรษณีย์ ประเทศไทย"
                className="w-full p-3 border border-[#E0E2E5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
              />
              {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
            </div>
          )}

          {/* Accompany Outside Location Destination address field */}
          {serviceLocation.includes('accompany_outside') && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#575859]">จุดจัดส่ง / สถานที่ปลายทางภายนอก</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative" ref={suggestionsRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDestinationQuery(val);
                        setHospitalName(val);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="พิมพ์ค้นหาสถานที่ปลายทางภายนอก..."
                      className={`w-full p-3 pr-10 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                        errors.hospitalName ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-[#52B69A]'
                      }`}
                    />
                    {isSearching ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-[#52B69A] text-base animate-spin">
                        sync
                      </span>
                    ) : (
                      destinationQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setDestinationQuery('');
                            setHospitalName('');
                            setSuggestions([]);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base hover:text-gray-600 cursor-pointer animate-fadeIn"
                        >
                          clear
                        </button>
                      )
                    )}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[2000] max-h-[220px] overflow-y-auto divide-y divide-gray-100">
                      {suggestions.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            const lat = parseFloat(item.lat);
                            const lng = parseFloat(item.lon);
                            const name = item.display_name;
                            setHospitalName(name);
                            setDestinationQuery(name);
                            setLatB(lat);
                            setLngB(lng);
                            setShowSuggestions(false);
                          }}
                          className="p-3 hover:bg-gray-50 cursor-pointer text-xs text-[#1A1A1A] transition flex items-start gap-2 text-left"
                        >
                          <span className="material-icons text-[#8A8C8E] text-sm mt-0.5">location_on</span>
                          <div>
                            <p className="font-semibold text-gray-800">{item.display_name.split(',')[0]}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{item.display_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showSuggestions && suggestions.length === 0 && destinationQuery.trim().length >= 3 && !isSearching && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[2000] p-4 text-center text-xs text-[#8A8C8E]">
                      ไม่พบสถานที่นี้ ลองพิมพ์ค้นหาใหม่อีกครั้ง
                    </div>
                  )}
                  {errors.hospitalName && <p className="text-red-500 text-xs mt-1">{errors.hospitalName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    placeholder="จุดนัดพบ หรือ สถานที่ปลายทางด้านนอกอย่างละเอียด"
                    className={`w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-1 ${
                      errors.meetingPoint ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-[#52B69A]'
                    }`}
                  />
                  {errors.meetingPoint && <p className="text-red-500 text-xs mt-1">{errors.meetingPoint}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Map coordination */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#8A8C8E] block">
              ระบุพิกัดสถานที่ในแผนที่ (สามารถลากตัวปักหมุดเพื่อระบุตำแหน่งที่แน่นอนได้)
            </span>
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
              showPinB={serviceLocation.includes('accompany_outside')}
            />
          </div>
        </div>
      )}

      {/* 5. Care Recipient Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-[#1A1A1A]">บุคคลผู้รับบริการ <span className="text-red-500">*</span></h3>
          <button
            type="button"
            onClick={handleFetchProfileData}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#52B69A] text-[#52B69A] bg-white hover:bg-[#52B69A]/5 transition rounded-lg text-xs font-bold cursor-pointer"
          >
            <span className="material-icons text-sm">person</span>
            ใช้ข้อมูลโปรไฟล์ของฉัน
          </button>
        </div>

        {/* Detailed Patient Health Form Area */}
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 space-y-4 pt-4">
          <h4 className="text-sm font-bold text-[#1A1A1A] border-b pb-2">แบบฟอร์มรายละเอียดทางสุขภาพ (แก้ไขเพิ่มเติมได้ที่นี่)</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-[#575859]">ชื่อ-นามสกุล คนไข้ <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="กรอกชื่อ-นามสกุลจริงคนไข้"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
              {errors.patientName && <p className="text-red-500 text-[11px]">{errors.patientName}</p>}
            </div>
            <div className="space-y-1 md:col-span-1">
              <label className="text-xs font-semibold text-[#575859]">อายุ (ปี) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="เช่น 72"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
              {errors.patientAge && <p className="text-red-500 text-[11px]">{errors.patientAge}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#575859] block">เพศคนไข้ <span className="text-red-500">*</span></label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold text-[#1A1A1A]">
                  <input
                    type="radio"
                    name="patientGender"
                    checked={patientGender === 'ชาย'}
                    onChange={() => setPatientGender('ชาย')}
                    className="text-[#52B69A] focus:ring-[#52B69A]"
                  />
                  ชาย
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold text-[#1A1A1A]">
                  <input
                    type="radio"
                    name="patientGender"
                    checked={patientGender === 'หญิง'}
                    onChange={() => setPatientGender('หญิง')}
                    className="text-[#52B69A] focus:ring-[#52B69A]"
                  />
                  หญิง
                </label>
              </div>
              {errors.patientGender && <p className="text-red-500 text-[11px]">{errors.patientGender}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859]">น้ำหนัก (กิโลกรัม) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={patientWeight}
                onChange={(e) => setPatientWeight(e.target.value)}
                placeholder="เช่น 54"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
              {errors.patientWeight && <p className="text-red-500 text-[11px]">{errors.patientWeight}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859]">ส่วนสูง (เซนติเมตร) <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={patientHeight}
                onChange={(e) => setPatientHeight(e.target.value)}
                placeholder="เช่น 155"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
              {errors.patientHeight && <p className="text-red-500 text-[11px]">{errors.patientHeight}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859] block">ระดับความสามารถในการช่วยเหลือตนเอง <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={patientSupportLevel}
                  onChange={(e) => setPatientSupportLevel(e.target.value)}
                  className="w-full p-2.5 pr-10 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none appearance-none"
                >
                  <option value="ช่วยเหลือตัวเองได้ดี">ช่วยเหลือตัวเองได้ดี</option>
                  <option value="ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน">ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน</option>
                  <option value="ช่วยเหลือตัวเองไม่ได้ / ติดเตียง">ช่วยเหลือตัวเองไม่ได้ / ติดเตียง</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base pointer-events-none">
                  keyboard_arrow_down
                </span>
              </div>
              {errors.patientSupportLevel && <p className="text-red-500 text-[11px]">{errors.patientSupportLevel}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859] block">กรุ๊ปเลือด <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={patientBloodGroup}
                  onChange={(e) => setPatientBloodGroup(e.target.value)}
                  className="w-full p-2.5 pr-10 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none appearance-none"
                >
                  <option value="">-- เลือกกรุ๊ปเลือด --</option>
                  <option value="A">กรุ๊ป A</option>
                  <option value="B">กรุ๊ป B</option>
                  <option value="AB">กรุ๊ป AB</option>
                  <option value="O">กรุ๊ป O</option>
                  <option value="A+">กรุ๊ป A+</option>
                  <option value="B+">กรุ๊ป B+</option>
                  <option value="AB+">กรุ๊ป AB+</option>
                  <option value="O+">กรุ๊ป O+</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 material-icons text-[#AAB2BA] text-base pointer-events-none">
                  keyboard_arrow_down
                </span>
              </div>
              {errors.patientBloodGroup && <p className="text-red-500 text-[11px]">{errors.patientBloodGroup}</p>}
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="text-xs font-semibold text-[#575859] block">โรคประจำตัวหรือประเด็นสุขภาพหลัก</label>
            <div className="flex flex-wrap gap-2">
              {[...PREDEFINED_CONDITIONS, ...patientConditions.filter(c => !PREDEFINED_CONDITIONS.includes(c) && c !== 'อื่นๆ'), 'อื่นๆ'].map(cond => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => handleConditionCheckbox(cond)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition cursor-pointer ${
                    patientConditions.includes(cond)
                      ? 'bg-[#F0FAF4] border-[#52B69A] text-[#1B5C48]'
                      : 'bg-white border-[#E0E2E5] text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
            {patientConditions.includes('อื่นๆ') && (
              <div>
                <div className="mt-2 animate-fadeIn flex gap-2 w-full">
                  <input
                    type="text"
                    value={otherCondition}
                    onChange={(e) => {
                      setOtherCondition(e.target.value);
                      if (e.target.value.trim() && errors.otherCondition) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.otherCondition;
                          return next;
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleToAddOtherCondition();
                      }
                    }}
                    placeholder="โปรดระบุโรคประจำตัวหรือประเด็นสุขภาพอื่นๆ"
                    className={`flex-1 p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 ${
                      errors.otherCondition ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E2E5] focus:ring-[#52B69A]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleToAddOtherCondition}
                    className="px-4 py-2 bg-[#52B69A] text-white text-xs font-bold rounded-lg hover:bg-[#52B69A]/95 transition cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
                {errors.otherCondition && <p className="text-red-500 text-xs mt-1">{errors.otherCondition}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859]">ยาประจำตัวที่คนไข้ต้องรับประทานสม่ำเสมอ</label>
              <input
                type="text"
                value={patientMedicines}
                onChange={(e) => setPatientMedicines(e.target.value)}
                placeholder="ระบุชื่อยา วิธีทาน และมื้อที่ทาน"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#575859]">ประวัติการแพ้ยา / แพ้อาหาร (ระบุเด่นชัด)</label>
              <input
                type="text"
                value={patientAllergies}
                onChange={(e) => setPatientAllergies(e.target.value)}
                placeholder="ระบุสิ่งที่แพ้ เช่น แพ้ยาแก้อักเสบ, แพ้อาหารทะเล"
                className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="text-xs font-semibold text-[#575859]">ข้อมูลบันทึกทางสุขภาพเพิ่มเติม (จำกัด 500 ตัวอักษร)</label>
            <textarea
              rows={3}
              value={patientCareInstructions}
              onChange={(e) => setPatientCareInstructions(e.target.value)}
              placeholder="เช่น เพิ่งผ่าตัดเปลี่ยนสะโพกมา 2 สัปดาห์ ยังช่วยพยุงเดินค่อนข้างช้า จำเป็นต้องพลิกตัวสม่ำเสมอ..."
              className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#575859]">โรงพยาบาลที่ใช้บริการประจำ</label>
            <input
              type="text"
              value={patientRegularHospital}
              onChange={(e) => setPatientRegularHospital(e.target.value)}
              placeholder="เช่น โรงพยาบาลศิริราช"
              className="w-full p-2.5 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none"
            />
          </div>

          {showSaveCheckbox && (
            <div className="flex items-center gap-2 p-4 border border-[#52B69A]/20 bg-[#52B69A]/5 rounded-xl">
              <input
                type="checkbox"
                id="saveForLater"
                checked={saveForLater}
                onChange={(e) => setSaveForLater(e.target.checked)}
                className="w-4 h-4 text-[#52B69A] border-gray-300 rounded focus:ring-[#52B69A] cursor-pointer"
              />
              <label htmlFor="saveForLater" className="text-xs font-semibold text-[#2D6A4F] cursor-pointer">
                บันทึกข้อมูลสมาชิกนี้ไว้ใช้ในคราวหน้า
              </label>
            </div>
          )}
        </div>
      </div>

      {/* 6. Emergency/On-day Contact Person */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-base font-bold text-[#1A1A1A]">ผู้ติดต่อในวันนัดหมาย <span className="text-red-500">*</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#575859]">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="เช่น นายสมบูรณ์ ดีจริง"
              className="w-full p-3 border border-[#E0E2E5] rounded-xl text-sm focus:outline-none"
            />
            {errors.contactName && <p className="text-red-500 text-xs">{errors.contactName}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#575859]">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="เช่น 089xxxxxxx"
              className="w-full p-3 border border-[#E0E2E5] rounded-xl text-sm focus:outline-none"
            />
            {errors.contactPhone && <p className="text-red-500 text-xs">{errors.contactPhone}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#575859]">ความสัมพันธ์</label>
            <input
              type="text"
              value={contactRelationship}
              onChange={(e) => setContactRelationship(e.target.value)}
              placeholder="เช่น บุตร, ตนเอง, เพื่อนบ้าน"
              className="w-full p-3 border border-[#E0E2E5] rounded-xl text-sm focus:outline-none"
            />
            {errors.contactRelationship && <p className="text-red-500 text-xs">{errors.contactRelationship}</p>}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleStep1Submit}
          className="px-6 py-3 bg-[#52B69A] text-white rounded-xl font-bold shadow-md hover:bg-[#52B69A]/95 transition cursor-pointer flex items-center gap-2"
        >
          ดำเนินการต่อ
          <span className="material-icons text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
