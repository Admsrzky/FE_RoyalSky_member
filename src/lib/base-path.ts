/**
 * Prefix sub-path portal.
 *
 * Portal bisa disajikan di akar domain (`http://localhost:3001`) atau di
 * sub-path (`https://xcloud.mpdev.my.id/member`). Next hanya menambahkan
 * `basePath` otomatis untuk `<Link>` dan aset hasil build — **tidak** untuk
 * `fetch()`, `<a href>`, `window.location`, atau `<img src>`. Semuanya wajib
 * lewat helper ini supaya tidak menunjuk ke `/api/...` atau `/preview` di akar
 * domain.
 *
 * Nilainya ditanam saat build lewat `next.config.ts` (`NEXT_PUBLIC_BASE_PATH`).
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/** Ubah path absolut (`/api/member`) menjadi path ber-prefix (`/member/api/member`). */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) {
    return path;
  }

  return `${BASE_PATH}${path}`;
}
