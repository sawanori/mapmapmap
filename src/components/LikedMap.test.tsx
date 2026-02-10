import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeMockVibePlace } from '@/test-utils/mock-data';

// Mock react-map-gl
vi.mock('react-map-gl', () => {
  const MapMock = vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ));
  const MarkerMock = vi.fn(
    ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: (e: { originalEvent: { stopPropagation: () => void } }) => void;
    }) => (
      <div
        data-testid="marker"
        onClick={() => onClick?.({ originalEvent: { stopPropagation: vi.fn() } })}
      >
        {children}
      </div>
    ),
  );
  return {
    __esModule: true,
    default: MapMock,
    Marker: MarkerMock,
    MapRef: {},
  };
});

import LikedMap from './LikedMap';

describe('LikedMap', () => {
  it('should render the map', () => {
    render(
      <LikedMap places={[]} onBack={vi.fn()} />,
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(
      <LikedMap places={[]} onBack={vi.fn()} />,
    );
    expect(screen.getByLabelText('カードに戻る')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <LikedMap places={[]} onBack={onBack} />,
    );

    await user.click(screen.getByLabelText('カードに戻る'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should render markers for liked places', () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
    ];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  it('should display place names on markers', () => {
    const places = [makeMockVibePlace('p1', 'カフェA')];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    expect(screen.getByText('カフェA')).toBeInTheDocument();
  });

  it('should show place count', () => {
    const places = [
      makeMockVibePlace('p1', 'カフェA'),
      makeMockVibePlace('p2', 'カフェB'),
      makeMockVibePlace('p3', 'カフェC'),
    ];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    expect(screen.getByText('♥ 3')).toBeInTheDocument();
  });

  it('should show detail card when a marker is clicked', async () => {
    const user = userEvent.setup();
    const places = [makeMockVibePlace('p1', 'カフェA')];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    await user.click(screen.getByTestId('marker'));
    expect(screen.getByRole('dialog', { name: 'カフェAの詳細' })).toBeInTheDocument();
    expect(screen.getByText('素敵な空間')).toBeInTheDocument();
    expect(screen.getByText('Google Maps で開く →')).toBeInTheDocument();
  });

  it('should close detail card when close button is clicked', async () => {
    const user = userEvent.setup();
    const places = [makeMockVibePlace('p1', 'カフェA')];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    await user.click(screen.getByTestId('marker'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByLabelText('閉じる'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show rating and category in detail card', async () => {
    const user = userEvent.setup();
    const places = [makeMockVibePlace('p1', 'カフェA', { rating: 4.0, distance: 1.0 })];
    render(
      <LikedMap places={places} onBack={vi.fn()} />,
    );

    await user.click(screen.getByTestId('marker'));
    expect(screen.getByText('Cafe')).toBeInTheDocument();
    expect(screen.getByText('★ 4.0')).toBeInTheDocument();
    expect(screen.getByText('1.0km')).toBeInTheDocument();
  });

  it('should render user marker when showUserMarker is true', () => {
    render(
      <LikedMap places={[]} userLat={35.45} userLng={139.63} showUserMarker={true} onBack={vi.fn()} />,
    );
    // User marker + map = 1 marker for user location
    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
  });

  it('should not render user marker when showUserMarker is false', () => {
    render(
      <LikedMap places={[]} userLat={35.45} userLng={139.63} showUserMarker={false} onBack={vi.fn()} />,
    );
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
  });
});
