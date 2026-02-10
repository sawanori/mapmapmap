import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpotCard from './SpotCard';
import { createMockSearchResult } from '@/test-helpers';

const mockSpot = createMockSearchResult({
  id: 1,
  name: 'Kohaku Coffee',
  lat: 35.6812,
  lng: 139.7671,
  category: 'Cafe',
  description: 'A quiet cafe with amber lighting.',
  magazineContext: 'BRUTUS 2024/02',
  createdAt: '2026-01-01',
  distance: 0.25,
});

describe('SpotCard drag-to-dismiss', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dismisses the sheet when dragged down more than 100px threshold', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    // Simulate touch drag: start at Y=200, move to Y=350 (150px > 100px threshold)
    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 350 }],
    });
    fireEvent.touchEnd(dialog);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss the sheet when drag is less than 100px threshold', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    // Simulate touch drag: start at Y=200, move to Y=250 (50px < 100px threshold)
    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 250 }],
    });
    fireEvent.touchEnd(dialog);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('springs back (resets transform) when drag is below threshold', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    // Simulate short drag
    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 230 }],
    });

    // During drag, the sheet should be translated
    expect(dialog.style.transform).toBe('translateY(30px)');

    fireEvent.touchEnd(dialog);

    // After touch end below threshold, transform should be reset
    expect(dialog.style.transform).toBe('');
  });

  it('only allows dragging downward (positive Y direction)', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    // Simulate upward drag
    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 300 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 200 }], // moving up
    });

    // Should not translate upward - dragY stays at 0
    // isDragging is true so transform is translateY(0px) which keeps sheet in place
    expect(dialog.style.transform).toBe('translateY(0px)');
  });

  it('applies translateY transform during active drag', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 280 }],
    });

    expect(dialog.style.transform).toBe('translateY(80px)');
  });

  it('disables transition during active drag for smooth following', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 250 }],
    });

    // During drag, transition should be 'none' for smooth following
    expect(dialog.style.transition).toBe('none');
  });

  it('re-enables transition after drag ends for spring-back animation', () => {
    render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.touchStart(dialog, {
      touches: [{ clientY: 200 }],
    });
    fireEvent.touchMove(dialog, {
      touches: [{ clientY: 250 }],
    });
    fireEvent.touchEnd(dialog);

    // After drag ends, transition should be restored for spring-back
    expect(dialog.style.transition).toBe('transform 0.3s ease-out');
  });
});
