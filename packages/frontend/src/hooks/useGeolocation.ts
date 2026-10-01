import { useState, useEffect, useRef } from 'react';

interface GeolocationPosition {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

interface GeolocationState {
  position: GeolocationPosition | null;
  error: string | null;
  isLoading: boolean;
  hasPermission: boolean | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}): GeolocationState {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = true,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
    hasPermission: null,
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: 'Geolocation is not supported by this browser.',
        isLoading: false,
        hasPermission: false,
      });
      return;
    }

    const onSuccess = (pos: globalThis.GeolocationPosition) => {
      setState({
        position: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        },
        error: null,
        isLoading: false,
        hasPermission: true,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      let message = 'Unable to retrieve location.';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          message = 'Location access denied. Please enable GPS permissions.';
          break;
        case err.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.';
          break;
        case err.TIMEOUT:
          message = 'Location request timed out.';
          break;
      }
      setState({
        position: null,
        error: message,
        isLoading: false,
        hasPermission: err.code === err.PERMISSION_DENIED ? false : null,
      });
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, geoOptions);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enableHighAccuracy, timeout, maximumAge, watch]);

  return state;
}
