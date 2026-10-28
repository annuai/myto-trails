import type { RouteDef } from "./http";

const CREATES = new Set(["POST /uploads", "POST /submissions", "POST /trails/{slug}/reports", "POST /checkins", "POST /group-rides", "POST /trails/{slug}/condition-reports", "POST /shared-routes"]);
const NO_CONTENT = new Set([
  "PUT /me/saved/{slug}", "DELETE /me/saved/{slug}", "POST /checkins/{id}/ping", "POST /checkins/{id}/extend", "POST /checkins/{id}/arrive", "POST /group-rides/{id}/regroup",
  "POST /group-rides/{id}/leave", "POST /group-rides/{id}/end", "POST /condition-reports/{id}/confirm", "DELETE /shared-routes/{id}",
]);
const successStatus = (r: RouteDef) => (CREATES.has(`${r.method} ${r.path}`) ? "201" : NO_CONTENT.has(`${r.method} ${r.path}`) ? "204" : "200");
/** Error statuses a route can return (422 carries extra `fields` or `steps`; GPX returns application/gpx+xml on success). */
function errorStatuses(r: RouteDef): number[] {
  const codes = new Set<number>([404, 429]);
  if (r.access !== "public") [401, 403].forEach((c) => codes.add(c));
  if (r.method !== "GET" && r.method !== "DELETE") [400, 413].forEach((c) => codes.add(c));
  if (r.path.startsWith("/submissions") || r.path.endsWith("/reports")) [409, 422].forEach((c) => codes.add(c));
  if (r.path.endsWith("/gpx")) [403, 503].forEach((c) => codes.add(c));
  if (r.path === "/sync" || r.path === "/trails") codes.add(400);
  return [...codes].sort();
}

/** The OpenAPI description is generated from the same route table the server dispatches on, so they cannot drift. */
export function buildOpenApi(routes: RouteDef[]) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const params = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
    (paths[r.path] ??= {})[r.method.toLowerCase()] = {
      summary: r.summary,
      parameters: params,
      ...(r.access === "public" ? {} : { security: [{ deviceToken: r.access === "token" ? [] : [r.access] }] }),
      responses: {
        [successStatus(r)]: { description: "Success" },
        ...Object.fromEntries(errorStatuses(r).map((c) => [String(c), { $ref: "#/components/responses/Error" }])),
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Moto Trails API", version: "1.0.0", description: "Read published trails, manage Saved trails, upload files and submit trails. Additive changes only within v1." },
    servers: [{ url: "/api/v1" }],
    paths,
    components: {
      securitySchemes: { deviceToken: { type: "http", scheme: "bearer", description: "A device token created on the account page. Scopes: saved, write:submission." } },
      responses: { Error: { description: "Error", content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } }, required: ["code", "message"] } } } } } } },
    },
  };
}
