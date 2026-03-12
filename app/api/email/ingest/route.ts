/**
 * /api/email/ingest
 * Receives POST requests from an email parser or webhook.
 * Confirms the route is working; will later be extended to parse emails and create tickets.
 */

export async function POST(req: Request) {
  try {
    const body = await req.text();
    console.log("Incoming email payload:");
    console.log(body);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Email ingestion endpoint is active"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Email ingest error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to process email payload"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      message: "Email ingest endpoint running"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
