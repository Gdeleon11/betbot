const PROXY = process.env.SPORTSDB_PROXY_BASE || "https://betbot-six.vercel.app/api/sportsdb";

function fact(n){let f=1;for(let i=2;i<=n;i++)f*=i;return f;}
function pmf(k,lambda){if(lambda<=0)return k===0?1:0;return Math.exp(-lambda)*Math.pow(lambda,k)/fact(k);}
function probMatrix(lh,la,max=6){const m=[];for(let h=0;h<=max;h++){m[h]=[];const ph=pmf(h,lh);for(let a=0;a<=max;a++){m[h][a]=ph*pmf(a,la);}}return m;}
function summary(m){let pH=0,pD=0,pA=0;for(let h=0;h<m.length;h++){for(let a=0;a<m[h].length;a++){const p=m[h][a];if(h>a)pH+=p;else if(h===a)pD+=p;else pA+=p;}}return{pHome:pH,pDraw:pD,pAway:pA};}

async function fetchJSON(url){const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}

function parseResults(obj){const arr=(obj?.results||obj?.events||[]).slice(0,20);const out=[];for(const e of arr){const H=e.intHomeScore??e.intHomeGoals??e.intHomeScoreFT;const A=e.intAwayScore??e.intAwayGoals??e.intAwayScoreFT; if(H==null||A==null)continue;out.push({home:e.strHomeTeam,away:e.strAwayTeam,H:+H,A:+A});}return out;}

function recentStats(teamName, rows, n=10){
  let gf=0,ga=0,played=0,wins=0;
  for(const r of rows){
    const isHome=(r.home||"").toLowerCase()===teamName.toLowerCase();
    const gFor=isHome?r.H:r.A, gAg=isHome?r.A:r.H;
    gf+=gFor; ga+=gAg; played++; if(gFor>gAg)wins++; if(played>=n)break;
  }
  played=played||1;
  return { gfAvg: gf/played, gaAvg: ga/played, wins, played };
}

export default async function handler(req,res){
  try{
    const url=new URL(req.url,"http://x");
    const home=url.searchParams.get("home");
    const away=url.searchParams.get("away");
    const oddsHome=parseFloat(url.searchParams.get("oddsHome")||"0");
    const oddsDraw=parseFloat(url.searchParams.get("oddsDraw")||"0");
    const oddsAway=parseFloat(url.searchParams.get("oddsAway")||"0");
    const n=parseInt(url.searchParams.get("n")||"10",10);
    if(!home||!away){return res.status(400).json({error:"Falta home y/o away"});}

    // Buscar equipos e historial
    const [homeTeams, awayTeams] = await Promise.all([
      fetchJSON(`${PROXY}/searchteams.php?t=${encodeURIComponent(home)}`),
      fetchJSON(`${PROXY}/searchteams.php?t=${encodeURIComponent(away)}`)
    ]);
    const idHome=homeTeams?.teams?.[0]?.idTeam;
    const idAway=awayTeams?.teams?.[0]?.idTeam;
    if(!idHome||!idAway){return res.status(404).json({error:"Equipo no encontrado"});}

    const [homeLast, awayLast] = await Promise.all([
      fetchJSON(`${PROXY}/eventslast.php?id=${idHome}`),
      fetchJSON(`${PROXY}/eventslast.php?id=${idAway}`)
    ]);

    const rowsH=parseResults(homeLast), rowsA=parseResults(awayLast);
    const formH=recentStats(homeTeams.teams[0].strTeam, rowsH, n);
    const formA=recentStats(awayTeams.teams[0].strTeam, rowsA, n);

    // Poisson simplificado con ajuste de localía
    const adjHome=1.10, adjAway=0.95;
    const lambdaHome=Math.max(0.1, formH.gfAvg* (formA.gaAvg||1)*adjHome);
    const lambdaAway=Math.max(0.1, formA.gfAvg* (formH.gaAvg||1)*adjAway);

    const mat=probMatrix(lambdaHome, lambdaAway, 6);
    const {pHome,pDraw,pAway}=summary(mat);

    const probModel={home:pHome, draw:pDraw, away:pAway};
    const probImp={
      home: oddsHome?1/oddsHome:null,
      draw: oddsDraw?1/oddsDraw:null,
      away: oddsAway?1/oddsAway:null
    };
    const EV=(p,o)=>(!p||!o)?null:(p*(o-1))-(1-p);
    const ev={
      home: EV(probModel.home,oddsHome),
      draw: EV(probModel.draw,oddsDraw),
      away: EV(probModel.away,oddsAway)
    };

    res.setHeader("Cache-Control","s-maxage=30, stale-while-revalidate=300");
    return res.status(200).json({
      inputs:{home,away,n,oddsHome,oddsDraw,oddsAway},
      features:{formH,formA,lambdaHome,lambdaAway},
      probModel, probImp, EV:ev
    });
  }catch(e){
    return res.status(502).json({error:"analyze_soccer_failed",detail:String(e)});
  }
}
