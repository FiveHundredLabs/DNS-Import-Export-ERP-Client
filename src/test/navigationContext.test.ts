import { describe, it, expect } from 'vitest';
import {
  buildEntryNavigationState,
  buildChildNavigationState,
  buildReturnToParentState,
  getOriginalReturnTo,
  getReturnLabel,
} from '../utils/navigationContext';

describe('Navigation Context Chain', () => {
  it('Scenario 1: My Approvals -> PO Details -> Print -> PO Details -> Back -> My Approvals', () => {
    const entryState = buildEntryNavigationState(
      { pathname: '/approvals/my-approvals', search: '?type=PURCHASE_ORDER&page=2' },
      'My Approvals',
    );
    expect(entryState.returnTo).toBe('/approvals/my-approvals?type=PURCHASE_ORDER&page=2');

    // PO Details -> Print (child route)
    const childState = buildChildNavigationState({
      pathname: '/purchasing/orders/po-001',
      search: '',
      state: entryState,
    });
    expect(childState.returnTo).toBe('/approvals/my-approvals?type=PURCHASE_ORDER&page=2');
    expect(childState.parentPath).toBe('/purchasing/orders/po-001');

    // Print -> PO Details (return to parent)
    const backToParentState = buildReturnToParentState({ state: childState });
    expect(backToParentState.returnTo).toBe('/approvals/my-approvals?type=PURCHASE_ORDER&page=2');
    expect(backToParentState.returnLabel).toBe('My Approvals');

    // PO Details -> Back
    const finalTarget = getOriginalReturnTo(backToParentState, '/purchasing/orders/po-001');
    expect(finalTarget).toBe('/approvals/my-approvals?type=PURCHASE_ORDER&page=2');
    expect(getReturnLabel(backToParentState, 'Orders')).toBe('My Approvals');
  });

  it('Scenario 2: Purchase Orders -> PO Details -> Print -> PO Details -> Back -> Purchase Orders', () => {
    const entryState = buildEntryNavigationState(
      { pathname: '/purchasing/orders', search: '?status=PENDING_APPROVAL' },
      'Orders',
    );
    const childState = buildChildNavigationState({
      pathname: '/purchasing/orders/po-001',
      search: '',
      state: entryState,
    });
    const backToParentState = buildReturnToParentState({ state: childState });
    expect(getOriginalReturnTo(backToParentState, '/purchasing/orders/po-001')).toBe(
      '/purchasing/orders?status=PENDING_APPROVAL',
    );
  });

  it('Scenario 3: Dashboard -> PO Details -> Print -> PO Details -> Back -> Dashboard', () => {
    const entryState = buildEntryNavigationState({ pathname: '/', search: '' }, 'Dashboard');
    const childState = buildChildNavigationState({
      pathname: '/purchasing/orders/po-001',
      search: '',
      state: entryState,
    });
    const backToParentState = buildReturnToParentState({ state: childState });
    expect(getOriginalReturnTo(backToParentState, '/purchasing/orders/po-001')).toBe('/');
    expect(getReturnLabel(backToParentState, 'Orders')).toBe('Dashboard');
  });

  it('Scenario 4: Direct URL -> PO Details -> Print -> PO Details -> Back -> Fallback (/purchasing/orders)', () => {
    const childState = buildChildNavigationState({
      pathname: '/purchasing/orders/po-001',
      search: '',
      state: null,
    });
    expect(childState.returnTo).toBeUndefined();
    expect(childState.parentPath).toBe('/purchasing/orders/po-001');

    const backToParentState = buildReturnToParentState({ state: childState });
    expect(getOriginalReturnTo(backToParentState, '/purchasing/orders/po-001')).toBeUndefined();
  });

  it('Rejects unsafe external/protocol-relative returnTo values', () => {
    expect(getOriginalReturnTo({ returnTo: '//evil.com' }, '/purchasing/orders/po-001')).toBeUndefined();
    expect(getOriginalReturnTo({ returnTo: 'https://evil.com' }, '/purchasing/orders/po-001')).toBeUndefined();
  });
});
