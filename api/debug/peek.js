import { obtenerTodo } from "../_lib/db.js";
export default async function handler(req,res){
  const { apuestas, resultados } = await obtenerTodo();
  res.status(200).json({
    bets: apuestas.slice(0,5),
    results: resultados.slice(0,5)
  });
}
