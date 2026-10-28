import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '../../../components/ui/chart';
import { cn } from '../../../utils/cn';
import { formatCurrency } from '../../../utils/formatters';
import { TrendingUp, DollarSign } from 'lucide-react';

// 30 daily ERP business records matching:
// Wholesale B2B Total: LKR 31,420,000 (LKR 31.4M)
// Showroom Retail Total: LKR 17,080,000 (LKR 17.1M)
// Grand Total: LKR 48,500,000 (LKR 48.5M, matching Director KPI Card)
// Total Orders: 2,641 orders
export const ERP_SALES_TRENDS_DATA = [
  { date: '2024-04-01', wholesale: 875000, retail: 445000, total: 1320000, orders: 71 },
  { date: '2024-04-02', wholesale: 493000, retail: 374000, total: 867000, orders: 47 },
  { date: '2024-04-03', wholesale: 740000, retail: 413000, total: 1153000, orders: 63 },
  { date: '2024-04-04', wholesale: 987000, retail: 571000, total: 1558000, orders: 85 },
  { date: '2024-04-05', wholesale: 1459000, retail: 738000, total: 2197000, orders: 120 },
  { date: '2024-04-06', wholesale: 1213000, retail: 669000, total: 1882000, orders: 103 },
  { date: '2024-04-07', wholesale: 966000, retail: 482000, total: 1448000, orders: 79 },
  { date: '2024-04-08', wholesale: 1593000, retail: 807000, total: 2400000, orders: 131 },
  { date: '2024-04-09', wholesale: 432000, retail: 305000, total: 737000, orders: 40 },
  { date: '2024-04-10', wholesale: 1048000, retail: 532000, total: 1580000, orders: 86 },
  { date: '2024-04-11', wholesale: 1316000, retail: 679000, total: 1995000, orders: 109 },
  { date: '2024-04-12', wholesale: 1172000, retail: 571000, total: 1743000, orders: 95 },
  { date: '2024-04-13', wholesale: 1346000, retail: 699000, total: 2045000, orders: 111 },
  { date: '2024-04-14', wholesale: 637000, retail: 413000, total: 1050000, orders: 57 },
  { date: '2024-04-15', wholesale: 524000, retail: 354000, total: 878000, orders: 48 },
  { date: '2024-04-16', wholesale: 596000, retail: 404000, total: 1000000, orders: 54 },
  { date: '2024-04-17', wholesale: 1727000, retail: 876000, total: 2603000, orders: 142 },
  { date: '2024-04-18', wholesale: 1449000, retail: 768000, total: 2217000, orders: 121 },
  { date: '2024-04-19', wholesale: 1110000, retail: 581000, total: 1691000, orders: 92 },
  { date: '2024-04-20', wholesale: 534000, retail: 354000, total: 888000, orders: 48 },
  { date: '2024-04-21', wholesale: 802000, retail: 433000, total: 1235000, orders: 67 },
  { date: '2024-04-22', wholesale: 1254000, retail: 650000, total: 1904000, orders: 104 },
  { date: '2024-04-23', wholesale: 606000, retail: 384000, total: 990000, orders: 54 },
  { date: '2024-04-24', wholesale: 1552000, retail: 797000, total: 2349000, orders: 128 },
  { date: '2024-04-25', wholesale: 1089000, retail: 571000, total: 1660000, orders: 90 },
  { date: '2024-04-26', wholesale: 401000, retail: 276000, total: 677000, orders: 37 },
  { date: '2024-04-27', wholesale: 1459000, retail: 748000, total: 2207000, orders: 120 },
  { date: '2024-04-28', wholesale: 576000, retail: 404000, total: 980000, orders: 53 },
  { date: '2024-04-29', wholesale: 1696000, retail: 866000, total: 2562000, orders: 140 },
  { date: '2024-04-30', wholesale: 1768000, retail: 916000, total: 2684000, orders: 146 },
];

export const chartConfig = {
  total: {
    label: 'Total Revenue',
    color: '#2563EB',
    formattedTotal: 'LKR 48.5M',
    sublabel: '2,641 Orders',
  },
  wholesale: {
    label: 'Wholesale B2B',
    color: '#0284C7',
    formattedTotal: 'LKR 31.4M',
    sublabel: '64.8% Share',
  },
  retail: {
    label: 'Showroom Retail',
    color: '#059669',
    formattedTotal: 'LKR 17.1M',
    sublabel: '35.2% Share',
  },
} as const;

export type ChartKey = keyof typeof chartConfig;

// Custom Tooltip tailored for ERP Director revenue inspection
function CustomRevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const dateObj = new Date(data.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-semibold text-slate-900">{formattedDate}</span>
        <span className="text-[11px] font-mono text-slate-500">{data.orders} orders</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Total Revenue
          </span>
          <span className="font-mono font-bold text-slate-900">
            {formatCurrency(data.total)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-sky-600" />
            Wholesale B2B
          </span>
          <span className="font-mono font-semibold text-slate-700">
            {formatCurrency(data.wholesale)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Showroom Retail
          </span>
          <span className="font-mono font-semibold text-slate-700">
            {formatCurrency(data.retail)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DirectorInteractiveBarChart() {
  const [activeChart, setActiveChart] = React.useState<ChartKey>('total');

  return (
    <Card className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
      {/* ── Card Header with ERP Metric Tabs ── */}
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b border-slate-200 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Commercial Sales &amp; Revenue Trends
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              +20.7%
            </span>
          </div>
          <CardDescription className="text-[11px] text-slate-500">
            Daily revenue streams across Wholesale B2B &amp; Showroom Retail · Month Total: LKR 48,500,000
          </CardDescription>
        </div>

        <div className="flex border-t sm:border-t-0 sm:border-l border-slate-200 divide-x divide-slate-200">
          {(['total', 'wholesale', 'retail'] as const).map((key) => {
            const config = chartConfig[key];
            const isActive = activeChart === key;
            return (
              <button
                key={key}
                data-active={isActive}
                type="button"
                className={cn(
                  'relative z-10 flex flex-1 flex-col justify-center gap-0.5 px-3 sm:px-4 py-2 sm:py-2.5 text-left transition-all min-w-[90px] sm:min-w-[115px]',
                  isActive
                    ? 'bg-slate-50/90 text-slate-900 border-b-2 border-b-primary shadow-2xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-50/60'
                )}
                onClick={() => setActiveChart(key)}
              >
                <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  {config.label}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight font-mono">
                  {config.formattedTotal}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">
                  {config.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      {/* ── Card Content with BarChart in Light Mode ── */}
      <CardContent className="px-2 sm:p-6 pt-4 sm:pt-6">
        <ChartContainer
          config={chartConfig as any}
          className="aspect-auto h-[260px] sm:h-[280px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={ERP_SALES_TRENDS_DATA}
            margin={{
              left: 12,
              right: 12,
              top: 10,
              bottom: 4,
            }}
          >
            <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={28}
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip content={<CustomRevenueTooltip />} />
            <Bar
              dataKey={activeChart}
              fill={chartConfig[activeChart].color}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
