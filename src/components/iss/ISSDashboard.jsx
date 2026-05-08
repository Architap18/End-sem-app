import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useISSData } from '../../hooks/useISSData';
import Loader from '../common/Loader';
import SpeedChart from '../charts/SpeedChart';
import { Navigation, MapPin, RefreshCw, Activity } from 'lucide-react';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const lerp = (a, b, t) => a + (b - a) * t;

const issDivIcon = new L.DivIcon({
  className: 'iss-div-icon',
  html: `<div class="iss-glow"></div><div class="iss-core"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } }
};

export default function ISSDashboard() {
  const { 
    currentPosition, 
    path, 
    speed, 
    locationName, 
    loading, 
    error,
    simulated,
    refreshData,
    speedHistory,
    positionsTracked
  } = useISSData();

  const mapRef = useRef(null);
  const rafRef = useRef(null);
  const fromPosRef = useRef(null);
  const toPosRef = useRef(null);
  const startMsRef = useRef(0);
  const [displayPos, setDisplayPos] = useState(null);

  useEffect(() => {
    if (!currentPosition) return;
    if (!displayPos) {
      setDisplayPos(currentPosition);
      fromPosRef.current = currentPosition;
      toPosRef.current = currentPosition;
      return;
    }

    fromPosRef.current = displayPos;
    toPosRef.current = currentPosition;
    startMsRef.current = performance.now();

    cancelAnimationFrame(rafRef.current);
    const durationMs = 1200;

    const tick = (now) => {
      const t = Math.min(1, (now - startMsRef.current) / durationMs);
      const a = fromPosRef.current;
      const b = toPosRef.current;
      if (a && b) {
        setDisplayPos([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
      }
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [currentPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition) return;

    // Pan only when ISS is near/over edge (avoid constant jumping).
    const bounds = map.getBounds();
    const padded = bounds.pad(-0.15);
    const inside = padded.contains(currentPosition);
    if (!inside) {
      map.panTo(currentPosition, { animate: true, duration: 0.8 });
    }
  }, [currentPosition]);

  const markerPos = displayPos || currentPosition;

  if (loading && !currentPosition) return <div className="glass-panel rounded-2xl h-full flex items-center justify-center"><Loader text="Locating ISS..." /></div>;
  if (error && !currentPosition) return <div className="glass-panel rounded-2xl h-full flex items-center justify-center text-red-400">Error: {error}</div>;

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2 neon-text-blue">
            <Navigation className="w-6 h-6 text-neon-blue" /> ISS Live Telemetry
          </h2>
          {simulated && (
            <span className="text-[11px] uppercase tracking-widest text-neon-purple/90 bg-neon-purple/10 border border-neon-purple/20 rounded-full px-3 py-1">
              Simulated Live Feed
            </span>
          )}
        </div>
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={refreshData} 
          className="p-2 rounded-lg bg-space-light border border-white/10 hover:border-neon-blue/50 transition-colors text-slate-400 hover:text-neon-blue"
          aria-label="Refresh ISS data"
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(0,243,255,0.15)] relative min-h-[350px] bg-space-light/50"
      >
        {currentPosition && (
          <MapContainer 
            center={currentPosition} 
            zoom={3} 
            scrollWheelZoom={true} 
            className="h-[350px] w-full z-0"
            whenCreated={(map) => { mapRef.current = map; }}
          >
            {/* Dark map tiles matching NASA style */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={markerPos} icon={issDivIcon} zIndexOffset={1000} keyboard={false}>
              <Popup className="custom-popup">
                <div className="text-sm font-mono">
                  <strong className="text-neon-blue">ISS Coordinates</strong><br/>
                  Lat: {markerPos[0].toFixed(4)}<br/>
                  Lon: {markerPos[1].toFixed(4)}
                </div>
              </Popup>
            </Marker>
            {path.length > 1 && (
              <Polyline positions={path} color="#00f3ff" weight={3} dashArray="5, 10" />
            )}
          </MapContainer>
        )}
        
        {/* Glow overlay */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] z-10"></div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <motion.div variants={itemVariants} className="bg-space-light/80 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-neon-blue/30 transition-colors group">
          <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-neon-blue/20 transition-colors">
            <Activity className="w-6 h-6 text-neon-blue" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Orbital Speed</span>
            <span className="text-lg font-bold text-slate-100">
              {typeof speed === 'number' ? speed.toLocaleString() : 'Calculating...'}{' '}
              <span className="text-sm font-normal text-slate-400">km/h</span>
            </span>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-space-light/80 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors group">
          <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
            <MapPin className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex flex-col overflow-hidden w-full">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Currently Over</span>
            <span className="text-lg font-bold text-slate-100 truncate" title={locationName}>{locationName}</span>
            {markerPos && (
              <span className="text-xs font-mono text-slate-400 mt-1">
                Lat {markerPos[0].toFixed(4)} · Lon {markerPos[1].toFixed(4)}
              </span>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-space-light/80 border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-purple-500/30 transition-colors group">
          <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-neon-purple/20 transition-colors">
            <Navigation className="w-6 h-6 text-neon-purple" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Pings Tracked</span>
            <span className="text-lg font-bold text-slate-100">{positionsTracked}</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 pt-6 border-t border-white/10"
      >
        <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Velocity Graph</h3>
        <SpeedChart data={speedHistory} />
      </motion.div>
    </div>
  );
}
