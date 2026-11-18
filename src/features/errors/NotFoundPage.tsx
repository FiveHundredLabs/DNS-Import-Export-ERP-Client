import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Error 404</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The page you requested does not exist or is no longer available.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}
