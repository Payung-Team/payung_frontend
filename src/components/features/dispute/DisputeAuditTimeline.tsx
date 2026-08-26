import DisputeCard from './DisputeCard';
import { cn } from '../../../lib/utils';
import { formatThaiDateTime } from './disputeMeta';
import type { TimelineEvent } from './disputeDetailMapper';

interface DisputeAuditTimelineProps {
  events: TimelineEvent[];
}

const ACTOR_COLOR: Record<TimelineEvent['actorKind'], string> = {
  customer: 'bg-[#4338CA]',
  caregiver: 'bg-[#C2410C]',
  system: 'bg-[#8A8C8E]',
  admin: 'bg-[#52B69A]',
};

// PYG-321 — audit timeline แนวตั้ง (actor + timestamp ทุก event)
export default function DisputeAuditTimeline({ events }: DisputeAuditTimelineProps) {
  return (
    <DisputeCard title="ประวัติการดำเนินการ">
      {events.length === 0 ? (
        <p className="text-sm text-[#8A8C8E]">ยังไม่มีประวัติการดำเนินการ</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex shrink-0 flex-col items-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white',
                    ACTOR_COLOR[event.actorKind],
                  )}
                >
                  {event.actor.charAt(0)}
                </span>
                {index < events.length - 1 && <span className="w-px flex-1 bg-[#E5E7EB]" />}
              </div>

              <div className={cn('min-w-0 flex-1', index < events.length - 1 && 'pb-5')}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[13px] font-bold text-[#1A1A1A]">{event.actor}</span>
                  <span className="font-[Inter] text-[11px] text-[#C6C8CB]">{formatThaiDateTime(event.at)}</span>
                </div>
                <div className="mt-2 rounded-lg border border-[#E5E7EB] px-3 py-2">
                  <p className="text-[13px] font-semibold leading-5 text-[#1A1A1A]">{event.title}</p>
                  {event.detail && <p className="mt-1 text-[12px] leading-5 text-[#8A8C8E]">{event.detail}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DisputeCard>
  );
}
