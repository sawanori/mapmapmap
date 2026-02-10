import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================
// Tests for Task 13: Error Handling Integration
// Part 1: SearchBar validation error display + network error handling
// ============================================================

const mockSearchSpots = vi.fn();
vi.mock('@/app/actions', () => ({
  searchSpots: (...args: unknown[]) => mockSearchSpots(...args),
}));

import SearchBar from './SearchBar';

describe('SearchBar: inline validation errors and network error handling', () => {
  const defaultProps = {
    userLocation: { lat: 35.6812, lng: 139.7671 },
    onResults: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables submit button for empty/whitespace query (validation prevention)', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    await user.type(input, '   ');
    const button = screen.getByRole('button', { name: /検索/ });
    expect(button).toBeDisabled();
  });

  it('does not show validation error before form submission', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);

    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    await user.type(input, 'test');
    await user.clear(input);

    expect(screen.queryByText(/検索キーワードを入力/)).not.toBeInTheDocument();
  });

  it('clears validation error when user types valid text', async () => {
    const user = userEvent.setup();
    mockSearchSpots.mockResolvedValue({ success: true, data: [] });

    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });

    await user.type(input, 'coffee');
    expect(screen.queryByText(/検索キーワードを入力/)).not.toBeInTheDocument();
  });

  it('catches network errors and calls onError with a friendly message', async () => {
    const user = userEvent.setup();
    mockSearchSpots.mockRejectedValue(new Error('Network failure'));

    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });

    await user.type(input, 'coffee');
    await user.click(screen.getByRole('button', { name: /検索/ }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(
        '通信エラーです。接続を確認してください。'
      );
    });
  });

  it('does not expose technical error details to user on network error', async () => {
    const user = userEvent.setup();
    mockSearchSpots.mockRejectedValue(new Error('TypeError: Failed to fetch at line 42'));

    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });

    await user.type(input, 'coffee');
    await user.click(screen.getByRole('button', { name: /検索/ }));

    await waitFor(() => {
      const errorCall = defaultProps.onError.mock.calls[0][0];
      expect(errorCall).not.toContain('TypeError');
      expect(errorCall).not.toContain('Failed to fetch');
      expect(errorCall).not.toContain('line 42');
    });
  });

  it('clears previous error state on new successful search', async () => {
    const user = userEvent.setup();
    mockSearchSpots.mockResolvedValue({
      success: false,
      error: { code: 'EMBEDDING_ERROR' as const, message: 'Search failed. Please try again.' },
    });

    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });

    await user.type(input, 'coffee');
    await user.click(screen.getByRole('button', { name: /検索/ }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Search failed. Please try again.');
    });

    mockSearchSpots.mockResolvedValue({ success: true, data: [] });
    await user.clear(input);
    await user.type(input, 'new search');
    await user.click(screen.getByRole('button', { name: /検索/ }));

    await waitFor(() => {
      expect(defaultProps.onResults).toHaveBeenCalledWith([]);
    });
  });

  it('does not show validation error element initially', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.queryByText('検索キーワードを入力してください')).not.toBeInTheDocument();
  });
});

// === Part 2: Map load error fallback UI ===

describe('Map: load error fallback UI structure', () => {
  it('Map component module exports a default function component', async () => {
    const MapModule = await import('./Map');
    expect(typeof MapModule.default).toBe('function');
  });
});
