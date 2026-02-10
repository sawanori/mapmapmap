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
  description: 'A quiet cafe with amber lighting where time stands still.',
  magazineContext: 'BRUTUS 2024/02 Reading Special',
  createdAt: '2026-01-01',
  distance: 0.25,
});

const mockSpotNullFields = createMockSearchResult({
  id: 2,
  name: 'Hidden Bar',
  lat: 35.685,
  lng: 139.77,
  category: 'Bar',
  description: null,
  magazineContext: null,
  createdAt: '2026-01-01',
  distance: 2.5,
});

const mockSpotFarAway = createMockSearchResult({
  id: 3,
  name: 'Distant Place',
  lat: 35.7,
  lng: 139.8,
  category: 'Gallery',
  description: 'A far-off gallery.',
  magazineContext: null,
  createdAt: '2026-01-01',
  distance: 1.8,
});

describe('SpotCard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-004: Pin tap shows bottom-sheet with slide-in animation (0.3s ease-out)
  describe('rendering and animation', () => {
    it('renders nothing when spot is null', () => {
      const { container } = render(<SpotCard spot={null} onClose={mockOnClose} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders the bottom sheet when spot is provided', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has slide-up animation class on the sheet', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('animate-slide-up');
    });

    it('renders the drag handle', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      // The drag handle is a small rounded div inside the sheet
      const handle = dialog.querySelector('.w-10.h-1');
      expect(handle).toBeInTheDocument();
    });
  });

  // AC-004: All required info displayed: name, category, distance, description, magazine context
  describe('displaying spot information', () => {
    it('displays the spot name', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByText('Kohaku Coffee')).toBeInTheDocument();
    });

    it('displays the category badge', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByText('Cafe')).toBeInTheDocument();
    });

    it('displays distance formatted in meters when < 1km', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      // 0.25 km = 250m
      expect(screen.getByText('250m先')).toBeInTheDocument();
    });

    it('displays distance formatted in km when >= 1km', () => {
      render(<SpotCard spot={mockSpotNullFields} onClose={mockOnClose} />);
      // 2.5 km
      expect(screen.getByText('2.5km先')).toBeInTheDocument();
    });

    it('displays the description', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(
        screen.getByText('A quiet cafe with amber lighting where time stands still.')
      ).toBeInTheDocument();
    });

    it('displays the magazine context', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByText('BRUTUS 2024/02 Reading Special')).toBeInTheDocument();
    });

    it('displays the Google Maps link', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByText('Google Mapsで開く')).toBeInTheDocument();
    });
  });

  // Null description handled: section hidden when spot.description is null
  // Null magazineContext handled: section hidden when spot.magazineContext is null
  describe('null field handling', () => {
    it('hides description section when description is null', () => {
      render(<SpotCard spot={mockSpotNullFields} onClose={mockOnClose} />);
      // The spot name should be visible but no description paragraph
      expect(screen.getByText('Hidden Bar')).toBeInTheDocument();
      // The description text should not exist
      expect(screen.queryByText(/quiet cafe/)).not.toBeInTheDocument();
    });

    it('hides magazine context section when magazineContext is null', () => {
      render(<SpotCard spot={mockSpotNullFields} onClose={mockOnClose} />);
      expect(screen.queryByText('掲載情報:')).not.toBeInTheDocument();
    });
  });

  // Distance formatted correctly: meters (< 1km) or km (>= 1km)
  describe('distance formatting', () => {
    it('formats distance less than 1km as meters', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByText('250m先')).toBeInTheDocument();
    });

    it('formats distance at exactly 1km or more as km with one decimal', () => {
      render(<SpotCard spot={mockSpotFarAway} onClose={mockOnClose} />);
      expect(screen.getByText('1.8km先')).toBeInTheDocument();
    });
  });

  // AC-004: Backdrop blur effect applied (backdrop-blur-sm)
  describe('backdrop blur', () => {
    it('renders a backdrop with blur class', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const backdrop = screen.getByRole('dialog').previousElementSibling;
      expect(backdrop).toBeInTheDocument();
      expect(backdrop!.className).toContain('backdrop-blur-sm');
    });
  });

  // AC-004: Dismissible via backdrop tap and Escape key
  describe('dismiss behavior', () => {
    it('calls onClose when backdrop is clicked', async () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement;
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when spot is null', () => {
      render(<SpotCard spot={null} onClose={mockOnClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // Keyboard accessible: Escape to close, focus moves to sheet on open
  describe('keyboard accessibility', () => {
    it('moves focus to the sheet when opened', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(document.activeElement).toBe(dialog);
    });
  });

  // ARIA attributes: role="dialog", aria-modal="true", aria-label
  describe('ARIA attributes', () => {
    it('has role="dialog"', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-label with spot name', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        'Kohaku Coffeeの詳細'
      );
    });

    it('Google Maps button has appropriate aria-label', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(
        screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く')
      ).toBeInTheDocument();
    });
  });

  // AC-007: Google Maps external link integration
  describe('Google Maps link', () => {
    it('renders as an <a> tag (not a <button>)', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link.tagName).toBe('A');
    });

    it('has correct Google Maps URL with lat,lng coordinates', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=35.6812,139.7671'
      );
    });

    it('opens in a new tab with target="_blank"', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has rel="noopener noreferrer" for security', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('is styled as a full-width block button', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link.className).toContain('w-full');
      expect(link.className).toContain('block');
    });

    it('uses correct coordinates for a different spot', () => {
      render(<SpotCard spot={mockSpotNullFields} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Hidden BarをGoogle Mapsで開く');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=35.685,139.77'
      );
    });
  });

  // Max height 70vh with scroll for long content
  describe('layout constraints', () => {
    it('has max-h-[70vh] class for scroll overflow', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('max-h-[70vh]');
    });

    it('has overflow-y-auto for scrolling', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('overflow-y-auto');
    });
  });

  // Safe area bottom padding for iOS
  describe('safe area', () => {
    it('has safe area bottom padding', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain('pb-[env(safe-area-inset-bottom)]');
    });
  });

  // Google Places integration: rating, address, opening hours, link
  describe('Google Places fields', () => {
    const mockGoogleSpot = createMockSearchResult({
      id: 10,
      name: 'Google Cafe',
      lat: 35.68,
      lng: 139.77,
      category: 'Cafe',
      description: 'A great cafe from Google',
      distance: 0.3,
      googlePlaceId: 'ChIJtest123',
      rating: 4.2,
      address: '1-1 Marunouchi, Chiyoda-ku, Tokyo',
      openingHours: '["Monday: 9:00 AM - 5:00 PM","Tuesday: 9:00 AM - 5:00 PM"]',
      source: 'google_places',
    });

    it('displays rating stars when rating is present', () => {
      render(<SpotCard spot={mockGoogleSpot} onClose={mockOnClose} />);
      expect(screen.getByText('4.2')).toBeInTheDocument();
      // 4.2 rounds to 4 stars filled
      expect(screen.getByText('★★★★☆')).toBeInTheDocument();
    });

    it('hides rating when rating is null', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });

    it('displays address when present', () => {
      render(<SpotCard spot={mockGoogleSpot} onClose={mockOnClose} />);
      expect(screen.getByText('1-1 Marunouchi, Chiyoda-ku, Tokyo')).toBeInTheDocument();
    });

    it('hides address when null', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.queryByText(/Marunouchi/)).not.toBeInTheDocument();
    });

    it('displays opening hours as collapsible details', () => {
      render(<SpotCard spot={mockGoogleSpot} onClose={mockOnClose} />);
      expect(screen.getByText('営業時間')).toBeInTheDocument();
      expect(screen.getByText('Monday: 9:00 AM - 5:00 PM')).toBeInTheDocument();
      expect(screen.getByText('Tuesday: 9:00 AM - 5:00 PM')).toBeInTheDocument();
    });

    it('hides opening hours when null', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      expect(screen.queryByText('営業時間')).not.toBeInTheDocument();
    });

    it('handles invalid JSON in openingHours gracefully', () => {
      const badSpot = createMockSearchResult({
        openingHours: 'not-valid-json',
      });
      render(<SpotCard spot={badSpot} onClose={mockOnClose} />);
      // Should not crash, and should not show 営業時間
      expect(screen.queryByText('営業時間')).not.toBeInTheDocument();
    });

    it('hides opening hours when JSON is an empty array', () => {
      const emptyHoursSpot = createMockSearchResult({
        openingHours: '[]',
      });
      render(<SpotCard spot={emptyHoursSpot} onClose={mockOnClose} />);
      expect(screen.queryByText('営業時間')).not.toBeInTheDocument();
    });

    it('uses place_id URL when googlePlaceId is present', () => {
      render(<SpotCard spot={mockGoogleSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Google CafeをGoogle Mapsで開く');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/maps/place/?q=place_id:ChIJtest123',
      );
    });

    it('uses lat,lng URL when googlePlaceId is null', () => {
      render(<SpotCard spot={mockSpot} onClose={mockOnClose} />);
      const link = screen.getByLabelText('Kohaku CoffeeをGoogle Mapsで開く');
      expect(link).toHaveAttribute(
        'href',
        'https://www.google.com/maps/search/?api=1&query=35.6812,139.7671',
      );
    });
  });
});
