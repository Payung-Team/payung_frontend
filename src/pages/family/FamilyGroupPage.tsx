import { Icon } from '../../components/ui/Icon';

export default function FamilyGroupPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 md:py-12">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-6 py-16 text-center">
        <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FAF4]">
          <Icon name="group" size="large" className="text-[#52B69A]" />
        </span>

        <h1
          className="text-[22px] font-semibold leading-[30px] text-[#0A0A0A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          กลุ่มครอบครัว
        </h1>

        <p
          className="mt-2 max-w-[420px] text-[14px] leading-[22px] text-[#717182]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ฟีเจอร์นี้กำลังพัฒนา เร็ว ๆ นี้คุณจะสามารถเชิญสมาชิกในครอบครัวมาร่วมดูแลและติดตามการนัดหมายร่วมกันได้
        </p>
      </div>
    </div>
  );
}
