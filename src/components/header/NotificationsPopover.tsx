import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'order' | 'approval' | 'stock' | 'payment';
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Quotation #QT-2025-084 Approved',
    description: 'Executive Director approved pricing discount exception (15%) for Lanka Electro.',
    time: '12m ago',
    type: 'approval',
    unread: true,
  },
  {
    id: 'n-2',
    title: 'Low Stock Alert: Acti9 32A MCB',
    description: 'Central Warehouse stock reached 14 units (reorder threshold: 25).',
    time: '45m ago',
    type: 'stock',
    unread: true,
  },
  {
    id: 'n-3',
    title: 'Payment Received: LKR 450,000',
    description: 'Cheque #883921 cleared for Apex Electricals against INV-0492.',
    time: '2h ago',
    type: 'payment',
    unread: true,
  },
  {
    id: 'n-4',
    title: 'Dispatch Scheduled: Order #SO-1092',
    description: 'Assigned to Fleet Vehicle 04 for Western Province route.',
    time: '5h ago',
    type: 'order',
    unread: false,
  },
];

interface NotificationsPopoverProps {
  className?: string;
}

export function NotificationsPopover({ className }: NotificationsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
      case 'stock':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
      case 'payment':
        return <Receipt className="h-3.5 w-3.5 text-blue-600" />;
      case 'order':
        return <Truck className="h-3.5 w-3.5 text-indigo-600" />;
    }
  };

  return (
    <div className={cn('relative', className)} ref={popoverRef}>
      {/* Header Toolbar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-foreground shrink-0 cursor-pointer',
          isOpen && 'bg-primary-foreground/20 text-primary-foreground'
        )}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-[17px] w-[17px] transition-transform duration-150 hover:scale-105" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400 ring-2 ring-primary" />
          </span>
        )}
      </button>

      {/* Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-84 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xl shadow-slate-900/15 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 px-1 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                ERP Activity & Alerts
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-mono">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="mt-2 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'py-2.5 px-2 rounded-lg transition-colors flex items-start gap-2.5',
                  item.unread ? 'bg-slate-50/80 hover:bg-slate-100/70' : 'hover:bg-slate-50'
                )}
              >
                <div className="mt-0.5 p-1 rounded-md bg-white border border-slate-200/80 shrink-0 shadow-2xs">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[12px] font-semibold text-slate-900 truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
