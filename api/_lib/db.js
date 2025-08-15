// api/_lib/db.js
export async function logBet(bet) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const res = await fetch(`${url}/lpush/betbot:bets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(bet) }),
  });

  return res.ok;
}

export async function logResult(result) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const res = await fetch(`${url}/lpush/betbot:results`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(result) }),
  });

  return res.ok;
}

export async function getSummary() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  const betsRes = await fetch(`${url}/lrange/betbot:bets/0/999`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resultsRes = await fetch(`${url}/lrange/betbot:results/0/999`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const bets = (await betsRes.json()).result?.map((b) => JSON.parse(b)) || [];
  const results = (await resultsRes.json()).result?.map((r) => JSON.parse(r)) || [];

  const wins = results.filter((r) => r.outcome === "win").length;
  const pnl = results.reduce((acc, r) => {
    if (r.outcome === "win") return acc + (r.payout - 1);
    if (r.outcome === "loss") return acc - 1;
    return acc;
  }, 0);

  return {
    totals: {
      bets: bets.length,
      wins,
      winrate: bets.length ? wins / bets.length : 0,
      evAvg: bets.length ? bets.reduce((a, b) => a + (b.EV || 0), 0) / bets.length : 0,
      pnlUnitStake: pnl,
    },
  };
}

