import { obtenerTodo } from "../_lib/db.js";
function parseEntry(x){
  try{
    const s = typeof x === "string"
      ? x
      : (x && typeof x.element === "string" ? x.element : JSON.stringify(x));
    const o = JSON.parse(s);
    return o && typeof o === "object" ? o : null;
  }catch{ return null; }
}
function keyOf(obj){
  const ev = (obj.event || obj.evento || "").toString().trim().toLowerCase();
  const pk = (obj.pick  || obj.seleccion || obj.mercado || "").toString().trim().toLowerCase();
  return `${ev}|${pk}`;
}
export default async function handler(req,res){
  const usingKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  try{
    const { apuestas = [], resultados = [] } = await obtenerTodo();
    const bets = (apuestas||[]).map(parseEntry).filter(Boolean);
    const results = (resultados||[]).map(parseEntry).filter(Boolean);

    const pairs = [];
    const map = new Map();
    for(const a of bets){ map.set(keyOf(a), { a, r:null }); }
    for(const r of results){
      const k = keyOf(r);
      const v = map.get(k) || {};
      v.r = r; map.set(k, v);
    }
    for(const [k,v] of map.entries()){
      pairs.push({ key:k, hasBet:!!v.a, hasResult:!!v.r });
    }

    res.status(200).json({
      usingKV,
      counts:{ bets:bets.length, results:results.length },
      pairs,
      sample:{ bets: bets.slice(0,5), results: results.slice(0,5) }
    });
  }catch(e){
    res.status(500).json({ usingKV, error:"dump_failed", detail:String(e) });
  }
}
