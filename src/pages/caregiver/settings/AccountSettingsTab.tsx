import React, { useEffect, useState } from 'react';
import ThailandAddressSimple from 'thailand-address-simple';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  GET_USER,
  GET_CAREGIVER_PROFILE,
  GET_KYC_DOCUMENTS,
} from '../../../graphql/queries';
import { Icon } from '../../../components/ui/Icon';
import KycStatusBadge from '../../../components/ui/KycStatusBadge';
import Avatar from '../../../components/ui/Avatar';
import Skeleton from '../../../components/ui/Skeleton';

function formatPhone(val?: string | null): string {
  if (!val) return '-';
  const d = val.replace(/\D/g, '').slice(0, 10);
  if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d || '-';
}

const addressDb = new ThailandAddressSimple();
let addressDbReady = false;
addressDb.init().then(() => { addressDbReady = true; });

interface ParsedAddress { province: string; amphoe: string; district: string; zipcode: string }

function parseAddressComponents(raw: string): ParsedAddress {
  const empty = { province: '', amphoe: '', district: '', zipcode: '' };
  if (!raw || !addressDbReady) return empty;
  const zipcodeMatch = raw.match(/\b(\d{5})\b/);
  if (zipcodeMatch) {
    const candidates = addressDb.searchByZipCode(zipcodeMatch[1]);
    const best =
      candidates.find(c => raw.includes(c.province) && raw.includes(c.amphoe) && raw.includes(c.district)) ||
      candidates.find(c => raw.includes(c.province) && raw.includes(c.amphoe)) ||
      candidates.find(c => raw.includes(c.province)) ||
      candidates[0];
    if (best) return { province: best.province, amphoe: best.amphoe, district: best.district, zipcode: best.zipcode };
  }
  return empty;
}

export const AccountSettingsTab: React.FC = () => {
  const navigate = useNavigate();
  const [parsedAddress, setParsedAddress] = useState<ParsedAddress>({ province: '', amphoe: '', district: '', zipcode: '' });

  const { data: userData, loading: userLoading } = useQuery<{
    me: {
      id: string;
      email: string;
      displayName?: string;
      phone?: string;
      address?: string;
      bio?: string;
      avatarUrl?: string;
      role: number;
      createdAt?: string;
      emailPreferences?: boolean;
    };
  }>(GET_USER);

  const { data: caregiverData, loading: caregiverLoading } = useQuery<{
    myCaregiverProfile: {
      id: string;
      caregiverNumber?: string;
      fullName?: string;
      kycStatus: string;
      kycSubmittedAt?: string;
      kycVerifiedAt?: string;
      isSearchable: boolean;
      idCardNumber?: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      address?: string;
      bio?: string;
      skills?: string[];
      experienceYears?: number;
      hourlyRate?: number;
      resubmitCount?: number;
      createdAt?: string;
      updatedAt?: string;
    };
  }>(GET_CAREGIVER_PROFILE);

  const { data: kycDocumentsData } = useQuery<{
    kycStatus: {
      documents: Array<{
        id: string;
        docType: string;
        fileName: string;
        fileUrl: string;
        fileSize?: number;
        mimeType?: string;
        uploadedAt?: string;
      }>;
    };
  }>(GET_KYC_DOCUMENTS);

  const user = userData?.me;
  const caregiver = caregiverData?.myCaregiverProfile;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const isLoading = userLoading || caregiverLoading;

  useEffect(() => {
    const rawAddress = caregiver?.address || user?.address || '';
    if (!rawAddress) return;
    const tryParse = () => {
      const result = parseAddressComponents(rawAddress);
      if (result.province) {
        setParsedAddress(result);
      } else if (!addressDbReady) {
        setTimeout(tryParse, 300);
      }
    };
    tryParse();
  }, [caregiver?.address, user?.address]);

  return (
    <div className="space-y-6">
      {/* Profile Card Section */}
      <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
        {/* Header with title and badge */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0A0A0A] mb-1">โปรไฟล์ของฉัน</h2>
          </div>
        </div>

        {/* Profile Avatar and Info */}
        {isLoading ? (
          <Skeleton height={120} borderRadius={16} className="mb-7" />
        ) : (
          <div className="flex items-center gap-6">
            <Avatar
              name={displayName}
              size={96}
              fallbackColor="#52B69A"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[20px] font-medium text-[#0A0A0A]">
                  {caregiver?.fullName || displayName}
                </h3>
                <KycStatusBadge status={caregiver?.kycStatus} />
              </div>
              <p className="text-[14px] text-[#717182] mb-2">ผู้ดูแลผู้สูงอายุ</p>
              <p className="text-[12px] text-[#B8C2CC]">
                {user?.createdAt 
                  ? `เข้าร่วมระบบเมื่อ ${new Date(user.createdAt).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit'
                  })}`
                  : 'เข้าร่วมระบบ -'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Button */}
      {(() => {
        const canEdit = caregiver?.kycStatus === 'verified';
        return (
          <div className="relative group">
            <button
              disabled={!canEdit}
              onClick={() => canEdit && navigate('/caregiver/edit-profile')}
              className={`w-full px-6 py-3 rounded-lg text-[14px] font-medium transition-colors ${
                canEdit
                  ? 'bg-[#52B69A] text-white hover:bg-[#4a9d87] cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              แก้ไขโปรไฟล์
            </button>
            {!canEdit && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 pointer-events-none">
                แก้ไขได้ต่อเมื่อได้รับการอนุมัติการยืนยันตัวตน
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            )}
          </div>
        );
      })()}

      {/* Personal Info Section */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลส่วนตัว</h3>

          <div className="space-y-6">
            {/* Caregiver ID */}
            <div>
              <label htmlFor="caregiver-id" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">หมายเลขประจำตัวผู้ดูแล</label>
              <input
                id="caregiver-id"
                type="text"
                value={caregiver?.caregiverNumber || '-'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Name and Surname */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="first-name" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ชื่อ</label>
                <input
                  id="first-name"
                  type="text"
                  value={caregiver?.fullName?.split(' ')[0] || '-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
              <div>
                <label htmlFor="last-name" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">นามสกุล</label>
                <input
                  id="last-name"
                  type="text"
                  value={caregiver?.fullName?.split(' ').slice(1).join(' ') || '-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
            </div>

            {/* Gender and DOB */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="gender" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เพศ</label>
                <input
                  id="gender"
                  type="text"
                  value={caregiver?.gender 
                    ? caregiver.gender === 'male' 
                      ? 'ชาย' 
                      : caregiver.gender === 'female' 
                      ? 'หญิง' 
                      : 'อื่นๆ'
                    : '-'
                  }
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
              <div>
                <label htmlFor="dob" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">วันเกิด</label>
                <input
                  id="dob"
                  type="date"
                  value={caregiver?.dateOfBirth 
                    ? new Date(caregiver.dateOfBirth).toISOString().split('T')[0]
                    : ''
                  }
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                  placeholder="-"
                />
              </div>
            </div>

            {/* Citizen ID */}
            <div>
              <label htmlFor="id-card" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เลขประจำตัวประชาชน</label>
              <input
                id="id-card"
                type="text"
                value={caregiver?.idCardNumber || '-'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contact Info Section */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลติดต่อ</h3>

          <div className="space-y-6">
            {/* Phone and Email */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เบอร์โทรศัพท์</label>
                <input
                  id="phone"
                  type="tel"
                  value={formatPhone(caregiver?.phone || user?.phone)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A]"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">อีเมล</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || '-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ที่อยู่</label>
              <textarea
                id="address"
                value={caregiver?.address || user?.address || '-'}
                readOnly
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#717182] resize-none"
              />
            </div>

            {/* Province, Amphoe, Postal */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label htmlFor="province" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">จังหวัด</label>
                <input
                  id="province"
                  type="text"
                  value={parsedAddress.province || '-ยังไม่ได้เลือก-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
              <div>
                <label htmlFor="amphoe" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เขต/อำเภอ</label>
                <input
                  id="amphoe"
                  type="text"
                  value={parsedAddress.amphoe || '-ยังไม่ได้เลือก-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
              <div>
                <label htmlFor="postal" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">รหัสไปรษณีย์</label>
                <input
                  id="postal"
                  type="text"
                  value={parsedAddress.zipcode || '-ยังไม่ได้เลือก-'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bio Section */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">แนะนำตัว</h3>

          <textarea
            id="bio"
            value={caregiver?.bio || user?.bio || '-'}
            readOnly
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#717182] resize-none"
          />
        </div>
      )}

      {/* Professional Info Section */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
          <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลวิชาชีพ</h3>

          <div className="space-y-6">
            {/* Experience */}
            <div>
              <label htmlFor="experience" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ประสบการณ์ทำงาน (ปี)</label>
              <input
                id="experience"
                type="text"
                value={caregiver?.experienceYears ? `${caregiver.experienceYears} ปี` : 'ยังไม่ได้เลือก'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Skills */}
            <div>
              <label htmlFor="skills" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ทักษะความสามารถ</label>
              <input
                id="skills"
                type="text"
                value={caregiver?.skills && caregiver.skills.length > 0 ? caregiver.skills.join(', ') : 'ยังไม่ได้เลือก'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label htmlFor="hourly-rate" className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">อัตราการจ้าง (บาท/ชั่วโมง)</label>
              <input
                id="hourly-rate"
                type="text"
                value={caregiver?.hourlyRate ? `฿${caregiver.hourlyRate.toFixed(2)}` : '-'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Certificate/Credentials Section */}
      {!isLoading && (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">ใบรับรอง / ความน่าเชื่อถือ</h3>
          </div>

          {/* Documents Container */}
          <div className="bg-[#ECECF0] rounded-xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[16px] font-semibold text-[#0A0A0A]">เอกสารที่อัปโหลดแล้ว ({kycDocumentsData?.kycStatus?.documents?.length || 0})</h4>
              <a href="/kyc/status" className="text-[14px] font-medium text-[#52B69A] underline">ติดตามสถานะ</a>
            </div>

            {/* Empty State */}
            {(!kycDocumentsData?.kycStatus?.documents || kycDocumentsData.kycStatus.documents.length === 0) && (
              <div className="bg-white rounded-lg p-4 text-center">
                <Icon name="description" size="medium" color="#717182" />
                <p className="text-[14px] text-[#717182] mt-2">ยังไม่มีเอกสารที่อัปโหลด</p>
                <button
                  onClick={() => navigate('/kyc')}
                  className="mt-3 px-4 py-2 bg-[#52B69A] text-white rounded-lg text-[14px] font-medium hover:bg-[#4a9d87] transition-colors"
                >
                  ไปยืนยันตัวตน
                </button>
              </div>
            )}

            {/* Document List */}
            {kycDocumentsData?.kycStatus?.documents && kycDocumentsData.kycStatus.documents.length > 0 && (
              <div className="space-y-3">
                {kycDocumentsData.kycStatus.documents.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon name="description" size="medium" color="#52B69A" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#0A0A0A] truncate">{doc.fileName}</p>
                        <p className="text-[12px] text-[#717182]">
                          {doc.uploadedAt ? `อัปโหลดเมื่อ ${new Date(doc.uploadedAt).toLocaleDateString('th-TH', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}` : 'วันที่ไม่ระบุ'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.fileSize && (
                        <span className="text-[12px] text-[#717182]">
                          {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                      {caregiver?.kycStatus === 'verified' && (
                        <span className="px-3 py-1 bg-[#F0FDF4] text-[#16A34A] rounded-lg text-[12px] font-semibold">ยืนยันแล้ว</span>
                      )}
                      {caregiver?.kycStatus === 'pending' && (
                        <span className="px-3 py-1 bg-[#FFFBEB] text-[#F59E0B] rounded-lg text-[12px] font-semibold">รอตรวจสอบ</span>
                      )}
                      {caregiver?.kycStatus === 'rejected' && (
                        <span className="px-3 py-1 bg-[#FEF2F2] text-[#DC2626] rounded-lg text-[12px] font-semibold">ปฏิเสธ</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
