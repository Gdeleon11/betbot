import { obtenerTodo } from "../_lib/db.js";
function keyOf(obj){
  const ev = (obj.event || obj.evento || "").toString().trim().toLowerCase();
  const pk = (obj.pick  || obj.seleccion || obj.mercado || "").toString().trim().toLowerCase();
  return `${ev}|${pk}`;
}
export default async function handler(req,res){
  try{
    const { apuestas, resultados } = await obtenerTodo();
    const bets = (apuestas||[]).slice(0,10);
    const results = (resultados||[]).slice(0,10);
    const pairs = [];
    const map = new Map();
    for(const a of bets){ map.set(keyOf(a), { a, r:null }); }
    for(const r of results){
      const k = keyOf(r);
      const v = map.get(k) || {};
      v.r = r; map.set(k, v);
    }
    for(const [k,v] of map.entries()){ pairs.push({ key:k, hasBet:!!v.a, hasResult:!!v.r }); }
    res.status(200).json({ usingKV: !!(process.env.KV_REST_API_URL&&process.env.KV_REST_API_TOKEN), counts:{bets:bets.length,results:results.length}, pairs, sample:{bets,results} });
  }catch(e){
    res.status(500).json({ error:"dump_failed", detail:String(e) });
  }
}
