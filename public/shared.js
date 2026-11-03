// Logik dikongsi antara pelayan (Node) dan pelayar.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const WIN_STEPS = 6;        // langkah tali untuk menang terus
  const GAME_SECONDS = 60;    // masa satu pusingan
  const WRONG_LOCK_MS = 800;  // denda jawapan salah

  const LEVELS = {
    tambah: 'Tambah & Tolak',
    darab: 'Sifir Darab',
    bahagi: 'Bahagi',
    campur: 'Campur',
  };

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  function makeQuestion(level) {
    if (level === 'campur') level = ['tambah', 'darab', 'bahagi'][rnd(0, 2)];
    if (level === 'tambah') {
      if (Math.random() < 0.5) {
        const a = rnd(2, 50), b = rnd(2, 49);
        return { text: `${a} + ${b} = ?`, answer: a + b };
      }
      const a = rnd(10, 99), b = rnd(1, a);
      return { text: `${a} − ${b} = ?`, answer: a - b };
    }
    if (level === 'bahagi') {
      const b = rnd(2, 9), ans = rnd(2, 10);
      return { text: `${b * ans} ÷ ${b} = ?`, answer: ans };
    }
    const a = rnd(2, 9), b = rnd(2, 9);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }

  // pos < 0 → tali ke kiri (Pemain 1), pos > 0 → ke kanan (Pemain 2)
  function winnerFromPos(pos) {
    if (pos < 0) return 0;
    if (pos > 0) return 1;
    return -1; // seri
  }

  return { WIN_STEPS, GAME_SECONDS, WRONG_LOCK_MS, LEVELS, makeQuestion, winnerFromPos };
});
