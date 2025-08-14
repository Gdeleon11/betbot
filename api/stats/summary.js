import { obtenerTodo } from "../_lib/db.js";

export default async function handler(req,res){
  const { apuestas, resultados } = await obtenerTodo();
  const join = new Map();
  for(const a of apuestas){
    const key = `${a.event||a.evento}|${a.pick||a.seleccion||a.mercado||""}`;
    join.set(key, { a, r:null });
  }
  for(const r of resultados){
    const key = `${r.event||r.evento}|${r.pick||r.seleccion||r.mercado||""}`;
    const v = join.get(key)||{}; v.r=r; join.set(key, v);
  }

  let tot=0, wins=0, evSum=0, pnl=0;
  for(const {a,r} of join.values()){
    if(!a) continue;
    tot++;
    if(typeof a.EV === "number") evSum += a.EV;
    if(r?.outcome==="win"){ pnl += (a.cuota? (a.cuota-1):1); wins++; }
    else if(r?.outcome==="loss"){ pnl -= 1; }
  }
  const winrate = tot? wins/tot : 0;
  const evAvg = tot? evSum/tot : 0;
  res.status(200).json({ totals:{ bets:tot, wins, winrate, evAvg, pnlUnitStake:pnl } });
}
