import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  /** Page primary heading */
  title: React.ReactNode;
  /** Optional secondary descriptive text */
  subtitle?: React.ReactNode;
  /** Optional badge or pill rendered directly next to the title */
  badge?: React.ReactNode;
  /** Action buttons or toolbars rendered on the right side of the header */
  actions?: React.ReactNode;
  /** Optional breadcrumb hierarchy navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Destination route for the back button */
  backUrl?: string;
  /** Custom click handler for back navigation */
  onBack?: () => void;
  /** Accessible and visual label for the back button (e.g. 'Orders') */
  backLabel?: string;
  /** Back button placement: 'inline' next to title, or 'top' above title */
  backPlacement?: 'inline' | 'top';
  /** Additional CSS class names for the header container */
  className?: string;
}

/**
 * Standardized PageHeader component for ERP routes.
 * Provides unified title typography, breadcrumb hierarchy, status badge slot,
 * back navigation, and right-aligned action toolbar across all modules.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  backUrl,
  onBack,
  backLabel,
  backPlacement = 'inline',
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const hasBackAction = Boolean(backUrl || onBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    }
  };

  const renderBackButton = () => {
    if (!hasBackAction) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        aria-label={backLabel ? `Back to ${backLabel}` : 'Go back'}
        className="gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 -ml-2 h-8 px-2.5 shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel && <span>{backLabel}</span>}
      </Button>
    );
  };

  return (
    <header className={cn('space-y-2', className)}>
      {/* Optional Breadcrumb Trail */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
                  {crumb.href && !isLast ? (
                    typeof Link !== 'undefined' && Link ? (
                      <Link
                        to={crumb.href}
                        className="hover:text-slate-900 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <a
                        href={crumb.href}
                        className="hover:text-slate-900 transition-colors"
                      >
                        {crumb.label}
                      </a>
                    )
                  ) : (
                    <span className={cn(isLast && 'font-medium text-slate-800')}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Top back button if explicitly placed at top */}
      {hasBackAction && backPlacement === 'top' && (
        <div className="pb-1">{renderBackButton()}</div>
      )}

      {/* Main Header Row: Title & Badges + Actions Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {hasBackAction && backPlacement === 'inline' && renderBackButton()}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
                {title}
              </h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right-aligned action buttons / toolbar */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
