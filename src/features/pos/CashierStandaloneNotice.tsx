export function CashierStandaloneNotice() {
  return (
    <main className="flex min-h-full w-full items-center justify-center bg-white px-6 text-center">
      <div className="max-w-md p-8 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-sm flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white p-2 border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="DNS Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">DNS Import & Export POS Terminal</h2>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Can&apos;t access POS in the web application. Use the standalone application.
          </p>
        </div>
      </div>
    </main>
  );
}
