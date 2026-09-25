import { useState } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InnerNavSubItem {
  name: string;
  path: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface InnerNavItem {
  name: string;
  path: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  exact?: boolean;
  children?: InnerNavSubItem[];
}

export interface InnerSidebarProps {
  title?: string;
  backPath?: string;
  backLabel?: string;
  onBack?: () => void;
  items: InnerNavItem[];
  footer?: React.ReactNode;
  collapsible?: boolean;
  className?: string;
}

export function InnerSidebar({
  title,
  backPath = '/',
  backLabel = 'Back',
  onBack,
  items,
  footer,
  collapsible = true,
  className,
}: InnerSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        initial[item.path] = true;
      }
    });
    return initial;
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Inline style guarantees exact var(--primary) color renders on active tabs
  const activeStyle: React.CSSProperties = {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
  };

  const toggleGroup = (path: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    }
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ease-in-out shrink-0 select-none h-full overflow-hidden',
        collapsed ? 'w-14' : 'w-60',
        className
      )}
    >
      {/* Top Header / Back & Collapse */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3.5">
        {!collapsed && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
            title={`Return to ${backLabel}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </button>
        )}

        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors',
              collapsed && 'mx-auto'
            )}
            title={collapsed ? 'Expand Sub-Menu' : 'Collapse Sub-Menu'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Title */}
      {!collapsed && title && (
        <div className="px-4 pt-4 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isGroupExpanded = expandedGroups[item.path] ?? true;

          const isItemActive =
            location.pathname === item.path ||
            (!item.exact && location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/'));

          const isChildActive =
            hasChildren &&
            item.children?.some(
              (child) =>
                location.pathname === child.path ||
                (!child.exact && location.pathname.startsWith(child.path))
            );

          const isActive = isItemActive || isChildActive;

          if (hasChildren) {
            return (
              <div key={item.path} className="pt-1">
                {!collapsed ? (
                  <div>
                    <div
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                        isActive
                          ? 'text-primary-text font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                      onClick={() => toggleGroup(item.path)}
                    >
                      <NavLink
                        to={item.path}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-slate-400')} />
                        <span className="truncate">{item.name}</span>
                      </NavLink>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(item.path);
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        aria-label={isGroupExpanded ? 'Collapse sub-items' : 'Expand sub-items'}
                      >
                        {isGroupExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {isGroupExpanded && (
                      <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-2">
                        {item.children?.map((sub) => {
                          const SubIcon = sub.icon;
                          return (
                            <NavLink
                              key={sub.path}
                              to={sub.path}
                              end={sub.exact ?? false}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors',
                                  isActive
                                    ? 'font-semibold shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                )
                              }
                              style={({ isActive }) => (isActive ? activeStyle : undefined)}
                            >
                              {({ isActive }) => (
                                <>
                                  {SubIcon && (
                                    <SubIcon
                                      className={cn(
                                        'h-3 w-3 shrink-0',
                                        isActive ? 'text-primary-foreground' : 'text-slate-400'
                                      )}
                                    />
                                  )}
                                  <span className="truncate">{sub.name}</span>
                                </>
                              )}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.path}
                    className={cn(
                      'flex items-center justify-center rounded-lg p-2 text-xs font-medium transition-colors',
                      isActive ? 'shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                    )}
                    style={isActive ? activeStyle : undefined}
                    title={item.name}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-primary-foreground' : 'text-slate-600')} />
                  </NavLink>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  collapsed && 'justify-center px-2'
                )
              }
              style={({ isActive }) => (isActive ? activeStyle : undefined)}
              title={collapsed ? item.name : undefined}
            >
              {({ isActive: isLinkActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isLinkActive ? 'text-primary-foreground' : isActive ? 'text-primary' : 'text-slate-400'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      {!collapsed && footer && (
        <div className="border-t border-slate-200 p-3 bg-slate-50/50 text-[11px] text-slate-400">
          {footer}
        </div>
      )}
    </aside>
  );
}
