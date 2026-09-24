import { ApprovalHistoryEntry } from '../../types/approval';
import { formatDateTime } from '../../utils/formatters';
import { CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ApprovalTimeline({ history }: { history: ApprovalHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return <div className="text-xs text-slate-400 italic">No approval actions recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {history.map((step) => {
          const isApprove = step.action === 'APPROVE';
          const isReject = step.action === 'REJECT';
          const isEscalate = step.action === 'ESCALATE';

          return (
            <div key={step.id} className="relative mb-4 last:mb-0">
              <div
                className={cn(
                  'absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-white',
                  isApprove && 'bg-emerald-500',
                  isReject && 'bg-rose-500',
                  isEscalate && 'bg-sky-500'
                )}
              >
                {isApprove && <CheckCircle2 className="h-3 w-3" />}
                {isReject && <XCircle className="h-3 w-3" />}
                {isEscalate && <ArrowUpRight className="h-3 w-3" />}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-900">
                    {step.actorName} <span className="font-normal text-slate-500">({step.actorRole})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDateTime(step.timestamp)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] uppercase font-bold',
                      isApprove && 'bg-emerald-50 text-emerald-700',
                      isReject && 'bg-rose-50 text-rose-700',
                      isEscalate && 'bg-sky-50 text-sky-700'
                    )}
                  >
                    {step.action}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    from <span className="font-mono">{step.fromStatus}</span> to{' '}
                    <span className="font-mono">{step.toStatus}</span>
                  </span>
                </div>
                {step.comment && (
                  <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                    "{step.comment}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
