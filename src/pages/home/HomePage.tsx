import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
// ภาพ hero สร้างด้วย AI (มี metadata OpenAI/C2PA ในไฟล์) — ส่วนภาพบริการและภาพชวนสมัคร
// วาดเองเป็น SVG ใน LandingIllustrations (PYG-687: เลิกใช้รูปที่ไม่รู้ที่มาเพื่อเลี่ยงปัญหาลิขสิทธิ์)
// PYG-712: ภาพนี้คือ LCP ของหน้าแรก — ใช้ WebP (เดิม PNG 1.7 MB) + ขนาดมือถือแยก
import heroImage from '../../assets/banner.webp';
import heroImageMobile from '../../assets/banner-828.webp';
// ภาพโทรศัพท์ 3 เครื่องในส่วน "ใช้งานง่ายใน 3 ขั้นตอน" — ภาพเดียวที่จัดองค์ประกอบมาแล้ว (สร้างด้วย AI จากหน้าจอแอปจริง)
// แทนกรอบโทรศัพท์ CSS + ภาพหน้าจอ 3 ใบเดิม · ต้นฉบับ PNG 1536×1024 1.4 MB → WebP
import appMockup from '../../assets/app-mockup.webp';
import appMockupSmall from '../../assets/app-mockup-720.webp';
import {
  BedCareArt,
  DoctorVisitArt,
  ElderCareArt,
  FamilyCareArt,
  PhysioArt,
} from './LandingIllustrations';

const heroHighlights = [
  { icon: 'verified_user', label: 'ผู้ดูแลทุกคนยืนยันตัวตนแล้ว' },
  { icon: 'lock', label: 'ชำระเงินปลอดภัยผ่านระบบ' },
];

const quickActions = [
  {
    to: '/booking/new',
    icon: 'event_available',
    title: 'จองผู้ดูแล',
    description: 'เลือกบริการ วันเวลา และผู้ดูแลที่ต้องการ',
    cta: 'เริ่มจอง',
  },
  {
    to: '/bookings',
    icon: 'calendar_month',
    title: 'นัดหมายของฉัน',
    description: 'ดูนัดหมายที่กำลังจะถึง และประวัติการจอง',
    cta: 'ดูนัดหมาย',
  },
  {
    to: '/family-group',
    icon: 'groups',
    title: 'จัดการกลุ่มของฉัน',
    description: 'จองแทนคนในครอบครัว และติดตามนัดหมายร่วมกัน',
    cta: 'ไปที่กลุ่ม',
  },
];

const services: { title: string; description: string; Art: React.FC<{ label: string }> }[] = [
  {
    title: 'ดูแลผู้สูงอายุ',
    description: 'ช่วยเรื่องกิจวัตรประจำวัน เตรียมอาหาร และอยู่เป็นเพื่อนพูดคุยไม่ให้เหงา',
    Art: ElderCareArt,
  },
  {
    title: 'ดูแลผู้ป่วยติดเตียง',
    description: 'ช่วยพลิกตัว เช็ดตัว ป้อนอาหาร และดูแลผิวเพื่อป้องกันแผลกดทับ',
    Art: BedCareArt,
  },
  {
    title: 'กายภาพบำบัด',
    description: 'ฟื้นฟูการเคลื่อนไหวถึงบ้าน โดยนักกายภาพบำบัดมืออาชีพ',
    Art: PhysioArt,
  },
  {
    title: 'ดูแลระหว่างพบแพทย์',
    description: 'รับ–ส่งโรงพยาบาล อยู่เป็นเพื่อนระหว่างรอตรวจ และช่วยรับยา',
    Art: DoctorVisitArt,
  },
];

const steps = [
  {
    title: 'บอกสิ่งที่ต้องการ',
    description: 'เลือกบริการ วันเวลา และสถานที่ พร้อมบอกข้อมูลของผู้รับบริการ',
  },
  {
    title: 'เลือกผู้ดูแลที่ใช่',
    description: 'ระบบคัดผู้ดูแลในพื้นที่มาให้ เลือกได้จากประวัติและคะแนนรีวิว',
  },
  {
    title: 'ชำระเงินและติดตามงาน',
    description: 'ชำระผ่านระบบอย่างปลอดภัย เงินจะถึงผู้ดูแลเมื่องานเสร็จ และติดตามสถานะได้ตลอด',
  },
];

interface HomePageProps {
  /** Guest view: hides the signed-in-only quick actions and shows the sign-up CTA. */
  readonly isPublic?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ isPublic = false }) => {
  return (
    <div className="bg-[#F6FAF9] text-[#1A1A1A] antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

      {/* ═══ HERO ═══ */}
      <section className="relative isolate">
        <div className="relative min-h-[620px] bg-[#EAF4F0] overflow-hidden">
          <img
            src={heroImage}
            srcSet={`${heroImageMobile} 828w, ${heroImage} 1415w`}
            sizes="100vw"
            fetchPriority="high"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(255,255,255,0.7)_50%,rgba(255,255,255,0)_100%)]" />

          <div className="relative max-w-[1200px] mx-auto px-6">
            <div className="max-w-[560px] pt-24 pb-48">
              <p className="text-[13px] font-bold tracking-[1.2px] uppercase text-[#009265]">บริการผู้ดูแลถึงบ้าน</p>

              {/* Thai vowels/tone marks stack above the line, so this needs more leading than a Latin heading */}
              <h1 className="mt-3 text-[48px] leading-[72px] font-bold text-[#1A1A1A]">
                ดูแลคนที่คุณรัก
                <br />
                <span className="relative inline-block">
                  {/* Highlight sits first so the glyphs (and their descenders) paint over it */}
                  <span className="absolute -left-1 bottom-2 h-1.5 w-[calc(100%+8px)] rounded-full bg-[rgba(82,182,154,0.4)]" />
                  <span className="relative">ด้วยผู้ดูแลมืออาชีพ</span>
                </span>
              </h1>

              <p className="mt-6 max-w-[520px] text-base leading-7 text-[#3F5049]">
                เลือกผู้ดูแลที่ผ่านการตรวจสอบประวัติ ในวันและเวลาที่คุณสะดวก
                ติดตามการดูแลได้ทุกขั้นตอน และชำระเงินอย่างปลอดภัยผ่านระบบ
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
                {heroHighlights.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Icon name={item.icon} className="!text-[18px]" color="#009265" />
                    <span className="text-[13px] leading-5 text-[#3F5049]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick action card — overlaps the bottom of the hero. Signed-in only:
            every destination requires a session. */}
        {!isPublic && (
        <div className="relative max-w-[1200px] mx-auto px-6 -mt-28">
          <div className="mx-auto max-w-[1000px] grid grid-cols-1 md:grid-cols-3 bg-white rounded-2xl border border-[#F3F4F6] shadow-[0_10px_40px_rgba(0,0,0,0.08)] overflow-hidden">
            {quickActions.map((action, index) => (
              <Link
                key={action.to}
                to={action.to}
                className={`group flex flex-col items-center text-center p-6 no-underline text-[#1A1A1A] transition-colors hover:bg-[#F8FCFA] ${
                  index > 0 ? 'md:border-l border-[#F3F4F6]' : ''
                }`}
              >
                <span className="w-12 h-12 rounded-full bg-[#F0FAF4] flex items-center justify-center">
                  <Icon name={action.icon} size="large" color="#009265" />
                </span>
                <span className="mt-4 text-base font-bold leading-6">{action.title}</span>
                <span className="mt-1 text-[13px] leading-5 text-[#8A8C8E]">{action.description}</span>
                <span className="mt-auto pt-4 flex w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-[#009265]">
                  {action.cta}
                  <Icon name="arrow_forward" className="!text-base transition-transform group-hover:translate-x-0.5" color="#009265" />
                </span>
              </Link>
            ))}
          </div>
        </div>
        )}
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="max-w-[1200px] mx-auto px-6 pt-20">
        <div className="max-w-[560px] mx-auto text-center">
          <p className="text-[13px] font-bold tracking-[1.2px] uppercase text-[#009265]">บริการของเรา</p>
          <h2 className="mt-2 text-[32px] leading-[48px] font-bold text-[#1A1A1A]">การดูแลที่เหมาะกับคนที่คุณรัก</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#8A8C8E]">
            ผู้ดูแลทุกคนผ่านการตรวจสอบประวัติและยืนยันตัวตน พร้อมดูแลตั้งแต่กิจวัตรประจำวันไปจนถึงการดูแลเฉพาะทาง
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map(({ title, description, Art }) => (
            <article
              key={title}
              className="flex flex-col bg-white rounded-xl border border-[#F3F4F6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden"
            >
              <div className="p-3 pb-0">
                <div className="aspect-[8/5] w-full overflow-hidden rounded-xl">
                  <Art label={title} />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold leading-6 text-[#1A1A1A]">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-[#8A8C8E]">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="mt-20 bg-white border-y border-[#F3F4F6] py-16">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* พื้นหลังภาพโปร่งใส (เงาโทรศัพท์ติดมาในภาพ) — วางลอยบนพื้นขาวตรง ๆ ไม่ใส่กรอบ
              width/height กันหน้าเลื่อน (CLS) ระหว่างโหลด · อยู่ใต้ fold จึง lazy */}
          <img
            src={appMockup}
            srcSet={`${appMockupSmall} 720w, ${appMockup} 1200w`}
            sizes="(min-width: 1024px) 576px, calc(100vw - 48px)"
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
            alt="หน้าจอแอป Payung: เลือกบริการ ยืนยันคำขอจอง และติดตามงาน"
            className="w-full h-auto"
          />

          <div>
            <p className="text-[13px] font-bold tracking-[1.2px] uppercase text-[#009265]">ใช้งานง่ายใน 3 ขั้นตอน</p>
            <h2 className="mt-2 text-[32px] leading-10 font-bold text-[#1A1A1A]">จองผู้ดูแลได้ง่าย ๆ ในไม่กี่นาที</h2>

            <ol className="mt-8 flex flex-col gap-7">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-[#F0FAF4] flex items-center justify-center text-base font-bold text-[#009265]">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold leading-6 text-[#1A1A1A]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#8A8C8E]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ Guests only: it asks for a sign-up they have not made yet. */}
      {isPublic && (
      <section className="max-w-[1200px] mx-auto px-6 pt-20">
        <div className="bg-[#005C3E] rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-center p-12">
          <div>
            <h2 className="text-[32px] leading-10 font-bold text-white">ให้เราช่วยดูแลคนที่คุณรัก</h2>
            <p className="mt-4 text-[15px] leading-7 text-white/80">
              สมัครวันนี้แล้วเริ่มจองผู้ดูแลได้ทันที ชวนคนในครอบครัวเข้ากลุ่มเดียวกัน
              เพื่อช่วยกันดูแลและจองแทนกันได้
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#005C3E] no-underline transition-colors hover:bg-[#EAF4F0]"
            >
              สมัครสมาชิกและเริ่มจอง
            </Link>
          </div>
          <div className="flex justify-center">
            <FamilyCareArt className="h-[320px] w-auto max-w-full" />
          </div>
        </div>
      </section>
      )}

      {/* ═══ FOOTER ═══ PYG-701: เหลือแค่คำอธิบาย Payung — เมนูบริการ/ช่วยเหลือ และอีเมล/เบอร์ติดต่อ
          เป็นข้อมูลสมมติ (ยังไม่มีหน้าปลายทางและช่องทางติดต่อจริง) จึงเอาออก */}
      <footer className="mt-16 bg-[#005C3E] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-bold leading-8 tracking-[-0.55px] text-white">payung</span>
            <Icon name="eco" color="#52B69A" />
          </div>
          <p className="mt-3 max-w-[380px] text-[13px] leading-6 text-white/70">
            แพลตฟอร์มจัดหาผู้ดูแลถึงบ้าน ผู้ดูแลผ่านการตรวจสอบประวัติ พร้อมระบบชำระเงินที่ปลอดภัย
          </p>

          <div className="mt-8 pt-6 border-t border-white/15 text-xs text-white/60">
            © 2569 Payung · แพลตฟอร์มจัดหาผู้ดูแลที่บ้าน
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
