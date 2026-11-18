import { FormEvent, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Terminal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiErrorResponse } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';

interface QuickLoginAccount {
  role: UserRole;
  label: string;
  email: string;
  password: string;
}

const QUICK_LOGIN_ACCOUNTS: QuickLoginAccount[] = [
  {
    role: 'DIRECTOR',
    label: 'Director',
    email: 'director@erp.dns.local',
    password: 'DirectorChangeMe123!',
  },
  {
    role: 'MANAGER',
    label: 'Manager',
    email: 'manager@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'SALES_MANAGER',
    label: 'Sales Manager',
    email: 'sales.manager@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'AREA_MANAGER',
    label: 'Area Manager',
    email: 'area.western@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'SALES_REP',
    label: 'Sales Representative',
    email: 'rep.colombo@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'FINANCE_MANAGER',
    label: 'Finance Manager',
    email: 'finance@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'FINANCE_OFFICER',
    label: 'Finance Officer',
    email: 'finance.officer@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'PURCHASING_MANAGER',
    label: 'Purchasing Manager',
    email: 'purchasing.manager@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'PURCHASING_OFFICER',
    label: 'Purchasing Officer',
    email: 'purchasing@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'SHOWROOM_MANAGER',
    label: 'Showroom Manager',
    email: 'showroom.manager@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'SHOWROOM_CASHIER',
    label: 'Showroom Cashier',
    email: 'cashier@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'STOCK_MANAGER',
    label: 'Stock Manager',
    email: 'stock.manager@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
  {
    role: 'STOCK_KEEPER',
    label: 'Stock Keeper',
    email: 'warehouse@dnserp.com',
    password: 'DnsErpChangeMe123!',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, isInitializing, loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const devPanelRef = useRef<HTMLDivElement>(null);
  const devBtnRef = useRef<HTMLButtonElement>(null);

  const from = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (!isInitializing && isAuthenticated && currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, from, isAuthenticated, isInitializing, navigate]);

  // Close dev panel on outside click
  useEffect(() => {
    if (!showDevPanel) return;
    function handleClick(e: MouseEvent) {
      if (
        devPanelRef.current &&
        !devPanelRef.current.contains(e.target as Node) &&
        devBtnRef.current &&
        !devBtnRef.current.contains(e.target as Node)
      ) {
        setShowDevPanel(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDevPanel]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail(email, password);
      toast.success('Signed in successfully.');
      navigate(from, { replace: true });
    } catch (error) {
      const payload = isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data
        : undefined;
      setErrorMessage(
        payload?.message || 'Unable to sign in. Check your credentials and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillQuickLogin(account: QuickLoginAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage(null);
    setShowDevPanel(false);
    toast.info(`${account.label} credentials filled.`);
  }

  return (
    <main className="min-h-screen w-full bg-slate-950 flex flex-col lg:flex-row relative p-3 sm:p-5 lg:p-6 gap-4 lg:gap-6">
      {/* ── Dev Quick Login button (top-right corner, DEV only) ── */}
      {import.meta.env.DEV && (
        <div className="absolute top-4 right-4 z-50">
          <button
            ref={devBtnRef}
            type="button"
            onClick={() => setShowDevPanel((v) => !v)}
            aria-label="Open developer quick login"
            title="Dev Quick Login"
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-amber-300 backdrop-blur-sm transition hover:bg-amber-400/20"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Dev</span>
          </button>

          {/* Dev panel dropdown */}
          {showDevPanel && (
            <div
              ref={devPanelRef}
              className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl ring-1 ring-black/20"
            >
              <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-2.5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Dev Quick Login
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Click a role to fill credentials
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDevPanel(false)}
                  className="text-slate-500 transition hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-2.5 max-h-72 overflow-y-auto">
                {QUICK_LOGIN_ACCOUNTS.map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => fillQuickLogin(account)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-2 text-left transition hover:border-blue-500/50 hover:bg-slate-700"
                  >
                    <span className="block text-[11px] font-semibold text-slate-200">
                      {account.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                      {account.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LEFT PANEL: Login form ── */}
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:py-12 lg:max-w-[480px] xl:max-w-[520px] lg:px-12 xl:px-16 rounded-3xl shadow-2xl z-10 border border-slate-100">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 p-1 shadow-sm border border-slate-100">
              <img src="/logo.png" alt="DNS ERP" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-800">DNS Import &amp; Export</p>
              <p className="text-[11px] text-slate-400">Enterprise Resource Planning</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Nice to see you again
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to your organization account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="login-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@dnserp.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me row */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="h-5 w-9 rounded-full border border-slate-200 bg-slate-100 transition peer-checked:border-blue-500 peer-checked:bg-blue-500" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
                </div>
                <span className="text-xs text-slate-500">Remember me</span>
              </label>
              <span className="text-xs font-medium text-blue-600 hover:underline cursor-default select-none">
                Forgot password?
              </span>
            </div>

            {/* Error */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
              >
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isInitializing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            Access is controlled by your backend role and permissions.
          </p>
        </div>
      </section>

      {/* ── RIGHT PANEL: Branding ── */}
      <section className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Optimized picture element with WebP + JPEG fallback */}
        <picture className="absolute inset-0 h-full w-full pointer-events-none">
          <source srcSet="/login.webp" type="image/webp" />
          <source srcSet="/login.jpg" type="image/jpeg" />
          <img
            src="/login.webp"
            alt="DNS ERP Global Logistics and Distribution"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
        </picture>

        {/* Dark contrast overlay to ensure clear readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-slate-900/70 backdrop-blur-[1px]" />

        {/* Top-right company branding (no logo icon, enlarged, shifted left and down) */}
        <div className="absolute top-10 right-10 xl:top-12 xl:right-14 z-20 text-right">
          <span className="block text-base xl:text-lg font-extrabold tracking-widest text-white uppercase drop-shadow-md">
            DNS Import &amp; Export
          </span>
          <span className="block text-[11px] font-semibold tracking-wider text-blue-200/80 uppercase">
            Enterprise Resource Planning
          </span>
        </div>

        {/* Centered Hero Content with frosted card for maximum readability */}
        <div className="relative z-10 text-center px-8 py-8 sm:px-10 sm:py-10 max-w-lg rounded-2xl bg-slate-950/50 backdrop-blur-md border border-white/10 shadow-2xl">
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-lg">
            Drive Your Business
            <br />
            <span className="text-blue-300">Forward.</span>
          </h2>
          <p className="mt-4 text-sm text-slate-100 font-medium leading-relaxed drop-shadow">
            &ldquo;Secure, integrated enterprise resource planning for modern distribution networks.&rdquo;
          </p>

          {/* Feature pills */}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {['Sales & CRM', 'Inventory', 'Finance & Ledger', 'Purchasing', 'Reports'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/25 bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md hover:bg-white/25 transition"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom version tag */}
        <p className="absolute bottom-6 text-[10px] font-semibold tracking-widest text-white/50 uppercase z-20">
          DNS ERP · Enterprise Edition
        </p>
      </section>
    </main>
  );
}
