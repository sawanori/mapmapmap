import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationPrompt from './LocationPrompt';

describe('LocationPrompt', () => {
  let originalGeolocation: Geolocation;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn(),
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('should render prompt UI', () => {
    render(
      <LocationPrompt onResolved={vi.fn()} defaultLat={35.45} defaultLng={139.63} />,
    );

    expect(screen.getByText('現在地を使ってもいい？')).toBeInTheDocument();
    expect(screen.getByText('現在地を使う')).toBeInTheDocument();
    expect(screen.getByText('みなとみらいで探す')).toBeInTheDocument();
  });

  it('should call onResolved with default coords when skip is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();
    render(
      <LocationPrompt onResolved={onResolved} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('みなとみらいで探す'));
    expect(onResolved).toHaveBeenCalledWith(35.45, 139.63, 'idle');
  });

  it('should call onResolved with granted status on geolocation success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        success({
          coords: { latitude: 35.68, longitude: 139.76 },
        } as GeolocationPosition);
      },
    );

    render(
      <LocationPrompt onResolved={onResolved} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));
    expect(onResolved).toHaveBeenCalledWith(35.68, 139.76, 'granted');
  });

  it('should show denied message and auto-resolve on permission denied', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (_success, error) => {
        error!({
          code: 1, // PERMISSION_DENIED
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'User denied',
        } as GeolocationPositionError);
      },
    );

    render(
      <LocationPrompt onResolved={onResolved} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));

    expect(screen.getByText('位置情報が利用できませんでした。デフォルト位置で探します...')).toBeInTheDocument();
    expect(onResolved).not.toHaveBeenCalled();

    // After 1.5s, should auto-resolve
    vi.advanceTimersByTime(1500);
    expect(onResolved).toHaveBeenCalledWith(35.45, 139.63, 'denied');
  });

  it('should show spinner while locating', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(() => {
      // never resolves
    });

    render(
      <LocationPrompt onResolved={vi.fn()} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));
    expect(screen.getByText('取得中...')).toBeInTheDocument();
  });

  it('should disable buttons while locating', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(() => {
      // never resolves
    });

    render(
      <LocationPrompt onResolved={vi.fn()} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));

    expect(screen.getByText('取得中...').closest('button')).toBeDisabled();
    expect(screen.getByText('みなとみらいで探す')).toBeDisabled();
  });

  it('should handle unavailable geolocation API', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(
      <LocationPrompt onResolved={onResolved} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));
    expect(onResolved).toHaveBeenCalledWith(35.45, 139.63, 'unavailable');
  });

  it('should not call onResolved after unmount (cancelledRef guard)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (_success, error) => {
        error!({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'User denied',
        } as GeolocationPositionError);
      },
    );

    const { unmount } = render(
      <LocationPrompt onResolved={onResolved} defaultLat={35.45} defaultLng={139.63} />,
    );

    await user.click(screen.getByText('現在地を使う'));
    // denied message shown, timer started
    expect(screen.getByText('位置情報が利用できませんでした。デフォルト位置で探します...')).toBeInTheDocument();

    // Unmount before timer fires
    unmount();
    vi.advanceTimersByTime(1500);

    // onResolved should NOT have been called because component was unmounted
    expect(onResolved).not.toHaveBeenCalled();
  });
});
