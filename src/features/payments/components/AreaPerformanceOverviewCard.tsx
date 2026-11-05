import React from 'react';
import { Area } from '../../../mock/mockAreas';
import { Customer } from '../../../types/customer';
import { Invoice } from '../../../types/invoice';
import { evaluateCustomerPaymentStatus } from '../../../rules/customerPaymentRules';
import { formatCurrency } from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  MapPin,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  UserCheck,
} from 'lucide-react';

interface AreaSummaryData {
  area: Area;
  totalCustomers: number;
  debtorCustomers: number;
  totalReceivables: number;
  totalOverdue: number;
  collectedThisMonth: number;
  collectionRate: number;
  salesRepsCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface AreaPerformanceOverviewCardProps {
  areas: Area[];
  customers: Customer[];
  invoices: Invoice[];
  selectedAreaId: string;
  onSelectArea: (areaId: string) => void;
}

export function AreaPerformanceOverviewCard({
  areas,
  customers,
  invoices,
  selectedAreaId,
  onSelectArea,
}: AreaPerformanceOverviewCardProps) {
  // Compute performance metrics for each area
  const areaSummaries: AreaSummaryData[] = React.useMemo(() => {
    return areas.map((area) => {
      const areaCustomers = customers.filter((c) => c.areaId === area.id);
      let totalReceivables = 0;
      let totalOverdue = 0;
      let debtorCustomers = 0;

      areaCustomers.forEach((c) => {
        const meta = evaluateCustomerPaymentStatus(c, invoices);
        totalReceivables += meta.totalOutstanding;
        totalOverdue += meta.totalOverdue;
        if (meta.totalOutstanding > 0) debtorCustomers++;
      });

      // Compute collected this month from paid/partially paid invoices for this area's customers
      const areaCustIds = new Set(areaCustomers.map((c) => c.id));
      const areaInvoices = invoices.filter((i) => areaCustIds.has(i.customerId));
      const collectedThisMonth = areaInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

      const totalTarget = totalReceivables + collectedThisMonth;
      const collectionRate = totalTarget > 0 ? Math.round((collectedThisMonth / totalTarget) * 100) : 100;

      // Unique reps in this area
      const repIds = new Set(areaCustomers.map((c) => c.assignedRepId).filter(Boolean));

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (totalOverdue > 1000000 || (totalReceivables > 0 && totalOverdue / totalReceivables > 0.5)) {
        riskLevel = 'HIGH';
      } else if (totalOverdue > 300000) {
        riskLevel = 'MEDIUM';
      }

      return {
        area,
        totalCustomers: areaCustomers.length,
        debtorCustomers,
        totalReceivables,
        totalOverdue,
        collectedThisMonth,
        collectionRate,
        salesRepsCount: Math.max(1, repIds.size),
        riskLevel,
      };
    });
  }, [areas, customers, invoices]);

  return (
    <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Area-Wise Collection Performance
            </h3>
            <Badge variant="outline" className="bg-slate-50 text-slate-600 text-[10px] font-semibold">
              Live Regional Float
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any area card below to filter the entire dashboard and inspect its assigned field representatives and dealers.
          </p>
        </div>

        {selectedAreaId !== 'ALL' && (
          <button
            type="button"
            onClick={() => onSelectArea('ALL')}
            className="text-xs font-semibold text-primary hover:text-primary-hover self-start sm:self-auto cursor-pointer"
          >
            ← View All Areas Overview
          </button>
        )}
      </div>

      {/* Responsive Grid of Area Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {areaSummaries.map((item) => {
          const isSelected = selectedAreaId === item.area.id;

          return (
            <div
              key={item.area.id}
              onClick={() => onSelectArea(isSelected ? 'ALL' : item.area.id)}
              className={`rounded-xl p-3.5 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-primary/5 border-primary shadow-xs ring-2 ring-primary/20'
                  : 'bg-slate-50/60 hover:bg-white hover:border-slate-300 border-slate-200/80 shadow-2xs'
              }`}
            >
              {/* Top Accent Strip when selected */}
              {isSelected && <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />}

              <div>
                {/* Header: Area Name & Risk Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-900 text-sm tracking-tight">{item.area.name}</span>
                  </div>

                  {item.riskLevel === 'HIGH' ? (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                      Critical Overdue
                    </Badge>
                  ) : item.riskLevel === 'MEDIUM' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                      Moderate Risk
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                      Healthy Float
                    </Badge>
                  )}
                </div>

                {/* Subtitle / Region info */}
                <div className="text-[11px] text-slate-500 mb-3 truncate flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-slate-400" />
                  <span>AM: {item.area.areaManagerName || 'Nimal Bandara'}</span>
                </div>

                {/* Financials: Receivables & Overdue */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Receivables:</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(item.totalReceivables)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Past Due:</span>
                    <span className={`font-mono font-bold ${item.totalOverdue > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {formatCurrency(item.totalOverdue)}
                    </span>
                  </div>
                </div>

                {/* Collection Performance Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                    <span>Collection Rate</span>
                    <span className="font-bold text-slate-900">{item.collectionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.collectionRate >= 75
                          ? 'bg-emerald-500'
                          : item.collectionRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.collectionRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer info: Reps & Accounts */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {item.totalCustomers} Accounts ({item.debtorCustomers} with debt)
                </span>
                <span className={`font-semibold flex items-center gap-0.5 ${isSelected ? 'text-primary' : 'text-slate-500'}`}>
                  {isSelected ? 'Active Filter' : 'Filter Area'}
                  <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

