import { useCallback, useEffect, useState } from 'react';

/**
 * Browser location with an explicit permission step (README §7.1).
 * status: 'idle' | 'prompt' | 'locating' | 'granted' | 'denied' | 'unavailable'
 */
export function useGeolocation() {
  const [status, setStatus] = useState('idle');
  const [position, setPosition] = useState(null); // { lat, lng, accuracy, capturedAt }
  const [error, setError] = useState(null);

  // Find out whether permission was already granted/denied, without prompting
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    navigator.permissions?.query({ name: 'geolocation' })
      .then((p) => setStatus((s) => (s === 'idle' ? (p.state === 'denied' ? 'denied' : p.state === 'granted' ? 'idle' : 'prompt') : s)))
      .catch(() => {});
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date(pos.timestamp).toISOString(),
        });
        setStatus('granted');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  return { status, position, error, request };
}
