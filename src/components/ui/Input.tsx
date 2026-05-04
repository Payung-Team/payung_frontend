import { forwardRef } from 'react';
import Icon from './Icon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  isCorrect?: boolean;
  isRejected?: boolean;
  rejectedReason?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', isCorrect, isRejected, rejectedReason, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors text-sm ${
              isCorrect 
                ? 'bg-[#F0FDF4] border-[#10B981] text-[#064E3B] pr-10 focus:border-[#10B981] focus:ring-0' 
                : isRejected
                  ? 'bg-[#FEF2F2] border-[#DC2626] text-[#111827] pr-10 focus:border-[#DC2626] focus:ring-0'
                  : error 
                    ? 'border-red-500' 
                    : 'border-gray-300 focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]'
            } ${className}`}
            disabled={isCorrect || props.disabled}
            {...props}
          />
          {isCorrect && (
            <div className="absolute right-3 flex items-center justify-center w-5 h-5 bg-[#10B981] rounded-full">
              <Icon name="check" color="white" style={{ fontSize: '14px' }} />
            </div>
          )}
          {isRejected && (
            <div className="absolute right-3 flex items-center justify-center w-5 h-5 border-[1.5px] border-[#DC2626] rounded-full text-[#DC2626] font-bold text-[12px] leading-none">
              !
            </div>
          )}
        </div>
        {isRejected && rejectedReason && (
          <span className="text-[11px] text-[#DC2626] font-normal leading-[14px] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {rejectedReason}
          </span>
        )}
        {error && <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
