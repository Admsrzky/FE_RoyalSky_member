# Royal Sky Member Portal

Portal web member Royal Sky Gym Club. Member masuk dengan email/ID akun dan PIN, lalu melihat kartu digital, QR akses pintu, status membership, sisa sesi PT, saldo wallet, poin loyalty, dan ringkasan aktivitas.

Tampilan kartu merupakan port dari aplikasi Flutter (`FE_RoyaleSky_Flutter`) ke React: kanvas desain tetap 340 × 517, aksen chrome + neon, sisi depan/belakang, dan QR yang dapat diperbesar.

## Menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3001`. Halaman contoh desain tanpa login tersedia di `http://localhost:3001/preview`.

Variabel lingkungan:

| Variabel | Wajib | Default |
| --- | --- | --- |
| `ROYALE_API_BASE_URL` | tidak | `https://api.mpdev.my.id/api/v1` |
| `ROYALE_API_TIMEOUT_MS` | tidak | `15000` |
| `ROYALE_API_TLS_COMPAT` | tidak | `1` |

## Perintah

```bash
npm run dev     # server pengembangan
npm run build   # build produksi + pemeriksaan TypeScript
npm run start   # menjalankan hasil build
```

## Arsitektur

- Next.js App Router + TypeScript, tanpa Tailwind.
- Token API dan data sesi disimpan di cookie `httpOnly` (`rs_member_token`, `rs_member_user`), bukan `localStorage`.
- Browser hanya memanggil route BFF milik aplikasi ini; bearer token tidak pernah dikirim ke klien.
- Login dibatasi untuk akun dengan role `member`. Akun staf ditolak dengan pesan yang sesuai.
- Halaman utama memakai `force-dynamic`; data member selalu diambil ulang dari server.

Route internal:

| Route | Fungsi |
| --- | --- |
| `POST /api/auth/login` | Login PIN, validasi role member, set cookie sesi |
| `POST /api/auth/logout` | Revoke token upstream dan hapus cookie |
| `GET /api/auth/logout` | Logout lalu redirect ke `/` |
| `GET /api/member` | Data kartu member yang sedang login |
| `GET /api/members/[id]` | Detail self-scoped; hanya ID milik sesi sendiri |

Alur data:

1. `src/lib/session.ts` membaca/menulis cookie sesi.
2. `src/lib/member.ts` mengambil `GET /members/{id}`, lalu melengkapi wallet, gate-card, riwayat membership, dan attendance secara paralel dengan `Promise.allSettled`.
3. `buildMemberCard()` menormalkan berbagai bentuk respons API menjadi satu view model siap render.
4. `src/components/MemberPortal.tsx` menampilkan dashboard dan `MemberCard.tsx` menggambar kartu.

### Catatan integrasi

- Jaringan kantor yang melakukan TLS interception dengan CA lama (mis. `POSCO_CA` 1024-bit) ditolak oleh OpenSSL bawaan Node. `ROYALE_API_TLS_COMPAT=1` mengaktifkan fallback yang tetap memverifikasi hostname dan chain memakai CA dari certificate store sistem; set ke `0` bila tidak diperlukan.
- Endpoint gate-card (`GET /members/{id}/gate-card`) dipakai oleh aplikasi Flutter, tetapi belum tercantum di OpenAPI live. Portal memperlakukannya sebagai data opsional: jika gagal, kartu tetap tampil dengan status QR belum tersedia.
- Sebagian akun memiliki ID user autentikasi yang berbeda dari ID member. Jika lookup berdasarkan ID gagal, portal mencoba mencari member berdasarkan email akun.
- Login hanya menerima PIN 4–6 digit. Rate limit upstream tetap berlaku (5 percobaan/menit).

## Struktur penting

```
src/app/                 halaman, layout, route API, stylesheet global
src/components/          login, portal, kartu, modal QR, ikon, brand
src/lib/api.ts           fetch upstream + normalisasi error/envelope
src/lib/member.ts        pengambilan & normalisasi data member
src/lib/session.ts       cookie sesi httpOnly
src/lib/demo.ts          data fiktif untuk /preview dan hero login
```
