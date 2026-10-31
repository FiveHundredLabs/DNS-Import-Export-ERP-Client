import { useMemo } from 'react';
import { MapPin, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function SalesRepGreetingCard() {
  const { currentUser } = useAuth();

  const greetingMessage = useMemo(() => {
    const hour = new Date().getHours();
    let timeOfDay = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeOfDay = 'Good afternoon';
    } else if (hour >= 17) {
      timeOfDay = 'Good evening';
    }
    const firstName = currentUser?.name?.split(' ')[0] || 'Kasun';
    return `${timeOfDay}, ${firstName}`;
  }, [currentUser?.name]);

  const territoryName = currentUser?.areaName ? `${currentUser.areaName} Territory` : 'Kelaniya Territory';
  const assignedDealersCount = currentUser?.assignedCustomersCount || 14;

  return (
    <div className="sales-rep-mobile-greeting relative p-5 pb-7 text-white rounded-b-[2.5rem] overflow-hidden transition-all shadow-md shadow-slate-900/10 border-none">
      {/* Fluid Decorative Ambient Waves */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />

      <div className="min-w-0 flex-1 relative z-10">
        {/* 1. Greeting & Name */}
        <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight truncate">
          {greetingMessage}
        </h1>

        {/* 2. Territory */}
        <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium mt-1 truncate">
          <MapPin className="h-3.5 w-3.5 text-rose-300 shrink-0" />
          <span className="truncate">{territoryName}</span>
        </div>

        {/* 3. Dealer Information */}
        <div className="flex items-center gap-2 text-[11px] text-white/80 font-medium mt-1">
          <div className="flex items-center gap-1 shrink-0">
            <Users className="h-3 w-3 text-sky-300 shrink-0" />
            <span>{assignedDealersCount} Assigned Dealers</span>
          </div>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-400/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Route
          </span>
        </div>
      </div>
    </div>
  );
}

