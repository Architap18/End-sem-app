import { motion } from 'framer-motion';

export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 text-slate-400">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-white/10 border-t-neon-blue rounded-full shadow-[0_0_15px_rgba(0,243,255,0.3)]"
      ></motion.div>
      <p className="animate-pulse tracking-widest text-sm uppercase">{text}</p>
    </div>
  );
}
