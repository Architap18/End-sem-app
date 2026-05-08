import { useState, useEffect, useRef } from 'react';
import { chatWithMistral } from '../services/api';

const CHAT_HISTORY_KEY = 'iss_chatbot_history';

const uid = () => `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const safeParse = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const readDashboardContext = () => {
  // Prefer new ISS cache key, fall back to old one if present.
  const issCache =
    safeParse(sessionStorage.getItem('iss_cache_v2')) ||
    safeParse(localStorage.getItem('iss_cache_v2')) ||
    safeParse(localStorage.getItem('iss_cache'));

  const iss = issCache?.snapshot || issCache || {};
  const pos = iss?.currentPosition;

  const newsCache = safeParse(localStorage.getItem('news_cache'));
  const headlines = newsCache?.articles?.slice?.(0, 5)?.map?.(a => a.title)?.filter(Boolean) || [];

  return {
    issLocation: iss?.locationName || 'Unknown',
    issSpeed: iss?.speed || 0,
    issLat: Array.isArray(pos) ? pos[0] : null,
    issLon: Array.isArray(pos) ? pos[1] : null,
    headlines,
  };
};

const localAssistantReply = (userText) => {
  const q = String(userText || '').trim();
  const lower = q.toLowerCase();
  const ctx = readDashboardContext();

  const hasCoords = typeof ctx.issLat === 'number' && typeof ctx.issLon === 'number';
  const coordLine = hasCoords
    ? `Lat ${ctx.issLat.toFixed(4)}, Lon ${ctx.issLon.toFixed(4)}`
    : 'Coordinates unavailable (cached telemetry missing).';

  if (/(speed|velocity|fast|km\/h|kmh)/i.test(lower)) {
    return `Current ISS velocity is about ${Number(ctx.issSpeed || 0).toLocaleString()} km/h (from dashboard telemetry).`;
  }

  if (/(where|location|over|coordinates|coord|lat|lon)/i.test(lower)) {
    return `ISS is currently over: ${ctx.issLocation}.\n${coordLine}`;
  }

  if (/(news|headline|headlines|latest|article)/i.test(lower)) {
    if (ctx.headlines.length === 0) return `No cached headlines available right now. Try refreshing the news panel.`;
    return `Top space news headlines right now:\n${ctx.headlines.slice(0, 3).map(t => `- ${t}`).join('\n')}`;
  }

  // Default: short, dashboard-scoped guidance
  return [
    `I’m in offline mode, but I can still answer using the dashboard state.`,
    `- ISS speed: ${Number(ctx.issSpeed || 0).toLocaleString()} km/h`,
    `- ISS location: ${ctx.issLocation}`,
    ctx.headlines.length ? `- Top headline: ${ctx.headlines[0]}` : `- News: not cached`,
    `Ask me about “speed”, “coordinates”, or “headlines”.`,
  ].join('\n');
};

export function useChatbot() {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const lastSendAtRef = useRef(0);
  const lastFailAtRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    } else {
      setMessages([{
        id: 'msg-0',
        text: "Hello! I'm your ISS & Space News Assistant. I can answer questions about the current ISS location, speed, or latest space news. What would you like to know?",
        isUser: false,
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Save history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const toggleChat = () => setIsOpen(!isOpen);
  
  const clearHistory = () => {
    const initialMsg = {
      id: 'msg-0',
      text: "Chat history cleared. How can I help you with the dashboard data?",
      isUser: false,
      timestamp: Date.now()
    };
    setMessages([initialMsg]);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify([initialMsg]));
  };

  const sendMessage = async (text) => {
    const cleaned = String(text || '').trim();
    if (!cleaned) return;
    if (isTyping) return;

    const now = Date.now();
    if (now - lastSendAtRef.current < 700) return; // hard throttle
    lastSendAtRef.current = now;

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      const userMsg = { id: uid(), text: cleaned, isUser: true, timestamp: Date.now() };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      const ctx = readDashboardContext();
      const topNews = ctx.headlines.length ? ctx.headlines.slice(0, 3).map(t => `- ${t}`).join('\n') : 'No news available';
      const coords = (typeof ctx.issLat === 'number' && typeof ctx.issLon === 'number')
        ? `Lat ${ctx.issLat.toFixed(4)}, Lon ${ctx.issLon.toFixed(4)}`
        : 'Unknown';

      const systemContext = `
You are a helpful AI assistant embedded in an ISS & Space News Dashboard.
Answer using ONLY the provided dashboard data. If data is missing, say so and suggest refreshing panels.

CURRENT DASHBOARD DATA:
- ISS Location: ${ctx.issLocation}
- ISS Coordinates: ${coords}
- ISS Speed: ${ctx.issSpeed} km/h
- Top Space News Headlines:
${topNews}

RULES:
1. Keep answers concise and directly related to the user's question.
2. If unrelated to ISS/space/news, politely redirect to dashboard data.
3. Plain text only.
      `.trim();

      try {
        // If we just failed very recently, skip external calls and reply locally.
        if (Date.now() - lastFailAtRef.current < 5000) {
          const replyText = localAssistantReply(cleaned);
          const botMsg = { id: uid(), text: replyText, isUser: false, timestamp: Date.now() };
          setMessages(prev => [...prev, botMsg]);
          return;
        }

        // Send the last 6 messages to keep context window small and relevant
        const recentMessages = messages.slice(-6);
        const replyText = await chatWithMistral([...recentMessages, userMsg], systemContext);

        const botMsg = { id: uid(), text: replyText, isUser: false, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        lastFailAtRef.current = Date.now();
        const fallbackText = localAssistantReply(cleaned);
        const botMsg = { id: uid(), text: fallbackText, isUser: false, timestamp: Date.now() };
        setMessages(prev => [...prev, botMsg]);
      } finally {
        setIsTyping(false);
      }
    }, 250);
  };

  return {
    messages,
    isOpen,
    isTyping,
    messagesEndRef,
    toggleChat,
    sendMessage,
    clearHistory
  };
}
