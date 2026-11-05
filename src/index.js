export default {
  async fetch(request, env) {
    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
