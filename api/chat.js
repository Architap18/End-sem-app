export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const token = process.env.VITE_AI_TOKEN || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Missing server token' });
    return;
  }

  const { inputs, parameters, options } = req.body || {};
  if (!inputs || typeof inputs !== 'string') {
    res.status(400).json({ error: 'Missing "inputs" string' });
    return;
  }

  try {
    const r = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs, parameters, options }),
    });

    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!r.ok) {
      res.status(r.status).json({ error: json?.error || json?.message || text || 'HF request failed' });
      return;
    }

    res.status(200).json(json ?? { text });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Proxy error' });
  }
}

