import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev: HMR WebSocket is allowlisted per initial host. Browsing via 127.0.0.1
  // while the dev server defaults to localhost (or the reverse) breaks HMR unless
  // both are listed. See https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
