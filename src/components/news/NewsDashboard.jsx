import { useState, useMemo } from 'react';
import { Newspaper, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNewsData } from '../../hooks/useNewsData';
import NewsCard from './NewsCard';
import NewsChart from '../charts/NewsChart';
import Loader from '../common/Loader';

const CHART_COLORS = ['#00f3ff', '#10b981', '#f59e0b', '#ef4444', '#bc13fe', '#ec4899'];

export default function NewsDashboard() {
  const { articles, loading, error, refreshNews } = useNewsData();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'source'
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredArticles = useMemo(() => {
    let filtered = articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.description && article.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (article.source?.name && article.source.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      } else {
        const sourceA = a.source?.name || '';
        const sourceB = b.source?.name || '';
        return sourceA.localeCompare(sourceB);
      }
    });

    return filtered;
  }, [articles, searchTerm, sortBy]);

  const sourceData = useMemo(() => {
    const counts = {};
    filteredArticles.forEach(a => {
      const source = a.source?.name || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({ name, value: counts[name] }));
  }, [filteredArticles]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage));
  const currentArticles = filteredArticles.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSort = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  if (loading && articles.length === 0) return <div className="glass-panel rounded-2xl h-full flex items-center justify-center"><Loader text="Fetching Space News..." /></div>;

  return (
    <div className="glass-panel rounded-2xl p-6 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 neon-text-purple">
          <Newspaper className="w-6 h-6 text-neon-purple" /> Earth & Space News
        </h2>
        <motion.button 
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={refreshNews} 
          className="p-2 rounded-lg bg-space-light border border-white/10 hover:border-neon-purple/50 transition-colors text-slate-400 hover:text-neon-purple"
          aria-label="Refresh news"
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex items-center bg-space-light/80 border border-white/10 rounded-xl px-4 py-2 focus-within:border-neon-purple/50 focus-within:shadow-[0_0_10px_rgba(188,19,254,0.2)] transition-all">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search transmission logs..." 
            value={searchTerm}
            onChange={handleSearch}
            className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm placeholder-slate-500"
          />
        </div>
        <select 
          value={sortBy} 
          onChange={handleSort} 
          className="bg-space-light/80 border border-white/10 rounded-xl px-4 py-2 text-slate-200 text-sm outline-none cursor-pointer focus:border-neon-purple/50 appearance-none min-w-[140px]"
        >
          <option value="date">Sort by Date</option>
          <option value="source">Sort by Source</option>
        </select>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">Error: {error}</div>}

      <div className="flex flex-col flex-1 gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <AnimatePresence mode="popLayout">
            {currentArticles.length > 0 ? (
              currentArticles.map((article, index) => (
                <NewsCard key={article.id || `${article.url}-${index}`} article={article} />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center p-8 text-slate-400 bg-space-light/50 border border-white/5 rounded-xl"
              >
                No transmissions found matching your criteria.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-2 pt-4 border-t border-white/10">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-2 px-4 py-2 bg-space-light border border-white/10 rounded-lg text-sm text-slate-300 hover:text-neon-purple hover:border-neon-purple/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="text-sm text-slate-400 font-mono">
              Page <span className="text-neon-purple">{page}</span> of {totalPages}
            </span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-space-light border border-white/10 rounded-lg text-sm text-slate-300 hover:text-neon-purple hover:border-neon-purple/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 pt-6 border-t border-white/10 flex flex-col"
      >
        <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Source Distribution</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full max-w-[200px]">
            <NewsChart data={sourceData} />
          </div>
          <div className="flex flex-col gap-2 min-w-[150px]">
            {sourceData.map((d, i) => (
              <div key={d.name} className="flex items-center text-xs">
                <span 
                  className="w-3 h-3 rounded-full mr-3 shadow-[0_0_5px_currentColor]" 
                  style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length], color: CHART_COLORS[i % CHART_COLORS.length] }}
                ></span>
                <span className="text-slate-400 flex-1 truncate max-w-[100px]">{d.name}</span>
                <span className="font-bold text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
