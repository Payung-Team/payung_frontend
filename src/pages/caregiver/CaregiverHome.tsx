import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { GET_USER, GET_CAREGIVER_PROFILE } from '../../graphql/queries';
import Skeleton from '../../components/ui/Skeleton';
import ProfileCard from '../../components/ui/ProfileCard';
import { Icon } from '../../components/ui/Icon';
import EditProfileModal from '../../components/layout/EditProfileModal';

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

interface CaregiverData {
  myCaregiverProfile: {
    id: string;
    fullName?: string;
    kycStatus: string;
    isSearchable: boolean;
    skills: string[];
    experienceYears?: number;
    hourlyRate?: number;
  };
}

const CaregiverHome: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<UserData>(GET_USER);
  const { data: caregiverData, loading: caregiverLoading } = useQuery<CaregiverData>(GET_CAREGIVER_PROFILE);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !data?.me) {
      navigate('/login');
    }
  }, [data, loading, navigate]);

  if (error) {
    console.error('Error fetching user data:', error);
  }

  const availabilityBadge = (() => {
    const profile = caregiverData?.myCaregiverProfile;
    if (!profile) {
      return null;
    }

    if (profile.kycStatus === 'verified' && profile.isSearchable) {
      return {
        label: 'กำลังรับงาน',
        classes: 'border-[#A7D8C2] bg-[#E7F5EE] text-[#228B55]',
      };
    }

    if (profile.kycStatus === 'verified' && !profile.isSearchable) {
      return {
        label: 'ไม่รับงาน',
        classes: 'border-[#D1D5DB] bg-[#F3F4F6] text-[#6B7280]',
      };
    }

    if (profile.kycStatus === 'pending') {
      return {
        label: 'รอยืนยัน',
        classes: 'border-[#E7B08A] bg-[#FDF1E7] text-[#C96E3A]',
      };
    }

    return {
      label: 'ยังไม่ยืนยัน',
      classes: 'border-[#FDBA74] bg-[#FFF7ED] text-[#9A3412]',
    };
  })();

  return (
    <>
      {/* ═══ ROOT ═══ */}
      <div className="bg-[#F6FAF9] text-[#1A1A1A] min-h-screen antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

        {/* ═══ BODY ═══ */}
        <main className="max-w-[1000px] mx-auto px-6 pt-7 pb-[120px] grid grid-cols-1 md:grid-cols-[300px_1fr] gap-7 items-start">

          {/* Profile card */}
          <ProfileCard 
            user={data?.me} 
            loading={loading} 
            onEditProfile={() => setIsEditOpen(true)}
          />

          {/* Main content column */}
          <div className="flex flex-col gap-6">

            {/* Greeting banner */}
            {loading || !data?.me ? (
              <Skeleton height={80} borderRadius={24} />
            ) : (
              <div
                className="rounded-3xl px-7 py-7 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#52B69A 0%,#76C893 100%)' }}
              >
                <div className="absolute -top-8 -right-5 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
                <h2 className="text-[22px] font-bold mb-1 relative z-10">
                  สวัสดีค่ะ คุณ {data.me.displayName || 'ผู้ดูแล Payung'}
                </h2>
                <p className="text-sm opacity-80 relative z-10">
                  {caregiverData?.myCaregiverProfile?.kycStatus === 'verified' 
                    ? '✅ บัญชีของคุณได้รับการยืนยันแล้ว' 
                    : '⚠️ กรุณาทำการยืนยัน KYC เพื่อเริ่มรับการจอง'}
                </p>

                {availabilityBadge && (
                  <button
                    type="button"
                    onClick={() => navigate('/caregiver/availability')}
                    className={`relative z-10 mt-4 inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors hover:brightness-95 ${availabilityBadge.classes}`}
                  >
                    {availabilityBadge.label}
                  </button>
                )}
              </div>
            )}

            {/* KYC Status Alert */}
            {!caregiverLoading && caregiverData?.myCaregiverProfile && (
              <>
                {caregiverData.myCaregiverProfile.kycStatus === 'none' && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="text-yellow-600 text-xl">⚠️</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-800 mb-1">ยังไม่ได้ยืนยัน KYC</h3>
                        <p className="text-sm text-yellow-700 mb-3">
                          กรุณาจำหน่ายเอกสารเพื่อให้ลูกค้าสามารถจองบริการของคุณได้
                        </p>
                        <Link 
                          to="/kyc" 
                          className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors"
                        >
                          ไปยังการยืนยัน KYC
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                
                {caregiverData.myCaregiverProfile.kycStatus === 'pending' && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 text-xl">📋</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-800 mb-1">รออนุมัติการยืนยัน</h3>
                        <p className="text-sm text-blue-700">
                          เอกสารของคุณกำลังรอการตรวจสอบ โปรดรอสักครู่...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {caregiverData.myCaregiverProfile.kycStatus === 'rejected' && (
                  <div className="bg-red-50 border-l-4 border-red-400 rounded-lg px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="text-red-600 text-xl">❌</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-red-800 mb-1">การยืนยันถูกปฏิเสธ</h3>
                        <p className="text-sm text-red-700 mb-3">
                          เอกสารของคุณไม่ผ่านการตรวจสอบ กรุณาส่งใหม่อีกครั้ง
                        </p>
                        <Link 
                          to="/kyc" 
                          className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                        >
                          ส่งใหม่
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Quick Actions */}
            <div>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="text-[17px] font-bold text-[#1A1A1A]">ทางลัด</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {loading || !data?.me ? (
                  [0, 1, 2].map(i => <Skeleton key={i} height={110} borderRadius={16} />)
                ) : (
                  <>
                    {/* Verification */}
                    <Link to="/kyc" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#E6F5ED] text-[#3A9A7E] flex items-center justify-center mx-auto mb-2.5">
                        <Icon name="verified_user" size="large" color="currentColor" />
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">การยืนยัน</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">ยืนยัน KYC</div>
                    </Link>

                    {/* Messages */}
                    <Link to="/messages" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF3E0] text-[#FFA92C] flex items-center justify-center mx-auto mb-2.5">
                        <Icon name="chat_bubble" size="large" color="currentColor" />
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">ข้อความ</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">แชทกับลูกค้า</div>
                    </Link>

                    {/* Profile */}
                    <Link to="/profile" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#F0F1F3] text-[#575859] flex items-center justify-center mx-auto mb-2.5">
                        <Icon name="person" size="large" color="currentColor" />
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">โปรไฟล์</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">แก้ไขข้อมูล</div>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Profile Stats */}
            {!caregiverLoading && caregiverData?.myCaregiverProfile && (
              <div>
                <div className="flex justify-between items-center mb-3.5">
                  <h2 className="text-[17px] font-bold text-[#1A1A1A]">ข้อมูลประวัติ</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl px-4 py-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-transparent">
                    <div className="text-2xl font-bold text-[#52B69A] mb-1">
                      {caregiverData.myCaregiverProfile.experienceYears || 0}
                    </div>
                    <div className="text-xs text-[#8A8C8E]">ปีประสบการณ์</div>
                  </div>

                  <div className="bg-white rounded-2xl px-4 py-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-transparent">
                    <div className="text-2xl font-bold text-[#52B69A] mb-1">
                      ฿{caregiverData.myCaregiverProfile.hourlyRate || 0}
                    </div>
                    <div className="text-xs text-[#8A8C8E]">/ชั่วโมง</div>
                  </div>

                  <div className="bg-white rounded-2xl px-4 py-5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-transparent">
                    <div className="text-2xl font-bold text-[#52B69A] mb-1">
                      {caregiverData.myCaregiverProfile.skills?.length || 0}
                    </div>
                    <div className="text-xs text-[#8A8C8E]">ทักษะ</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State if no KYC verified */}
            {!caregiverLoading && caregiverData?.myCaregiverProfile?.kycStatus !== 'verified' && (
              <div>
                <div className="text-center py-11 px-6 bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-transparent">
                  <div className="w-[72px] h-[72px] bg-[#F0F1F3] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#C6C8CB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">ยังคงต้องยืนยัน KYC</div>
                  <div className="text-[13px] text-[#8A8C8E] leading-relaxed">
                    กรุณาทำการยืนยัน KYC เพื่อเปิดใช้งาน<br />ความสามารถในการรับการจองจากลูกค้า
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        userEmail={data?.me?.email || ''}
        currentDisplayName={data?.me?.displayName || ''}
        currentPhone={data?.me?.phone || ''}
        currentAddress={data?.me?.address || ''}
        currentBio={data?.me?.bio || ''}
      />
    </>
  );
};

export default CaregiverHome;
