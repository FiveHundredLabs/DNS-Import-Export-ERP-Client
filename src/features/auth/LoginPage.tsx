import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
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

  const from = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (!isInitializing && isAuthenticated && currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, from, isAuthenticated, isInitializing, navigate]);

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
      setErrorMessage(payload?.message || 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function fillQuickLogin(account: QuickLoginAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage(null);
    toast.info(`${account.label} credentials filled.`);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[350px] w-[500px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <section className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1 shadow-md">
            <img src="/logo.png" alt="DNS ERP" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">DNS IMPORT & EXPORT ERP</p>
            <p className="text-xs text-slate-400">Secure enterprise workspace</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in with your organization account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email address
            </span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Password
            </span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-10 pr-11 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isInitializing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {import.meta.env.DEV && (
          <section className="mt-8 border-t border-slate-800 pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Development quick login
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select a seeded backend role to fill its real credentials.
                </p>
              </div>
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                Dev only
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LOGIN_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillQuickLogin(account)}
                  className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-left transition hover:border-primary hover:bg-slate-800"
                >
                  <span className="block text-xs font-semibold text-slate-200">{account.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">{account.email}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Access is controlled by your backend role and permissions.
        </p>
      </section>
    </main>
  );
}
