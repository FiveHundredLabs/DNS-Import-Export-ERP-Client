import React from 'react';

export function PageLoadingFallback() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <span className="text-xs text-slate-400 font-medium tracking-wide">Loading workspace...</span>
      </div>
    </div>
  );
}

export default PageLoadingFallback;
