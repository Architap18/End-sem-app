import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';

export default function SpeedChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[200px] mt-4 rounded-xl bg-space-light/40 border border-white/10 flex items-center justify-center">
        <span className="text-xs uppercase tracking-widest text-slate-400">Awaiting velocity samples…</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ width: '100%', height: 220, marginTop: '1rem' }}
      className="rounded-xl bg-space-light/40 border border-white/10 p-2 shadow-[0_0_25px_rgba(0,243,255,0.08)]"
    >
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--text-secondary)" 
            fontSize={12} 
            tickMargin={10} 
            minTickGap={20}
          />
          <YAxis 
            domain={([min, max]) => {
              if (typeof min !== 'number' || typeof max !== 'number') return ['auto', 'auto'];
              // Tighten the view so real variance is visible (ISS is ~27.5k–28.2k).
              const pad = Math.max(80, (max - min) * 0.4);
              return [Math.floor(min - pad), Math.ceil(max + pad)];
            }}
            stroke="var(--text-secondary)" 
            fontSize={12} 
            width={40}
            tickFormatter={(v) => `${Math.round(v).toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              boxShadow: '0 0 18px rgba(188, 19, 254, 0.14)',
            }}
            itemStyle={{ color: 'var(--accent-color)' }}
            formatter={(value) => [`${Number(value).toLocaleString()} km/h`, 'Velocity']}
          />
          <Line 
            type="monotone" 
            dataKey="speed" 
            stroke="var(--accent-color)" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 6 }} 
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
