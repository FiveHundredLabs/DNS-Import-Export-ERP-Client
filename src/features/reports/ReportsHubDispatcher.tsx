import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ReportsPage } from './ReportsPage';

export function ReportsHubDispatcher() {
  const { user } = useAuth();

  if (user?.role === 'FINANCE_MANAGER') {
    return <Navigate to="/reports/finance" replace />;
  }
  if (user?.role === 'SALES_MANAGER') {
    return <Navigate to="/reports/sales" replace />;
  }
  if (user?.role === 'PURCHASING_MANAGER') {
    return <Navigate to="/reports/purchasing" replace />;
  }
  if (user?.role === 'STOCK_MANAGER') {
    return <Navigate to="/reports/inventory" replace />;
  }
  if (user?.role === 'SHOWROOM_MANAGER') {
    return <Navigate to="/reports/sales/showroom" replace />;
  }

  return <ReportsPage />;
}

