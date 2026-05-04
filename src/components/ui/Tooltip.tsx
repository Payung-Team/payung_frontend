import React, { useEffect, useRef, useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 500, position = 'top' }) => {
  const [visible, setVisible] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  // Check viewport after tooltip mounts
  useEffect(() => {
    if (!visible || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    setAlignRight(rect.right > window.innerWidth - 8);
  }, [visible]);

  const isTop = position === 'top';

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        className="cursor-help inline-flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#52B69A] rounded"
        aria-label="ข้อมูลเพิ่มเติม"
      >
        {children}
      </button>

      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[999] pointer-events-none ${alignRight ? 'right-0' : 'left-0'} ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          <div className="bg-gray-900 text-white text-[12px] leading-relaxed rounded-lg px-3 py-2 max-w-[220px] whitespace-normal shadow-lg">
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-[5px] border-transparent ${alignRight ? 'right-3' : 'left-3'}`}
            style={isTop
              ? { top: '100%', borderTopColor: '#111827' }
              : { bottom: '100%', borderBottomColor: '#111827' }
            }
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
