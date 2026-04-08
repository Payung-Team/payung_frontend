import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GET_USER } from '../../graphql/queries';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import ProfileCard from '../../components/ui/ProfileCard';

interface UserData {
  me: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
  };
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<UserData>(GET_USER);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !data?.me) {
      navigate('/login');
    }
  }, [data, loading, navigate]);

  // If there's an error, we might want to show it or keep loading
  if (error) {
    console.error('Error fetching user data:', error);
  }

  return (
    <>
      {/* ═══ ROOT ═══ */}
      <div className=" bg-[#F6FAF9] text-[#1A1A1A] min-h-screen antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

        {/* ═══ BODY ═══ */}
        <main className="max-w-[1000px] mx-auto px-6 pt-7 pb-[120px] grid grid-cols-1 md:grid-cols-[300px_1fr] gap-7 items-start">

          {/* Profile card */}
          <ProfileCard user={data?.me} loading={loading} />

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
                  สวัสดีค่ะ คุณ {data.me.displayName || 'ผู้ใช้ Payung'}
                </h2>
                <p className="text-sm opacity-80 relative z-10"> {/* TODO: Add appointment count */}
                  เริ่มต้นค้นหาผู้ดูแลที่เหมาะกับคุณ
                </p>
              </div>
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
                    {/* Search */}
                    <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#E6F5ED] text-[#3A9A7E] flex items-center justify-center mx-auto mb-2.5">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">ค้นหาผู้ดูแล</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">หาผู้ดูแลใกล้ฉัน</div>
                    </a>
                    {/* Book */}
                    <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#FFF3E0] text-[#FFA92C] flex items-center justify-center mx-auto mb-2.5">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">จองนัดหมาย</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">สร้างนัดหมายล่วงหน้า</div>
                    </a>
                    {/* Chat */}
                    <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                      <div className="w-12 h-12 rounded-xl bg-[#F0F1F3] text-[#575859] flex items-center justify-center mx-auto mb-2.5">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      </div>
                      <div className="text-[13px] font-semibold mb-0.5">ข้อความ</div>
                      <div className="text-[11px] text-[#8A8C8E] leading-snug">แชทกับผู้ดูแล</div>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Upcoming Bookings */} {/* TODO: Add upcoming bookings */}
            <div>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="text-[17px] font-bold text-[#1A1A1A]">นัดหมายที่กำลังจะมาถึง</h2>
                {!loading && data?.me && <a href="#" className="text-[13px] font-semibold text-[#52B69A] no-underline hover:underline">ดูทั้งหมด</a>}
              </div>

              {loading || !data?.me ? (
                <div className="flex flex-col gap-2.5">
                  <Skeleton height={76} borderRadius={16} />
                  <Skeleton height={76} borderRadius={16} />
                </div>
              ) : (
                <div className="text-center py-11 px-6 bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-transparent hover:border-[#E6F5ED] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-200">
                  <div className="w-[72px] h-[72px] bg-[#F0F1F3] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[#C6C8CB]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">ยังไม่มีนัดหมาย</div>
                  <div className="text-[13px] text-[#8A8C8E] leading-relaxed mb-4">
                    เริ่มต้นค้นหาผู้ดูแลและจองนัดหมาย<br />เพื่อเริ่มใช้บริการ Payung
                  </div>
                  <button className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#52B69A] text-white rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200 hover:bg-[#3A9A7E] hover:shadow-[0_4px_12px_rgba(82,182,154,0.3)]">
                    <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    จองนัดหมายแรก
                  </button>
                </div>
              )}
            </div>

            {/* Recommended Caregivers */} {/* TODO: Add recommended caregivers functionality */}
            <div>
              <div className="flex justify-between items-center mb-3.5">
                <h2 className="text-[17px] font-bold text-[#1A1A1A]">ผู้ดูแลแนะนำ</h2>
                <a href="#" className="text-[13px] font-semibold text-[#52B69A] no-underline hover:underline">ดูทั้งหมด</a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loading || !data?.me ? (
                  [0, 1, 2, 3].map(i => <Skeleton key={i} height={84} borderRadius={16} />)
                ) : (
                  <>
                    {/* CG Card reusable inline */}
                    {[
                      { name: 'สมศรี วงศ์ดี', spec: 'ดูแลทั่วไป · ประสบการณ์ 5 ปี', rating: '4.9', grad: 'linear-gradient(135deg,#F0A500,#FFC570)' },
                      { name: 'วิภา สุขใจ', spec: 'กายภาพบำบัด · ประสบการณ์ 8 ปี', rating: '4.8', grad: 'linear-gradient(135deg,#52B69A,#76C893)' },
                      { name: 'นภา รักษ์ดี', spec: 'พยาบาลวิชาชีพ · ประสบการณ์ 12 ปี', rating: '5.0', grad: 'linear-gradient(135deg,#6C63FF,#A29BFE)' },
                      { name: 'ประภา ใจงาม', spec: 'ดูแลผู้ป่วยติดเตียง · ประสบการณ์ 6 ปี', rating: '4.7', grad: 'linear-gradient(135deg,#E17055,#FAB1A0)' },
                    ].map(cg => (
                      <div key={cg.name} className="bg-white rounded-2xl p-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex gap-3.5 items-center border border-transparent cursor-pointer transition-all duration-200 hover:border-[#E6F5ED] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                        <Avatar
                          name={cg.name}
                          size={48}
                          gradient={cg.grad}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{cg.name}</div>
                          <div className="text-[11px] text-[#8A8C8E] mb-1">{cg.spec}</div>
                          <div className="text-xs font-semibold text-[#FFA92C] flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#FFA92C"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            {cg.rating}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HomePage;
