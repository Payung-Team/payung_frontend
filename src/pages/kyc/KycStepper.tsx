import { Fragment } from 'react';
import Icon from '../../components/ui/Icon';

const STEPS = ['ข้อมูลส่วนตัว', 'เอกสาร', 'บัญชีรับเงิน', 'ตรวจสอบ'];

export default function KycStepper({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center mb-6 sm:mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <Fragment key={n}>
            {/* มือถือ: ความกว้างคงที่ให้ป้ายตัดบรรทัดได้ · เส้นเชื่อมยืดเต็มที่ว่าง */}
            <div className="flex flex-col items-center gap-1.5 w-16 sm:w-auto shrink-0">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  done || active ? 'bg-[#2D6A58] text-white' : 'bg-[#E2E8F0] text-[#717182]'
                }`}
              >
                {done ? (
                  <Icon name="check" color="white" style={{ fontSize: '18px' }} />
                ) : (
                  n
                )}
              </div>
              <span
                className={`text-[11px] sm:text-xs leading-tight text-center sm:whitespace-nowrap font-medium ${active ? 'text-[#2D6A58]' : done ? 'text-[#2D6A58]' : 'text-[#717182]'}`}
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 min-w-3 sm:flex-none sm:w-16 h-0.5 mt-4 sm:mt-[17px] ${done ? 'bg-[#2D6A58]' : 'bg-[#E2E8F0]'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
