export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;
  const header = request.headers.get("authorization") || "";
  if (!env.HOUSE_CODE || header !== "Bearer " + env.HOUSE_CODE) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  return new Response(JSON.stringify({ menu: null, recipes: null }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
