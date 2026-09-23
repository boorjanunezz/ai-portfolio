import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La API lee /content en tiempo de ejecución con fs: hay que incluir los
  // Markdown en el bundle de la función serverless de Vercel.
  outputFileTracingIncludes: {
    "/api/chat": ["./content/**/*.md"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
