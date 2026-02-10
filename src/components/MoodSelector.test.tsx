import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodSelector from './MoodSelector';

describe('MoodSelector', () => {
  it('should render all three mood buttons', () => {
    render(<MoodSelector onSelect={vi.fn()} />);

    expect(screen.getByText('まったり')).toBeInTheDocument();
    expect(screen.getByText('ワイワイ')).toBeInTheDocument();
    expect(screen.getByText('集中')).toBeInTheDocument();
  });

  it('should render English sub-labels', () => {
    render(<MoodSelector onSelect={vi.fn()} />);

    expect(screen.getByText('Chill')).toBeInTheDocument();
    expect(screen.getByText('Party')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
  });

  it('should render heading text', () => {
    render(<MoodSelector onSelect={vi.fn()} />);

    expect(screen.getByText('今の気分は？')).toBeInTheDocument();
  });

  it('should call onSelect with correct mood when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} />);

    await user.click(screen.getByText('まったり'));
    expect(onSelect).toHaveBeenCalledWith('chill');

    await user.click(screen.getByText('ワイワイ'));
    expect(onSelect).toHaveBeenCalledWith('party');

    await user.click(screen.getByText('集中'));
    expect(onSelect).toHaveBeenCalledWith('focus');
  });

  it('should have aria-label on mood group', () => {
    render(<MoodSelector onSelect={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'ムード選択' })).toBeInTheDocument();
  });

  it('should have aria-labels on individual buttons', () => {
    render(<MoodSelector onSelect={vi.fn()} />);

    expect(screen.getByLabelText('まったりモードを選択')).toBeInTheDocument();
    expect(screen.getByLabelText('ワイワイモードを選択')).toBeInTheDocument();
    expect(screen.getByLabelText('集中モードを選択')).toBeInTheDocument();
  });

  it('should disable all buttons when disabled prop is true', () => {
    render(<MoodSelector onSelect={vi.fn()} disabled />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('should not call onSelect when disabled', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoodSelector onSelect={onSelect} disabled />);

    await user.click(screen.getByText('まったり'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
