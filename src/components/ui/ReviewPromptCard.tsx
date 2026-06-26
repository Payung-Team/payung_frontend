import React, { useState } from 'react';
import Icon from './Icon';

interface ReviewPromptCardProps {
  caregiverName: string;
  onReview: () => void;
}

export const ReviewPromptCard: React.FC<ReviewPromptCardProps> = ({
  caregiverName,
  onReview,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="w-full bg-gradient-to-br from-[#F0FAF4] to-[#E6F5ED] border border-[#D1FAE5] rounded-2xl p-5 flex flex-col items-center text-center shadow-[0px_2px_8px_rgba(82,182,154,0.08)] animate-slideIn"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      {/* Star icon */}
      <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mb-3">
        <Icon
          name="star"
          className="text-[28px] text-[#F59E0B]"
          style={{ fontSize: '28px' }}
        />
      </div>

      {/* Title */}
      <h3 className="font-bold text-base leading-6 text-[#1A1A1A] m-0">
        ขอบคุณที่ใช้บริการ!
      </h3>

      {/* Description */}
      <p className="font-normal text-[13px] leading-5 text-[#575859] mt-1.5 mb-0 max-w-[320px]">
        คุณประทับใจบริการของ{' '}
        <span className="font-semibold text-[#1A1A1A]">{caregiverName}</span>{' '}
        หรือไม่? ให้คะแนนและรีวิวเพื่อช่วยเหลือผู้ใช้คนอื่น
      </p>

      {/* Buttons */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-5">
        <button
          type="button"
          onClick={onReview}
          className="w-full sm:w-auto flex flex-row justify-center items-center gap-2 px-5 h-10 bg-[#009265] hover:bg-[#007C55] rounded-lg cursor-pointer shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all"
        >
          <Icon name="rate_review" className="text-[18px] text-white" />
          <span className="font-semibold text-[13px] leading-5 text-white">ให้คะแนนและรีวิว</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-full sm:w-auto flex flex-row justify-center items-center px-5 h-10 bg-transparent border border-[#D1D5DB] hover:bg-white/60 rounded-lg cursor-pointer transition-colors"
        >
          <span className="font-semibold text-[13px] leading-5 text-[#8A8C8E]">ข้ามไปก่อน</span>
        </button>
      </div>
    </div>
  );
};

export default ReviewPromptCard;
