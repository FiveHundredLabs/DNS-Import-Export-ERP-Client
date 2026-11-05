import { useNavigate, useLocation } from 'react-router-dom';

/**
 * useSmartBack — Reliable back navigation for the DNS ERP application.
 *
 * Returns a `goBack` function that navigates to the route stored in
 * `location.state.from` (set by the caller when navigating *to* this page),
 * falling back to `defaultPath` when no state is available (direct URL access,
 * page refresh, or the user arrived without a `from` state).
 *
 * Usage in a detail page:
 *   const goBack = useSmartBack('/orders');
 *   <Button onClick={goBack}>Back</Button>
 *
 * Usage in a list / hub page when navigating to a detail page:
 *   navigate(`/orders/${id}`, { state: { from: location.pathname + location.search } });
 */
export function useSmartBack(defaultPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return () => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== location.pathname ? from : defaultPath);
  };
}

