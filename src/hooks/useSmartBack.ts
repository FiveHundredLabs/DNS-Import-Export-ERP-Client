import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  NavigationContextState,
  buildChildNavigationState,
  buildReturnToParentState,
  getOriginalReturnTo,
  getReturnLabel,
} from '../utils/navigationContext';

/**
 * useNavigationContext — Reusable typed navigation hook for detail and child routes.
 *
 * Preserves the original entry point (`returnTo`) across nested navigation chains
 * (e.g. My Approvals -> PO Detail -> Print -> PO Detail -> Back -> My Approvals).
 */
export function useNavigationContext(defaultFallbackPath: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as NavigationContextState | null) || null;

  const returnTo = getOriginalReturnTo(state, location.pathname) || defaultFallbackPath;
  const parentPath = state?.parentPath;
  const isFromMyApprovals = returnTo.includes('my-approvals');

  /**
   * Navigates back to the preserved original entry point (or `defaultFallbackPath` on direct URL access).
   */
  const goBack = useCallback(() => {
    navigate(returnTo);
  }, [navigate, returnTo]);

  /**
   * Navigates from a child route (e.g. Print, Edit, Stickers) back to its parent detail route
   * while preserving the original `returnTo` context.
   */
  const goBackToParent = useCallback(
    (fallbackParentPath?: string) => {
      const target = parentPath || fallbackParentPath || returnTo;
      navigate(target, { state: buildReturnToParentState(location) });
    },
    [location, navigate, parentPath, returnTo],
  );

  /**
   * Returns state to pass when navigating from a detail page to a child route.
   */
  const getChildState = useCallback(
    (explicitParentPath?: string) => buildChildNavigationState(location, explicitParentPath),
    [location],
  );

  /**
   * Returns state to pass when navigating from a child route back to its parent detail page.
   */
  const getParentReturnState = useCallback(
    () => buildReturnToParentState(location),
    [location],
  );

  const resolveLabel = useCallback(
    (fallbackLabel: string) => getReturnLabel(state, fallbackLabel),
    [state],
  );

  return {
    returnTo,
    parentPath,
    isFromMyApprovals,
    goBack,
    goBackToParent,
    getChildState,
    getParentReturnState,
    getReturnLabel: resolveLabel,
  };
}

/**
 * useSmartBack — Backward-compatible hook returning a `goBack` callback that
 * respects `returnTo` / `from` in React Router state and falls back to `defaultPath`.
 */
export function useSmartBack(defaultPath: string): () => void {
  const { goBack } = useNavigationContext(defaultPath);
  return goBack;
}
