import React from 'react';

interface CorporateSignatureBlockProps {
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  approvedByName?: string;
  approvedByTitle?: string;
  date?: string;
}

export const CorporateSignatureBlock: React.FC<CorporateSignatureBlockProps> = ({
  preparedByName = 'K. M. Jayawardena, ACMA',
  preparedByTitle = 'Senior Financial Accountant',
  reviewedByName = 'H. P. Samarasekara, ACA',
  reviewedByTitle = 'Head of Finance / Controller',
  approvedByName = 'D. N. Senanayake',
  approvedByTitle = 'Managing Director / CEO',
  date,
}) => {
  const displayDate =
    date ||
    new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div
      data-testid="corporate-signature-block"
      className="mt-12 pt-6 border-t-2 border-slate-300 print:mt-16 print:pt-8 break-inside-avoid"
    >
      <div className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        Statutory Governance &amp; Certification Sign-Off
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 1. Prepared By */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Prepared By
            </span>
            <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1">
              <span className="font-serif italic text-slate-700 text-sm">
                K. M. Jayawardena
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs">
            <p className="font-bold text-slate-900">{preparedByName}</p>
            <p className="text-[11px] text-slate-500">{preparedByTitle}</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: {displayDate}</p>
          </div>
        </div>

        {/* 2. Reviewed & Verified By */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              2. Reviewed &amp; Verified By
            </span>
            <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1">
              <span className="font-serif italic text-slate-700 text-sm">
                H. P. Samarasekara
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs">
            <p className="font-bold text-slate-900">{reviewedByName}</p>
            <p className="text-[11px] text-slate-500">{reviewedByTitle}</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: {displayDate}</p>
          </div>
        </div>

        {/* 3. Approved By */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-4 bg-slate-50/50 relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                3. Approved By
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Board Seal
              </span>
            </div>
            <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end justify-between pb-1">
              <span className="font-serif italic text-slate-700 text-sm">
                D. N. Senanayake
              </span>
              <div className="h-10 w-10 rounded-full border-2 border-emerald-600/40 border-dashed flex items-center justify-center text-[8px] font-bold text-emerald-700 uppercase rotate-12">
                SEAL
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs">
            <p className="font-bold text-slate-900">{approvedByName}</p>
            <p className="text-[11px] text-slate-500">{approvedByTitle}</p>
            <p className="text-[10px] text-slate-400 mt-1">Date: {displayDate}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-slate-400 text-center italic">
        This statement has been prepared in compliance with Sri Lanka Accounting Standards (LKAS / SLFRS) and validated by internal accounting controls.
      </div>
    </div>
  );
};
