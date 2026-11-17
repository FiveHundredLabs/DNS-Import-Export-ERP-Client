import { Link } from 'react-router-dom';

export function ServerErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-rose-400">Error 500</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Service unavailable</h1>
        <p className="mt-3 text-sm text-slate-400">
          The server could not complete your request. Please try again shortly.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
