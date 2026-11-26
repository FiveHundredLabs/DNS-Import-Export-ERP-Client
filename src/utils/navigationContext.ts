import type { Location } from 'react-router-dom';

/**
 * Typed React Router location state used to preserve the original entry point
 * across nested detail and child routes (e.g. My Approvals -> PO Detail -> Print -> PO Detail -> Back).
 */
export interface NavigationContextState {
  /** Original entry point path + search (never overwritten by child navigation) */
  returnTo?: string;
  /** Legacy alias supported for backward compatibility */
  from?: string;
  /** Human-readable label for the original entry point (e.g. "My Approvals") */
  returnLabel?: string;
  /** Parent detail route when currently inside a child sub-route (e.g. /purchasing/orders/123) */
  parentPath?: string;
}

/**
 * Validates that a candidate return path is an internal relative route
 * and not identical to the current pathname.
 */
function isValidReturnPath(candidate: unknown, currentPathname?: string): candidate is string {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  if (currentPathname && trimmed === currentPathname) return false;
  return true;
}

/**
 * Reads the preserved original return destination (`returnTo`, falling back to `from`).
 */
export function getOriginalReturnTo(
  state: unknown,
  currentPathname?: string,
): string | undefined {
  const navState = state as NavigationContextState | null | undefined;
  if (!navState) return undefined;

  if (isValidReturnPath(navState.returnTo, currentPathname)) {
    return navState.returnTo;
  }
  if (isValidReturnPath(navState.from, currentPathname)) {
    return navState.from;
  }
  return undefined;
}

/**
 * Infers a friendly back-button label from the preserved return destination.
 */
export function getReturnLabel(state: unknown, fallbackLabel: string): string {
  const navState = state as NavigationContextState | null | undefined;
  if (navState?.returnLabel) {
    return navState.returnLabel;
  }
  const returnTo = getOriginalReturnTo(state);
  if (returnTo?.includes('my-approvals')) return 'My Approvals';
  if (returnTo?.includes('approval-engine') || returnTo === '/approvals') return 'Approval Engine';
  if (returnTo === '/') return 'Dashboard';
  return fallbackLabel;
}

/**
 * Builds navigation state when entering a detail page from a list, dashboard, or approval hub.
 */
export function buildEntryNavigationState(
  location: Pick<Location, 'pathname' | 'search'>,
  returnLabel?: string,
): NavigationContextState {
  const entryPath = `${location.pathname}${location.search || ''}`;
  return {
    returnTo: entryPath,
    from: entryPath,
    ...(returnLabel ? { returnLabel } : {}),
  };
}

/**
 * Builds navigation state when a detail page navigates into a child route (e.g. /print, /edit, /stickers).
 * CRITICAL: Preserves the existing `returnTo` / `returnLabel` and never overwrites them.
 */
export function buildChildNavigationState(
  currentLocation: Pick<Location, 'pathname' | 'search' | 'state'>,
  explicitParentPath?: string,
): NavigationContextState {
  const existingState = (currentLocation.state as NavigationContextState | null) || {};
  const preservedReturnTo = getOriginalReturnTo(existingState);
  const parentPath = explicitParentPath || `${currentLocation.pathname}${currentLocation.search || ''}`;

  return {
    ...(preservedReturnTo ? { returnTo: preservedReturnTo, from: preservedReturnTo } : {}),
    ...(existingState.returnLabel ? { returnLabel: existingState.returnLabel } : {}),
    parentPath,
  };
}

/**
 * Builds navigation state when a child route returns to its parent detail page.
 * CRITICAL: Carries forward the original `returnTo` / `returnLabel` without setting `from` to the child route.
 */
export function buildReturnToParentState(
  currentLocation: Pick<Location, 'state'>,
): NavigationContextState {
  const existingState = (currentLocation.state as NavigationContextState | null) || {};
  const preservedReturnTo = getOriginalReturnTo(existingState);

  return {
    ...(preservedReturnTo ? { returnTo: preservedReturnTo, from: preservedReturnTo } : {}),
    ...(existingState.returnLabel ? { returnLabel: existingState.returnLabel } : {}),
  };
}
