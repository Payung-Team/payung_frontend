import type { ReactNode } from 'react';

export interface ExpandableSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Native <details>/<summary> — simplest correct disclosure widget, no accordion state to manage,
 * keyboard-accessible for free. */
export default function ExpandableSection({ title, children, defaultOpen = false }: Readonly<ExpandableSectionProps>) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-[#E5E7EB] bg-white [&_summary::-webkit-details-marker]:hidden"
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 text-sm font-bold text-[#1A1A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {title}
        <span className="material-icons text-[#8A8C8E] transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div className="border-t border-[#F0F1F3] p-3.5">{children}</div>
    </details>
  );
}
