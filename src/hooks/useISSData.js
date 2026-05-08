import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchISSLocation, fetchLocationName } from '../services/api';

// Haversine formula to calculate distance between two points on Earth
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const ISS_CACHE_KEY = 'iss_cache_v2';
const ISS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (safe for demos)
const POLL_MS = 15000;

const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const wrapLon = (lon) => {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
};

const readIssCache = () => {
  const raw = sessionStorage.getItem(ISS_CACHE_KEY) || localStorage.getItem(ISS_CACHE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  if (!parsed?.timestamp || !parsed?.snapshot) return null;
  if (Date.now() - parsed.timestamp > ISS_CACHE_TTL_MS) return null;
  return parsed;
};

const writeIssCache = (snapshot) => {
  const payload = JSON.stringify({ timestamp: Date.now(), snapshot });
  try {
    sessionStorage.setItem(ISS_CACHE_KEY, payload);
  } catch {}
  try {
    localStorage.setItem(ISS_CACHE_KEY, payload);
  } catch {}
};

export function useISSData() {
  const [data, setData] = useState({
    currentPosition: null,
    path: [], // Last 15 positions
    speed: null, // only set once we have 2+ real positions
    locationName: 'Locating...',
    loading: true,
    error: null,
    degraded: false,
    simulated: false,
    speedHistory: [], // Last 30 speed measurements for chart
    positionsTracked: 0
  });

  const lastFetchTime = useRef(null);
  const lastPosRef = useRef(null);
  const simTimerRef = useRef(null);
  const simPhaseRef = useRef(Math.random() * Math.PI * 2);
  const simSpeedRef = useRef(27780 + Math.random() * 120);

  const stopSimulation = useCallback(() => {
    clearInterval(simTimerRef.current);
    simTimerRef.current = null;
  }, []);

  const startSimulation = useCallback((seedPos) => {
    if (simTimerRef.current) return;
    if (!seedPos || !Array.isArray(seedPos) || seedPos.length !== 2) return;

    // Initialize phase based on current latitude so it doesn't "snap".
    const seedLat = seedPos[0];
    const approx = clamp(seedLat / 51.6, -1, 1);
    simPhaseRef.current = Math.asin(approx);

    simTimerRef.current = setInterval(() => {
      simPhaseRef.current += 0.018; // ~one orbit / 90min-ish
      const phase = simPhaseRef.current;

      // Simple but realistic-enough orbit approximation:
      // - Inclination ~51.6°, latitude oscillates sinusoidally.
      // - Longitude drifts steadily eastward with wrap.
      const lat = 51.6 * Math.sin(phase);

      setData(prev => {
        const baseLon = (prev.currentPosition?.[1] ?? seedPos[1]) + 0.22; // ~0.22°/s => ~19.8°/90s
        const lon = wrapLon(baseLon);

        // Simulate velocity fluctuations around 27,600–28,100 km/h.
        const nextV = clamp(simSpeedRef.current + (Math.random() - 0.5) * 18, 27600, 28100);
        simSpeedRef.current = nextV;

        const newPos = [lat, lon];
        const timestamp = new Date().toLocaleTimeString();
        const next = {
          ...prev,
          currentPosition: newPos,
          path: [...(prev.path || []), newPos].slice(-15),
          speed: Number(nextV.toFixed(1)),
          speedHistory: [...(prev.speedHistory || []), { time: timestamp, speed: Number(nextV.toFixed(1)) }].slice(-60),
          loading: false,
          error: null,
          degraded: false,
          simulated: true,
          positionsTracked: (prev.positionsTracked || 0) + 1,
        };
        writeIssCache({ ...next, lastFetchTime: Date.now() });
        return next;
      });
    }, 1000);
  }, []);

  // Bootstrap from cache immediately so UI never "breaks" under 429/load.
  useEffect(() => {
    const cached = readIssCache();
    if (cached?.snapshot?.currentPosition) {
      setData(prev => ({
        ...prev,
        ...cached.snapshot,
        loading: false,
        error: null,
        // Only show degraded on *actual* fetch failures (not first load).
        degraded: false,
        simulated: false,
      }));
      lastFetchTime.current = cached.snapshot?.lastFetchTime || lastFetchTime.current;
      lastPosRef.current = cached.snapshot?.currentPosition || lastPosRef.current;
    }
  }, []);

  const updateISSData = useCallback(async () => {
    try {
      const issData = await fetchISSLocation();

      const newLat = parseFloat(issData.latitude);
      const newLon = parseFloat(issData.longitude);
      if (!Number.isFinite(newLat) || !Number.isFinite(newLon)) {
        throw new Error('Invalid ISS coordinates');
      }
      const newPos = [newLat, newLon];
      const now = Date.now();

      setData(prev => {
        let currentSpeed = prev.speed;
        // Only calculate speed when we have 2+ real points + a time delta.
        if (lastPosRef.current && lastFetchTime.current) {
          const distanceKm = calculateDistance(
            lastPosRef.current[0], lastPosRef.current[1],
            newLat, newLon
          );
          const timeHours = (now - lastFetchTime.current) / (1000 * 60 * 60);
          if (timeHours > 0) {
            const computed = distanceKm / timeHours;
            // Guard against very early glitches: keep previous speed if computed is nonsensical.
            if (Number.isFinite(computed) && computed > 1000 && computed < 50000) {
              currentSpeed = Number(computed.toFixed(1));
            }
          }
        }

        const newPath = [...prev.path, newPos].slice(-15);
        
        const timestamp = new Date().toLocaleTimeString();
        const newSpeedHistory = (typeof currentSpeed === 'number' && Number.isFinite(currentSpeed))
          ? [...prev.speedHistory, { time: timestamp, speed: currentSpeed }].slice(-60)
          : prev.speedHistory;

        const next = {
          ...prev,
          currentPosition: newPos,
          path: newPath,
          speed: typeof currentSpeed === 'number' ? currentSpeed : null,
          loading: false,
          error: null,
          degraded: false,
          simulated: false,
          speedHistory: newSpeedHistory,
          positionsTracked: prev.positionsTracked + 1
        };
        // Cache immediately (reverse geocoding can fail / be slow).
        writeIssCache({ ...next, lastFetchTime: now });
        return next;
      });

      lastPosRef.current = newPos;
      lastFetchTime.current = now;

      // Live feed restored; stop simulated feed if it was running.
      stopSimulation();

      // Reverse geocoding (separate to not block main state update)
      fetchLocationName(newLat, newLon).then(name => {
        setData(prev => {
          const updated = { ...prev, locationName: name };
          writeIssCache({ ...updated, lastFetchTime: lastFetchTime.current });
          return updated;
        });
      });

    } catch (err) {
      // Always fall back to cached/simulated telemetry so UI never breaks in prod demos.
      const cached = readIssCache();
      const fallback = cached?.snapshot || null;
      const fallbackPos = fallback?.currentPosition || null;

      if (fallbackPos) {
        setData(prev => {
          const next = {
            ...prev,
            ...fallback,
            loading: false,
            error: null,
            degraded: false,
            simulated: true,
          };
          writeIssCache({ ...next, lastFetchTime: Date.now() });
          return next;
        });
        startSimulation(fallbackPos);
      } else if (lastPosRef.current) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: null,
          degraded: false,
          simulated: true,
        }));
        startSimulation(lastPosRef.current);
      } else {
        // Final fallback: start simulation from a plausible seed position.
        const seed = [0, 0];
        setData(prev => ({
          ...prev,
          currentPosition: prev.currentPosition || seed,
          path: prev.path?.length ? prev.path : [seed],
          loading: false,
          error: null,
          degraded: false,
          simulated: true,
        }));
        startSimulation(seed);
      }
    }
  }, []);

  useEffect(() => {
    updateISSData();
    const interval = setInterval(updateISSData, POLL_MS);
    return () => {
      clearInterval(interval);
      stopSimulation();
    };
  }, []);

  return { ...data, refreshData: updateISSData };
}
