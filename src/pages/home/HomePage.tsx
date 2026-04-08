import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_USER } from '../../graphql/queries';
import Skeleton from '../../components/ui/Skeleton';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_USER);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !data?.me) {
      navigate('/login');
    }
  }, [data, loading, navigate]);

  // Helper: Get initials for avatar placeholder
  const getInitials = () => {
    if (!data?.me) return '?';
    const name = data.me.displayName || data.me.email;
    return name.charAt(0).toUpperCase();
  };

  // Helper: Map role to Thai display name
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      patient: 'ผู้สูงอายุ',
      caregiver: 'ผู้ดูแล',
      admin: 'ผู้ดูแลระบบ',
    };
    return roles[role] || role;
  };

  // If there's an error, we might want to show it or keep loading
  if (error) {
    console.error('Error fetching user data:', error);
  }

  return (
    <>
      {/* ═══ ROOT ═══ */}
      <div className=" bg-[#F6FAF9] text-[#1A1A1A] min-h-screen antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

        {/* ═══ HEADER ═══ */}
        <header className="sticky top-0 z-50 border-b border-[#F0F1F3] px-6 h-16 flex items-center justify-between backdrop-blur-xl bg-white/90">

          {/* Left: logo + brand */}
          <div className="flex items-center gap-2.5">
            <svg className="w-9 h-9" viewBox="0 0 48 48" fill="none">
              <path d="M10 22C10 14 16.5 7 24 7C31.5 7 38 14 38 22H10Z" fill="#52B69A" opacity="0.9"/>
              <path d="M24 7V6" stroke="#52B69A" strokeWidth="2" strokeLinecap="round"/>
              <path d="M24 22V36" stroke="#52B69A" strokeWidth="2" strokeLinecap="round"/>
              <path d="M24 36C24 38.2 22.2 40 20 40C17.8 40 16 38.2 16 36" stroke="#52B69A" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M24 26C24 26 21 23.5 21 21.5C21 20.4 21.9 19.5 23 19.5C23.6 19.5 24 19.8 24 19.8C24 19.8 24.4 19.5 25 19.5C26.1 19.5 27 20.4 27 21.5C27 23.5 24 26 24 26Z" fill="#FFA92C"/>
            </svg>
            <span className="text-[22px] font-bold text-[#1A1A1A]">
              Pay<span className="text-[#FFA92C]">ung</span>
            </span>
          </div>

          {/* Centre nav – hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="#" className="px-4 py-2 text-sm font-semibold text-[#52B69A] bg-[#F0FAF4] rounded-lg no-underline transition-all duration-200">หน้าหลัก</a>
            <a href="#" className="px-4 py-2 text-sm font-medium text-[#8A8C8E] rounded-lg no-underline hover:text-[#1A1A1A] hover:bg-[#F6FAF9] transition-all duration-200">ค้นหาผู้ดูแล</a>
            <a href="#" className="px-4 py-2 text-sm font-medium text-[#8A8C8E] rounded-lg no-underline hover:text-[#1A1A1A] hover:bg-[#F6FAF9] transition-all duration-200">นัดหมาย</a>
            <a href="#" className="px-4 py-2 text-sm font-medium text-[#8A8C8E] rounded-lg no-underline hover:text-[#1A1A1A] hover:bg-[#F6FAF9] transition-all duration-200">ข้อความ</a>
          </nav>

          {/* Right: notif + avatar */}
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-[#F6FAF9] hover:bg-[#F0F1F3] border-0 flex items-center justify-center text-[#575859] relative transition-colors duration-200 cursor-pointer">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC3545] rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* ═══ DEFAULT STATE ═══ */}

          <main className="max-w-[1000px] mx-auto px-6 pt-7 pb-[120px] grid grid-cols-1 md:grid-cols-[300px_1fr] gap-7 items-start">

            {/* Profile card */}
            <aside className="bg-white rounded-3xl px-6 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.02)] md:sticky md:top-24">
              {loading || !data?.me ? (
                <div className="text-center mb-5">
                  <Skeleton circle width={76} height={76} className="mx-auto mb-3" />
                  <Skeleton width={120} height={17} className="mx-auto mb-1.5" />
                  <Skeleton width={160} height={12} className="mx-auto mb-3" />
                  <Skeleton width={90} height={24} borderRadius={16} className="mx-auto" />
                </div>
              ) : (
                <div className="text-center mb-5">
                  {/* Avatar */}
                  <div
                    className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 relative border-[3px] border-white shadow-[0_4px_16px_rgba(82,182,154,0.2)] overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,#76C893,#3A9A7E)' }}
                  >
                    {data.me.avatarUrl ? (
                      <img src={data.me.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitials()
                    )}
                    <div className="absolute bottom-0 right-0 w-[22px] h-[22px] bg-[#52B69A] rounded-full border-2 border-white flex items-center justify-center">
                      <svg className="w-[11px] h-[11px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-[17px] font-bold text-[#1A1A1A] mb-0.5">{data.me.displayName || 'ผู้ใช้แอป Payung'}</div>
                  <div className="text-xs text-[#8A8C8E] mb-3">{data.me.email}</div>
                  {/* Role badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-[#E6F5ED] text-[#3A9A7E]">
                    <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                    </svg>
                    {getRoleLabel(data.me.role)}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1 my-[18px] py-3.5 border-y border-[#F0F1F3]">
                {loading || !data?.me ? (
                  [0,1,2].map(i => (
                    <div key={i} className="text-center">
                      <Skeleton width={36} height={18} className="mx-auto mb-1" />
                      <Skeleton width={44} height={10} className="mx-auto" />
                    </div>
                  ))
                ) : (
                  [
                    { val: '12', lbl: 'นัดหมาย' },
                    { val: '3',  lbl: 'ผู้ดูแล'  },
                    { val: '4.8', lbl: 'คะแนน'   },
                  ].map(s => (
                    <div key={s.lbl} className="text-center">
                      <div className="text-[18px] font-bold text-[#1A1A1A]">{s.val}</div>
                      <div className="text-[10px] font-medium text-[#8A8C8E] mt-px">{s.lbl}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Edit button */}
              {loading || !data?.me ? (
                <Skeleton height={40} className="mt-3.5" />
              ) : (
                <button
                  className="w-full h-10 border border-[#E0E2E5] rounded-lg bg-white text-[13px] font-semibold text-[#575859] flex items-center justify-center gap-1.5 mt-3.5 cursor-pointer transition-all duration-200 hover:border-[#52B69A] hover:text-[#52B69A] hover:bg-[#F0FAF4]"
                >
                  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  แก้ไขโปรไฟล์
                </button>
              )}
            </aside>

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
                    สวัสดีค่ะ คุณ{data.me.displayName || 'ผู้ใช้ Payung'}
                  </h2>
                  <p className="text-sm opacity-80 relative z-10">
                    วันนี้คุณมีนัดหมาย 1 รายการ
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
                    [0,1,2].map(i => <Skeleton key={i} height={110} borderRadius={16} />)
                  ) : (
                    <>
                      {/* Search */}
                      <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                        <div className="w-12 h-12 rounded-xl bg-[#E6F5ED] text-[#3A9A7E] flex items-center justify-center mx-auto mb-2.5">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </div>
                        <div className="text-[13px] font-semibold mb-0.5">ค้นหาผู้ดูแล</div>
                        <div className="text-[11px] text-[#8A8C8E] leading-snug">หาผู้ดูแลใกล้ฉัน</div>
                      </a>
                      {/* Book */}
                      <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                        <div className="w-12 h-12 rounded-xl bg-[#FFF3E0] text-[#FFA92C] flex items-center justify-center mx-auto mb-2.5">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <div className="text-[13px] font-semibold mb-0.5">จองนัดหมาย</div>
                        <div className="text-[11px] text-[#8A8C8E] leading-snug">สร้างนัดหมายล่วงหน้า</div>
                      </a>
                      {/* Chat */}
                      <a href="#" className="bg-white rounded-2xl px-3.5 py-[22px] text-center border border-transparent shadow-[0_1px_4px_rgba(0,0,0,0.03)] no-underline text-[#1A1A1A] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-[#E6F5ED]">
                        <div className="w-12 h-12 rounded-xl bg-[#F0F1F3] text-[#575859] flex items-center justify-center mx-auto mb-2.5">
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        </div>
                        <div className="text-[13px] font-semibold mb-0.5">ข้อความ</div>
                        <div className="text-[11px] text-[#8A8C8E] leading-snug">แชทกับผู้ดูแล</div>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div>
                <div className="flex justify-between items-center mb-3.5">
                  <h2 className="text-[17px] font-bold text-[#1A1A1A]">นัดหมายที่กำลังจะมาถึง</h2>
                  {viewState === 'default' && <a href="#" className="text-[13px] font-semibold text-[#52B69A] no-underline hover:underline">ดูทั้งหมด</a>}
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
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="text-[15px] font-bold text-[#1A1A1A] mb-1">ยังไม่มีนัดหมาย</div>
                    <div className="text-[13px] text-[#8A8C8E] leading-relaxed mb-4">
                      เริ่มต้นค้นหาผู้ดูแลและจองนัดหมาย<br />เพื่อเริ่มใช้บริการ Payung
                    </div>
                    <button className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#52B69A] text-white rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200 hover:bg-[#3A9A7E] hover:shadow-[0_4px_12px_rgba(82,182,154,0.3)]">
                      <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      จองนัดหมายแรก
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Booking 1 */}
                    <div className="bg-white rounded-2xl px-5 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex gap-3.5 items-center border border-transparent mb-2.5 transition-all duration-200 hover:border-[#E6F5ED] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                      <div className="w-[52px] h-14 bg-[#F0FAF4] rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-[#52B69A] leading-none">15</span>
                        <span className="text-[10px] font-semibold text-[#76C893] mt-0.5">เม.ย.</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1A1A1A] mb-0.5">คุณสมศรี — ดูแลประจำวัน</div>
                        <div className="text-xs text-[#8A8C8E] flex items-center gap-1.5">
                          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          09:00 – 17:00
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E6F5ED] text-[#3A9A7E] flex-shrink-0 whitespace-nowrap">ยืนยันแล้ว</span>
                    </div>

                    {/* Booking 2 */}
                    <div className="bg-white rounded-2xl px-5 py-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex gap-3.5 items-center border border-transparent transition-all duration-200 hover:border-[#E6F5ED] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                      <div className="w-[52px] h-14 bg-[#F0FAF4] rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-[#52B69A] leading-none">18</span>
                        <span className="text-[10px] font-semibold text-[#76C893] mt-0.5">เม.ย.</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1A1A1A] mb-0.5">คุณวิภา — กายภาพบำบัด</div>
                        <div className="text-xs text-[#8A8C8E] flex items-center gap-1.5">
                          <svg className="w-[13px] h-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          13:00 – 15:00
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FFF3E0] text-[#D4860A] flex-shrink-0 whitespace-nowrap">รอยืนยัน</span>
                    </div>
                  </>
                )}
              </div>

              {/* Recommended Caregivers */}
              <div>
                <div className="flex justify-between items-center mb-3.5">
                  <h2 className="text-[17px] font-bold text-[#1A1A1A]">ผู้ดูแลแนะนำ</h2>
                  <a href="#" className="text-[13px] font-semibold text-[#52B69A] no-underline hover:underline">ดูทั้งหมด</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loading || !data?.me ? (
                    [0,1,2,3].map(i => <Skeleton key={i} height={84} borderRadius={16} />)
                  ) : (
                    <>
                      {/* CG Card reusable inline */}
                      {[
                        { init: 'ศ', name: 'คุณสมศรี วงศ์ดี',  spec: 'ดูแลทั่วไป · ประสบการณ์ 5 ปี',        rating: '4.9', grad: 'linear-gradient(135deg,#F0A500,#FFC570)' },
                        { init: 'ว', name: 'คุณวิภา สุขใจ',    spec: 'กายภาพบำบัด · ประสบการณ์ 8 ปี',      rating: '4.8', grad: 'linear-gradient(135deg,#52B69A,#76C893)' },
                        { init: 'น', name: 'คุณนภา รักษ์ดี',   spec: 'พยาบาลวิชาชีพ · ประสบการณ์ 12 ปี',   rating: '5.0', grad: 'linear-gradient(135deg,#6C63FF,#A29BFE)' },
                        { init: 'ป', name: 'คุณประภา ใจงาม',   spec: 'ดูแลผู้ป่วยติดเตียง · ประสบการณ์ 6 ปี', rating: '4.7', grad: 'linear-gradient(135deg,#E17055,#FAB1A0)' },
                      ].map(cg => (
                        <div key={cg.name} className="bg-white rounded-2xl p-[18px] shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex gap-3.5 items-center border border-transparent cursor-pointer transition-all duration-200 hover:border-[#E6F5ED] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold text-white flex-shrink-0" style={{ background: cg.grad }}>
                            {cg.init}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{cg.name}</div>
                            <div className="text-[11px] text-[#8A8C8E] mb-1">{cg.spec}</div>
                            <div className="text-xs font-semibold text-[#FFA92C] flex items-center gap-1">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#FFA92C"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
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
