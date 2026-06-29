import React from 'react';
import Icon from './Icon';

interface ReviewPromptCardProps {
  onReview: () => void;
}

export const ReviewPromptCard: React.FC<ReviewPromptCardProps> = ({ onReview }) => (
  <div
    className="w-full bg-gradient-to-br from-[#F0FAF4] to-[#E6F5ED] border border-[#D1FAE5] rounded-2xl p-5 flex flex-col items-center text-center shadow-[0px_2px_8px_rgba(82,182,154,0.08)] animate-slideIn"
    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
  >
    <div className="w-12 h-12 bg-[#FEF3C7] rounded-full flex items-center justify-center mb-3">
      <Icon
        name="star"
        className="text-[28px] text-[#F59E0B]"
        style={{ fontSize: '28px' }}
      />
    </div>

    <h3 className="font-bold text-base leading-6 text-[#1A1A1A] m-0">
      บริการเสร็จสิ้น คุณพอใจหรือไม่?
    </h3>

    <button
      type="button"
      onClick={onReview}
      className="w-full sm:w-auto flex flex-row justify-center items-center gap-2 px-6 h-11 mt-5 bg-[#009265] hover:bg-[#007C55] rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all"
    >
      <Icon name="rate_review" className="text-[18px] text-white" />
      <span className="font-semibold text-[13px] leading-5 text-white">เขียนรีวิว</span>
    </button>
  </div>
);

export default ReviewPromptCard;
