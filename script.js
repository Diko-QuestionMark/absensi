/* ===== Pengaturan (mudah diganti) ===== */
const NAMA_SEKOLAH = 'SMA YPK AIR KENANGA';
const JAM_MASUK = '07:15:00'; // scan setelah jam ini berstatus "Terlambat"

/* ===== Penyimpanan (localStorage, hanya untuk prototipe) ===== */
const KEY = { s: 'absensi_siswa', r: 'absensi_catatan', v: 'absensi_seed_ver' };
const SEED_VER = 'v3_10kls_30siswa';
const $ = s => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function seed() {
  const depan = [
    'Aditya', 'Agus', 'Ahmad', 'Aisyah', 'Alif', 'Amanda', 'Andi', 'Anisa', 'Bayu', 'Bima',
    'Budi', 'Citra', 'Danu', 'Dewi', 'Dimas', 'Dina', 'Doni', 'Eka', 'Fadhil', 'Fajar',
    'Farhan', 'Gita', 'Gilang', 'Hadi', 'Hana', 'Ilham', 'Indah', 'Intan', 'Joko', 'Kartika',
    'Kevin', 'Kiki', 'Lina', 'Maya', 'Muhammad', 'Nabila', 'Nanda', 'Nur', 'Oki', 'Putri',
    'Rafi', 'Rahma', 'Rian', 'Rina', 'Rizky', 'Salsa', 'Sari', 'Taufik', 'Tono', 'Ulfa'
  ];
  const belakang = [
    'Pratama', 'Wijaya', 'Lestari', 'Saputra', 'Hidayat', 'Kurnia', 'Permata', 'Santoso',
    'Kusuma', 'Siregar', 'Wulandari', 'Setiawan', 'Ramadhan', 'Nugroho', 'Firmansyah', 'Utami',
    'Puspita', 'Mahendra', 'Gunawan', 'Hakim'
  ];
  const kelas = ['10A', '10B', '10C', '10D', '11A', '11B', '11C', '12A', '12B', '12C'];
  const out = [];
  kelas.forEach((k, ci) => {
    for (let j = 0; j < 30; j++) {
      const i = ci * 30 + j;
      const d = depan[(i * 3 + j) % depan.length];
      const b = belakang[(i * 7 + ci) % belakang.length];
      out.push({
        nis: '2026' + String(i + 1).padStart(3, '0'),
        nama: `${d} ${b}`,
        kelas: k
      });
    }
  });
  return out;
}

let students = load(KEY.s, null);
if (!students || !students.length || localStorage.getItem(KEY.v) !== SEED_VER) {
  students = seed();
  save(KEY.s, students);
  save(KEY.r, []);
  localStorage.setItem(KEY.v, SEED_VER);
}
let records = load(KEY.r, []);
let route = 'scan';

/* ===== Util tanggal & jam ===== */
const p2 = n => String(n).padStart(2, '0');
const tglStr = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const jamStr = d => p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
const today = () => tglStr(new Date());
const tglId = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
const kelasSort = (a, b) => a.localeCompare(b, 'id', { numeric: true });

function formatStatus(jam, status) {
  if (status !== 'Terlambat') return status;
  const [h1, m1, s1] = jam.split(':').map(Number);
  const [h2, m2, s2] = JAM_MASUK.split(':').map(Number);
  const diff = (h1 * 3600 + m1 * 60 + (s1 || 0)) - (h2 * 3600 + m2 * 60 + (s2 || 0));
  if (diff <= 0) return 'Terlambat';
  const menit = Math.floor(diff / 60);
  if (menit < 1) return 'Terlambat < 1 menit';
  if (menit >= 60) {
    const j = Math.floor(menit / 60), m = menit % 60;
    return m > 0 ? `Terlambat ${j} jam ${m} menit` : `Terlambat ${j} jam`;
  }
  return `Terlambat ${menit} menit`;
}

function tick() {
  const n = new Date();
  $('#clk').textContent = jamStr(n);
  $('#dt').textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }

/* ===== Halaman scan ===== */
let audioCtx;
function playSound(type) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (type === 'hadir') {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1046.5, now);
      o.frequency.exponentialRampToValueAtTime(1318.5, now + 0.05);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.35);

    } else if (type === 'late') {
      [0, 0.12].forEach(offset => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(659.25, now + offset); // nada E5
        g.gain.setValueAtTime(0.25, now + offset);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.08);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(now + offset); o.stop(now + offset + 0.08);
      });

    } else {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, now);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(now); o.stop(now + 0.28);
    }
  } catch (e) { }
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
    playSound('error');
    showResult('err', '✕', 'Kartu tidak dikenali', code, 'Barcode tidak terdaftar. Hubungi petugas untuk memeriksa data siswa.');
  } else {
    const prev = records.find(r => r.nis === code && r.tgl === tgl);
    if (prev) {
      playSound('error');
      showResult('dup', '!', 'Sudah absen hari ini', s.nama, 'Kelas ' + s.kelas + ' · tercatat pukul ' + prev.jam);
    } else {
      const status = jam > JAM_MASUK ? 'Terlambat' : 'Hadir';
      records.push({ nis: s.nis, nama: s.nama, kelas: s.kelas, tgl, jam, status });
      save(KEY.r, records);
      playSound(status === 'Hadir' ? 'hadir' : 'late');
      showResult(status === 'Hadir' ? 'ok' : 'late', '✓', 'Absensi berhasil', s.nama, 'Kelas ' + s.kelas + ' · pukul ' + jam + ' · ' + formatStatus(jam, status));
    }
  }
  renderScan();
}

function renderScan() {
  const t = today();
  const todayRec = records.filter(r => r.tgl === t);
  $('#cnt').textContent = new Set(todayRec.map(r => r.nis)).size;
  const last = [...todayRec].reverse();
  $('#recent').innerHTML = last.length
    ? last.map((r, i) => `<li><span><span class="r-num">${i + 1}.</span> <b>${esc(r.nama)}</b> <span class="e">${esc(r.kelas)}</span></span><span>${r.jam} · <b class="${r.status === 'Hadir' ? 'c-ok' : 'c-late'}">${formatStatus(r.jam, r.status)}</b></span></li>`).join('')
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

  // Tabel Riwayat Scan (Hadir & Terlambat)
  const rows = records.filter(r => (!tgl || r.tgl === tgl) && (!kelas || r.kelas === kelas) &&
    (!q || r.nama.toLowerCase().includes(q) || r.nis.toLowerCase().includes(q)))
    .sort((a, b) => (b.tgl + b.jam).localeCompare(a.tgl + a.jam));
  $('#tbRiwayat').innerHTML = rows.length
    ? rows.map((r, i) => `<tr><td>${i + 1}</td><td class="c">${tglId(r.tgl)}</td><td class="c">${r.jam}</td><td class="c">${esc(r.nis)}</td><td>${esc(r.nama)}</td><td class="c">${esc(r.kelas)}</td><td class="c"><span class="tag ${r.status === 'Hadir' ? 'h' : 't'}">${formatStatus(r.jam, r.status)}</span></td></tr>`).join('')
    : '<tr><td class="empty" colspan="7">Tidak ada catatan absensi untuk filter ini.</td></tr>';

  // Tabel Siswa Belum Hadir di Bagian Paling Bawah
  const belumRows = students
    .filter(s => inK(s) && !hadirSet.has(s.nis) && (!q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)))
    .sort((a, b) => kelasSort(a.kelas, b.kelas) || a.nama.localeCompare(b.nama));
  $('#cBelum').textContent = belumRows.length;
  $('#tbBelum').innerHTML = belumRows.length
    ? belumRows.map((s, i) => `<tr><td>${i + 1}</td><td class="c">${esc(s.nis)}</td><td>${esc(s.nama)}</td><td class="c">${esc(s.kelas)}</td><td class="c"><span class="tag b">Belum Hadir</span></td></tr>`).join('')
    : '<tr><td class="empty" colspan="5">Semua siswa sudah hadir.</td></tr>';
}
['#fQ', '#fKelas', '#fTgl'].forEach(id => $(id).addEventListener('input', renderDash));

function exportExcel() {
  const tgl = $('#fTgl').value;
  const tAktif = tgl || today();
  const kelas = $('#fKelas').value;
  const q = $('#fQ').value.trim().toLowerCase();
  const inK = s => !kelas || s.kelas === kelas;

  // Ambil daftar siswa berdasarkan filter kelas dan pencarian
  const filteredStudents = students.filter(s => inK(s) &&
    (!q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)));

  if (!filteredStudents.length) {
    alert('Tidak ada data siswa untuk diekspor!');
    return;
  }

  // Ambil daftar kelas unik dari data siswa yang difilter dan urutkan
  const listKelas = [...new Set(filteredStudents.map(s => s.kelas))].sort(kelasSort);
  const headers = ['No', 'Tanggal', 'Jam', 'NIS', 'Nama Siswa', 'Kelas', 'Status Kehadiran'];
  const tglName = tgl || today();
  const klsName = kelas ? `_${kelas}` : '';
  const fileName = `Rekap_Absensi_YPK_${tglName}${klsName}.xlsx`;

  if (window.XLSX) {
    const aoa = [];
    const merges = [];
    const titleRowIndices = [];

    listKelas.forEach((k, idx) => {
      // Data seluruh siswa di kelas ini (menyatu: hadir dan belum hadir)
      const classStudents = filteredStudents.filter(s => s.kelas === k);
      const classRows = classStudents.map(s => {
        const rec = records.find(r => r.nis === s.nis && (tgl ? r.tgl === tgl : r.tgl === tAktif));
        if (rec) {
          return {
            hadir: 1,
            tgl: rec.tgl,
            jam: rec.jam,
            nis: s.nis,
            nama: s.nama,
            kelas: s.kelas,
            status: formatStatus(rec.jam, rec.status)
          };
        } else {
          return {
            hadir: 0,
            tgl: tAktif,
            jam: '-',
            nis: s.nis,
            nama: s.nama,
            kelas: s.kelas,
            status: 'Belum Hadir'
          };
        }
      }).sort((a, b) => (b.hadir - a.hadir) || (a.hadir ? a.jam.localeCompare(b.jam) : a.nama.localeCompare(b.nama)));

      if (idx > 0) {
        aoa.push([]); // baris kosong pemisah antar tabel
        aoa.push([]);
      }

      // Baris judul tabel kelas di-merge dari kolom A sampai G (indeks 0 sampai 6)
      const titleRowIndex = aoa.length;
      titleRowIndices.push(titleRowIndex);
      merges.push({ s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: 6 } });

      aoa.push([`TABEL ABSENSI KELAS: ${k}`]);
      aoa.push(headers);
      classRows.forEach((r, i) => {
        aoa.push([
          i + 1,
          r.tgl,
          r.jam,
          r.nis,
          r.nama,
          r.kelas,
          r.status
        ]);
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Terapkan merge cell pada setiap baris judul tabel kelas (A - G)
    ws['!merges'] = merges;

    // Buat judul tiap tabel kelas berada tepat di tengah (center)
    titleRowIndices.forEach(rIdx => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: 0 });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          font: {
            bold: true
          }
        };
      }
    });

    // Atur lebar kolom yang rapi dan profesional
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal
      { wch: 10 }, // Jam
      { wch: 14 }, // NIS
      { wch: 28 }, // Nama Siswa
      { wch: 10 }, // Kelas
      { wch: 24 }  // Status Kehadiran
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');
    XLSX.writeFile(wb, fileName);
    toast('Data absensi per kelas berhasil diunduh ke Excel (.xlsx)');
    return;
  }

  // Cadangan jika XLSX tidak tersedia
  const sections = [];
  listKelas.forEach(k => {
    const classStudents = filteredStudents.filter(s => s.kelas === k);
    const classRows = classStudents.map(s => {
      const rec = records.find(r => r.nis === s.nis && (tgl ? r.tgl === tgl : r.tgl === tAktif));
      if (rec) {
        return {
          hadir: 1,
          tgl: rec.tgl,
          jam: rec.jam,
          nis: s.nis,
          nama: s.nama,
          kelas: s.kelas,
          status: formatStatus(rec.jam, rec.status)
        };
      } else {
        return {
          hadir: 0,
          tgl: tAktif,
          jam: '-',
          nis: s.nis,
          nama: s.nama,
          kelas: s.kelas,
          status: 'Belum Hadir'
        };
      }
    }).sort((a, b) => (b.hadir - a.hadir) || (a.hadir ? a.jam.localeCompare(b.jam) : a.nama.localeCompare(b.nama)));

    const lines = [
      `"TABEL ABSENSI KELAS: ${k.replace(/"/g, '""')}"`,
      headers.join(','),
      ...classRows.map((r, i) => [
        i + 1,
        `"${r.tgl}"`,
        `"${r.jam}"`,
        `"${r.nis}"`,
        `"${r.nama.replace(/"/g, '""')}"`,
        `"${r.kelas}"`,
        `"${r.status}"`
      ].join(','))
    ];

    sections.push(lines.join('\r\n'));
  });

  const csvContent = sections.join('\r\n\r\n\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Absensi_YPK_${tglName}${klsName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Data absensi per kelas berhasil diunduh ke Excel (.csv)');
}
$('#btnExport').addEventListener('click', exportExcel);

/* ===== Manajemen siswa ===== */
let editNis = null;
function fillSiswaKelas() {
  const sel = $('#sKelas'), cur = sel.value;
  const list = [...new Set(students.map(s => s.kelas))].sort(kelasSort);
  sel.innerHTML = '<option value="">Semua kelas</option>' + list.map(k => `<option>${esc(k)}</option>`).join('');
  if (list.includes(cur)) sel.value = cur;
}
function renderSiswa() {
  fillSiswaKelas();
  const q = $('#sQ').value.trim().toLowerCase();
  const kelas = $('#sKelas').value;
  const rows = students
    .filter(s => (!kelas || s.kelas === kelas) && (!q || (s.nis + ' ' + s.nama).toLowerCase().includes(q)))
    .sort((a, b) => kelasSort(a.kelas, b.kelas) || a.nama.localeCompare(b.nama));
  $('#tbSiswa').innerHTML = rows.length
    ? rows.map((s, i) => `<tr><td>${i + 1}</td><td class="c">${esc(s.nis)}</td><td>${esc(s.nama)}</td><td class="c">${esc(s.kelas)}</td><td class="r"><button class="btn ghost sm" data-e="${esc(s.nis)}">Edit</button> <button class="btn del sm" data-d="${esc(s.nis)}">Hapus</button></td></tr>`).join('')
    : '<tr><td class="empty" colspan="5">Tidak ada siswa untuk filter ini.</td></tr>';
}
$('#sQ').addEventListener('input', renderSiswa);
$('#sKelas').addEventListener('change', renderSiswa);

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
    students = seed(); records = []; save(KEY.s, students); save(KEY.r, records); localStorage.setItem(KEY.v, SEED_VER); renderSiswa(); toast('Data contoh dikembalikan');
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
