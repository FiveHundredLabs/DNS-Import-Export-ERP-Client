import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfirmButton } from '../components/ui/confirm-button';

describe('ConfirmButton Component', () => {
  it('renders correctly with given text and attributes', () => {
    render(
      <ConfirmButton variant="destructive" size="sm">
        Delete Invoice
      </ConfirmButton>
    );

    const button = screen.getByRole('button', { name: /delete invoice/i });
    expect(button).toBeDefined();
    // Dialog shouldn't be open initially
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens confirmation modal upon click and does NOT call onConfirm or onClick immediately', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton
        confirmTitle="Delete Confirmation"
        confirmMessage="Are you sure you want to permanently delete this document?"
        confirmText="Yes, Delete"
        onConfirm={onConfirmMock}
      >
        Delete Item
      </ConfirmButton>
    );

    const trigger = screen.getByRole('button', { name: /delete item/i });
    fireEvent.click(trigger);

    // Modal is opened
    expect(screen.getByText('Delete Confirmation')).toBeDefined();
    expect(
      screen.getByText('Are you sure you want to permanently delete this document?')
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /yes, delete/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();

    // Callback has not yet been executed
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('cancels and closes modal without executing action when Cancel is clicked', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton onConfirm={onConfirmMock}>
        Perform Action
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /perform action/i }));
    expect(screen.getByRole('heading', { name: /Are you sure/i })).toBeDefined();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    // Dialog is dismissed
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('executes onConfirm when confirmed in dialog and closes dialog', async () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton
        confirmTitle="Approve Sale"
        confirmText="Confirm Approval"
        onConfirm={onConfirmMock}
      >
        Approve
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

    const confirmBtn = screen.getByRole('button', { name: /confirm approval/i });
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('intercepts onClick if onConfirm is not provided', async () => {
    const onClickMock = vi.fn();
    render(
      <ConfirmButton onClick={onClickMock}>
        Submit Order
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /submit order/i }));
    expect(onClickMock).not.toHaveBeenCalled();

    const confirmBtn = screen.getByTestId('confirm-dialog-submit-btn');
    fireEvent.click(confirmBtn);

    expect(onClickMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('handles async actions with loading state before closing', async () => {
    let resolvePromise: () => void = () => {};
    const asyncAction = vi.fn(() => new Promise<void>((res) => {
      resolvePromise = res;
    }));

    render(
      <ConfirmButton onConfirm={asyncAction}>
        Post to Ledger
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /post to ledger/i }));
    const confirmBtn = screen.getByTestId('confirm-dialog-submit-btn');
    fireEvent.click(confirmBtn);

    expect(asyncAction).toHaveBeenCalledTimes(1);
    // Button is disabled while resolving
    expect(confirmBtn).toBeDisabled();

    // Resolve promise
    resolvePromise();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('bypasses confirmation modal when requireConfirm is false', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton requireConfirm={false} onConfirm={onConfirmMock}>
        Quick Action
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /quick action/i }));

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does nothing when disabled', () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton disabled onConfirm={onConfirmMock}>
        Disabled Action
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /disabled action/i }));

    expect(onConfirmMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('supports custom confirmContent inside the dialog', () => {
    render(
      <ConfirmButton
        confirmContent={<div data-testid="custom-warning">Warning: 50 items will be affected</div>}
      >
        Batch Process
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /batch process/i }));

    expect(screen.getByTestId('custom-warning')).toBeDefined();
    expect(screen.getByText('Warning: 50 items will be affected')).toBeDefined();
  });

  it('submits enclosing form on confirmation when type="submit"', async () => {
    const onSubmitMock = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmitMock}>
        <input name="testInput" defaultValue="hello" />
        <ConfirmButton type="submit">Submit Form</ConfirmButton>
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: /submit form/i }));
    expect(onSubmitMock).not.toHaveBeenCalled();

    const confirmBtn = screen.getByTestId('confirm-dialog-submit-btn');
    fireEvent.click(confirmBtn);

    expect(onSubmitMock).toHaveBeenCalledTimes(1);
  });

  it('blocks opening confirmation dialog when enclosing form is invalid', () => {
    const onSubmitMock = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmitMock}>
        <input name="requiredInput" required defaultValue="" />
        <ConfirmButton type="submit">Submit Form</ConfirmButton>
      </form>
    );

    const trigger = screen.getByRole('button', { name: /submit form/i });
    fireEvent.click(trigger);

    // Dialog should not open because HTML form is invalid
    expect(screen.queryByTestId('confirm-dialog-submit-btn')).toBeNull();
    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it('prevents duplicate executions on rapid double-clicks while loading', async () => {
    let resolveAction: () => void = () => {};
    const longRunningAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        })
    );

    render(
      <ConfirmButton onConfirm={longRunningAction}>
        Run Heavy Operation
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /run heavy operation/i }));
    const confirmBtn = screen.getByTestId('confirm-dialog-submit-btn');

    // Click twice rapidly
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(longRunningAction).toHaveBeenCalledTimes(1);

    resolveAction();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('dismisses dialog when Escape key is pressed', async () => {
    const onConfirmMock = vi.fn();
    render(
      <ConfirmButton onConfirm={onConfirmMock}>
        Esc Action
      </ConfirmButton>
    );

    fireEvent.click(screen.getByRole('button', { name: /esc action/i }));
    expect(screen.getByRole('heading', { name: /are you sure/i })).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(onConfirmMock).not.toHaveBeenCalled();
  });
});
