import { execSync } from "node:child_process";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Kurz-Hash des gebauten Commits; baut der Host ohne .git, helfen die üblichen Umgebungsvariablen, sonst „unbekannt“. */
function buildStand(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "unbekannt";
  } catch {
    const sha = process.env.GITHUB_SHA ?? process.env.SOURCE_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA;
    return sha ? sha.slice(0, 7) : "unbekannt";
  }
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Statische CSP ohne Nonce: Nonces würden alle Seiten (auch die Landingpage)
// dynamisch rendern. 'unsafe-inline' bleibt für Next-Inline-Skripte und
// Chart-/Style-Attribute nötig; alles andere ist auf die eigene Domain und
// Supabase beschränkt. frame-ancestors/object-src/base-uri/form-action sind zu.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl}${isDev ? " ws: wss:" : ""}`.trim(),
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_STAND: buildStand(), NEXT_PUBLIC_BUILD_ZEIT: new Date().toISOString() },
  async redirects() {
    // Die frühere Kundensicht „Kosten“/„Abrechnung“ gibt es nicht mehr — alte Lesezeichen führen zum Dashboard.
    return [
      { source: "/kosten/:path*", destination: "/dashboard", permanent: true },
      { source: "/dokumentation", destination: "/einstellungen/rechtsgrundlagen", permanent: true },
      { source: "/abrechnung/:path*", destination: "/dashboard", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
