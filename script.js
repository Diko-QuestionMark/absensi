/* ===== Pengaturan (mudah diganti) ===== */
const NAMA_SEKOLAH = 'SMA Contoh Negeri 1';
const JAM_MASUK = '07:15:00'; // scan setelah jam ini berstatus "Terlambat"

/* ===== Penyimpanan (localStorage, hanya untuk prototipe) ===== */
const KEY = { s: 'absensi_siswa', r: 'absensi_catatan' };
const $ = s => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function seed() {
  const depan = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kiki', 'Lina', 'Maya', 'Nanda', 'Oki', 'Putri', 'Rian', 'Sari', 'Tono', 'Ulfa'];
  const belakang = ['Pratama', 'Wijaya', 'Lestari', 'Saputra', 'Hidayat', 'Kurnia', 'Permata', 'Santoso'];
  const kelas = ['X-1', 'X-2', 'X-3', 'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XII-1', 'XII-2', 'XII-3'];
  const out = [];
  kelas.forEach((k, ci) => { for (let j = 0; j < 6; j++) {
    const i = ci * 6 + j;
    out.push({ nis: '2026' + String(i + 1).padStart(3, '0'), nama: depan[i % 20] + ' ' + belakang[(i * 7 + ci) % 8], kelas: k });
  } });
  return out;
}

let students = load(KEY.s, null);
if (!students || !students.length) { students = seed(); save(KEY.s, students); }
let records = load(KEY.r, []);
let route = 'scan';

/* ===== Util tanggal & jam ===== */
const p2 = n => String(n).padStart(2, '0');
const tglStr = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const jamStr = d => p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
const today = () => tglStr(new Date());
const tglId = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
const kelasSort = (a, b) => a.localeCompare(b, 'id', { numeric: true });

function tick() {
  const n = new Date();
  $('#clk').textContent = jamStr(n);
  $('#dt').textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }

/* ===== Halaman scan ===== */
let audioCtx;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = ok ? 880 : 200; o.type = ok ? 'sine' : 'square'; g.gain.value = .08;
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + (ok ? .12 : .35));
  } catch (e) {}
}

let idleTimer;
function showResult(kind, icon, title, name, meta) {
  const r = $('#res');
  r.className = 'result ' + kind;
  $('#rIcon').textContent = icon; $('#rTitle').textContent = title;
  $('#rName').textContent = name; $('#rMeta').textContent = meta;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => showResult('idle', '⌁', 'Siap memindai', '', 'Hasil pemindaian akan tampil di sini.'), 6000);
}

function doScan(raw) {
  const code = raw.trim();
  if (!code) return;
  const now = new Date(), tgl = tglStr(now), jam = jamStr(now);
  const s = students.find(x => x.nis === code);
  if (!s) {
    beep(false);
    showResult('err', '✕', 'Kartu tidak dikenali', code, 'Barcode tidak terdaftar. Hubungi petugas untuk memeriksa data siswa.');
  } else {
    const prev = records.find(r => r.nis === code && r.tgl === tgl);
    if (prev) {
      beep(false);
      showResult('dup', '!', 'Sudah absen hari ini', s.nama, 'Kelas ' + s.kelas + ' · tercatat pukul ' + prev.jam);
    } else {
      const status = jam > JAM_MASUK ? 'Terlambat' : 'Hadir';
      records.push({ nis: s.nis, nama: s.nama, kelas: s.kelas, tgl, jam, status });
      save(KEY.r, records);
      beep(true);
      showResult(status === 'Hadir' ? 'ok' : 'late', '✓', 'Absensi berhasil', s.nama, 'Kelas ' + s.kelas + ' · pukul ' + jam + ' · ' + status);
    }
  }
  renderScan();
}

function renderScan() {
  const t = today();
  const todayRec = records.filter(r => r.tgl === t);
  $('#cnt').textContent = new Set(todayRec.map(r => r.nis)).size;
  const last = todayRec.slice(-5).reverse();
  $('#recent').innerHTML = last.length
    ? last.map(r => `<li><span><b>${esc(r.nama)}</b> <span class="e">${esc(r.kelas)}</span></span><span>${r.jam} · ${r.status}</span></li>`).join('')
    : '<li class="e">Belum ada siswa yang scan hari ini.</li>';
}

$('#bc').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value; e.target.value = ''; doScan(v); }
});
// Fokus selalu kembali ke input saat di halaman scan
$('#bc').addEventListener('blur', () => { if (route === 'scan' && !$('#dlg').open) setTimeout(() => $('#bc').focus(), 60); });
$('#sim').addEventListener('click', () => {
  // Meniru scanner USB: mengetik NIS lalu menekan Enter
  const t = today(), done = new Set(records.filter(r => r.tgl === t).map(r => r.nis));
  const pool = students.filter(s => !done.has(s.nis));
  const pick = (pool.length ? pool : students)[Math.floor(Math.random() * (pool.length || students.length))];
  const inp = $('#bc'); inp.value = pick.nis;
  setTimeout(() => inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), 250);
  inp.focus();
});

/* ===== Dashboard ===== */
function fillKelas(sel, withAll) {
  const list = [...new Set(students.map(s => s.kelas))].sort(kelasSort);
  const cur = sel.value;
  sel.innerHTML = (withAll ? '<option value="">Semua kelas</option>' : '') + list.map(k => `<option>${esc(k)}</option>`).join('');
  if (list.includes(cur) || cur === '') sel.value = cur;
}

function renderDash() {
  fillKelas($('#fKelas'), true);
  const tgl = $('#fTgl').value, tAktif = tgl || today();
  const kelas = $('#fKelas').value, q = $('#fQ').value.trim().toLowerCase();
  const inK = s => !kelas || s.kelas === kelas;
  const hadirSet = new Set(records.filter(r => r.tgl === tAktif).map(r => r.nis));
  const total = students.filter(inK).length;
  const hadir = students.filter(s => inK(s) && hadirSet.has(s.nis)).length;
  $('#sTotal').textContent = total; $('#sHadir').textContent = hadir; $('#sBelum').textContent = total - hadir;
  const pct = total ? Math.round(hadir / total * 100) : 0;
  $('#sPct').textContent = pct + '%'; $('#sBar').style.width = pct + '%';
  const rows = records.filter(r => (!tgl || r.tgl === tgl) && (!kelas || r.kelas === kelas) &&
    (!q || r.nama.toLowerCase().includes(q) || r.nis.toLowerCase().includes(q)))
    .sort((a, b) => (b.tgl + b.jam).localeCompare(a.tgl + a.jam));
  $('#tbRiwayat').innerHTML = rows.length
    ? rows.map(r => `<tr><td>${tglId(r.tgl)}</td><td>${r.jam}</td><td>${esc(r.nis)}</td><td>${esc(r.nama)}</td><td>${esc(r.kelas)}</td><td><span class="tag ${r.status === 'Hadir' ? 'h' : 't'}">${r.status}</span></td></tr>`).join('')
    : '<tr><td class="empty" colspan="6">Tidak ada catatan absensi untuk filter ini.</td></tr>';
}
['#fQ', '#fKelas', '#fTgl'].forEach(id => $(id).addEventListener('input', renderDash));
$('#fAll').addEventListener('click', () => { $('#fTgl').value = ''; renderDash(); });

/* ===== Manajemen siswa ===== */
let editNis = null;
function renderSiswa() {
  const q = $('#sQ').value.trim().toLowerCase();
  const rows = students.filter(s => !q || (s.nis + ' ' + s.nama + ' ' + s.kelas).toLowerCase().includes(q))
    .sort((a, b) => kelasSort(a.kelas, b.kelas) || a.nama.localeCompare(b.nama));
  $('#tbSiswa').innerHTML = rows.length
    ? rows.map(s => `<tr><td>${esc(s.nis)}</td><td>${esc(s.nama)}</td><td>${esc(s.kelas)}</td><td class="r"><button class="btn ghost sm" data-e="${esc(s.nis)}">Edit</button> <button class="btn del sm" data-d="${esc(s.nis)}">Hapus</button></td></tr>`).join('')
    : '<tr><td class="empty" colspan="4">Belum ada siswa. Klik "Tambah siswa" untuk memulai.</td></tr>';
}
$('#sQ').addEventListener('input', renderSiswa);

function openForm(nis) {
  editNis = nis;
  const s = nis && students.find(x => x.nis === nis);
  $('#dTitle').textContent = s ? 'Edit siswa' : 'Tambah siswa';
  $('#fNis').value = s ? s.nis : ''; $('#fNis').readOnly = !!s;
  $('#fNama').value = s ? s.nama : ''; $('#fKls').value = s ? s.kelas : '';
  $('#klsList').innerHTML = [...new Set(students.map(x => x.kelas))].sort(kelasSort).map(k => `<option value="${esc(k)}">`).join('');
  $('#dErr').textContent = '';
  $('#dlg').showModal();
  (s ? $('#fNama') : $('#fNis')).focus();
}
$('#add').addEventListener('click', () => openForm(null));
$('#tbSiswa').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.e) return openForm(b.dataset.e);
  const s = students.find(x => x.nis === b.dataset.d);
  if (s && confirm('Hapus siswa ' + s.nama + ' (NIS ' + s.nis + ')?\nRiwayat absensinya tetap tersimpan.')) {
    students = students.filter(x => x.nis !== s.nis); save(KEY.s, students); renderSiswa(); toast('Siswa dihapus');
  }
});
$('#frm').addEventListener('submit', e => {
  if (e.submitter && e.submitter.value !== 'ok') return; // Batal
  const nis = $('#fNis').value.trim(), nama = $('#fNama').value.trim(), kelas = $('#fKls').value.trim().toUpperCase();
  if (!nis || !nama || !kelas) { e.preventDefault(); $('#dErr').textContent = 'Semua kolom wajib diisi.'; return; }
  if (!editNis && students.some(s => s.nis === nis)) { e.preventDefault(); $('#dErr').textContent = 'NIS ' + nis + ' sudah dipakai siswa lain.'; return; }
  if (editNis) { const s = students.find(x => x.nis === editNis); s.nama = nama; s.kelas = kelas; }
  else students.push({ nis, nama, kelas });
  save(KEY.s, students); renderSiswa(); toast(editNis ? 'Perubahan disimpan' : 'Siswa ditambahkan');
});
$('#reset').addEventListener('click', () => {
  if (confirm('Kembalikan data siswa contoh dan hapus semua riwayat absensi?')) {
    students = seed(); records = []; save(KEY.s, students); save(KEY.r, records); renderSiswa(); toast('Data contoh dikembalikan');
  }
});

/* ===== Navigasi ===== */
function go() {
  route = ['scan', 'dashboard', 'siswa'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'scan';
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('show', v.id === 'v-' + route));
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  if (route === 'scan') { renderScan(); $('#bc').focus(); }
  if (route === 'dashboard') { if (!$('#fTgl').value && !go.init) { $('#fTgl').value = today(); go.init = 1; } renderDash(); }
  if (route === 'siswa') renderSiswa();
}
window.addEventListener('hashchange', go);
$('#schoolName').textContent = NAMA_SEKOLAH; document.title = 'Absensi · ' + NAMA_SEKOLAH;
setInterval(tick, 1000); tick(); go();
