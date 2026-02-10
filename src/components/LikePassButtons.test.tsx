import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LikePassButtons from './LikePassButtons';

describe('LikePassButtons', () => {
  it('should render like and pass buttons', () => {
    render(<LikePassButtons onLike={vi.fn()} onPass={vi.fn()} />);

    expect(screen.getByLabelText('お気に入りに追加')).toBeInTheDocument();
    expect(screen.getByLabelText('パスする')).toBeInTheDocument();
  });

  it('should call onLike when like button is clicked', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    render(<LikePassButtons onLike={onLike} onPass={vi.fn()} />);

    await user.click(screen.getByLabelText('お気に入りに追加'));
    expect(onLike).toHaveBeenCalledTimes(1);
  });

  it('should call onPass when pass button is clicked', async () => {
    const user = userEvent.setup();
    const onPass = vi.fn();
    render(<LikePassButtons onLike={vi.fn()} onPass={onPass} />);

    await user.click(screen.getByLabelText('パスする'));
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons when disabled prop is true', () => {
    render(<LikePassButtons onLike={vi.fn()} onPass={vi.fn()} disabled />);

    expect(screen.getByLabelText('お気に入りに追加')).toBeDisabled();
    expect(screen.getByLabelText('パスする')).toBeDisabled();
  });

  it('should not call handlers when disabled', async () => {
    const user = userEvent.setup();
    const onLike = vi.fn();
    const onPass = vi.fn();
    render(<LikePassButtons onLike={onLike} onPass={onPass} disabled />);

    await user.click(screen.getByLabelText('お気に入りに追加'));
    await user.click(screen.getByLabelText('パスする'));
    expect(onLike).not.toHaveBeenCalled();
    expect(onPass).not.toHaveBeenCalled();
  });
});
