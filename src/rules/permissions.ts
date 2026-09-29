import { UserRole, Permission } from '../types/auth';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  DIRECTOR: [
    'view:director_dashboard',
    'products:view',
    'products:create',
    'products:edit',
    'products:price_approval',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:commercial_approval',
    'customers:director_approval',
    'quotations:view',
    'quotations:create',
    'quotations:approve',
    'orders:view',
    'orders:create',
    'orders:approve_standard',
    'orders:approve_special',
    'orders:escalate',
    'inventory:view',
    'inventory:grn_create',
    'inventory:grn_approve',
    'inventory:pick_issue',
    'invoices:view',
    'invoices:create',
    'payments:view',
    'payments:create',
    'payments:approve',
    'pos:operate',
    'finance:expenses',
    'finance:petty_cash',
    'finance:reports',
    'warranty:view',
    'warranty:claims',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'reports:area_only',
    'audit:view',
  ],
  MANAGER: [
    'view:manager_dashboard',
    'products:view',
    'products:create',
    'products:edit',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:commercial_approval',
    'quotations:view',
    'quotations:create',
    'quotations:approve',
    'orders:view',
    'orders:create',
    'orders:approve_standard',
    'orders:approve_special',
    'orders:escalate',
    'inventory:view',
    'inventory:grn_approve',
    'invoices:view',
    'payments:view',
    'pos:operate',
    'finance:expenses',
    'finance:petty_cash',
    'finance:reports',
    'warranty:view',
    'warranty:claims',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'reports:area_only',
    'audit:view',
  ],
  SALES_MANAGER: [
    'view:sales_manager_dashboard',
    'products:view',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:commercial_approval',
    'quotations:view',
    'quotations:create',
    'quotations:approve',
    'orders:view',
    'orders:create',
    'orders:approve_standard',
    'orders:escalate',
    'invoices:view',
    'invoices:create',
    'payments:view',
    'warranty:view',
    'warranty:claims',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'reports:area_only',
  ],
  FINANCE_MANAGER: [
    'view:finance_dashboard',
    'customers:view',
    'invoices:view',
    'invoices:create',
    'payments:view',
    'payments:create',
    'payments:approve',
    'finance:expenses',
    'finance:petty_cash',
    'finance:reports',
    'reports:all',
    'audit:view',
  ],
  AREA_MANAGER: [
    'view:area_manager_dashboard',
    'products:view',
    'customers:view',
    'customers:create',
    'quotations:view',
    'orders:view',
    'invoices:view',
    'payments:view',
    'warranty:view',
    'commissions:view',
    'reports:area_only',
  ],
  SALES_REP: [
    'view:sales_rep_dashboard',
    'customers:view',
    'quotations:view',
    'quotations:create',
    'orders:view',
    'orders:create',
    'invoices:view',
    'payments:view',
    'payments:create',
    'warranty:view',
    'commissions:view',
  ],
  STOCK_KEEPER: [
    'view:stock_keeper_dashboard',
    'products:view',
    'inventory:view',
    'inventory:grn_create',
    'inventory:pick_issue',
  ],
  CASHIER: [
    'view:cashier_dashboard',
    'products:view',
    'customers:view',
    'pos:operate',
    'invoices:view',
    'payments:view',
    'payments:create',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'DIRECTOR') return true;

  if (path === '/' || path.startsWith('/dashboard')) {
    return true;
  }
  if (path.startsWith('/products')) {
    return hasPermission(role, 'products:view');
  }
  if (path.startsWith('/customers')) {
    return hasPermission(role, 'customers:view');
  }
  if (path.startsWith('/approvals')) {
    return (
      role === 'DIRECTOR' ||
      role === 'MANAGER' ||
      role === 'SALES_MANAGER' ||
      role === 'FINANCE_MANAGER'
    );
  }
  if (path.startsWith('/quotations')) {
    return hasPermission(role, 'quotations:view');
  }
  if (path.startsWith('/orders')) {
    return hasPermission(role, 'orders:view');
  }
  if (path.startsWith('/inventory')) {
    return hasPermission(role, 'inventory:view');
  }
  if (path.startsWith('/pos')) {
    return hasPermission(role, 'pos:operate');
  }
  if (path.startsWith('/invoices')) {
    return hasPermission(role, 'invoices:view');
  }
  if (path.startsWith('/payments')) {
    return (
      hasPermission(role, 'payments:view') ||
      hasPermission(role, 'payments:create') ||
      hasPermission(role, 'payments:approve')
    );
  }
  if (path.startsWith('/finance')) {
    return (
      hasPermission(role, 'finance:expenses') ||
      hasPermission(role, 'finance:petty_cash') ||
      hasPermission(role, 'finance:reports')
    );
  }
  if (path.startsWith('/warranty')) {
    return hasPermission(role, 'warranty:view');
  }
  if (path.startsWith('/commissions')) {
    return hasPermission(role, 'commissions:view');
  }
  if (path.startsWith('/reports')) {
    return (
      hasPermission(role, 'reports:all') ||
      hasPermission(role, 'reports:area_only')
    );
  }
  if (path.startsWith('/audit')) {
    return hasPermission(role, 'audit:view');
  }
  if (path.startsWith('/settings')) {
    return role === 'DIRECTOR' || role === 'MANAGER';
  }

  // Strict default deny for unrecognized routes
  return false;
}
