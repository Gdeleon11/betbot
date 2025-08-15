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
  // Upstash REST LPUSH
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

function parseEntry(x) {
  // Soporta: "{"ts":...}"  o  {element:"{...}"}
  try {
    const val = typeof x === "string" ? x : (x && typeof x.element === "string" ? x.element : null);
    if (!val) return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
}

export async function obtenerTodo() {
  const k = kv();
  if (!k) {
    const mem = globalThis.__mem || { bets: [], results: [] };
    return { apuestas: mem.bets, resultados: mem.results };
  }
  const br = await fetch(`${k.url}/lrange/betbot:bets/0/999`, {
    headers: { Authorization: `Bearer ${k.token}` }
  });
  const rr = await fetch(`${k.url}/lrange/betbot:results/0/999`, {
    headers: { Authorization: `Bearer ${k.token}` }
  });

  const bj = br.ok ? await br.json() : { result: [] };
  const rj = rr.ok ? await rr.json() : { result: [] };

  const apuestas  = (bj.result || []).map(parseEntry).filter(Boolean);
  const resultados = (rj.result || []).map(parseEntry).filter(Boolean);

  return { apuestas, resultados };
}
