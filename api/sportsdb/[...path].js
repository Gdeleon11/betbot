export default async function handler(req, res) {
  try {
    const urlIn = new URL(req.url, "http://local");
    const prefix = "/api/sportsdb";
    const subpath = urlIn.pathname.startsWith(prefix)
      ? urlIn.pathname.slice(prefix.length)
      : urlIn.pathname;

    const apiKey = process.env.SPORTSDB_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing SPORTSDB_KEY env var" });
    }

    const upstream = `https://www.thesportsdb.com/api/v1/json/${apiKey}${subpath}${urlIn.search || ""}`;
    const r = await fetch(upstream, {
      headers: { "User-Agent": "BetBot/1.0 (+chatgpt-action)" },
      cache: "no-store"
    });

    const contentType = r.headers.get("content-type") || "";
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=300");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (contentType.includes("application/json")) {
      const data = await r.json();
      return res.status(r.status).json(data);
    } else {
      const text = await r.text();
      return res.status(r.status).send(text);
    }
  } catch (err) {
    return res.status(502).json({ error: "Upstream error", detail: String(err) });
  }
}
