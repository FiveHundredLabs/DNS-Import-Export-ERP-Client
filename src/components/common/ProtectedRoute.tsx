import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ErrorState } from './ErrorState';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { role, canAccessRoute } = useAuth();
  const location = useLocation();

  const isAllowed = canAccessRoute(location.pathname);

  if (!isAllowed) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto">
        <div className="rounded-xl border border-rose-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
          <p className="mt-2 text-xs text-slate-600">
            Your current role (<span className="font-semibold text-slate-800">{role}</span>) does not have authorization to access <span className="font-mono font-medium text-slate-700">{location.pathname}</span>.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Use the role switcher in the navigation bar to test this view with an authorized role (e.g. Director, Manager, or Sales Manager).
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
