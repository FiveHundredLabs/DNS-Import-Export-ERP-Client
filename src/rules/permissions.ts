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
    'orders:close',
    'inventory:view',
    'inventory:grn_approve',
    'inventory:pick_issue',
    'inventory:damaged_recover',
    'invoices:view',
    'invoices:create',
    'payments:view',
    'payments:create',
    'payments:approve',
    'pos:operate',
    'pos:override_discount',
    'finance:expenses',
    'finance:petty_cash',
    'finance:reports',
    'finance:cashbook_view',
    'finance:voucher_create',
    'finance:voucher_approve',
    'warranty:view',
    'warranty:claims',
    'warranty:record_notes',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'reports:area_only',
    'audit:view',
    'view:purchasing_dashboard',
    'purchasing:suppliers_view',
    'purchasing:suppliers_manage',
    'purchasing:po_view',
    'purchasing:po_create',
    'purchasing:po_edit',
    'purchasing:grn_view',
    'purchasing:reports',
    'purchasing:returns_view',
    'purchasing:returns_create',
    'purchasing:payments_view',
    'purchasing:returns_approve',
    'purchasing:payments_view',
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
    'orders:close',
    'inventory:view',
    'inventory:grn_create',
    'inventory:grn_approve',
    'inventory:pick_issue',
    'inventory:damaged_recover',
    'invoices:view',
    'payments:view',
    'pos:operate',
    'pos:override_discount',
    'finance:expenses',
    'finance:petty_cash',
    'finance:reports',
    'finance:cashbook_view',
    'finance:voucher_create',
    'finance:voucher_approve',
    'warranty:view',
    'warranty:claims',
    'warranty:record_notes',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'reports:area_only',
    'audit:view',
    'purchasing:suppliers_view',
    'purchasing:suppliers_manage',
    'purchasing:po_view',
    'purchasing:po_create',
    'purchasing:po_edit',
    'purchasing:grn_view',
    'purchasing:returns_view',
    'purchasing:returns_create',
    'purchasing:payments_view',
    'purchasing:returns_approve',
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
    'orders:close',
    'invoices:view',
    'invoices:create',
    'payments:view',
    'warranty:view',
    'warranty:claims',
    'warranty:record_notes',
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
    'finance:cashbook_view',
    'finance:voucher_create',
    'finance:voucher_approve',
    'commissions:view',
    'commissions:manage',
    'reports:all',
    'audit:view',
  ],
  AREA_MANAGER: [
    'view:area_manager_dashboard',
    'products:view',
    'customers:view',
    'customers:create',
    'customers:edit',
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
  ],
  STOCK_KEEPER: [
    'view:stock_keeper_dashboard',
    'products:view',
    'inventory:view',
    'inventory:grn_create',
    'inventory:pick_issue',
    'inventory:damaged_recover',
  ],
  STOCK_MANAGER: [
    'view:stock_keeper_dashboard',
    'view:stock_manager_dashboard',
    'products:view',
    'inventory:view',
    'inventory:grn_create',
    'inventory:grn_approve',
    'inventory:pick_issue',
    'inventory:damaged_recover',
  ],
  CASHIER: [
    'view:cashier_dashboard',
    'products:view',
    'pos:operate',
  ],
  SHOWROOM_MANAGER: [
    'view:showroom_manager_dashboard',
    'products:view',
    'pos:operate',
    'pos:override_discount',
    'reports:all',
  ],
  PURCHASING_OFFICER: [
    'view:purchasing_dashboard',
    'products:view',
    'purchasing:suppliers_view',
    'purchasing:suppliers_manage',
    'purchasing:po_view',
    'purchasing:po_create',
    'purchasing:po_edit',
    'purchasing:grn_view',
    'purchasing:reports',
    'purchasing:returns_view',
    'purchasing:returns_create',
    'purchasing:payments_view',
  ],
  PURCHASING_MANAGER: [
    'view:purchasing_dashboard',
    'products:view',
    'purchasing:suppliers_view',
    'purchasing:suppliers_manage',
    'purchasing:po_view',
    'purchasing:po_create',
    'purchasing:po_edit',
    'purchasing:po_approve',
    'purchasing:grn_view',
    'purchasing:reports',
    'purchasing:returns_view',
    'purchasing:returns_create',
    'purchasing:payments_view',
    'purchasing:returns_approve',
    'purchasing:payments_view',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'DIRECTOR') return true;

  if (
    path === '/' ||
    path.startsWith('/dashboard') ||
    path === '/profile' ||
    path.startsWith('/profile')
  ) {
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
      role === 'FINANCE_MANAGER' ||
      role === 'STOCK_MANAGER' ||
      role === 'PURCHASING_MANAGER' ||
      role === 'PURCHASING_OFFICER'
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
  if (path === '/warranty/verification' || path.startsWith('/warranty/verification/')) {
    return role === 'SALES_REP' || role === 'AREA_MANAGER';
  }
  if (path.startsWith('/warranty')) {
    return hasPermission(role, 'warranty:view');
  }
  if (path.startsWith('/commissions')) {
    return hasPermission(role, 'commissions:view');
  }
  if (path.startsWith('/reports')) {
    // Area Manager: NO access to reports
    if (role === 'AREA_MANAGER') {
      return false;
    }
    // Showroom Manager: ONLY the showroom sales report
    if (role === 'SHOWROOM_MANAGER') {
      return path === '/reports/sales/showroom';
    }
    // Finance Manager: ONLY finance reports
    if (role === 'FINANCE_MANAGER') {
      return path === '/reports' || path.startsWith('/reports/finance');
    }
    // Purchasing Manager: ONLY purchasing reports
    if (role === 'PURCHASING_MANAGER') {
      return path === '/reports' || path.startsWith('/reports/purchasing');
    }
    // Sales Manager: ONLY sales reports
    if (role === 'SALES_MANAGER') {
      return path === '/reports' || path.startsWith('/reports/sales');
    }
    // Stock Manager: ONLY inventory reports
    if (role === 'STOCK_MANAGER') {
      return path === '/reports' || path.startsWith('/reports/inventory');
    }
    // Director and Manager: access all reports
    if (role === 'DIRECTOR' || role === 'MANAGER') {
      return true;
    }
    // Other roles with reports:all permission
    return hasPermission(role, 'reports:all');
  }
  if (path.startsWith('/audit')) {
    return hasPermission(role, 'audit:view');
  }
  if (path.startsWith('/areas') || path.startsWith('/teams')) {
    return (
      role === 'DIRECTOR' ||
      role === 'MANAGER' ||
      role === 'SALES_MANAGER'
    );
  }
  if (path.startsWith('/settings')) {
    return role === 'DIRECTOR' || role === 'MANAGER';
  }
  if (path.startsWith('/purchasing')) {
    if (role === 'DIRECTOR' || role === 'MANAGER') return true;
    if (role === 'PURCHASING_OFFICER' || role === 'PURCHASING_MANAGER') {
      if (path === '/purchasing' || path.startsWith('/purchasing/dashboard')) {
        return hasPermission(role, 'view:purchasing_dashboard');
      }
      if (path.startsWith('/purchasing/suppliers')) {
        return hasPermission(role, 'purchasing:suppliers_view');
      }
      if (path.startsWith('/purchasing/orders')) {
        return hasPermission(role, 'purchasing:po_view');
      }
      if (path.startsWith('/purchasing/grn')) {
        return hasPermission(role, 'purchasing:grn_view');
      }
      if (path.startsWith('/purchasing/reports')) {
        return hasPermission(role, 'purchasing:reports');
      }
      if (path.startsWith('/purchasing/payments')) {
        return hasPermission(role, 'purchasing:payments_view');
      }
      if (path.startsWith('/purchasing/returns')) {
        return true;
      }
      return true;
    }
    return false;
  }

  // Strict default deny for unrecognized routes
  return false;
}
