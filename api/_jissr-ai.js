// Falaj: the ONE place that talks to an AI provider. To switch provider (for example to Azure OpenAI),
// set JISSR_AI_PROVIDER in the Vercel settings. Nothing else in the project needs to change.
//
//   JISSR_AI_PROVIDER = anthropic | azure-openai | gemini   (if empty: auto-detect from which key is present)
//   anthropic:     ANTHROPIC_API_KEY  (optional JISSR_AI_MODEL)
//   gemini:        GEMINI_API_KEY  (free key from Google AI Studio; optional JISSR_AI_MODEL, default gemini-2.5-flash)
//   azure-openai:  AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT (optional AZURE_OPENAI_API_VERSION)
//
// Keys live only in environment variables, never in the repository.

const env = (k) => (process.env[k] || '').trim();

export function pickFalajProvider() {
  const want = env('JISSR_AI_PROVIDER').toLowerCase();
  if ((!want || want === 'anthropic') && env('ANTHROPIC_API_KEY')) return 'anthropic';
  if ((!want || want === 'azure-openai') && env('AZURE_OPENAI_ENDPOINT') && env('AZURE_OPENAI_API_KEY') && env('AZURE_OPENAI_DEPLOYMENT')) return 'azure-openai';
  if ((!want || want === 'gemini') && env('GEMINI_API_KEY')) return 'gemini';
  return null;
}

async function post(url, headers, body, ms = 12000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error('provider status ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

const providers = {
  async anthropic({ system, user, maxTokens }) {
    const j = await post('https://api.anthropic.com/v1/messages',
      { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
      { model: env('JISSR_AI_MODEL') || 'claude-haiku-5-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
    return (j.content || []).map((b) => b.text || '').join('').trim();
  },
  async gemini({ system, user, maxTokens }) {
    const model = env('JISSR_AI_MODEL') || 'gemini-2.5-flash';
    const j = await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': env('GEMINI_API_KEY') },
      { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { maxOutputTokens: Math.max(maxTokens, 1024), temperature: 0.4 } });
    return (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('').trim();
  },
  async 'azure-openai'({ system, user, maxTokens }) {
    const base = env('AZURE_OPENAI_ENDPOINT').replace(/\/+$/, '');
    const ver = env('AZURE_OPENAI_API_VERSION') || '2024-10-21';
    const j = await post(`${base}/openai/deployments/${encodeURIComponent(env('AZURE_OPENAI_DEPLOYMENT'))}/chat/completions?api-version=${ver}`,
      { 'api-key': env('AZURE_OPENAI_API_KEY') },
      { max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
    return (j.choices?.[0]?.message?.content || '').trim();
  },
};

// complete({system, user, maxTokens}) -> text. Throws if no provider is set up or the call fails.
export async function falajComplete(args) {
  const p = pickFalajProvider();
  if (!p) throw new Error('no provider');
  return { text: await providers[p](args), provider: p };
}
