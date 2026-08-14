import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // standalone é para Docker; na Vercel o runtime próprio não usa esse output
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
