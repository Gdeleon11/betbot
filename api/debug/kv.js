export default async function handler(req, res) {
  const hasUrl = !!process.env.KV_REST_API_URL;
  const hasToken = !!process.env.KV_REST_API_TOKEN;
  res.status(200).json({ usingKV: hasUrl && hasToken, hasUrl, hasToken });
}
