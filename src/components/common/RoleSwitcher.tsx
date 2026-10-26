import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../utils/cn';

export const ROLES: { label: string; shortLabel: string; role: UserRole }[] = [
  { label: 'Director (Global Executive)', shortLabel: 'Director', role: 'DIRECTOR' },
  { label: 'Manager (Operations)', shortLabel: 'Manager', role: 'MANAGER' },
  { label: 'Sales Manager (Sales & Approvals)', shortLabel: 'Sales Manager', role: 'SALES_MANAGER' },
  { label: 'Finance Manager (Payments & Ledger)', shortLabel: 'Finance Manager', role: 'FINANCE_MANAGER' },
  { label: 'Area Manager (Regional Hub)', shortLabel: 'Area Manager', role: 'AREA_MANAGER' },
  { label: 'Sales Representative (Field Rep)', shortLabel: 'Sales Rep', role: 'SALES_REP' },
  { label: 'Stock Keeper (Warehouse/GRN)', shortLabel: 'Stock Keeper', role: 'STOCK_KEEPER' },
  { label: 'Cashier (Showroom POS)', shortLabel: 'Cashier', role: 'CASHIER' },
];

interface RoleSwitcherProps {
  className?: string;
  triggerClassName?: string;
  showIcon?: boolean;
}

export function RoleSwitcher({ className, triggerClassName, showIcon = true }: RoleSwitcherProps) {
  const { currentUser, switchRole } = useAuth();

  const currentRoleObj = ROLES.find((r) => r.role === currentUser.role);

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <Select
        value={currentUser.role}
        onValueChange={(val) => switchRole(val as UserRole)}
      >
        <SelectTrigger
          aria-label="Switch User Role"
          className={cn(
            'h-8 text-xs font-medium bg-slate-50 border-slate-200/90 hover:bg-slate-100 text-slate-800 rounded-md gap-1.5 px-2.5 shadow-2xs transition-colors',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {showIcon && <ShieldCheck className="h-3.5 w-3.5 opacity-80 shrink-0" />}
            <span className="font-normal opacity-75 hidden lg:inline">Role:</span>
            <SelectValue placeholder="Select Role">
              <span className="font-semibold">
                {currentRoleObj?.shortLabel || currentUser.role}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent align="end" className="w-64 rounded-lg shadow-lg border-slate-200">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Switch System Role
          </div>
          {ROLES.map((r) => (
            <SelectItem key={r.role} value={r.role} className="text-xs rounded-sm py-1.5">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-900">{r.shortLabel}</span>
                <span className="text-[11px] text-slate-500 font-normal">{r.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
