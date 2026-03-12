export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Email ingest endpoint running"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function POST(req: Request) {
  const body = await req.text();

  console.log("Incoming email payload:", body);

  return new Response(
    JSON.stringify({
      status: "success",
      message: "Email webhook received"
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}
