# Tarik Tali Matematik 🪢

Permainan tarik tali matematik untuk 2 pemain. Setiap pemain dapat soalan sendiri —
jawab betul untuk menarik tali ke pihak anda. Sesuai untuk smartboard di kelas.

## Cara main
- Setiap jawapan betul menarik tali **1 langkah** ke pihak anda.
- Jawapan salah → papan kekunci dikunci seketika (0.8 saat).
- Menang terus jika tali sampai **6 langkah** ke pihak anda, atau pihak yang tali condong ke arahnya bila masa **60 saat** tamat.
- Jenis soalan: Tambah & Tolak, Sifir Darab, Bahagi, atau Campur.

## Mod
1. **Satu Skrin** — 2 pemain berkongsi satu skrin (smartboard / tablet). Sokong sentuhan serentak.
   Di **phone (potret)**: letak phone di atas meja antara 2 pemain — Pemain 1 di atas (papan kekunci
   terbalik menghadap dia), Pemain 2 di bawah. Phone melintang pun boleh (kiri vs kanan).
   Tak perlu pelayan — boleh buka terus `public/index.html` atau melalui GitHub Pages.
2. **Online** — seorang cipta bilik, dapat kod 4 digit; seorang lagi masukkan kod dari peranti lain.
   Pelayan yang menjana soalan dan menyemak jawapan (adil, tidak boleh menipu dari pelayar).

## Jalankan
```bash
npm install
npm start
# buka http://localhost:3000
```
Untuk main online antara peranti, deploy ke mana-mana hos Node.js yang menyokong WebSocket
(contoh: Render, Railway, Fly.io). Pelayan guna `PORT` dari persekitaran.

Pautan terus ke bilik: `http://host/?bilik=1234`

## Main offline (1 fail HTML)
Muat turun **`tarik-tali-matematik.html`** ke phone/komputer dan buka dengan pelayar (Chrome/Safari).
Tak perlu internet atau pelayan. Jana semula selepas ubah kod: `node build-offline.js`.

## Main di phone (GitHub Pages)
1. Merge branch ini ke `main`.
2. Di GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` akan deploy folder `public/`.
4. Buka `https://adzimaziz.github.io/tariktalimath/` di phone → **Satu Skrin**.
   (Mod Online tidak berfungsi di GitHub Pages kerana perlukan pelayan Node.js.)

## Struktur
- `server.js` — pelayan HTTP + WebSocket (bilik, soalan, skor)
- `public/shared.js` — penjana soalan & tetapan (dikongsi pelayan/pelayar)
- `public/game.js` — UI, mod satu skrin, sambungan online
- `public/style.css`, `public/index.html`
