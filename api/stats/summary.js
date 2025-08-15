import { obtenerTodo } from "../_lib/db.js";

function keyOf(obj){
  const ev = (obj.event || obj.evento || "").toString().trim().toLowerCase();
  const pk = (obj.pick  || obj.seleccion || obj.mercado || "").toString().trim().toLowerCase();
  return `${ev}|${pk}`;
}

export default async function handler(req,res){
  const usingKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  try{
    const { apuestas = [], resultados = [] } = await obtenerTodo();

    // sets para outcomes
    const winsSet = new Set();
    const lossSet = new Set();
    for(const r of resultados){
      const k = keyOf(r);
      if(!k || k === '|') continue;
      if((r.outcome||'').toString().toLowerCase()==='win')  winsSet.add(k);
      if((r.outcome||'').toString().toLowerCase()==='loss') lossSet.add(k);
    }

    let tot=0, wins=0, evSum=0, pnl=0;
    const seenKeys = new Set(); // contar por clave única (evento+pick)
    for(const a of apuestas){
      const k = keyOf(a);
      if(!k || k==='|') continue;
      if(seenKeys.has(k)) continue; // 1 apuesta por clave para el resumen
      seenKeys.add(k);
      tot++;
      if(typeof a.EV === "number") evSum += a.EV;

      if(winsSet.has(k)){
        pnl += (typeof a.cuota === 'number' ? (a.cuota - 1) : 1);
        wins++;
      } else if(lossSet.has(k)){
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
