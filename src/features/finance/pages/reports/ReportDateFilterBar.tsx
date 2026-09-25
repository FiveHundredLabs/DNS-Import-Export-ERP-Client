import { Calendar, Printer, Download } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

export interface DateFilterState {
  preset: 'TODAY' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
  startDate: string;
  endDate: string;
}

interface ReportDateFilterBarProps {
  filter: DateFilterState;
  onChange: (filter: DateFilterState) => void;
  onPrint?: () => void;
  onExportCsv?: () => void;
  reportTitle?: string;
}

export function ReportDateFilterBar({
  filter,
  onChange,
  onPrint,
  onExportCsv,
  reportTitle,
}: ReportDateFilterBarProps) {
  const handlePreset = (preset: DateFilterState['preset']) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'TODAY') {
      onChange({ preset, startDate: todayStr, endDate: todayStr });
    } else if (preset === 'THIS_MONTH') {
      const firstDay = `${yyyy}-${mm}-01`;
      onChange({ preset, startDate: firstDay, endDate: todayStr });
    } else if (preset === 'THIS_QUARTER') {
      const qStartMonth = Math.floor(today.getMonth() / 3) * 3 + 1;
      const firstDayQ = `${yyyy}-${String(qStartMonth).padStart(2, '0')}-01`;
      onChange({ preset, startDate: firstDayQ, endDate: todayStr });
    } else if (preset === 'THIS_YEAR') {
      onChange({ preset, startDate: `${yyyy}-01-01`, endDate: todayStr });
    } else {
      onChange({ ...filter, preset: 'CUSTOM' });
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm print:hidden">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
          Period:
        </span>
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {(['THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR', 'TODAY', 'CUSTOM'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePreset(p)}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                filter.preset === p
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'THIS_MONTH'
                ? 'This Month'
                : p === 'THIS_QUARTER'
                ? 'This Quarter'
                : p === 'THIS_YEAR'
                ? 'This Year'
                : p === 'TODAY'
                ? 'Today'
                : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Pickers & Actions */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
        <div className="flex items-center gap-2 text-xs">
          <Input
            type="date"
            value={filter.startDate}
            onChange={(e) =>
              onChange({ ...filter, preset: 'CUSTOM', startDate: e.target.value })
            }
            className="h-8 w-36 text-xs"
          />
          <span className="text-slate-400 font-medium">to</span>
          <Input
            type="date"
            value={filter.endDate}
            onChange={(e) =>
              onChange({ ...filter, preset: 'CUSTOM', endDate: e.target.value })
            }
            className="h-8 w-36 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {onExportCsv && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-8 gap-1 text-xs text-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1 text-xs text-slate-700"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
