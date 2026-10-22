import type { NextConfig } from "next";

// Portal bisa disajikan di akar domain (default, mis. http://localhost:3001)
// atau di sub-path (mis. https://xcloud.mpdev.my.id/member). Sub-path diambil
// dari env supaya build lokal tidak berubah:
//   ROYALE_BASE_PATH=/member npm run build
const basePath = process.env.ROYALE_BASE_PATH?.trim() ?? "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(basePath ? { basePath } : {}),
  // Dipakai `src/lib/base-path.ts` untuk tautan/fetch/aset yang TIDAK otomatis
  // diberi prefix oleh Next (fetch(), <a href>, window.location, <img src>).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
