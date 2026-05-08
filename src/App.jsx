import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './hooks/useTheme';
import { motion } from 'framer-motion';
import ISSDashboard from './components/iss/ISSDashboard';
import NewsDashboard from './components/news/NewsDashboard';
import ThemeToggle from './components/common/ThemeToggle';
import Chatbot from './components/chatbot/Chatbot';
import './index.css';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col font-sans relative overflow-hidden bg-space-dark text-slate-200">
        
        {/* Futuristic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-neon-blue/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl"></div>
        </div>

        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="sticky top-0 z-50 px-6 py-4 mb-8 glass-panel border-t-0 rounded-b-2xl shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <span className="bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
                ISS & Earth News Live
              </span>
            </h1>
            <ThemeToggle />
          </div>
        </motion.header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 pb-8">
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="h-full">
              <ISSDashboard />
            </div>
            <div className="h-full">
              <NewsDashboard />
            </div>
          </motion.section>
        </main>

        <Chatbot />
        <Toaster position="bottom-left" toastOptions={{
          style: {
            background: 'var(--color-space-light)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
      </div>
    </ThemeProvider>
  );
}

export default App;
