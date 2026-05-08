import { useState, useEffect, useCallback } from 'react';
import { fetchNews } from '../services/api';

const CACHE_KEY = 'news_cache';
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes

const stableHash = (str) => {
  // djb2
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
};

export function useNewsData() {
  const [data, setData] = useState({
    articles: [],
    loading: true,
    error: null,
    lastFetched: null,
  });

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TIME) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to read cache', e);
    }
    return null;
  };

  const loadNews = useCallback(async (forceRefresh = false) => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        // NewsAPI returns max 100, we only need 10
        const top10 = cached.articles.slice(0, 10).filter(a => a.title && a.url);
        setData({
          articles: top10,
          loading: false,
          error: null,
          lastFetched: cached.timestamp
        });
        return;
      }
    }

    try {
      const result = await fetchNews();
      const rawArticles = result.results || [];
      const mappedArticles = rawArticles.map(a => ({
        id: stableHash(`${a.url || ''}|${a.published_at || ''}|${a.title || ''}`),
        title: a.title,
        url: a.url,
        urlToImage: a.image_url,
        source: { name: a.news_site },
        publishedAt: a.published_at,
        description: a.summary,
        author: ''
      }));
      const validArticles = mappedArticles.filter(a => a.title && a.url).slice(0, 10);
      
      const cacheObj = {
        articles: validArticles,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));

      setData({
        articles: validArticles,
        loading: false,
        error: null,
        lastFetched: cacheObj.timestamp
      });
    } catch (err) {
      setData(prev => ({
        ...prev,
        error: err.message,
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return { ...data, refreshNews: () => loadNews(true) };
}
