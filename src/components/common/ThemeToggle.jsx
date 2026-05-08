import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button 
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-space-light border border-white/10 hover:border-neon-blue/50 transition-colors shadow-lg" 
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
      ) : (
        <Moon className="w-5 h-5 text-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
      )}
    </motion.button>
  );
}
