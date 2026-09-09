import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { GET_USER } from '../../graphql/queries';
import { Icon } from '../../components/ui/Icon';
import heroImage from '../../assets/banner.png';
import careService1 from '../../assets/careservice_1.jpg';
import careService2 from '../../assets/careservice_2.jpg';
import careService3 from '../../assets/careservice_3.jpg';
import careService4 from '../../assets/careservice_4.jpg';
import appScreenshot1 from '../../assets/step_1.png';
import appScreenshot2 from '../../assets/step_2.png';
import appScreenshot3 from '../../assets/step_3.png';


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

/** Dashed grey box standing in for artwork that has not been supplied yet. */
const ImagePlaceholder: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center rounded-xl bg-[#F1F5F4] border-[1.6px] border-dashed border-[#CBD5D1] ${className}`}
  >
    <Icon name="image" size="large" color="#9AA5A1" />
    <span className="mt-1.5 text-[11px] font-semibold tracking-[0.275px] text-[#9AA5A1]">{label}</span>
  </div>
);

/**
 * Phone mockup frame for the app screenshots. Drop a screenshot into `image`
 * and it fills the screen; without one the dashed placeholder shows instead.
 */
const PhoneFrame: React.FC<{ label: string; image?: string; className?: string }> = ({ label, image, className = '' }) => (
  <div
    className={`w-full max-w-[168px] rounded-[28px] bg-[#1A1A1A] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)] ${className}`}
  >
    <div className="relative aspect-[9/19] overflow-hidden rounded-[22px] bg-[#F1F5F4]">
      {/* notch */}
      <span className="absolute top-1.5 left-1/2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#1A1A1A]" />
      {image ? (
        <img src={image} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
          <Icon name="image" size="large" color="#9AA5A1" />
          <span className="mt-1.5 text-[11px] font-semibold leading-4 tracking-[0.275px] text-[#9AA5A1]">{label}</span>
        </div>
      )}
    </div>
  </div>
);

/** Per-phone tilt + depth, applied by position in the fan. */
const phoneAngles = [
  'z-10 [transform:rotateY(22deg)_rotateZ(-7deg)_scale(0.9)_translateY(16px)]',
  'z-30 [transform:rotateY(6deg)_rotateZ(-4deg)]',
  'z-20 [transform:rotateY(-18deg)_rotateZ(5deg)_scale(0.92)_translateY(22px)]',
];

/** Screenshots for the "how it works" phone mockups — add `image` when the artwork is ready. */
const appScreens: { label: string; image?: string }[] = [
  { label: 'หน้าจอ 1', image: appScreenshot1 },
  { label: 'หน้าจอ 2', image: appScreenshot2 },
  { label: 'หน้าจอ 3', image: appScreenshot3 },
];

const heroHighlights = [
  { icon: 'verified_user', label: 'ผู้ดูแลผ่าน KYC ทุกคน' },
  { icon: 'lock', label: 'ชำระเงินปลอดภัย' },
  { icon: 'support_agent', label: 'ทีมงานดูแลตลอดงาน' },
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

/** `image` wins when supplied; otherwise the dashed `placeholder` box is shown. */
const services: { title: string; description: string; placeholder: string; image?: string }[] = [
  {
    title: 'ดูแลผู้สูงอายุ',
    description: 'ช่วยเหลือกิจวัตรประจำวัน เตรียมอาหาร และเป็นเพื่อนพูดคุย',
    placeholder: 'รูปบริการ 1',
    image: careService1,
  },
  {
    title: 'ดูแลผู้ป่วยติดเตียง',
    description: 'พลิกตัว ทำความสะอาด ป้อนอาหาร และดูแลแผลกดทับ',
    placeholder: 'รูปบริการ 2',
    image: careService2,
  },
  {
    title: 'กายภาพบำบัด',
    description: 'ฟื้นฟูการเคลื่อนไหวโดยนักกายภาพบำบัดวิชาชีพ',
    placeholder: 'รูปบริการ 3',
    image: careService3,
  },
  {
    title: 'พาไปโรงพยาบาล',
    description: 'รับส่ง ดูแลระหว่างพบแพทย์ และรับยาแทน',
    placeholder: 'รูปบริการ 4',
    image: careService4,
  },
];

const steps = [
  {
    title: 'บอกความต้องการ',
    description: 'เลือกบริการ วันเวลา สถานที่ และรายละเอียดผู้รับบริการ',
  },
  {
    title: 'เลือกผู้ดูแล',
    description: 'ระบบจับคู่ผู้ดูแลในพื้นที่ให้ เลือกจากประวัติและคะแนนรีวิว',
  },
  {
    title: 'ชำระเงินและติดตาม',
    description: 'ชำระผ่านระบบ เงินถูกพักไว้จนงานเสร็จ ติดตามสถานะได้ตลอด',
  },
];

const footerServiceLinks = ['ดูแลผู้สูงอายุ', 'ดูแลผู้ป่วยติดเตียง', 'กายภาพบำบัด', 'พาไปโรงพยาบาล'];
const footerHelpLinks = ['คำถามที่พบบ่อย', 'ติดต่อเรา', 'เงื่อนไขการใช้บริการ', 'นโยบายความเป็นส่วนตัว'];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<UserData>(GET_USER);

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!loading && !data?.me) {
      navigate('/login');
    }
  }, [data, loading, navigate]);

  if (error) {
    console.error('Error fetching user data:', error);
  }

  return (
    <div className="bg-[#F6FAF9] text-[#1A1A1A] antialiased" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>

      {/* ═══ HERO ═══ */}
      <section className="relative isolate">
        <div className="relative min-h-[620px] bg-[#EAF4F0] overflow-hidden">
          <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover object-right" />
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
                จองผู้ดูแลที่ผ่านการตรวจสอบประวัติแล้ว เลือกวันเวลาที่สะดวก
                ติดตามการให้บริการแบบเรียลไทม์ และชำระเงินอย่างปลอดภัยผ่านระบบ
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

        {/* Quick action card — overlaps the bottom of the hero */}
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
      </section>

      {/* ═══ SERVICES ═══ */}
      <section className="max-w-[1200px] mx-auto px-6 pt-20">
        <div className="max-w-[560px] mx-auto text-center">
          <p className="text-[13px] font-bold tracking-[1.2px] uppercase text-[#009265]">บริการของเรา</p>
          <h2 className="mt-2 text-[32px] leading-[48px] font-bold text-[#1A1A1A]">เลือกบริการที่ตรงกับความต้องการ</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#8A8C8E]">
            ผู้ดูแลของเราผ่านการอบรมและตรวจสอบประวัติ พร้อมดูแลตั้งแต่งานประจำวันจนถึงการดูแลเฉพาะทาง
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map(service => (
            <article
              key={service.title}
              className="flex flex-col bg-white rounded-xl border border-[#F3F4F6] shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden"
            >
              <div className="p-3 pb-0">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-[150px] w-full rounded-xl object-cover"
                  />
                ) : (
                  <ImagePlaceholder label={service.placeholder} className="h-[150px]" />
                )}
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold leading-6 text-[#1A1A1A]">{service.title}</h3>
                <p className="mt-1.5 text-[13px] leading-6 text-[#8A8C8E]">{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="mt-20 bg-white border-y border-[#F3F4F6] py-16">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Phones fanned out in 3D — back two tilted away, middle one in front */}
          <div className="flex justify-center items-center py-8 [perspective:1400px]">
            {appScreens.map((screen, index) => (
              <PhoneFrame
                key={screen.label}
                label={screen.label}
                image={screen.image}
                className={`${phoneAngles[index] ?? ''} ${index > 0 ? '-ml-10 sm:-ml-12' : ''}`}
              />
            ))}
          </div>

          <div>
            <p className="text-[13px] font-bold tracking-[1.2px] uppercase text-[#009265]">ใช้งานง่ายใน 3 ขั้นตอน</p>
            <h2 className="mt-2 text-[32px] leading-10 font-bold text-[#1A1A1A]">จองผู้ดูแลได้ในไม่กี่นาที</h2>

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

      {/* ═══ CTA ═══ */}
      <section className="max-w-[1200px] mx-auto px-6 pt-20">
        <div className="bg-[#005C3E] rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-12">
          <div>
            <h2 className="text-[32px] leading-10 font-bold text-white">ให้เราช่วยดูแลคนที่คุณรัก</h2>
            <p className="mt-4 text-[15px] leading-7 text-white/80">
              เริ่มจองผู้ดูแลวันนี้ หรือชวนคนในครอบครัวเข้ากลุ่มเพื่อช่วยกันดูแลและจองแทนกันได้
            </p>
            <Link
              to="/booking/new"
              className="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#005C3E] no-underline transition-colors hover:bg-[#EAF4F0]"
            >
              สร้างโปรไฟล์เพื่อเริ่มการจอง
            </Link>
          </div>
          <div className="flex justify-center lg:justify-end">
            <ImagePlaceholder
              label="รูป CTA · 520 × 320"
              className="w-full max-w-[520px] h-[320px] !bg-white/5 !border-white/25 [&_span]:!text-white/60"
            />
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="mt-16 bg-[#005C3E] text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10">
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[22px] font-bold leading-8 tracking-[-0.55px] text-white">payung</span>
                <Icon name="eco" color="#52B69A" />
              </div>
              <p className="mt-3 max-w-[380px] text-[13px] leading-6 text-white/70">
                แพลตฟอร์มจัดหาผู้ดูแลถึงบ้าน ผู้ดูแลผ่านการตรวจสอบประวัติ พร้อมระบบชำระเงินที่ปลอดภัย
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">บริการ</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {footerServiceLinks.map(label => (
                  <li key={label} className="text-[13px] leading-5 text-white/70">{label}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">ช่วยเหลือ</h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {footerHelpLinks.map(label => (
                  <li key={label} className="text-[13px] leading-5 text-white/70">{label}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/15 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/60">
            <span>© 2569 Payung · แพลตฟอร์มจัดหาผู้ดูแลที่บ้าน</span>
            <span>contact@payung.app · 02-123-4567</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
