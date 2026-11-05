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
import { cn } from '../../utils/cn';
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

  // Current month in local YYYY-MM format
  const currentMonthStr = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    currentUser.areaId || 'area-01'
  );

  // Month navigation helpers with validation preventing future months
  const handleMonthStep = (offset: number) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + offset, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Disallow future months
    if (newMonthStr > currentMonthStr) {
      return;
    }
    setSelectedMonth(newMonthStr);
  };

  const handleSelectMonth = (newMonth: string) => {
    // Disallow future months
    if (newMonth > currentMonthStr) {
      return;
    }
    setSelectedMonth(newMonth);
  };

  const isNextMonthDisabled = selectedMonth >= currentMonthStr;

  // Generate recent 12 months for dropdown selector (all <= current month)
  const availableMonths = React.useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (val <= currentMonthStr) {
        months.push({ value: val, label });
      }
    }
    return months;
  }, [currentMonthStr]);

  const isSalesRep = role === 'SALES_REP';
  const isAreaManager = role === 'AREA_MANAGER';

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
                Performance & Incentives Desk
              </h1>
              <p className="text-xs text-slate-500">
                {isSalesRep
                  ? 'Based on sales generated, track your collected cash and the cash incentive you earn.'
                  : isAreaManager
                  ? 'Territory sales rep leaderboard, cash collection metrics, and your managerial incentive based on team performance.'
                  : 'This module is restricted to Sales Representatives and Area Managers.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Role Indicator & Global Month Selector */}
        {(isSalesRep || isAreaManager) && (
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="text-xs font-semibold py-1 px-2.5 border-slate-300 bg-white text-slate-700 shadow-2xs"
            >
              {isSalesRep ? (
                <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                  <User className="h-3.5 w-3.5" /> Sales Representative Desk
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <MapPin className="h-3.5 w-3.5" /> Area Territory Manager Desk
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

              <Select value={selectedMonth} onValueChange={handleSelectMonth}>
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
                disabled={isNextMonthDisabled}
                className={cn(
                  "h-8 w-8 text-slate-500",
                  isNextMonthDisabled
                    ? "opacity-30 cursor-not-allowed text-slate-300 hover:bg-transparent"
                    : "hover:text-slate-900 cursor-pointer"
                )}
                title={isNextMonthDisabled ? "Cannot select future months" : "Next Month"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main View: Strictly for Sales Rep & Area Manager Only */}
      {isSalesRep ? (
        <RepPersonalPerformanceView
          repId={currentUser.id}
          month={selectedMonth}
        />
      ) : isAreaManager ? (
        <ManagerTerritoryView
          areaId={currentUser.areaId || 'area-01'}
          month={selectedMonth}
          canSwitchArea={false}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            This module is reserved exclusively for Sales Representatives and Area Managers to track personal and territory cash collection incentives.
          </p>
        </div>
      )}
    </div>
  );
}
