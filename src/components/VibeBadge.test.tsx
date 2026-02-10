import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VibeBadge from './VibeBadge';

describe('VibeBadge', () => {
  it('should render the tag text', () => {
    render(<VibeBadge tag="#深夜の読書" />);
    expect(screen.getByText('#深夜の読書')).toBeInTheDocument();
  });

  it('should render as an inline span', () => {
    render(<VibeBadge tag="#一人時間" />);
    const element = screen.getByText('#一人時間');
    expect(element.tagName).toBe('SPAN');
  });

  it('should have glassmorphism classes', () => {
    render(<VibeBadge tag="#珈琲" />);
    const element = screen.getByText('#珈琲');
    expect(element.className).toContain('backdrop-blur');
    expect(element.className).toContain('bg-white/20');
    expect(element.className).toContain('border');
  });

  it('should render multiple badges independently', () => {
    render(
      <div>
        <VibeBadge tag="#A" />
        <VibeBadge tag="#B" />
        <VibeBadge tag="#C" />
      </div>,
    );

    expect(screen.getByText('#A')).toBeInTheDocument();
    expect(screen.getByText('#B')).toBeInTheDocument();
    expect(screen.getByText('#C')).toBeInTheDocument();
  });
});
