import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { Users } from 'lucide-react';

const ROLES: { label: string; role: UserRole }[] = [
  { label: 'Director (Global Exec)', role: 'DIRECTOR' },
  { label: 'Manager (Operations)', role: 'MANAGER' },
  { label: 'Sales Manager (Sales & Approvals)', role: 'SALES_MANAGER' },
  { label: 'Finance Manager (Payments & Ledger)', role: 'FINANCE_MANAGER' },
  { label: 'Area Manager (Regional Hub)', role: 'AREA_MANAGER' },
  { label: 'Sales Representative (Field Rep)', role: 'SALES_REP' },
  { label: 'Stock Keeper (Warehouse/GRN)', role: 'STOCK_KEEPER' },
  { label: 'Cashier (Showroom POS)', role: 'CASHIER' },
];

export function RoleSwitcher() {
  const { currentUser, switchRole } = useAuth();

  return (
    <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm text-xs">
      <Users className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium text-slate-300 hidden sm:inline">Role View:</span>
      <select
        value={currentUser.role}
        onChange={(e) => switchRole(e.target.value as UserRole)}
        className="bg-slate-800 text-white rounded px-2 py-0.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium cursor-pointer"
      >
        {ROLES.map((r) => (
          <option key={r.role} value={r.role}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
