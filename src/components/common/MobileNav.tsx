import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users2, ShoppingCart, DollarSign, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export function MobileNav() {
  const { role } = useAuth();

  // Highlight bottom navigation primarily for Sales Rep and Area Manager
  const showMobileBar = role === 'SALES_REP' || role === 'AREA_MANAGER';

  if (!showMobileBar) return null;

  const items = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users2 },
    { name: 'Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Warranty', path: '/warranty', icon: ShieldCheck },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200 bg-white/95 px-2 backdrop-blur md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-slate-500 hover:text-slate-900'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
