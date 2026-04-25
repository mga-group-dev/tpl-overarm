import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "taxsahihai.com",
        port: "",
        pathname: "/main_logo.png",
      },
    ],
  },
};

export default nextConfig;
