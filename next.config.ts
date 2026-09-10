import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avoids a native `sharp` dependency until we've confirmed the Hostinger
    // build environment supports it.
    unoptimized: true,
  },
};

export default nextConfig;
