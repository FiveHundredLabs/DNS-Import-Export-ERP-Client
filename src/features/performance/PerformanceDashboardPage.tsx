import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RepPersonalPerformanceView } from './RepPersonalPerformanceView';
import { ManagerTerritoryView } from './ManagerTerritoryView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  User,
  ShieldAlert,
} from 'lucide-react';

export function PerformanceDashboardPage() {
  const { currentUser, role } = useAuth();

  // Current month default in YYYY-MM format
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    currentUser.areaId || 'area-01'
  );

  // Month navigation helpers
  const handleMonthStep = (offset: number) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + offset, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  // Generate recent 12 months for dropdown selector
  const availableMonths = React.useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: val, label });
    }
    return months;
  }, []);

  const isSalesRep = role === 'SALES_REP';
  const isAreaManager = role === 'AREA_MANAGER';
  const isExecutiveOrSalesManager =
    role === 'DIRECTOR' || role === 'MANAGER' || role === 'SALES_MANAGER';

  return (
    <div className="space-y-6">
      {/* Global Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Performance & Incentives
              </h1>
              <p className="text-xs text-slate-500">
                {isSalesRep
                  ? 'Your personal sales milestones, incentive scheme progression, and verified collections.'
                  : isAreaManager
                  ? `Territory performance oversight, subordinate sales audit, and regional manager incentives.`
                  : 'Executive performance monitoring and regional territory commission audits.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Role Indicator & Global Month Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="text-xs font-semibold py-1 px-2.5 border-slate-300 bg-white text-slate-700 shadow-2xs"
          >
            {isSalesRep ? (
              <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                <User className="h-3.5 w-3.5" /> Sales Representative Desk
              </span>
            ) : isAreaManager ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <MapPin className="h-3.5 w-3.5" /> Area Territory Manager Desk
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-purple-700 font-bold">
                <Award className="h-3.5 w-3.5" /> Executive Oversight Desk
              </span>
            )}
          </Badge>

          {/* Month Stepper & Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMonthStep(-1)}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 border-0 text-xs font-semibold min-w-36 bg-transparent text-slate-800 shadow-none focus:ring-0">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMonthStep(1)}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main View: Conditional Rendering based on Role */}
      {isSalesRep ? (
        /* STRICT DATA ISOLATION: Sales Reps ONLY see their own personal data */
        <RepPersonalPerformanceView
          repId={currentUser.id}
          month={selectedMonth}
        />
      ) : isAreaManager ? (
        /* STRICT DATA ISOLATION: Area Managers ONLY see their assigned territory */
        <ManagerTerritoryView
          areaId={currentUser.areaId || 'area-01'}
          month={selectedMonth}
          canSwitchArea={false}
        />
      ) : isExecutiveOrSalesManager ? (
        /* Executives can view and switch territories */
        <ManagerTerritoryView
          areaId={selectedAreaId}
          month={selectedMonth}
          canSwitchArea={true}
          onAreaChange={setSelectedAreaId}
        />
      ) : (
        /* Fallback for other roles */
        <Card className="p-8 text-center space-y-3 bg-white border-slate-200">
          <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Standard Desk Notice</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The Performance & Incentives module is configured for Sales Representatives, Area Managers, and Sales Executives.
          </p>
        </Card>
      )}
    </div>
  );
}
