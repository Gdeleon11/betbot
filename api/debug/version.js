import { DB_VERSION } from "../_lib/db.js";
export default async function handler(req,res){
  res.status(200).json({ dbVersion: DB_VERSION, commit: process.env.VERCEL_GIT_COMMIT_SHA || null });
}
