export async function GET() {
  const response = await fetch("http://localhost:8000/echo/scenario", {
    cache: "no-store",
  });
  const data = await response.json();
  return Response.json(data);
}
