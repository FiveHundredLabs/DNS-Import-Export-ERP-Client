import { formatDateTime } from '../../utils/formatters';
import {
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Send,
  Ban,
  Boxes,
  PackageCheck,
  FileText,
  Truck,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TimelineEntry {
  id: string;
  stepNumber?: number;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  comment?: string;
  timestamp: string;
  targetRole?: string;
}

export function ApprovalTimeline({ history }: { history: TimelineEntry[] }) {
  if (!history || history.length === 0) {
    return <div className="text-xs text-slate-400 italic">No approval actions recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {history.map((step) => {
          const act = step.action?.toUpperCase();
          const isApprove = act === 'APPROVE' || act === 'DELIVER';
          const isReject = act === 'REJECT';
          const isEscalate = act === 'ESCALATE';
          const isSubmit = act === 'SUBMIT';
          const isCancel = act === 'CANCEL';
          const isPick = act === 'PICK';
          const isIssue = act === 'ISSUE';
          const isInvoice = act === 'INVOICE';
          const isDispatch = act === 'DISPATCH';
          const isCreate = act === 'CREATE';

          return (
            <div key={step.id} className="relative mb-4 last:mb-0">
              <div
                className={cn(
                  'absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full text-white',
                  isApprove && 'bg-emerald-500',
                  isReject && 'bg-rose-500',
                  isEscalate && 'bg-primary-light',
                  isSubmit && 'bg-primary-light',
                  isCancel && 'bg-slate-500',
                  isPick && 'bg-amber-500',
                  isIssue && 'bg-primary-light',
                  isInvoice && 'bg-purple-500',
                  isDispatch && 'bg-teal-500',
                  isCreate && 'bg-slate-400'
                )}
              >
                {isApprove && <CheckCircle2 className="h-3 w-3" />}
                {isReject && <XCircle className="h-3 w-3" />}
                {isEscalate && <ArrowUpRight className="h-3 w-3" />}
                {isSubmit && <Send className="h-2.5 w-2.5" />}
                {isCancel && <Ban className="h-3 w-3" />}
                {isPick && <Boxes className="h-3 w-3" />}
                {isIssue && <PackageCheck className="h-3 w-3" />}
                {isInvoice && <FileText className="h-3 w-3" />}
                {isDispatch && <Truck className="h-3 w-3" />}
                {isCreate && <PlusCircle className="h-3 w-3" />}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-900">
                    {step.actorName} <span className="font-normal text-slate-500">({step.actorRole})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{formatDateTime(step.timestamp)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-medium flex-wrap">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] uppercase font-bold',
                      isApprove && 'bg-emerald-50 text-emerald-700',
                      isReject && 'bg-rose-50 text-rose-700',
                      isEscalate && 'bg-primary-light text-sky-700',
                      isSubmit && 'bg-primary-light text-primary-text',
                      isCancel && 'bg-slate-100 text-slate-700',
                      isPick && 'bg-amber-50 text-amber-700',
                      isIssue && 'bg-primary-light text-blue-700',
                      isInvoice && 'bg-purple-50 text-purple-700',
                      isDispatch && 'bg-teal-50 text-teal-700',
                      isCreate && 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {step.action}
                  </span>
                  {step.targetRole && (
                    <span className="text-[10px] text-sky-700 bg-primary-light px-1 py-0.5 rounded font-semibold">
                      → {step.targetRole}
                    </span>
                  )}
                  {step.fromStatus && step.toStatus && (
                    <span className="text-slate-500 text-[11px]">
                      from <span className="font-mono">{step.fromStatus}</span> to{' '}
                      <span className="font-mono">{step.toStatus}</span>
                    </span>
                  )}
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
