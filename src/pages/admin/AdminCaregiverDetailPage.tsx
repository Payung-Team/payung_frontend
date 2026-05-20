import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import Icon from '../../components/ui/Icon';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import KycDocumentsPreview from '../../components/ui/KycDocumentsPreview';
import KycHistoryCard from '../../components/ui/KycHistoryCard';

// ─── GraphQL Queries ────────────────────────────────────────────────────────

const ADMIN_KYC_DETAIL_LOCAL = gql`
  query AdminKycDetailLocal($caregiverId: ID!) {
    adminKycDetail(caregiverId: $caregiverId) {
      caregiver {
        id
        userId
        kycStatus
      }
      documents {
        id
        docType
        fileName
        fileUrl
        fileSize
        mimeType
        signedUrl
        uploadedAt
      }
      reviews {
        id
        action
        reason
        reviewedBy
        reviewerName
        reviewedAt
      }
      editHistory {
        id
        action
        editorName
        createdAt
        fieldChanges {
          field
          oldValue
          newValue
        }
      }
    }
  }
`;

const GET_ADMIN_CAREGIVER_DETAIL = gql`
  query GetAdminCaregiverDetail($userId: ID!) {
    adminUserDetail(userId: $userId) {
      user {
        id
        email
        displayName
        isActive
        avatarUrl
        createdAt
      }
      caregiver {
        id
        userId
        caregiverNumber
        fullName
        email
        idCardNumber
        gender
        dateOfBirth
        address
        phone
        skills
        experienceYears
        hourlyRate
        bio
        kycStatus
        kycSubmittedAt
        kycVerifiedAt
        resubmitCount
        createdAt
        updatedAt
      }
      isSuspended
      kycStatus
    }
  }
`;

// ─── Helpers & Mappings ─────────────────────────────────────────────────────

const statusMeta = {
  pending: {
    label: 'รอตรวจสอบ',
    badgeClass: 'bg-[#FFFBEB] text-[#92400E]',
    dotClass: 'bg-[#F59E0B]',
  },
  verified: {
    label: 'อนุมัติแล้ว',
    badgeClass: 'bg-[#ECFDF5] text-[#047857]',
    dotClass: 'bg-[#059669]',
  },
  rejected: {
    label: 'ปฏิเสธ',
    badgeClass: 'bg-[#FEF2F2] text-[#991B1B]',
    dotClass: 'bg-[#DC2626]',
  },
  none: {
    label: 'ไม่มีข้อมูล',
    badgeClass: 'bg-gray-100 text-gray-500',
    dotClass: 'bg-gray-400',
  }
};

const docTypeLabels: Record<string, string> = {
  id_card: 'บัตรประชาชน',
  id_card_front: 'บัตรประชาชน (ด้านหน้า)',
  id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
  certificate: 'ใบรับรองการอบรม',
  photo: 'รูปถ่ายหน้าตรง',
  license: 'ใบอนุญาตประกอบวิชาชีพ',
};

const formattedDate = (dateStr?: string | null, monthType: 'long' | 'short' = 'long') => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
      day: 'numeric',
      month: monthType,
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const maskIdCard = (idCard?: string) => {
  if (!idCard) return '-';
  const cleanId = idCard.replace(/-/g, '');
  if (cleanId.length < 4) return cleanId;
  return '*********' + cleanId.slice(-4);
};




export default function AdminCaregiverDetailPage() {
  const { caregiverId } = useParams<{ caregiverId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'kyc'>('general');

  // 1. Fetch User & Caregiver Details by userId
  const { data: userDetailData, loading: userDetailLoading, error: userDetailError } = useQuery(
    GET_ADMIN_CAREGIVER_DETAIL,
    {
      variables: { userId: caregiverId },
      skip: !caregiverId,
      fetchPolicy: 'cache-and-network',
    }
  );

  const caregiver = userDetailData?.adminUserDetail?.caregiver;
  const user = userDetailData?.adminUserDetail?.user;

  // 2. Fetch KYC Documents & Reviews using caregiver.id
  const { data: kycDetailData, loading: kycDetailLoading } = useQuery(
    ADMIN_KYC_DETAIL_LOCAL,
    {
      variables: { caregiverId: caregiver?.id },
      skip: !caregiver?.id,
      fetchPolicy: 'cache-and-network',
    }
  );

  const documents = kycDetailData?.adminKycDetail?.documents ?? [];
  const reviews = kycDetailData?.adminKycDetail?.reviews ?? [];




  const isLoading = userDetailLoading || (caregiver?.id && kycDetailLoading);

  const currentStatusMeta = caregiver?.kycStatus
    ? (statusMeta[caregiver.kycStatus as keyof typeof statusMeta] ?? statusMeta.none)
    : statusMeta.none;

  const isSuspended = userDetailData?.adminUserDetail?.isSuspended;

  const editLogs = kycDetailData?.adminKycDetail?.editHistory ?? [];
  const isActive = user?.isActive && !isSuspended;

  // Split full name
  const nameParts = useMemo(() => {
    if (!caregiver?.fullName) return { firstName: '-', lastName: '-' };
    const parts = caregiver.fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || '-',
      lastName: parts.slice(1).join(' ') || '-',
    };
  }, [caregiver?.fullName]);

  // States for locked/unlocked fields and their editable values
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({
    firstName: false,
    lastName: false,
    idCardNumber: false,
    email: false,
  });

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    idCardNumber: '',
    email: '',
  });

  const [savedOverrides, setSavedOverrides] = useState<Record<string, string> | null>(null);

  // Track initial values to detect changes
  const initialValues = useMemo(() => {
    const fn = savedOverrides?.firstName || (caregiver?.fullName ? caregiver.fullName.trim().split(/\s+/)[0] : '-');
    const ln = savedOverrides?.lastName || (caregiver?.fullName ? caregiver.fullName.trim().split(/\s+/).slice(1).join(' ') : '-');
    const ic = savedOverrides?.idCardNumber || caregiver?.idCardNumber || '';
    const em = savedOverrides?.email || caregiver?.email || user?.email || '';
    return {
      firstName: fn,
      lastName: ln,
      idCardNumber: ic,
      email: em,
    };
  }, [caregiver, user, savedOverrides]);

  // Sync fieldValues when initial values change (e.g. on load)
  useEffect(() => {
    setFieldValues({
      firstName: initialValues.firstName,
      lastName: initialValues.lastName,
      idCardNumber: initialValues.idCardNumber,
      email: initialValues.email,
    });
  }, [initialValues]);

  const toggleLock = (field: string) => {
    setUnlockedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isModified = useMemo(() => {
    return (
      fieldValues.firstName !== initialValues.firstName ||
      fieldValues.lastName !== initialValues.lastName ||
      fieldValues.idCardNumber !== initialValues.idCardNumber ||
      fieldValues.email !== initialValues.email
    );
  }, [fieldValues, initialValues]);

  const handleSave = () => {
    setSavedOverrides({
      firstName: fieldValues.firstName,
      lastName: fieldValues.lastName,
      idCardNumber: fieldValues.idCardNumber,
      email: fieldValues.email,
    });
    setUnlockedFields({
      firstName: false,
      lastName: false,
      idCardNumber: false,
      email: false,
    });
  };

  const handleCancel = () => {
    setFieldValues({
      firstName: initialValues.firstName,
      lastName: initialValues.lastName,
      idCardNumber: initialValues.idCardNumber,
      email: initialValues.email,
    });
    setUnlockedFields({
      firstName: false,
      lastName: false,
      idCardNumber: false,
      email: false,
    });
  };

  if (isLoading && !userDetailData) {
    return (
      <div className="bg-[#F9FAFB] min-h-screen flex items-center justify-center" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
        <div className="flex flex-col items-center gap-3">
          <span className="material-icons animate-spin text-4xl text-[#059669]">refresh</span>
          <p className="text-sm font-semibold text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (userDetailError || !caregiver) {
    return (
      <div className="bg-[#F9FAFB] min-h-screen text-gray-900 pb-12" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
        <section className="mx-auto max-w-[1312px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
              <Icon name="error" variant="outlined" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">โหลดรายละเอียดผู้ดูแลไม่สำเร็จ</h2>
            <p className="mt-1 text-sm text-gray-500">{userDetailError?.message || 'ไม่พบข้อมูลผู้ดูแลรายนี้'}</p>
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="mt-4 inline-flex h-9 items-center gap-1 rounded-md bg-[#059669] px-4 text-sm font-semibold text-white hover:bg-[#047857] transition-colors cursor-pointer"
            >
              กลับหน้าจัดการผู้ใช้
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-screen text-gray-900 pb-12" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
      {/* ─── Breadcrumb Header ─── */}
      <section className="mx-auto max-w-[1312px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="inline-flex h-8 items-center gap-1 rounded-md bg-[#F3F4F6] px-3 text-xs font-semibold leading-4 text-[#374151] hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <Icon name="arrow_back" size="small" />
              กลับ
            </button>
            <div>
              <h2 className="text-xl font-bold leading-7 text-[#064E3B]">แก้ไขโปรไฟล์</h2>
              <p className="text-xs text-gray-500 mt-0.5">ข้อมูลโปรไฟล์ที่ล็อคบนหน้าโปรไฟล์ของผู้ดูแล</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-500">สถานะปัจจุบัน:</span>
            <StatusBadge
              label={currentStatusMeta.label}
              badgeClass={`${currentStatusMeta.badgeClass} px-3 py-1 text-sm font-semibold`}
              dotClass={currentStatusMeta.dotClass}
            />
          </div>
        </div>
      </section>

      {/* ─── Main Content Layout ─── */}
      <main className="mx-auto max-w-[1312px] px-4 sm:px-6 lg:px-8 mt-4 grid gap-6 lg:grid-cols-[340px_1fr]">

        {/* Left Column: Side Card & History */}
        <aside className="space-y-6">
          {/* Side Profile Card */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col items-center text-center">
            {/* Avatar */}
            <Avatar
              name={caregiver.fullName}
              size={96}
              src={user?.avatarUrl || undefined}
              className="text-[#0D9488] mb-4"
            />

            <h3 className="font-bold text-gray-900 text-base">
              {caregiver.fullName}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{caregiver.email || user?.email}</p>

            <div className="w-full border-t border-gray-100 my-4" />

            <div className="w-full text-left space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-400 block">รหัสประจำตัวผู้ดูแล</span>
                <span className="text-sm font-semibold text-gray-700">{caregiver.caregiverNumber || caregiver.id.slice(0, 6)}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 block">เข้าร่วมเมื่อ</span>
                <span className="text-sm font-semibold text-gray-700">{formattedDate(user?.createdAt)}</span>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400 block">สถานะการใช้งาน</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#059669]' : 'bg-gray-400'}`} />
                  {isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit History Card */}
          <KycHistoryCard
            caregiver={caregiver}
            reviews={reviews}
            editHistory={editLogs}
            onlyKycLogs={false}
          />

        </aside>

        {/* Right Column: Tabbed Content Cards */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 gap-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'general' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              ข้อมูลส่วนตัว
            </button>
            <button
              onClick={() => setActiveTab('kyc')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'kyc' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              ข้อมูล KYC & เอกสาร
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] min-h-[400px]">
            {activeTab === 'general' && (
              <div className="space-y-8">
                {/* Card 1: ข้อมูลที่ล็อค */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="lock" className="text-[#059669]" />
                      <h4 className="text-base font-bold text-[#064E3B]">ข้อมูลที่ล็อค</h4>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>กดปุ่ม</span>
                      <Icon name="lock" size="small" className="text-gray-400" />
                      <span>เพื่อปลดล็อคก่อนแก้ไข</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="inline-flex items-center text-xs font-semibold text-gray-500 mb-1">
                        หมายเลขประจำตัวผู้ดูแล
                        <span className="group relative flex items-center select-none">
                          <Icon name="info" size="small" className="text-gray-400 ml-1 cursor-help" />
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center">
                            <span className="relative z-10 rounded bg-[#1F2937] px-2 py-1 text-[10px] font-normal leading-4 text-white shadow-md whitespace-nowrap">
                              ไม่สามารถแก้ไขได้
                            </span>
                            <span className="-mt-1 h-1.5 w-1.5 rotate-45 bg-[#1F2937]" />
                          </span>
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={caregiver.caregiverNumber || ''}
                          disabled
                          readOnly
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-sm text-gray-500 outline-none cursor-not-allowed"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                          <Icon name="lock" size="small" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อ</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={fieldValues.firstName}
                            onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            disabled={!unlockedFields.firstName}
                            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all ${
                              unlockedFields.firstName
                                ? 'border-[#059669] bg-white text-gray-900 focus:ring-1 focus:ring-[#059669] focus:border-[#059669]'
                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                          />
                          <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                            unlockedFields.firstName ? 'text-[#059669]' : 'text-gray-400'
                          }`}>
                            <Icon name={unlockedFields.firstName ? 'lock_open' : 'lock'} size="small" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLock('firstName')}
                          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            unlockedFields.firstName
                              ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Icon name={unlockedFields.firstName ? 'lock_open' : 'lock'} size="small" />
                        </button>
                      </div>
                      {fieldValues.firstName !== initialValues.firstName && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-[#059669]">
                          <Icon name="check" size="small" />
                          <span>เปลี่ยนจาก "{initialValues.firstName}" เป็น "{fieldValues.firstName}"</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">นามสกุล</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={fieldValues.lastName}
                            onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            disabled={!unlockedFields.lastName}
                            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all ${
                              unlockedFields.lastName
                                ? 'border-[#059669] bg-white text-gray-900 focus:ring-1 focus:ring-[#059669] focus:border-[#059669]'
                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                          />
                          <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                            unlockedFields.lastName ? 'text-[#059669]' : 'text-gray-400'
                          }`}>
                            <Icon name={unlockedFields.lastName ? 'lock_open' : 'lock'} size="small" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLock('lastName')}
                          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            unlockedFields.lastName
                              ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Icon name={unlockedFields.lastName ? 'lock_open' : 'lock'} size="small" />
                        </button>
                      </div>
                      {fieldValues.lastName !== initialValues.lastName && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-[#059669]">
                          <Icon name="check" size="small" />
                          <span>เปลี่ยนจาก "{initialValues.lastName}" เป็น "{fieldValues.lastName}"</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">เลขประจำตัวประชาชน</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={unlockedFields.idCardNumber ? fieldValues.idCardNumber : maskIdCard(fieldValues.idCardNumber)}
                            onChange={(e) => handleFieldChange('idCardNumber', e.target.value)}
                            disabled={!unlockedFields.idCardNumber}
                            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all ${
                              unlockedFields.idCardNumber
                                ? 'border-[#059669] bg-white text-gray-900 focus:ring-1 focus:ring-[#059669] focus:border-[#059669]'
                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                          />
                          <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                            unlockedFields.idCardNumber ? 'text-[#059669]' : 'text-gray-400'
                          }`}>
                            <Icon name={unlockedFields.idCardNumber ? 'lock_open' : 'lock'} size="small" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLock('idCardNumber')}
                          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            unlockedFields.idCardNumber
                              ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Icon name={unlockedFields.idCardNumber ? 'lock_open' : 'lock'} size="small" />
                        </button>
                      </div>
                      {fieldValues.idCardNumber !== initialValues.idCardNumber && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-[#059669]">
                          <Icon name="check" size="small" />
                          <span>เปลี่ยนจาก "{maskIdCard(initialValues.idCardNumber)}" เป็น "{maskIdCard(fieldValues.idCardNumber)}"</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">อีเมล</label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={fieldValues.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            disabled={!unlockedFields.email}
                            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all ${
                              unlockedFields.email
                                ? 'border-[#059669] bg-white text-gray-900 focus:ring-1 focus:ring-[#059669] focus:border-[#059669]'
                                : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                          />
                          <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                            unlockedFields.email ? 'text-[#059669]' : 'text-gray-400'
                          }`}>
                            <Icon name={unlockedFields.email ? 'lock_open' : 'lock'} size="small" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLock('email')}
                          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            unlockedFields.email
                              ? 'border-[#059669] bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Icon name={unlockedFields.email ? 'lock_open' : 'lock'} size="small" />
                        </button>
                      </div>
                      {fieldValues.email !== initialValues.email && (
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-[#059669]">
                          <Icon name="check" size="small" />
                          <span>เปลี่ยนจาก "{initialValues.email}" เป็น "{fieldValues.email}"</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons Bar shown only when modified */}
                    {isModified && (
                      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 md:col-span-2">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-[#059669] px-4 text-sm font-semibold text-white hover:bg-[#047857] shadow-sm transition-colors cursor-pointer"
                        >
                          บันทึกการแก้ไข
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: ข้อมูลอื่นๆ */}
                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#064E3B]">ข้อมูลอื่นๆ</h4>
                    <span className="text-xs text-gray-400">ผู้ดูแลสามารถแก้ไขเองได้</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">เบอร์โทรศัพท์</label>
                      <input
                        type="text"
                        value={caregiver.phone || ''}
                        disabled
                        readOnly
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ที่อยู่</label>
                      <input
                        type="text"
                        value={caregiver.address || ''}
                        disabled
                        readOnly
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">เกี่ยวกับฉัน</label>
                      <textarea
                        value={caregiver.bio || ''}
                        disabled
                        readOnly
                        rows={3}
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ค่าชั่วโมง (บาท)</label>
                      <input
                        type="text"
                        value={caregiver.hourlyRate || ''}
                        disabled
                        readOnly
                        className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kyc' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-base font-bold text-[#064E3B]">ข้อมูล KYC & เอกสาร</h4>
                </div>

                <KycDocumentsPreview documents={documents} docTypeLabel={docTypeLabels} variant="plain" layout="split" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
