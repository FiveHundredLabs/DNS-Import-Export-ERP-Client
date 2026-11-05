import { useState } from 'react';
import { Target } from 'lucide-react';
import { ReportPageShell, ReportFilterBar, getDefaultDateRange, KpiCard, SortableTable, StatusPill, lkr, pct, type DateRange, type TableCol } from '../shared/ReportSharedUI';
import { MOCK_TARGETS, TARGET_KPIS, type TargetRow } from '../shared/reportMockData';

const COLS: TableCol<TargetRow>[] = [
  { key: 'name', label: 'Name / Area', sortable: true },
  { key: 'type', label: 'Type', align: 'center', render: (r) => <StatusPill label={r.type} variant={r.type === 'REP' ? 'purple' : 'blue'} /> },
  { key: 'period', label: 'Period' },
  { key: 'target', label: 'Target', align: 'right', sortable: true, render: (r) => lkr(r.target) },
  { key: 'achieved', label: 'Achieved', align: 'right', sortable: true, render: (r) => lkr(r.achieved) },
  { key: 'remaining', label: 'Remaining', align: 'right', render: (r) => r.remaining > 0 ? <span className="text-amber-600 font-medium">{lkr(r.remaining)}</span> : <span className="text-emerald-600 font-medium">—</span> },
  { key: 'achievement', label: 'Achievement', align: 'center', sortable: true,
    render: (r) => (
      <div className="flex items-center gap-1.5 justify-center">
        <div className="w-16 bg-slate-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${r.achievement >= 100 ? 'bg-emerald-500' : r.achievement >= 85 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.achievement, 100)}%` }} />
        </div>
        <span className={`font-semibold text-[11px] ${r.achievement >= 100 ? 'text-emerald-600' : r.achievement >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{pct(r.achievement)}</span>
      </div>
    )
  },
];

export function SalesTargetReportPage() {
  const [dr, setDr] = useState<DateRange>(getDefaultDateRange());

  return (
    <ReportPageShell
      backPath="/reports/sales"
      backLabel="Back to Sales Reports"
      title="Sales Target Achievement Report"
      subtitle="Rep-wise and area-wise target vs actual achievement with progress indicators."
      badge="Target vs Actual"
      badgeColor="bg-amber-50 text-amber-700 border-amber-200"
      toolbar={<ReportFilterBar dateRange={dr} onChange={setDr} />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="On / Above Target" value={TARGET_KPIS.onTarget.toString()} sub="Reps & areas ≥100%" color="green" />
        <KpiCard label="Below Target" value={TARGET_KPIS.belowTarget.toString()} sub="Need attention" color="amber" />
        <KpiCard label="Avg Achievement" value={pct(TARGET_KPIS.avgAchievement)} sub="Overall average" color="blue" />
        <KpiCard label="Monthly Target" value={lkr(TARGET_KPIS.monthlyTarget)} sub="Combined targets" color="default" />
      </div>

      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-slate-700">Target Achievement Detail</span>
      </div>

      <SortableTable columns={COLS} data={MOCK_TARGETS as unknown as Record<string, unknown>[]} />
    </ReportPageShell>
  );
}

