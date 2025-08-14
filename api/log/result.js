import { guardarResultado } from "../_lib/db.js";

async function readJson(req){
  const body = await new Promise((resolve)=>{let d="";req.on("data",c=>d+=c);req.on("end",()=>resolve(d));});
  return JSON.parse(body||"{}");
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Solo POST"});
  try{
    const data = await readJson(req);
    await guardarResultado({ ts:new Date().toISOString(), ...data });
    res.status(200).json({ ok:true });
  }catch(e){
    res.status(400).json({ error:"bad_json", detail:String(e) });
  }
}
