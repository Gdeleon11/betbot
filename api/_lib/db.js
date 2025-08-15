function kv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function kvPost(path, body) {
  const k = kv();
  if (!k) throw new Error("KV not configured");
  const r = await fetch(`${k.url}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${k.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(`KV POST ${path} -> HTTP ${r.status}`);
  return r.json();
}

export async function guardarApuesta(apuesta) {
  const k = kv();
  if (!k) {
    globalThis.__mem = globalThis.__mem || { bets: [], results: [] };
    globalThis.__mem.bets.push(apuesta);
    return;
  }
  // Upstash REST: LPUSH con campo "element"
  await kvPost("lpush/betbot:bets", { element: JSON.stringify(apuesta) });
}

export async function guardarResultado(resultado) {
  const k = kv();
  if (!k) {
    globalThis.__mem = globalThis.__mem || { bets: [], results: [] };
    globalThis.__mem.results.push(resultado);
    return;
  }
  await kvPost("lpush/betbot:results", { element: JSON.stringify(resultado) });
}

export async function obtenerTodo() {
  const k = kv();
  if (!k) {
    const mem = globalThis.__mem || { bets: [], results: [] };
    return { apuestas: mem.bets, resultados: mem.results };
  }
  const betsResp = await fetch(`${k.url}/lrange/betbot:bets/0/999`, {
    headers: { Authorization: `Bearer ${k.token}` }
  });
  const resResp = await fetch(`${k.url}/lrange/betbot:results/0/999`, {
    headers: { Authorization: `Bearer ${k.token}` }
  });
  const betsJson = betsResp.ok ? await betsResp.json() : { result: [] };
  const resJson  = resResp.ok ? await resResp.json() : { result: [] };

  const toObj = (arr) => (arr || []).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  return {
    apuestas: toObj(betsJson.result),
    resultados: toObj(resJson.result)
  };
}
