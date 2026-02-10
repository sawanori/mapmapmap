import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortToggle from './SortToggle';

describe('SortToggle', () => {
  it('shows 距離順 label when sortBy is distance', () => {
    render(<SortToggle sortBy="distance" onSortChange={vi.fn()} />);
    expect(screen.getByText('距離順')).toBeInTheDocument();
  });

  it('shows 評価順 label when sortBy is rating', () => {
    render(<SortToggle sortBy="rating" onSortChange={vi.fn()} />);
    expect(screen.getByText('評価順')).toBeInTheDocument();
  });

  it('calls onSortChange with rating when clicked in distance mode', async () => {
    const onSortChange = vi.fn();
    render(<SortToggle sortBy="distance" onSortChange={onSortChange} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('rating');
  });

  it('calls onSortChange with distance when clicked in rating mode', async () => {
    const onSortChange = vi.fn();
    render(<SortToggle sortBy="rating" onSortChange={onSortChange} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('distance');
  });

  it('has aria-label with current mode', () => {
    render(<SortToggle sortBy="distance" onSortChange={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'ソート切り替え: 現在 距離順'
    );
  });

  it('is a focusable button element', () => {
    render(<SortToggle sortBy="distance" onSortChange={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });
});
