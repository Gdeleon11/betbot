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

    // Parsear por si aún vienen como {element:"..."}
    const bets = (apuestas  || []).map(parseEntry).filter(Boolean);
    const results = (resultados || []).map(parseEntry).filter(Boolean);

    const winsSet = new Set();
    const lossSet = new Set();
    for(const r of results){
      const k = keyOf(r);
      if(!k || k==='|') continue;
      const oc = (r.outcome||'').toString().toLowerCase();
      if(oc === 'win')  winsSet.add(k);
      if(oc === 'loss') lossSet.add(k);
    }

    let tot=0, wins=0, evSum=0, pnl=0;
    const seen = new Set();
    for(const a of bets){
      const k = keyOf(a);
      if(!k || k==='|') continue;
      if(seen.has(k)) continue;
      seen.add(k);
      tot++;
      if(typeof a.EV === 'number') evSum += a.EV;

      if(winsSet.has(k)){
        pnl += (typeof a.cuota === 'number' ? (a.cuota - 1) : 1);
        wins++;
      } else if(lossSet.has(k)){
        pnl -= 1;
      }
    }

    res.status(200).json({
      usingKV,
      totals:{
        bets: tot,
        wins,
        winrate: tot ? wins/tot : 0,
        evAvg:  tot ? evSum/tot : 0,
        pnlUnitStake: pnl
      }
    });
  }catch(e){
    res.status(500).json({ usingKV, error:"summary_failed", detail:String(e) });
  }
}
