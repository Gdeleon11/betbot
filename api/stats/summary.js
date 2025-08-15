import { obtenerTodo } from "../_lib/db.js";

function keyOf(obj){
  const ev = (obj.event || obj.evento || "").toString().trim().toLowerCase();
  const pk = (obj.pick  || obj.seleccion || obj.mercado || "").toString().trim().toLowerCase();
  return `${ev}|${pk}`;
}

export default async function handler(req,res){
  const usingKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  try{
    const { apuestas, resultados } = await obtenerTodo();
    const join = new Map();
    for(const a of apuestas){
      const k = keyOf(a);
      if(!k) continue;
      join.set(k, { a, r: null });
    }
    for(const r of resultados){
      const k = keyOf(r);
      if(!k) continue;
      const v = join.get(k) || {};
      v.r = r;
      join.set(k, v);
    }

    let tot=0, wins=0, evSum=0, pnl=0;
    for(const {a,r} of join.values()){
      if(!a) continue;
      tot++;
      if(typeof a.EV === "number") evSum += a.EV;
      if(r?.outcome === "win"){
        pnl += (a.cuota ? (a.cuota - 1) : 1);
        wins++;
      } else if(r?.outcome === "loss"){
        pnl -= 1;
      }
    }
    const winrate = tot ? wins/tot : 0;
    const evAvg = tot ? evSum/tot : 0;

    res.status(200).json({
      usingKV,
      totals:{ bets:tot, wins, winrate, evAvg, pnlUnitStake:pnl }
    });
  }catch(e){
    res.status(500).json({ usingKV, error:"summary_failed", detail:String(e) });
  }
}
