import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/ui/select';

describe('Global Searchable Select Enhancement', () => {
  it('renders search input when dropdown opens and places cursor for immediate search', async () => {
    const handleChange = vi.fn();
    render(
      <Select defaultValue="apple" onChange={handleChange}>
        <option value="apple">Fresh Red Apple</option>
        <option value="banana">Yellow Cavendish Banana</option>
        <option value="cherry">Sweet Dark Cherry</option>
      </Select>
    );

    // Click trigger to open dropdown
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Search input should appear
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    // Verify search input has focus or cursor
    await waitFor(() => {
      expect(document.activeElement).toBe(searchInput);
    });

    // Type query "cherry"
    fireEvent.change(searchInput, { target: { value: 'cherry' } });

    // Apple and Banana should be filtered out
    expect(screen.queryByText('Fresh Red Apple')).not.toBeInTheDocument();
    expect(screen.queryByText('Yellow Cavendish Banana')).not.toBeInTheDocument();
    expect(screen.getByText('Sweet Dark Cherry')).toBeInTheDocument();

    // Clicking filtered item selects it and closes dropdown
    fireEvent.click(screen.getByText('Sweet Dark Cherry'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: 'cherry' } })
    );
  });

  it('supports compound Select components with search, scrollability, and clearing', async () => {
    render(
      <Select defaultValue="item-1">
        <SelectTrigger data-testid="compound-trigger">
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="item-1">Electronics - Television 4K</SelectItem>
          <SelectItem value="item-2">Home - Air Conditioner 1.5HP</SelectItem>
          <SelectItem value="item-3">Electronics - Refrigerator Inverter</SelectItem>
        </SelectContent>
      </Select>
    );

    fireEvent.click(screen.getByTestId('compound-trigger'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    // Search "Air"
    fireEvent.change(searchInput, { target: { value: 'Air' } });
    expect(screen.queryByText('Electronics - Television 4K')).not.toBeInTheDocument();
    expect(screen.getByText('Home - Air Conditioner 1.5HP')).toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = searchInput.parentElement?.querySelector('button');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn!);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveTextContent('Electronics - Television 4K');
    expect(listbox).toHaveTextContent('Home - Air Conditioner 1.5HP');
    expect(listbox).toHaveTextContent('Electronics - Refrigerator Inverter');
  });

  it('supports optgroup categories filtering in option-based Select', async () => {
    render(
      <Select defaultValue="toyota">
        <optgroup label="Japanese Manufacturers">
          <option value="toyota">Toyota Motor Corporation</option>
          <option value="honda">Honda Motor Co.</option>
        </optgroup>
        <optgroup label="German Manufacturers">
          <option value="bmw">BMW Group</option>
          <option value="mercedes">Mercedes-Benz AG</option>
        </optgroup>
      </Select>
    );

    fireEvent.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.change(searchInput, { target: { value: 'Benz' } });

    expect(screen.queryByText('Toyota Motor Corporation')).not.toBeInTheDocument();
    expect(screen.queryByText('Honda Motor Co.')).not.toBeInTheDocument();
    expect(screen.queryByText('BMW Group')).not.toBeInTheDocument();
    expect(screen.getByText('Mercedes-Benz AG')).toBeInTheDocument();
  });
});
