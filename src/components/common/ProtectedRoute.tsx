import { ReactNode } from 'react';
import { useLocation, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, Users } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { role, canAccessRoute, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isAllowed = canAccessRoute(location.pathname);

  if (!isAllowed) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto">
        <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Access Denied</h3>
          <p className="mt-2 text-xs text-slate-600">
            Your current role (<span className="font-semibold text-slate-800">{role}</span>) does not have authorization to access <span className="font-mono font-medium text-slate-700">{location.pathname}</span>.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Switch to an authorized role on the login page or return to the main dashboard.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-xs transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Switch User / Role
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

