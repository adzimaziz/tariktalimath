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
   Boleh juga dibuka terus `public/index.html` tanpa pelayan.
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

## Struktur
- `server.js` — pelayan HTTP + WebSocket (bilik, soalan, skor)
- `public/shared.js` — penjana soalan & tetapan (dikongsi pelayan/pelayar)
- `public/game.js` — UI, mod satu skrin, sambungan online
- `public/style.css`, `public/index.html`
