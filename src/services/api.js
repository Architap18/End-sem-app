import { HfInference } from '@huggingface/inference';

class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const inflight = new Map();

const withDedup = (key, fn) => {
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => fn())().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
};

const fetchJsonWithTimeout = async (url, { timeoutMs = 10000, ...init } = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const contentType = res.headers?.get?.('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
    if (!res.ok) {
      throw new ApiError(
        typeof body === 'string' && body ? body : (body?.error || body?.message || res.statusText || 'Request failed'),
        { status: res.status }
      );
    }
    return body;
  } catch (e) {
    if (e?.name === 'AbortError') throw new ApiError('Request timed out', { code: 'TIMEOUT' });
    throw e;
  } finally {
    clearTimeout(id);
  }
};

// ISS APIs
export const fetchISSLocation = async () => {
  // Using wheretheiss.at because it supports HTTPS and CORS directly
  return withDedup('iss_location', async () => {
    try {
      return await fetchJsonWithTimeout('https://api.wheretheiss.at/v1/satellites/25544', { timeoutMs: 9000 });
    } catch (e) {
      if (e instanceof ApiError) {
        // Preserve HTTP status so callers can backoff on 429.
        throw e;
      }
      throw new ApiError(e?.message || 'Failed to fetch ISS location');
    }
  });
};

// BigDataCloud Free Reverse Geocoding (CORS friendly, no key)
export const fetchLocationName = async (lat, lon) => {
  try {
    const key = `nominatim:${lat.toFixed?.(3) ?? lat}:${lon.toFixed?.(3) ?? lon}`;
    const data = await withDedup(key, () =>
      fetchJsonWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&zoom=10&addressdetails=1`,
        {
          timeoutMs: 12000,
          headers: {
            // Nominatim requires identifying User-Agent/Referer in practice.
            'Accept': 'application/json',
          }
        }
      )
    );

    const addr = data?.address || {};
    const name =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.hamlet ||
      addr.county ||
      addr.state ||
      addr.region ||
      addr.country ||
      data?.display_name ||
      '';

    const cleaned = String(name || '').trim();
    if (!cleaned) return 'Over the Ocean';
    // If Nominatim returns only very broad strings, still show something sane.
    return cleaned.includes('Ocean') ? 'Over the Ocean' : cleaned;
  } catch (err) {
    return 'Over the Ocean';
  }
};

// Spaceflight News API (No key required, CORS friendly, highly relevant)
export const fetchNews = async () => {
  return withDedup('space_news', async () => {
    try {
      return await fetchJsonWithTimeout('https://api.spaceflightnewsapi.net/v4/articles?limit=15', { timeoutMs: 12000 });
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e?.message || 'Failed to fetch space news');
    }
  });
};

// HuggingFace AI Chatbot
export const chatWithMistral = async (messages, systemContext) => {
  const token = import.meta.env.VITE_AI_TOKEN;
  if (!token) {
    throw new ApiError('HuggingFace Token missing in .env', { code: 'NO_TOKEN' });
  }

  try {
    // Prefer the HF Inference REST API with a text-generation style payload.
    // Many public models reject "chatCompletion" formatting and return 400.
    const model = 'mistralai/Mistral-7B-Instruct-v0.2';

    const prompt = [
      `### System\n${systemContext?.trim?.() || ''}`.trim(),
      '',
      ...messages.map(m => `### ${m.isUser ? 'User' : 'Assistant'}\n${String(m.text || '').trim()}`),
      '### Assistant\n'
    ].join('\n');

    // In production, prefer same-origin proxy to avoid browser CORS blocks.
    const endpoint = import.meta.env.PROD
      ? '/api/chat'
      : `https://api-inference.huggingface.co/models/${model}`;

    const data = await withDedup(`hf_chat:${endpoint}:${prompt.length}:${messages.length}`, async () => {
      const headers = { 'Content-Type': 'application/json' };
      if (!import.meta.env.PROD) headers.Authorization = `Bearer ${token}`;

      const res = await fetchJsonWithTimeout(endpoint, {
        timeoutMs: 20000,
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 220,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
          },
          options: {
            wait_for_model: true,
            use_cache: true,
          },
        }),
      });
      return res;
    });

    // HF can return either an array of generations or an object depending on pipeline.
    const text =
      (Array.isArray(data) ? data?.[0]?.generated_text : data?.generated_text) ||
      data?.choices?.[0]?.message?.content ||
      '';

    if (!text.trim()) throw new ApiError('Empty AI response', { code: 'EMPTY_AI' });
    return text.trim();
  } catch (error) {
    console.error('Chat error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to communicate with AI');
  }
};
