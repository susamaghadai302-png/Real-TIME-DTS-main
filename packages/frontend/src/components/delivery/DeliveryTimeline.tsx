import { DeliveryStatus, DeliveryStatusHistory, DELIVERY_TIMELINE_STEPS, STATUS_DISPLAY } from '@dts/shared';
import { Check } from 'lucide-react';
import { format } from 'date-fns';

interface DeliveryTimelineProps {
  status: DeliveryStatus;
  history?: DeliveryStatusHistory[];
}

// Map statuses that are off the main timeline
const TERMINAL_NON_TIMELINE = [
  DeliveryStatus.CANCELLED,
  DeliveryStatus.FAILED,
  DeliveryStatus.DELAYED,
];

export default function DeliveryTimeline({ status, history = [] }: DeliveryTimelineProps) {
  const currentIndex = DELIVERY_TIMELINE_STEPS.indexOf(status);
  const isTerminal = TERMINAL_NON_TIMELINE.includes(status);

  const getHistoryEntry = (step: DeliveryStatus): DeliveryStatusHistory | undefined => {
    return history.find((h) => h.status === step);
  };

  return (
    <div className="space-y-0">
      {/* Non-timeline terminal statuses */}
      {isTerminal && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <span className="text-lg">{STATUS_DISPLAY[status].icon}</span>
          <div>
            <p className="text-sm font-semibold text-red-700">{STATUS_DISPLAY[status].label}</p>
            {history.find((h) => h.status === status)?.note && (
              <p className="text-xs text-red-500 mt-0.5">
                {history.find((h) => h.status === status)?.note}
              </p>
            )}
          </div>
        </div>
      )}

      {DELIVERY_TIMELINE_STEPS.map((step, idx) => {
        const isPast = currentIndex > idx || status === DeliveryStatus.DELIVERED;
        const isCurrent = currentIndex === idx && !isTerminal;
        const isFuture = !isPast && !isCurrent;
        const entry = getHistoryEntry(step);
        const display = STATUS_DISPLAY[step];
        const isLast = idx === DELIVERY_TIMELINE_STEPS.length - 1;

        return (
          <div key={step} className="flex gap-4">
            {/* Left column: icon + line */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all
                  ${isPast ? 'bg-green-500' : ''}
                  ${isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-100 animate-pulse' : ''}
                  ${isFuture ? 'bg-gray-100 border-2 border-gray-200' : ''}
                `}
              >
                {isPast ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                ) : isCurrent ? (
                  <div className="w-3 h-3 rounded-full bg-white" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 min-h-[24px] transition-all ${
                    isPast ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Right column: text */}
            <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-semibold ${
                    isPast
                      ? 'text-green-700'
                      : isCurrent
                      ? 'text-indigo-700'
                      : 'text-gray-400'
                  }`}
                >
                  {display.icon} {display.label}
                </span>
                {isCurrent && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium animate-pulse">
                    Current
                  </span>
                )}
              </div>
              {entry ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                  {entry.note && (
                    <span className="ml-1 text-gray-400">— {entry.note}</span>
                  )}
                </p>
              ) : isFuture ? (
                <p className="text-xs text-gray-300 mt-0.5">Pending</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
