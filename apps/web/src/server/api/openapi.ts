import type { RouteDef } from "./http";

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
        "200": { description: "Success" },
        "400": { $ref: "#/components/responses/Error" },
        "401": { $ref: "#/components/responses/Error" },
        "404": { $ref: "#/components/responses/Error" },
        "429": { $ref: "#/components/responses/Error" },
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
