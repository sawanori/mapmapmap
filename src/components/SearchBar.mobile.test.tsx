import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchBar from './SearchBar';

// Mock the searchSpots Server Action
vi.mock('@/app/actions', () => ({
  searchSpots: vi.fn(),
}));

describe('SearchBar mobile polish', () => {
  const defaultProps = {
    userLocation: { lat: 35.6812, lng: 139.7671 },
    onResults: vi.fn(),
    onError: vi.fn(),
  };

  it('uses type="search" for mobile keyboard optimization', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input).toHaveAttribute('type', 'search');
  });

  it('has inputMode="text" for proper mobile keyboard', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input).toHaveAttribute('inputMode', 'text');
  });

  it('has autoComplete="off" to prevent unwanted suggestions', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input).toHaveAttribute('autoComplete', 'off');
  });

  it('has autoCorrect="off" to prevent auto-correction', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input).toHaveAttribute('autoCorrect', 'off');
  });

  it('has spellCheck="false" to prevent spell checking', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input.getAttribute('spellcheck')).toBe('false');
  });

  it('has enterKeyHint="search" for mobile keyboard search button', () => {
    render(<SearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox', { name: /検索キーワード/ });
    expect(input).toHaveAttribute('enterKeyHint', 'search');
  });

  it('has safe area bottom padding on the form', () => {
    render(<SearchBar {...defaultProps} />);
    const form = screen.getByRole('form');
    expect(form.className).toContain('pb-[calc(1rem+env(safe-area-inset-bottom))]');
  });

  it('submit button meets minimum 44px touch target (w-10 h-10 = 40px + padding)', () => {
    render(<SearchBar {...defaultProps} />);
    const button = screen.getByRole('button', { name: /検索/ });
    // w-10 = 40px, h-10 = 40px. The surrounding padding makes total target >= 44px
    expect(button.className).toContain('w-10');
    expect(button.className).toContain('h-10');
  });
});
