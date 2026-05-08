import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewsCard({ article }) {
  const { title, source, author, publishedAt, urlToImage, description, url } = article;
  
  const date = new Date(publishedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className="flex flex-col bg-space-light/50 border border-white/5 rounded-xl overflow-hidden hover:border-neon-purple/50 hover:shadow-[0_0_15px_rgba(188,19,254,0.15)] transition-all duration-300 group"
    >
      {urlToImage && (
        <div className="w-full h-40 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-space-light to-transparent z-10 pointer-events-none"></div>
          <img 
            src={urlToImage} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
            loading="lazy" 
          />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3 relative z-20">
        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="text-neon-purple">{source?.name || 'Unknown Source'}</span>
          <span>{date}</span>
        </div>
        
        <h3 className="text-base font-bold text-slate-100 leading-snug line-clamp-2 group-hover:text-neon-blue transition-colors">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed flex-1">
            {description}
          </p>
        )}
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
          <span className="text-xs text-slate-500 truncate max-w-[60%]">
            {author ? `By ${author}` : ''}
          </span>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 bg-white/5 hover:bg-neon-purple text-slate-200 hover:text-white rounded-lg transition-colors"
          >
            Read <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
