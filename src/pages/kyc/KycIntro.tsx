import { useKyc } from '../../context/KycContext';

const STEPS = [
  {
    num: 1,
    title: 'ข้อมูลส่วนตัว',
    desc: 'ชื่อ เลขบัตรประชาชน',
  },
  {
    num: 2,
    title: 'อัปโหลดเอกสาร',
    desc: 'รูปบัตรและใบรับรอง',
  },
  {
    num: 3,
    title: 'ตรวจสอบ',
    desc: 'ยืนยันก่อนส่ง',
  },
];

export default function KycIntro() {
  const { goToStep } = useKyc();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-[1248px] min-h-[736px] bg-white rounded-3xl border border-[#F1F5F9] flex flex-col items-center justify-center gap-8 px-16 py-14"
        style={{
          boxShadow: '0 12px 28px -6px rgba(15,23,43,0.06), 0 1px 2px 0 rgba(15,23,43,0.04)',
        }}
      >
        {/* Shield Icon */}
        <div className="w-20 h-20 rounded-full bg-[#DFF2EC] flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 3.33334L5 9.16668V19.1667C5 27.6667 11.6 35.6167 20 37.5C28.4 35.6167 35 27.6667 35 19.1667V9.16668L20 3.33334Z"
              fill="#52B69A"
              opacity="0.25"
            />
            <path
              d="M20 3.33334L5 9.16668V19.1667C5 27.6667 11.6 35.6167 20 37.5C28.4 35.6167 35 27.6667 35 19.1667V9.16668L20 3.33334Z"
              stroke="#2D6A58"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M14 20L18 24L26 16"
              stroke="#2D6A58"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ยืนยันตัวตนเพื่อเริ่มรับงาน
          </h1>
          <p
            className="mt-3 text-base text-[#717182]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ใช้เวลาประมาณ 5 นาที ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ
          </p>
        </div>

        {/* Step Cards */}
        <div className="flex gap-4 w-full max-w-[720px]">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white px-6 py-5 flex flex-col items-center gap-3 text-center"
            >
              <div className="w-9 h-9 rounded-full bg-[#2D6A58] flex items-center justify-center">
                <span
                  className="text-white text-sm font-bold"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  {s.num}
                </span>
              </div>
              <div>
                <p
                  className="text-sm font-semibold text-[#0A0A0A]"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  {s.title}
                </p>
                <p
                  className="text-xs text-[#717182] mt-0.5"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={() => goToStep(1)}
          className="h-[52px] w-full max-w-[320px] rounded-xl bg-[#2D6A58] text-white font-bold text-lg hover:bg-[#255a4a] active:scale-[0.98] transition-all duration-150 cursor-pointer"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          เริ่มยืนยันตัวตน →
        </button>
      </div>
    </div>
  );
}
