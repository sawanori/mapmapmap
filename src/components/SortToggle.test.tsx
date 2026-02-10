import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortToggle from './SortToggle';

describe('SortToggle', () => {
  it('shows 関連度順 label when sortBy is relevance', () => {
    render(<SortToggle sortBy="relevance" onSortChange={vi.fn()} />);
    expect(screen.getByText('関連度順')).toBeInTheDocument();
  });

  it('shows 距離順 label when sortBy is distance', () => {
    render(<SortToggle sortBy="distance" onSortChange={vi.fn()} />);
    expect(screen.getByText('距離順')).toBeInTheDocument();
  });

  it('shows 評価順 label when sortBy is rating', () => {
    render(<SortToggle sortBy="rating" onSortChange={vi.fn()} />);
    expect(screen.getByText('評価順')).toBeInTheDocument();
  });

  it('cycles relevance -> distance -> rating -> relevance', async () => {
    const onSortChange = vi.fn();

    // relevance -> distance
    const { unmount: u1 } = render(<SortToggle sortBy="relevance" onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('distance');
    u1();

    onSortChange.mockClear();

    // distance -> rating
    const { unmount: u2 } = render(<SortToggle sortBy="distance" onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('rating');
    u2();

    onSortChange.mockClear();

    // rating -> relevance
    render(<SortToggle sortBy="rating" onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith('relevance');
  });

  it('has aria-label with current mode', () => {
    render(<SortToggle sortBy="relevance" onSortChange={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'ソート切り替え: 現在 関連度順'
    );
  });

  it('is a focusable button element', () => {
    render(<SortToggle sortBy="relevance" onSortChange={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });
});
