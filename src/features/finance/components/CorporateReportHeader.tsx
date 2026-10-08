import React from 'react';
import { Building2, ShieldCheck } from 'lucide-react';

interface CorporateReportHeaderProps {
  title: string;
  subtitle?: string;
  periodLabel?: string;
  currency?: string;
  showInWebPreview?: boolean;
}

export const CorporateReportHeader: React.FC<CorporateReportHeaderProps> = ({
  title,
  subtitle,
  periodLabel,
  currency = 'LKR (Sri Lankan Rupee)',
  showInWebPreview = true,
}) => {
  return (
    <div
      data-testid="corporate-report-header"
      className={`border-b-2 border-slate-900 pb-4 mb-6 ${
        showInWebPreview ? 'block' : 'hidden print:block'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl tracking-wider shadow-sm">
            DNS
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              DNS Import &amp; Export (Pvt) Ltd
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Company Reg: PV 0029384 &bull; VAT Reg No: VAT-102938475 &bull; SVAT: SVAT-009988
            </p>
            <p className="text-[11px] text-slate-500">
              104 Nawam Mawatha, Colombo 02, Sri Lanka &bull; Tel: +94 11 234 5678 &bull; finance@dnsgroup.lk
            </p>
          </div>
        </div>

        {/* Audit & Compliance Watermark */}
        <div className="flex flex-col items-start sm:items-end text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Audited Statutory Financial Record</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[11px] font-semibold text-slate-700">
            Reporting Currency: {currency}
          </span>
        </div>
      </div>

      {/* Statement Title Banner */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
        </div>
        {periodLabel && (
          <div className="text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            {periodLabel}
          </div>
        )}
      </div>
    </div>
  );
};
