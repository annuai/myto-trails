/** Browser origins allowed to call our API: API_CORS_ORIGINS (comma separated), plus the app's local web build outside production. */
export function corsOrigins(env: { API_CORS_ORIGINS?: string; NODE_ENV?: string } = process.env): string[] {
  const configured = (env.API_CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return env.NODE_ENV === "production" ? configured : [...configured, "http://localhost:8081"];
}
