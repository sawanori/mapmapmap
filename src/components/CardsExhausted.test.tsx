import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardsExhausted from './CardsExhausted';

describe('CardsExhausted', () => {
  const defaultProps = {
    likedCount: 3,
    onExpandRadius: vi.fn(),
    onChangeMood: vi.fn(),
    onShowLikedMap: vi.fn(),
  };

  it('should render completion heading', () => {
    render(<CardsExhausted {...defaultProps} />);
    expect(screen.getByText('すべてチェックしました！')).toBeInTheDocument();
  });

  it('should show liked count when > 0', () => {
    render(<CardsExhausted {...defaultProps} likedCount={5} />);
    expect(screen.getByText('5件のお気に入りがあります')).toBeInTheDocument();
  });

  it('should not show liked count when 0', () => {
    render(<CardsExhausted {...defaultProps} likedCount={0} />);
    expect(screen.queryByText(/件のお気に入り/)).not.toBeInTheDocument();
  });

  it('should render expand radius button', () => {
    render(<CardsExhausted {...defaultProps} />);
    expect(screen.getByText('範囲を広げてもっと探す')).toBeInTheDocument();
  });

  it('should render change mood button', () => {
    render(<CardsExhausted {...defaultProps} />);
    expect(screen.getByText('気分を変える')).toBeInTheDocument();
  });

  it('should render liked map button when likedCount > 0', () => {
    render(<CardsExhausted {...defaultProps} likedCount={2} />);
    expect(screen.getByText('お気に入りを地図で見る')).toBeInTheDocument();
  });

  it('should hide liked map button when likedCount is 0', () => {
    render(<CardsExhausted {...defaultProps} likedCount={0} />);
    expect(screen.queryByText('お気に入りを地図で見る')).not.toBeInTheDocument();
  });

  it('should call onExpandRadius when clicked', async () => {
    const user = userEvent.setup();
    const onExpandRadius = vi.fn();
    render(<CardsExhausted {...defaultProps} onExpandRadius={onExpandRadius} />);

    await user.click(screen.getByText('範囲を広げてもっと探す'));
    expect(onExpandRadius).toHaveBeenCalledTimes(1);
  });

  it('should call onChangeMood when clicked', async () => {
    const user = userEvent.setup();
    const onChangeMood = vi.fn();
    render(<CardsExhausted {...defaultProps} onChangeMood={onChangeMood} />);

    await user.click(screen.getByText('気分を変える'));
    expect(onChangeMood).toHaveBeenCalledTimes(1);
  });

  it('should call onShowLikedMap when clicked', async () => {
    const user = userEvent.setup();
    const onShowLikedMap = vi.fn();
    render(<CardsExhausted {...defaultProps} onShowLikedMap={onShowLikedMap} />);

    await user.click(screen.getByText('お気に入りを地図で見る'));
    expect(onShowLikedMap).toHaveBeenCalledTimes(1);
  });

  it('should have aria-labels on all buttons', () => {
    render(<CardsExhausted {...defaultProps} />);
    expect(screen.getByLabelText('範囲を広げてもっと探す')).toBeInTheDocument();
    expect(screen.getByLabelText('気分を変える')).toBeInTheDocument();
    expect(screen.getByLabelText('お気に入りを地図で見る')).toBeInTheDocument();
  });
});
