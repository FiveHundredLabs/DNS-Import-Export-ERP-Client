import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
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
import { TrendingUp } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { themeService, PrimaryColorOption } from '../../../services/ThemeService';

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
    color: '#263183',
    formattedTotal: 'LKR 48.5M',
    sublabel: '2,641 Orders',
  },
  wholesale: {
    label: 'Sales Reps',
    color: '#0284C7',
    formattedTotal: 'LKR 31.4M',
    sublabel: '64.8% Share',
  },
  retail: {
    label: 'Showroom',
    color: '#059669',
    formattedTotal: 'LKR 17.1M',
    sublabel: '35.2% Share',
  },
} as const;

export type ChartKey = keyof typeof chartConfig;

// Modern executive tooltip tailored for ERP Director revenue inspection
function CustomRevenueTooltip({ active, payload, primaryColor }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const dateObj = new Date(data.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const wholesalePct = ((data.wholesale / data.total) * 100).toFixed(1);
  const retailPct = ((data.retail / data.total) * 100).toFixed(1);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xl text-xs space-y-2.5 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900 tracking-tight">{formattedDate}</span>
        <span className="text-[10px] sm:text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {data.orders} orders
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-2xs"
              style={{ backgroundColor: primaryColor }}
            />
            Total Revenue
          </span>
          <span className="font-mono font-extrabold text-slate-900 text-sm">
            {formatCurrency(data.total)}
          </span>
        </div>

        {/* Visual Share Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-sky-500 rounded-l-full transition-all"
            style={{ width: `${wholesalePct}%` }}
          />
          <div
            className="h-full bg-emerald-500 rounded-r-full transition-all"
            style={{ width: `${retailPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Sales Reps ({wholesalePct}%)
          </span>
          <span className="font-mono font-semibold text-slate-700">
            {formatCurrency(data.wholesale)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Showroom ({retailPct}%)
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
  const { currentColor } = useTheme();
  const [activeChart, setActiveChart] = React.useState<ChartKey>('total');
  const [themeColor, setThemeColor] = React.useState<PrimaryColorOption>(() =>
    themeService.getPrimaryColor()
  );

  // Synchronize directly with themeService events for dynamic theme switching
  React.useEffect(() => {
    setThemeColor(themeService.getPrimaryColor());
    const unsub = themeService.subscribe((updated) => {
      setThemeColor(updated);
    });
    return unsub;
  }, []);

  const effectiveTheme = currentColor || themeColor;
  const primaryHex = effectiveTheme?.hex || '#263183';

  // Dynamic modern palette reactively bound to active ERP theme
  const dynamicPalette = React.useMemo(() => {
    const hex = primaryHex.toLowerCase();

    // Red theme
    if (hex.includes('ec1b27') || hex.includes('d40f1b') || hex.includes('b60a14')) {
      return {
        total: '#EC1B27',
        totalGradientStart: '#F43F5E',
        totalGradientEnd: '#BE123C',
        wholesale: '#F97316',
        wholesaleGradientStart: '#FB923C',
        wholesaleGradientEnd: '#C2410C',
        retail: '#10B981',
        retailGradientStart: '#34D399',
        retailGradientEnd: '#047857',
      };
    }

    // Black / Slate theme
    if (hex.includes('161511') || hex.includes('282723') || hex.includes('0d0c0a')) {
      return {
        total: '#1E293B',
        totalGradientStart: '#475569',
        totalGradientEnd: '#0F172A',
        wholesale: '#64748B',
        wholesaleGradientStart: '#94A3B8',
        wholesaleGradientEnd: '#334155',
        retail: '#0D9488',
        retailGradientStart: '#2DD4BF',
        retailGradientEnd: '#115E59',
      };
    }

    // Default Dark Blue theme (#263183)
    return {
      total: primaryHex,
      totalGradientStart: '#3B82F6',
      totalGradientEnd: effectiveTheme?.hover || '#1D2667',
      wholesale: '#0284C7',
      wholesaleGradientStart: '#38BDF8',
      wholesaleGradientEnd: '#0369A1',
      retail: '#059669',
      retailGradientStart: '#34D399',
      retailGradientEnd: '#047857',
    };
  }, [primaryHex, effectiveTheme]);

  const activeGradientId =
    activeChart === 'total'
      ? 'barThemeTotalGradient'
      : activeChart === 'wholesale'
      ? 'barThemeWholesaleGradient'
      : 'barThemeRetailGradient';

  return (
    <Card className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between">
      {/* ── Global Theme Gradient Definitions for Recharts ── */}
      <svg className="sr-only absolute pointer-events-none" aria-hidden="true" width="0" height="0">
        <defs>
          <linearGradient id="barThemeTotalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dynamicPalette.totalGradientStart} stopOpacity={0.95} />
            <stop offset="100%" stopColor={dynamicPalette.totalGradientEnd} stopOpacity={0.78} />
          </linearGradient>
          <linearGradient id="barThemeWholesaleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dynamicPalette.wholesaleGradientStart} stopOpacity={0.95} />
            <stop offset="100%" stopColor={dynamicPalette.wholesaleGradientEnd} stopOpacity={0.78} />
          </linearGradient>
          <linearGradient id="barThemeRetailGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={dynamicPalette.retailGradientStart} stopOpacity={0.95} />
            <stop offset="100%" stopColor={dynamicPalette.retailGradientEnd} stopOpacity={0.78} />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Card Header with Interactive ERP Metric Tabs ── */}
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b border-slate-200/80 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Commercial Sales &amp; Revenue Trends
            </CardTitle>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shadow-2xs">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              +20.7%
            </span>
          </div>

        </div>

        <div className="flex border-t sm:border-t-0 sm:border-l border-slate-200/80 divide-x divide-slate-200/80">
          {(['total', 'wholesale', 'retail'] as const).map((key) => {
            const config = chartConfig[key];
            const isActive = activeChart === key;
            const activeColor =
              key === 'total'
                ? dynamicPalette.total
                : key === 'wholesale'
                ? dynamicPalette.wholesale
                : dynamicPalette.retail;

            return (
              <button
                key={key}
                data-active={isActive}
                type="button"
                className={cn(
                  'relative z-10 flex flex-1 flex-col justify-center gap-0.5 px-3 sm:px-4 py-2 sm:py-2.5 text-left transition-all min-w-[90px] sm:min-w-[115px] cursor-pointer group',
                  isActive
                    ? 'bg-slate-50/90 text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-50/60'
                )}
                onClick={() => setActiveChart(key)}
              >
                {/* Active Accent Top Indicator Pill */}
                {isActive && (
                  <span
                    className="absolute top-0 left-0 right-0 h-0.5 transition-all"
                    style={{ backgroundColor: activeColor }}
                  />
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
                    {config.label}
                  </span>
                  <span
                    className="h-1.5 w-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: isActive ? activeColor : 'transparent',
                    }}
                  />
                </div>

                <span
                  className="text-xs sm:text-sm font-extrabold tracking-tight font-mono transition-colors"
                  style={{ color: isActive ? activeColor : undefined }}
                >
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

      {/* ── Modern Dynamic BarChart with Gradient & Track Fill ── */}
      <CardContent className="px-2 sm:p-6 pt-4 sm:pt-6">
        <ChartContainer
          config={chartConfig as any}
          className="aspect-auto h-[260px] sm:h-[285px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={ERP_SALES_TRENDS_DATA}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 4,
            }}
          >
            {/* Dynamic Linear Gradients for Theme Reactivity */}
            <defs>
              <linearGradient id="barThemeTotalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dynamicPalette.totalGradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={dynamicPalette.totalGradientEnd} stopOpacity={0.78} />
              </linearGradient>
              <linearGradient id="barThemeWholesaleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dynamicPalette.wholesaleGradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={dynamicPalette.wholesaleGradientEnd} stopOpacity={0.78} />
              </linearGradient>
              <linearGradient id="barThemeRetailGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dynamicPalette.retailGradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={dynamicPalette.retailGradientEnd} stopOpacity={0.78} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="4 4" strokeOpacity={0.8} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              minTickGap={28}
              tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />

            <ChartTooltip
              content={<CustomRevenueTooltip primaryColor={dynamicPalette.total} />}
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)', radius: 6 }}
            />

            <Bar
              dataKey={activeChart}
              fill={`url(#${activeGradientId})`}
              radius={[6, 6, 0, 0]}
              maxBarSize={30}
              background={{ fill: '#F8FAFC', radius: [6, 6, 0, 0] }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
