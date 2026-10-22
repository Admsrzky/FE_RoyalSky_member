# Royal Sky Member Portal

Portal web member Royal Sky Gym Club. Mode normal memakai email/ID akun dan PIN. Tersedia juga **mode tanpa PIN sementara** dengan akses terbatas: kartu, membership, poin, dan aktivitas tampil; wallet serta QR akses pintu disembunyikan sampai login PIN kembali tersedia.

Tampilan kartu merupakan port dari aplikasi Flutter (`FE_RoyaleSky_Flutter`) ke React: kanvas desain tetap 340 × 517, aksen chrome + neon, sisi depan/belakang, dan QR yang dapat diperbesar.

Portal mendukung mode terang dan gelap. Tombol tema ada di topbar; pilihan disimpan di `localStorage`, default mengikuti preferensi sistem, dan kartu member tetap memakai kanvas gelap.

## Menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3001`. Halaman contoh desain tanpa login tersedia di `http://localhost:3001/preview`.

### Windows

- Klik dua kali `start-portal.bat` untuk menghentikan server lama di port `3001`, menjalankan server, lalu membuka portal di Chrome.
- Server berjalan di jendela **Royal Sky Dev Server**. Tekan `Ctrl+C` di jendela tersebut untuk menghentikannya.
- Muat ulang halaman di Chrome dengan `Shift+R` bila perlu.

Variabel lingkungan:

| Variabel | Wajib | Default |
| --- | --- | --- |
| `ROYALE_API_BASE_URL` | tidak | `https://api.mpdev.my.id/api/v1` |
| `ROYALE_API_TIMEOUT_MS` | tidak | `15000` |
| `ROYALE_API_TLS_COMPAT` | tidak | `1` |
| `ROYALE_ALLOW_PINLESS_LOGIN` | tidak | `0` |
| `ROYALE_SERVICE_USER_ID` | untuk lookup email/kode saat login PIN dan mode tanpa PIN | — |
| `ROYALE_SERVICE_PIN` | untuk lookup email/kode saat login PIN dan mode tanpa PIN | — |
| `ROYALE_SESSION_SECRET` | production | — (min. 32 karakter) |

## Perintah

```bash
npm run dev     # server pengembangan
npm run build   # build produksi + pemeriksaan TypeScript
npm run start   # menjalankan hasil build
```

## Arsitektur

- Next.js App Router + TypeScript, tanpa Tailwind.
- Token API dan data sesi disimpan di cookie `httpOnly` (`rs_member_token`, `rs_member_user`), bukan `localStorage`.
- Cookie `rs_member_user` ditandatangani HMAC-SHA256 agar sesi tanpa PIN tidak bisa dipalsukan.
- Browser hanya memanggil route BFF milik aplikasi ini; bearer token dan token akun layanan tidak pernah dikirim ke klien.
- Login PIN dibatasi untuk akun dengan role `member`. Akun staf ditolak dengan pesan yang sesuai.
- Upstream live menolak login dengan `identifier`, tetapi menerima `user_id`. Portal memetakan email atau kode member ke `user_id` lewat akun layanan server; ID numerik + PIN tetap bisa dipakai tanpa lookup.
- Mode tanpa PIN hanya menyimpan cookie user yang ditandatangani; token akun layanan tetap di server.
- Halaman utama memakai `force-dynamic`; data member selalu diambil ulang dari server.

Route internal:

| Route | Fungsi |
| --- | --- |
| `POST /api/auth/login` | Login PIN (email/kode/ID), atau lookup pada mode tanpa PIN |
| `POST /api/auth/logout` | Revoke token upstream dan hapus cookie |
| `GET /api/auth/logout` | Logout lalu redirect ke `/` |
| `GET /api/member` | Data kartu member yang sedang login |
| `GET /api/members/[id]` | Detail self-scoped; hanya ID milik sesi sendiri |

Alur data:

1. `src/lib/session.ts` membaca/menulis cookie sesi yang ditandatangani.
2. `src/lib/member.ts` mengambil `GET /members/{id}`, lalu melengkapi wallet, gate-card, riwayat membership, dan attendance secara paralel dengan `Promise.allSettled`.
3. `src/lib/service.ts` memakai akun layanan server untuk memetakan email/kode member ke `user_id` saat login PIN, dan untuk lookup member pada mode tanpa PIN. Pada mode tanpa PIN, wallet dan gate-card tidak pernah diambil.
4. `buildMemberCard()` menormalkan berbagai bentuk respons API menjadi satu view model siap render.
5. `src/components/MemberPortal.tsx` menampilkan dashboard dan `MemberCard.tsx` menggambar kartu.

### Mode tanpa PIN sementara

Mode cadangan bila login PIN tidak tersedia:

```env
ROYALE_ALLOW_PINLESS_LOGIN=1
ROYALE_SERVICE_USER_ID=<id akun layanan>
ROYALE_SERVICE_PIN=<pin akun layanan>
ROYALE_SESSION_SECRET=<string acak minimal 32 karakter>
```

Perilaku:

- Login cukup dengan email, kode member, atau ID member.
- Wallet dan QR akses pintu tidak diminta dari API dan tidak ditampilkan.
- Sesi tidak memiliki token member; server memakai token akun layanan yang di-cache dan diperbarui otomatis.
- Siapa pun yang mengetahui email/ID member dapat membuka data terbatas tersebut. Jangan aktifkan di jaringan publik.
- Set `ROYALE_ALLOW_PINLESS_LOGIN=0` (atau hapus variabel) untuk kembali ke login PIN.

### Catatan integrasi

- Jaringan kantor yang melakukan TLS interception dengan CA lama (mis. `POSCO_CA` 1024-bit) ditolak oleh OpenSSL bawaan Node. `ROYALE_API_TLS_COMPAT=1` mengaktifkan fallback yang tetap memverifikasi hostname dan chain memakai CA dari certificate store sistem; set ke `0` bila tidak diperlukan.
- Endpoint gate-card (`GET /members/{id}/gate-card`) dipakai oleh aplikasi Flutter, tetapi belum tercantum di OpenAPI live. Portal memperlakukannya sebagai data opsional: jika gagal, kartu tetap tampil dengan status QR belum tersedia.
- Sebagian akun memiliki ID user autentikasi yang berbeda dari ID member. Jika lookup berdasarkan ID gagal, portal mencoba mencari member berdasarkan email akun.
- Login PIN hanya menerima 4–6 digit. Rate limit upstream tetap berlaku (5 percobaan/menit).
- Mode tanpa PIN bergantung pada `/members?q=` dan `GET /members/{id}` memakai akun layanan. Pastikan akun tersebut punya izin baca member dan tidak dipakai untuk login browser.
- Backend live menolak `POST /auth/login` dengan `identifier` untuk akun member, tetapi menerima `user_id`. Karena itu portal melakukan lookup email/kode ke `user_id` lewat akun layanan. Tanpa akun layanan, gunakan ID numerik member + PIN.

## Struktur penting

```
src/app/                 halaman, layout, route API, stylesheet global
src/components/          login, portal, kartu, modal QR, ikon, brand
src/lib/api.ts           fetch upstream + normalisasi error/envelope
src/lib/member.ts        pengambilan & normalisasi data member
src/lib/pinless.ts       resolusi email/kode/ID member (login PIN & mode tanpa PIN)
src/lib/service.ts       akun layanan server + cache token
src/lib/session.ts       cookie sesi httpOnly yang ditandatangani
src/lib/demo.ts          data fiktif untuk /preview dan hero login
```
