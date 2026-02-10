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
      <LocationPrompt
        onResolved={vi.fn()}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    expect(
      screen.getByText('近くのスポットを出すために位置情報を使います'),
    ).toBeInTheDocument();
    expect(screen.getByText('位置情報を許可して探す')).toBeInTheDocument();
    expect(screen.getByText('駅名で探す')).toBeInTheDocument();
  });

  it('should call onStationSearch when "駅名で探す" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onStationSearch = vi.fn();
    const onResolved = vi.fn();

    render(
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={onStationSearch}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('駅名で探す'));
    expect(onStationSearch).toHaveBeenCalledOnce();
    expect(onResolved).not.toHaveBeenCalled();
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
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));
    expect(onResolved).toHaveBeenCalledWith(35.68, 139.76, 'granted');
  });

  it('should show denied state with station search option on permission denied', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();
    const onStationSearch = vi.fn();

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

    render(
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={onStationSearch}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));

    // Should show denied message
    expect(
      screen.getByText('位置情報が使えないため、駅名で探せます。'),
    ).toBeInTheDocument();

    // Should show both buttons
    expect(screen.getByText('駅名で探す')).toBeInTheDocument();
    expect(screen.getByText('再度許可を試す')).toBeInTheDocument();

    // onResolved should NOT have been called
    expect(onResolved).not.toHaveBeenCalled();

    // Clicking station search calls onStationSearch
    await user.click(screen.getByText('駅名で探す'));
    expect(onStationSearch).toHaveBeenCalledOnce();
  });

  it('should NOT auto-resolve on permission denied', async () => {
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

    render(
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));

    expect(
      screen.getByText('位置情報が使えないため、駅名で探せます。'),
    ).toBeInTheDocument();

    // Advance well past the old 1.5s timer
    vi.advanceTimersByTime(5000);

    // onResolved should never be called automatically
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('should show spinner while locating', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      () => {
        // never resolves
      },
    );

    render(
      <LocationPrompt
        onResolved={vi.fn()}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));
    expect(screen.getByText('取得中...')).toBeInTheDocument();
  });

  it('should disable buttons while locating', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      () => {
        // never resolves
      },
    );

    render(
      <LocationPrompt
        onResolved={vi.fn()}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));

    expect(screen.getByText('取得中...').closest('button')).toBeDisabled();
    expect(screen.getByText('駅名で探す')).toBeDisabled();
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
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));
    expect(onResolved).toHaveBeenCalledWith(35.45, 139.63, 'unavailable');
  });

  it('should call onResolved with unavailable for non-permission errors', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (_success, error) => {
        error!({
          code: 2, // POSITION_UNAVAILABLE
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'Position unavailable',
        } as GeolocationPositionError);
      },
    );

    render(
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));
    expect(onResolved).toHaveBeenCalledWith(35.45, 139.63, 'unavailable');
  });

  it('should not call onResolved after unmount (cancelledRef guard)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onResolved = vi.fn();

    let capturedSuccess: PositionCallback | undefined;

    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(
      (success) => {
        // Capture the callback but do not invoke it yet
        capturedSuccess = success;
      },
    );

    const { unmount } = render(
      <LocationPrompt
        onResolved={onResolved}
        onStationSearch={vi.fn()}
        defaultLat={35.45}
        defaultLng={139.63}
      />,
    );

    await user.click(screen.getByText('位置情報を許可して探す'));

    // Unmount before the geolocation callback fires
    unmount();

    // Now fire the captured success callback after unmount
    capturedSuccess!({
      coords: { latitude: 35.68, longitude: 139.76 },
    } as GeolocationPosition);

    // onResolved should NOT have been called because component was unmounted
    expect(onResolved).not.toHaveBeenCalled();
  });
});
