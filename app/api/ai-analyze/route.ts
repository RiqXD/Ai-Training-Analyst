export async function POST(req: Request) {
  const body = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), { status: 500 });
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Guru Dashboard AI Evaluator",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
