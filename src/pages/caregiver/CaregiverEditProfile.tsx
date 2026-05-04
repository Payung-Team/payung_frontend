import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GET_USER, GET_CAREGIVER_PROFILE, UPDATE_CAREGIVER_PROFILE } from '../../graphql/queries';
import { Icon } from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import Skeleton from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';
import type { ToastType } from '../../components/ui/Toast';
import ProfileFormFields from '../../components/ui/ProfileFormFields';
import ThaiAddressSelector from '../../components/ui/ThaiAddressSelector';
import AlertModal from '../../components/ui/AlertModal';

function formatPhone(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

// Zod Schema สำหรับ validation
const CaregiverProfileSchema = z.object({
  bio: z.string().max(500, 'แนะนำตัวต้องไม่เกิน 500 ตัวอักษร').optional().nullable(),
  hourlyRate: z.number().positive('ค่าชั่วโมงต้องเป็นจำนวนบวก').optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  experienceYears: z.number().min(0, 'ประสบการณ์ต้องเป็นจำนวนไม่ติดลบ').optional().nullable(),
  phone: z
    .string()
    .refine(
      (val) => !val || /^\d{3}-\d{3}-\d{4}$/.test(val),
      'เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)',
    )
    .optional()
    .nullable(),
  address: z.string().max(500, 'ที่อยู่ต้องไม่เกิน 500 ตัวอักษร').optional().nullable(),
  province: z.string().optional().nullable(),
  amphoe: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
});

type CaregiverProfileFormData = z.infer<typeof CaregiverProfileSchema>;

interface CaregiverData {
  id: string;
  caregiverNumber?: string;
  fullName?: string;
  citizenId?: string;
  phone?: string;
  email?: string;
  address?: string;
  bio?: string;
  hourlyRate?: number;
  skills?: string[];
  experienceYears?: number;
  kycStatus?: string;
  updatedAt?: string;
}

interface UserData {
  me: {
    id: string;
    email: string;
    displayName?: string;
    phone?: string;
    address?: string;
    bio?: string;
    avatarUrl?: string;
    role: number;
  };
}

const CaregiverEditProfile: React.FC = () => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: userData, loading: userLoading } = useQuery<UserData>(GET_USER);
  const { data: caregiverData, loading: caregiverLoading } = useQuery<{ myCaregiverProfile: CaregiverData }>(GET_CAREGIVER_PROFILE);

  // Mutation สำหรับ update profile
  const [updateCaregiverProfile, { loading: updateLoading }] = useMutation(UPDATE_CAREGIVER_PROFILE, {
    refetchQueries: [{ query: GET_CAREGIVER_PROFILE }],
    update: (cache, { data: updateData }) => {
      // อัปเดต Apollo Cache ทันที
      if (updateData?.updateCaregiverProfile) {
        cache.writeQuery({
          query: GET_CAREGIVER_PROFILE,
          data: {
            myCaregiverProfile: updateData.updateCaregiverProfile,
          },
        });
      }
    },
    onCompleted: () => {
      // Refetch เพื่อให้แน่ใจว่าข้อมูลอัปเดต
      client.refetchQueries({
        include: [GET_CAREGIVER_PROFILE],
      });
    },
  });

  const user = userData?.me;
  const caregiver = caregiverData?.myCaregiverProfile;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const isLoading = userLoading || caregiverLoading;

  // ⛔ Guard: KYC Verification Check
  useEffect(() => {
    if (!caregiverLoading && caregiver) {
      const kycStatus = caregiver.kycStatus?.toLowerCase();
      const isKycVerified = kycStatus === 'verified';
      
      if (!isKycVerified) {
        setToastMessage({ type: 'warning', message: 'คุณต้องยืนยัน KYC เพื่อแก้ไขโปรไฟล์' });
        // Redirect to appropriate page based on KYC status
        const redirectPath = kycStatus === 'pending' ? '/kyc/status' : '/kyc';
        setTimeout(() => navigate(redirectPath), 2000);
      }
    }
  }, [caregiverLoading, caregiver, navigate]);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    reset,
  } = useForm<CaregiverProfileFormData>({
    resolver: zodResolver(CaregiverProfileSchema),
    mode: 'onChange',
    defaultValues: {
      bio: caregiver?.bio || '',
      hourlyRate: caregiver?.hourlyRate || 0,
      skills: caregiver?.skills || [],
      experienceYears: caregiver?.experienceYears || 0,
      phone: formatPhone(caregiver?.phone),
      address: caregiver?.address || '',
      province: '',
      amphoe: '',
      district: '',
      postalCode: '',
    },
  });

  const watchedValues = watch();

  // Populate all form fields when caregiver data loads
  useEffect(() => {
    if (!caregiver) return;
    reset({
      bio: caregiver.bio || '',
      hourlyRate: caregiver.hourlyRate || 0,
      skills: caregiver.skills || [],
      experienceYears: caregiver.experienceYears || 0,
      phone: formatPhone(caregiver.phone),
      address: caregiver.address || '',
      province: '',
      amphoe: '',
      district: '',
      postalCode: '',
    });
  }, [caregiver?.id]);

  // Track dirty state
  useEffect(() => {
    const isFormDirty =
      watchedValues.bio !== (caregiver?.bio || '') ||
      watchedValues.hourlyRate !== (caregiver?.hourlyRate || 0) ||
      watchedValues.experienceYears !== (caregiver?.experienceYears || 0) ||
      watchedValues.phone !== formatPhone(caregiver?.phone) ||
      watchedValues.address !== (caregiver?.address || '') ||
      JSON.stringify(watchedValues.skills) !== JSON.stringify(caregiver?.skills || []);

    setIsDirty(isFormDirty);
  }, [watchedValues, caregiver]);

  // Handle Save
  const onSubmit = async (data: CaregiverProfileFormData) => {
    try {
      const input: any = {};
      
      // bio is optional — send even if empty to allow clearing
      if (data.bio !== undefined && data.bio !== null) input.bio = data.bio;
      if (data.hourlyRate && data.hourlyRate > 0) input.hourlyRate = data.hourlyRate;
      if (data.experienceYears !== undefined && data.experienceYears !== null) input.experienceYears = data.experienceYears;
      if (data.phone) input.phone = data.phone.replace(/-/g, '');
      const addressParts = [data.address, data.district, data.amphoe, data.province, data.postalCode].filter(Boolean);
      if (addressParts.length > 0) input.address = addressParts.join(' ');
      if (data.skills && data.skills.length > 0) input.skills = data.skills;

      const result = await updateCaregiverProfile({
        variables: { input },
      });

      if (result.data?.updateCaregiverProfile) {
        setToastMessage({ type: 'success', message: 'บันทึกข้อมูลสำเร็จ' });
        setIsDirty(false);
        // อัปเดต cache ทันที เพื่อให้หน้าอื่นเห็นข้อมูลใหม่
        setTimeout(() => navigate(-1), 2000);
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      setToastMessage({ 
        type: 'error', 
        message: error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
      });
    }
  };

  // Handle Cancel
  const handleCancel = () => {
    if (isDirty) {
      setShowConfirmDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex flex-col">
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <Skeleton width="200px" height="32px" />
        </div>
        <div className="flex-1 flex overflow-hidden px-8 py-7">
          <div className="flex-1 max-w-[700px] space-y-6">
            <Skeleton width="100%" height="200px" />
            <Skeleton width="100%" height="300px" />
          </div>
        </div>
      </div>
    );
  }

  // ถ้า KYC ไม่ verified จะ redirect ไป /kyc/status ก่อนแสดงหน้า
  if (!caregiverLoading && caregiver && caregiver.kycStatus?.toLowerCase() !== 'verified') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {/* ═══ Toast ═══ */}
      {toastMessage && (
        <Toast type={toastMessage.type} message={toastMessage.message} duration={3000} />
      )}

      {/* ═══ Confirmation Dialog ═══ */}
      <AlertModal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmCancel}
        title="ยกเลิกการแก้ไข?"
        message="คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?"
        confirmText="ยกเลิก"
        cancelText="กลับไปแก้ไข"
        variant="warning"
      />

      {/* ═══ Sub Header ═══ */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full px-8 py-4 flex items-center justify-between">
          <h1 className="text-[24px] font-semibold text-[#0A0A0A]">โปรไฟล์ของฉัน</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-[14px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={!isDirty || updateLoading}
              className={`px-4 py-2 rounded-lg text-[14px] font-medium text-white transition-colors ${
                isDirty && !updateLoading
                  ? 'bg-[#52B69A] hover:bg-[#409E82]'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {updateLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ═══ Center Edit Form ═══ */}
        <div className="flex-1 overflow-y-auto bg-[#F6FAF9] px-8 py-7 flex justify-center">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-[700px] space-y-6">
            {/* Personal Info Card - Read Only */}
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">ข้อมูลส่วนตัว</h3>
              <p className="text-[12px] text-[#717182] mb-6">หากต้องการแก้ไขกรุณา resubmit KYC</p>

              <div className="space-y-6">
                <ProfileFormFields
                  caregiverId={caregiver?.caregiverNumber}
                  fullName={caregiver?.fullName}
                  citizenId={caregiver?.citizenId}
                  showTooltip={true}
                />
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลติดต่อ</h3>

              <div className="space-y-6">
                {/* Phone + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เบอร์โทรศัพท์</label>
                    <input
                      id="phone"
                      type="tel"
                      {...(() => { const { onChange: _, ...rest } = register('phone'); return rest; })()}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setValue('phone', formatted, { shouldValidate: true });
                      }}
                      placeholder="081-234-5678"
                      maxLength={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-white text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
                    />
                    {errors.phone && <p className="text-[12px] text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>

                  {/* Email - Read Only */}
                  <div>
                    <label htmlFor="email" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">อีเมล</label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A] cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ที่อยู่</label>
                  <textarea
                    id="address"
                    {...register('address')}
                    rows={3}
                    placeholder="เลขที่ ถนน แขวง/ตำบล"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-white text-[#0A0A0A] resize-none focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
                  />
                  {errors.address && <p className="text-[12px] text-red-500 mt-1">{errors.address.message}</p>}
                </div>

                {/* Province / Amphoe / District cascading dropdowns */}
                <ThaiAddressSelector
                  provinceValue={watch('province') ?? ''}
                  amphoeValue={watch('amphoe') ?? ''}
                  districtValue={watch('district') ?? ''}
                  onProvinceChange={(v) => setValue('province', v, { shouldValidate: true })}
                  onAmphoeChange={(v) => setValue('amphoe', v, { shouldValidate: true })}
                  onDistrictChange={(v) => setValue('district', v, { shouldValidate: true })}
                  onZipcodeChange={(v) => setValue('postalCode', v)}
                />

                {/* Postal Code (auto-filled) */}
                <div>
                  <label htmlFor="postalCode" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">รหัสไปรษณีย์</label>
                  <input
                    id="postalCode"
                    type="text"
                    value={watch('postalCode') ?? ''}
                    readOnly
                    placeholder="กรอกอัตโนมัติเมื่อเลือกตำบล"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">แนะนำตัว</h3>
              <p className="text-[14px] text-[#717182] mb-6">เขียนข้อความแนะนำตัวที่จะแสดงในโปรไฟล์ของคุณ</p>

              <textarea
                id="bio"
                {...register('bio')}
                rows={5}
                placeholder="เขียนแนะนำตัวสั้นๆ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-white text-[#0A0A0A] resize-none focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
              />
              <p className="text-[10px] text-[#717182] mt-2">
                เหลือ {500 - (watchedValues.bio?.length || 0)} ตัวอักษร
              </p>
              {errors.bio && <p className="text-[12px] text-red-500 mt-1">{errors.bio.message}</p>}
            </div>

            {/* Professional Info */}
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
              <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลวิชาชีพ</h3>

              <div className="space-y-6">
                {/* Experience Years + Hourly Rate row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Experience Years */}
                  <div>
                    <label htmlFor="experienceYears" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ประสบการณ์ทำงาน (ปี)</label>
                    <input
                      id="experienceYears"
                      type="number"
                      {...register('experienceYears', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-white text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
                    />
                    {errors.experienceYears && (
                      <p className="text-[12px] text-red-500 mt-1">{errors.experienceYears.message}</p>
                    )}
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label htmlFor="hourlyRate" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ค่าชั่วโมง (บาท)</label>
                    <input
                      id="hourlyRate"
                      type="number"
                      {...register('hourlyRate', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-white text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
                    />
                    {errors.hourlyRate && (
                      <p className="text-[12px] text-red-500 mt-1">{errors.hourlyRate.message}</p>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label htmlFor="skillInput" className="text-[14px] font-semibold text-[#0A0A0A] mb-3 block">ทักษะความสามารถ</label>
                  <div className="p-4 border border-gray-300 rounded-lg bg-white">
                    {/* Selected Skills Chips */}
                    {(watchedValues.skills || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(watchedValues.skills || []).map((skill) => (
                          <div
                            key={skill}
                            className="px-3 py-2 bg-[#52B69A] text-white rounded-full text-[12px] font-semibold flex items-center gap-2 hover:bg-[#409E82] transition-colors"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => {
                                const newSkills = (watchedValues.skills || []).filter((s) => s !== skill);
                                setValue('skills', newSkills);
                              }}
                              className="text-[14px] hover:opacity-70 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Suggestion Chips */}
                    <div className="mb-4">
                      <p className="text-[12px] text-[#717182] mb-2">ทักษะแนะนำ:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'การดูแลด้านสุขภาพ',
                          'การเตรียมอาหาร',
                          'การช่วยเหลือการเดิน',
                          'การยา',
                          'การปรึกษา',
                        ].map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              if (!(watchedValues.skills || []).includes(skill)) {
                                const newSkills = [...(watchedValues.skills || []), skill];
                                setValue('skills', newSkills);
                              }
                            }}
                            className={`px-3 py-2 rounded-full text-[12px] font-semibold transition-colors ${
                              (watchedValues.skills || []).includes(skill)
                                ? 'bg-[#52B69A] text-white cursor-default'
                                : 'bg-[#F5F5F5] text-[#717182] hover:bg-[#52B69A] hover:text-white cursor-pointer'
                            }`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Custom Input */}
                    <input
                      type="text"
                      id="skillInput"
                      placeholder="พิมพ์ทักษะแล้วกด Enter เพื่อเพิ่มเอง"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          const newSkill = e.currentTarget.value.trim();
                          if (!(watchedValues.skills || []).includes(newSkill)) {
                            const newSkills = [...(watchedValues.skills || []), newSkill];
                            setValue('skills', newSkills);
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {caregiver?.updatedAt && (
              <div className="text-center">
                <p className="text-[12px] text-[#717182]">
                  อัปเดตล่าสุด:{' '}
                  {new Date(caregiver.updatedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* ═══ Right Profile Preview ═══ */}
        <div className="w-[500px] overflow-y-auto border-l border-gray-200">
          <div className="p-6">
            {/* Preview Header */}
            <div className="flex items-center gap-2 mb-6">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52B69A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <h3 className="text-[14px] font-semibold text-[#52B69A] uppercase tracking-wide">ตัวอย่างหน้าโปรไฟล์</h3>
              <span className="ml-auto text-[11px] bg-[#52B69A]/10 text-[#52B69A] px-2 py-0.5 rounded-full font-medium">Preview</span>
            </div>

            {/* Profile Card — framed in dashed green border */}
            <div className="rounded-2xl border-2 border-dashed border-[#52B69A]/40 p-2">
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] overflow-hidden">
                {/* Profile Header */}
                <div className="bg-[#52B69A] h-[120px]"></div>

                {/* Profile Content */}
                <div className="p-6">
                  <div className="flex items-start gap-6 mb-6">
                    <div className="relative -mt-16">
                      <Avatar name={caregiver?.fullName || displayName} size={128} fallbackColor="#52B69A" />
                    </div>
                    <div className="flex-1 pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-[20px] font-semibold text-[#0A0A0A]">{caregiver?.fullName || displayName}</h2>
                        <span className="px-2 py-1 bg-[#00A63E] text-white rounded-lg text-[12px] font-semibold">✓ ยืนยันตัวตน</span>
                      </div>
                      <div className="flex items-center gap-2 text-[14px] text-[#717182]">
                        <span>{watchedValues.experienceYears || 0}+ ปีประสบการณ์</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-[18px] font-semibold text-[#52B69A] mb-2">เกี่ยวกับฉัน</h4>
                    <p className="text-[14px] text-[rgba(0,0,0,0.5)]">{watchedValues.bio || <span className="text-[#BDBDBD]">ยังไม่มีแนะนำตัว</span>}</p>
                  </div>

                  <div className="mb-6 p-3 bg-[#F3F3F5] rounded-lg">
                    <p className="text-[14px] font-semibold text-[#0A0A0A]">
                      ค่าชั่วโมง:{' '}
                      {watchedValues.hourlyRate
                        ? <span className="text-[#52B69A]">{new Intl.NumberFormat('th-TH').format(watchedValues.hourlyRate)} บาท</span>
                        : <span className="text-[#BDBDBD]">ยังไม่ได้กำหนด</span>}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[18px] font-semibold text-[#52B69A] mb-3 flex items-center gap-2">
                      <Icon name="star" size="small" color="currentColor" />
                      ทักษะความสามารถ
                    </h4>
                    {watchedValues.skills && watchedValues.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {watchedValues.skills.map((skill) => (
                          <span key={skill} className="px-3 py-1 bg-[#ECEEF2] text-[#030213] rounded-lg text-[12px] font-semibold">{skill}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[14px] text-[#BDBDBD]">ยังไม่มีทักษะ</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaregiverEditProfile;
