// ===== DATA STORE (localStorage) =====
function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');

const pageTitles = {
    'dashboard': 'Dashboard', 'daftar-hadir': 'Daftar Hadir', 'data-buku': 'Data Buku',
    'peminjaman': 'Peminjaman Buku', 'pengembalian': 'Pengembalian Buku', 'riwayat': 'Riwayat Transaksi'
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
        sidebar.classList.remove('open');
    });
});

function navigateTo(page) {
    navItems.forEach(n => n.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));

    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById('page-title').textContent = pageTitles[page] || page;

    if (page === 'dashboard') refreshDashboard();
    if (page === 'daftar-hadir') renderDaftarHadir();
    if (page === 'data-buku') renderDataBuku();
    if (page === 'peminjaman') { renderPeminjamanAktif(); loadDropdownBuku(); }
    if (page === 'pengembalian') loadDropdownPengembalian();
    if (page === 'riwayat') renderRiwayat();
}

hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target !== hamburger) {
        sidebar.classList.remove('open');
    }
});

// ===== DATETIME =====
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('datetime').textContent = now.toLocaleDateString('id-ID', options);
}
updateDateTime();
setInterval(updateDateTime, 1000);

// ===== TOAST =====
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== MODAL =====
function bukaModal(id) { document.getElementById(id).classList.add('active'); }
function tutupModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== HELPER =====
function todayStr() { return new Date().toISOString().split('T')[0]; }
function timeStr() { return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
function dateNow() { return new Date().toISOString().split('T')[0]; }
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// =============================================
//  DAFTAR HADIR
// =============================================
function absenMasuk() {
    const nama = document.getElementById('hadir-nama').value.trim();
    const kelas = document.getElementById('hadir-kelas').value.trim();
    const keperluan = document.getElementById('hadir-keperluan').value;

    if (!nama || !kelas) { showToast('Nama dan kelas wajib diisi!', 'error'); return; }

    const hadir = getData('hadir');
    const sudahMasuk = hadir.find(h => h.nama.toLowerCase() === nama.toLowerCase() && h.tanggal === todayStr() && !h.jamKeluar);
    if (sudahMasuk) { showToast(`${nama} sudah absen masuk hari ini!`, 'error'); return; }

    const newHadir = { id: Date.now(), nama, kelas, keperluan, tanggal: todayStr(), jamMasuk: timeStr(), jamKeluar: null };
    hadir.unshift(newHadir);
    setData('hadir', hadir);
    tambahRiwayat('Kehadiran', nama, `Masuk perpustakaan - ${keperluan}`);

    showToast(`${nama} berhasil absen masuk!`, 'success');
    document.getElementById('hadir-nama').value = '';
    document.getElementById('hadir-kelas').value = '';
    renderDaftarHadir();
}

function absenKeluar() {
    const nama = document.getElementById('hadir-nama').value.trim();
    if (!nama) { showToast('Masukkan nama untuk absen keluar!', 'error'); return; }

    const hadir = getData('hadir');
    const record = hadir.find(h => h.nama.toLowerCase() === nama.toLowerCase() && h.tanggal === todayStr() && !h.jamKeluar);
    if (!record) { showToast(`${nama} tidak ditemukan / sudah absen keluar!`, 'error'); return; }

    record.jamKeluar = timeStr();
    setData('hadir', hadir);
    tambahRiwayat('Kehadiran', nama, `Keluar perpustakaan`);
    showToast(`${nama} berhasil absen keluar!`, 'success');
    document.getElementById('hadir-nama').value = '';
    renderDaftarHadir();
}

function renderDaftarHadir() {
    const hadir = getData('hadir');
    const search = (document.getElementById('search-hadir')?.value || '').toLowerCase();
    const todayHadir = hadir.filter(h => h.tanggal === todayStr());
    const filtered = todayHadir.filter(h => h.nama.toLowerCase().includes(search) || h.kelas.toLowerCase().includes(search));

    const tbody = document.getElementById('tabel-hadir');
    const empty = document.getElementById('empty-hadir');

    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map((h, i) => `
        <tr>
            <td>${i + 1}</td><td><strong>${h.nama}</strong></td><td>${h.kelas}</td><td>${h.keperluan}</td>
            <td>${h.jamMasuk}</td><td>${h.jamKeluar || '-'}</td>
            <td>${h.jamKeluar ? '<span class="badge badge-success">Selesai</span>' : '<span class="badge badge-warning">Masih di sini</span>'}</td>
            <td>${!h.jamKeluar ? `<button class="btn btn-sm btn-success" onclick="absenKeluarById(${h.id})">Keluar</button>` : `<button class="btn btn-sm btn-danger" onclick="hapusHadir(${h.id})">🗑️</button>`}</td>
        </tr>`).join('');
}

function absenKeluarById(id) {
    const hadir = getData('hadir');
    const record = hadir.find(h => h.id === id);
    if (record) {
        record.jamKeluar = timeStr();
        setData('hadir', hadir);
        tambahRiwayat('Kehadiran', record.nama, `Keluar perpustakaan`);
        showToast(`${record.nama} absen keluar!`, 'success');
        renderDaftarHadir();
    }
}

function hapusHadir(id) {
    if (!confirm('Hapus data kehadiran ini?')) return;
    let hadir = getData('hadir');
    hadir = hadir.filter(h => h.id !== id);
    setData('hadir', hadir);
    showToast('Data kehadiran dihapus!', 'info');
    renderDaftarHadir();
}

// =============================================
//  DATA BUKU
// =============================================
function tambahBuku() {
    const judul = document.getElementById('buku-judul').value.trim();
    const pengarang = document.getElementById('buku-pengarang').value.trim();
    const penerbit = document.getElementById('buku-penerbit').value.trim();
    const tahun = document.getElementById('buku-tahun').value;
    const isbn = document.getElementById('buku-isbn').value.trim();
    const kategori = document.getElementById('buku-kategori').value;
    const stok = parseInt(document.getElementById('buku-stok').value) || 0;
    const rak = document.getElementById('buku-rak').value.trim();

    if (!judul || !pengarang) { showToast('Judul dan pengarang wajib diisi!', 'error'); return; }

    const buku = getData('buku');
    const newBuku = { id: Date.now(), judul, pengarang, penerbit, tahun, isbn, kategori, stok, rak };
    buku.push(newBuku);
    setData('buku', buku);
    tambahRiwayat('Buku', judul, `Buku baru ditambahkan (Stok: ${stok})`);

    showToast(`Buku "${judul}" berhasil ditambahkan!`, 'success');
    resetFormBuku();
    renderDataBuku();
}

function resetFormBuku() {
    ['buku-judul', 'buku-pengarang', 'buku-penerbit', 'buku-tahun', 'buku-isbn', 'buku-stok', 'buku-rak'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('buku-kategori').selectedIndex = 0;
}

function renderDataBuku() {
    const buku = getData('buku');
    const search = (document.getElementById('search-buku')?.value || '').toLowerCase();
    const filtered = buku.filter(b => b.judul.toLowerCase().includes(search) || b.pengarang.toLowerCase().includes(search) || b.kategori.toLowerCase().includes(search));

    const tbody = document.getElementById('tabel-buku');
    const empty = document.getElementById('empty-buku');

    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map((b, i) => `
        <tr>
            <td>${i + 1}</td><td><strong>${b.judul}</strong></td><td>${b.pengarang}</td><td>${b.penerbit || '-'}</td><td>${b.tahun || '-'}</td>
            <td><span class="badge badge-info">${b.kategori}</span></td>
            <td>${b.stok > 0 ? `<span class="badge badge-success">${b.stok}</span>` : `<span class="badge badge-danger">Habis</span>`}</td>
            <td>${b.rak || '-'}</td>
            <td><button class="btn btn-sm btn-primary" onclick="editBuku(${b.id})">✏️</button><button class="btn btn-sm btn-danger" onclick="hapusBuku(${b.id})">🗑️</button></td>
        </tr>`).join('');
}

function editBuku(id) {
    const buku = getData('buku');
    const b = buku.find(x => x.id === id);
    if (!b) return;

    document.getElementById('edit-buku-index').value = id;
    document.getElementById('edit-buku-judul').value = b.judul;
    document.getElementById('edit-buku-pengarang').value = b.pengarang;
    document.getElementById('edit-buku-penerbit').value = b.penerbit || '';
    document.getElementById('edit-buku-tahun').value = b.tahun || '';
    document.getElementById('edit-buku-isbn').value = b.isbn || '';
    document.getElementById('edit-buku-kategori').value = b.kategori;
    document.getElementById('edit-buku-stok').value = b.stok;
    document.getElementById('edit-buku-rak').value = b.rak || '';
    bukaModal('modal-edit-buku');
}

function simpanEditBuku() {
    const id = parseInt(document.getElementById('edit-buku-index').value);
    let buku = getData('buku');
    const idx = buku.findIndex(b => b.id === id);
    if (idx === -1) return;

    buku[idx].judul = document.getElementById('edit-buku-judul').value.trim();
    buku[idx].pengarang = document.getElementById('edit-buku-pengarang').value.trim();
    buku[idx].penerbit = document.getElementById('edit-buku-penerbit').value.trim();
    buku[idx].tahun = document.getElementById('edit-buku-tahun').value;
    buku[idx].isbn = document.getElementById('edit-buku-isbn').value.trim();
    buku[idx].kategori = document.getElementById('edit-buku-kategori').value;
    buku[idx].stok = parseInt(document.getElementById('edit-buku-stok').value) || 0;
    buku[idx].rak = document.getElementById('edit-buku-rak').value.trim();

    setData('buku', buku);
    tutupModal('modal-edit-buku');
    showToast('Data buku berhasil diperbarui!', 'success');
    renderDataBuku();
}

function hapusBuku(id) {
    if (!confirm('Yakin hapus buku ini?')) return;
    let buku = getData('buku');
    const b = buku.find(x => x.id === id);
    buku = buku.filter(x => x.id !== id);
    setData('buku', buku);
    tambahRiwayat('Buku', b ? b.judul : '', 'Buku dihapus dari database');
    showToast('Buku berhasil dihapus!', 'info');
    renderDataBuku();
}

// =============================================
//  PEMINJAMAN BUKU
// =============================================
function loadDropdownBuku() {
    const buku = getData('buku').filter(b => b.stok > 0);
    const select = document.getElementById('pinjam-buku');
    select.innerHTML = '<option value="">-- Pilih Buku --</option>';
    buku.forEach(b => select.innerHTML += `<option value="${b.id}">${b.judul} — Stok: ${b.stok}</option>`);

    document.getElementById('pinjam-tgl').value = dateNow();
    const batas = new Date(); batas.setDate(batas.getDate() + 7);
    document.getElementById('pinjam-batas').value = batas.toISOString().split('T')[0];
}

function pinjamBuku() {
    const nama = document.getElementById('pinjam-nama').value.trim();
    const kelas = document.getElementById('pinjam-kelas').value.trim();
    const telp = document.getElementById('pinjam-telp').value.trim();
    const bukuId = parseInt(document.getElementById('pinjam-buku').value);
    const tglPinjam = document.getElementById('pinjam-tgl').value;
    const batasKembali = document.getElementById('pinjam-batas').value;

    if (!nama || !kelas || !bukuId) { showToast('Nama, kelas, dan buku wajib diisi!', 'error'); return; }

    let buku = getData('buku');
    const b = buku.find(x => x.id === bukuId);
    if (!b || b.stok <= 0) { showToast('Stok buku tidak tersedia!', 'error'); return; }

    const pinjam = getData('pinjaman');
    const sudahPinjam = pinjam.find(p => p.nama.toLowerCase() === nama.toLowerCase() && p.bukuId === bukuId && p.status === 'Dipinjam');
    if (sudahPinjam) { showToast(`${nama} masih meminjam buku ini!`, 'error'); return; }

    b.stok--; setData('buku', buku);

    const newPinjam = { id: Date.now(), nama, kelas, telp, bukuId, judulBuku: b.judul, tglPinjam: tglPinjam || todayStr(), batasKembali: batasKembali, tglKembali: null, status: 'Dipinjam', keterangan: '' };
    pinjam.unshift(newPinjam); setData('pinjaman', pinjam);

    tambahRiwayat('Peminjaman', nama, `Meminjam "${b.judul}" — Batas: ${formatDate(batasKembali)}`);
    showToast(`Peminjaman "${b.judul}" berhasil!`, 'success');
    resetFormPinjam(); loadDropdownBuku(); renderPeminjamanAktif();
}

function resetFormPinjam() {
    ['pinjam-nama', 'pinjam-kelas', 'pinjam-telp'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pinjam-buku').selectedIndex = 0;
}

function renderPeminjamanAktif() {
    const pinjam = getData('pinjaman');
    const search = (document.getElementById('search-pinjam')?.value || '').toLowerCase();
    const aktif = pinjam.filter(p => p.status === 'Dipinjam');
    const filtered = aktif.filter(p => p.nama.toLowerCase().includes(search) || p.judulBuku.toLowerCase().includes(search));

    const tbody = document.getElementById('tabel-pinjam');
    const empty = document.getElementById('empty-pinjam');

    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map((p, i) => {
        const today = new Date(todayStr()); const batas = new Date(p.batasKembali);
        const isTerlambat = today > batas;
        return `<tr><td>${i + 1}</td><td><strong>${p.nama}</strong></td><td>${p.kelas}</td><td>${p.judulBuku}</td><td>${formatDate(p.tglPinjam)}</td>
        <td>${formatDate(p.batasKembali)} ${isTerlambat ? '<span class="badge badge-danger">Terlambat!</span>' : ''}</td>
        <td><span class="badge badge-warning">${p.status}</span></td>
        <td><button class="btn btn-sm btn-success" onclick="kembalikanLangsung(${p.id})">📥 Kembalikan</button></td></tr>`;
    }).join('');
}

function kembalikanLangsung(id) {
    if (!confirm('Proses pengembalian buku ini?')) return;
    prosesKembali(id, todayStr(), '', true);
}

// =============================================
//  PENGEMBALIAN
// =============================================
function loadDropdownPengembalian() {
    const pinjam = getData('pinjaman').filter(p => p.status === 'Dipinjam');
    const select = document.getElementById('kembali-id');
    select.innerHTML = '<option value="">-- Pilih Peminjaman --</option>';
    pinjam.forEach(p => select.innerHTML += `<option value="${p.id}">${p.nama} — ${p.judulBuku} (${formatDate(p.tglPinjam)})</option>`);

    document.getElementById('kembali-nama').value = '';
    document.getElementById('kembali-buku').value = '';
    document.getElementById('kembali-tgl').value = todayStr();
    document.getElementById('kembali-ket').value = '';
}

function isiDataPengembalian() {
    const id = parseInt(document.getElementById('kembali-id').value);
    if (!id) { document.getElementById('kembali-nama').value = ''; document.getElementById('kembali-buku').value = ''; return; }
    const pinjam = getData('pinjaman');
    const p = pinjam.find(x => x.id === id);
    if (p) { document.getElementById('kembali-nama').value = p.nama; document.getElementById('kembali-buku').value = p.judulBuku; }
}

function kembalikanBuku() {
    const id = parseInt(document.getElementById('kembali-id').value);
    const tglKembali = document.getElementById('kembali-tgl').value;
    const ket = document.getElementById('kembali-ket').value.trim();
    if (!id) { showToast('Pilih peminjaman terlebih dahulu!', 'error'); return; }
    prosesKembali(id, tglKembali || todayStr(), ket, false);
}

function prosesKembali(id, tglKembali, ket, dariLangsung) {
    let pinjam = getData('pinjaman');
    const p = pinjam.find(x => x.id === id);
    if (!p || p.status !== 'Dipinjam') { showToast('Data peminjaman tidak ditemukan!', 'error'); return; }

    p.status = 'Dikembalikan'; p.tglKembali = tglKembali; p.keterangan = ket;
    setData('pinjaman', pinjam);

    let buku = getData('buku');
    const b = buku.find(x => x.id === p.bukuId);
    if (b) { b.stok++; setData('buku', buku); }

    tambahRiwayat('Pengembalian', p.nama, `Mengembalikan "${p.judulBuku}"${ket ? ' — ' + ket : ''}`);
    showToast(`Buku "${p.judulBuku}" berhasil dikembalikan!`, 'success');

    if (dariLangsung) renderPeminjamanAktif();
    else loadDropdownPengembalian();
    loadDropdownBuku();
}

// =============================================
//  RIWAYAT
// =============================================
function tambahRiwayat(jenis, nama, detail) {
    const riwayat = getData('riwayat');
    riwayat.unshift({ id: Date.now(), tanggal: todayStr(), waktu: timeStr(), jenis, nama, detail });
    if (riwayat.length > 500) riwayat.length = 500;
    setData('riwayat', riwayat);
}

function renderRiwayat() {
    const riwayat = getData('riwayat');
    const search = (document.getElementById('search-riwayat')?.value || '').toLowerCase();
    const filtered = riwayat.filter(r => r.nama.toLowerCase().includes(search) || r.jenis.toLowerCase().includes(search) || r.detail.toLowerCase().includes(search));

    const tbody = document.getElementById('tabel-riwayat');
    const empty = document.getElementById('empty-riwayat');

    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    const badgeMap = { 'Kehadiran': 'badge-info', 'Peminjaman': 'badge-warning', 'Pengembalian': 'badge-success', 'Buku': 'badge-danger' };
    tbody.innerHTML = filtered.slice(0, 100).map((r, i) => `
        <tr><td>${i + 1}</td><td>${formatDate(r.tanggal)}<br><small style="color:#999">${r.waktu}</small></td>
        <td><span class="badge ${badgeMap[r.jenis] || 'badge-info'}">${r.jenis}</span></td><td><strong>${r.nama}</strong></td><td>${r.detail}</td><td>-</td></tr>`).join('');
}

function hapusSemuaRiwayat() {
    if (!confirm('Yakin hapus SEMUA riwayat? Tindakan ini tidak bisa dibatalkan!')) return;
    setData('riwayat', []);
    showToast('Semua riwayat dihapus!', 'info');
    renderRiwayat();
}

// =============================================
//  DASHBOARD
// =============================================
function refreshDashboard() {
    const buku = getData('buku');
    const hadir = getData('hadir');
    const pinjam = getData('pinjaman');
    const riwayat = getData('riwayat');
    const today = todayStr();

    document.getElementById('stat-buku').textContent = buku.reduce((sum, b) => sum + b.stok, 0);
    document.getElementById('stat-hadir').textContent = hadir.filter(h => h.tanggal === today).length;
    document.getElementById('stat-pinjam').textContent = pinjam.filter(p => p.status === 'Dipinjam').length;
    document.getElementById('stat-total').textContent = riwayat.length;

    const hadirToday = hadir.filter(h => h.tanggal === today).slice(0, 5);
    const tbodyHadir = document.getElementById('dashboard-hadir');
    const emptyHadir = document.getElementById('empty-hadir-dash');
    if (hadirToday.length === 0) { tbodyHadir.innerHTML = ''; emptyHadir.style.display = 'block'; }
    else { emptyHadir.style.display = 'none'; tbodyHadir.innerHTML = hadirToday.map(h => `<tr><td>${h.nama}</td><td>${h.kelas}</td><td>${h.jamMasuk}</td></tr>`).join(''); }

    const aktif = pinjam.filter(p => p.status === 'Dipinjam').slice(0, 5);
    const tbodyPinjam = document.getElementById('dashboard-pinjam');
    const emptyPinjam = document.getElementById('empty-pinjam-dash');
    if (aktif.length === 0) { tbodyPinjam.innerHTML = ''; emptyPinjam.style.display = 'block'; }
    else { emptyPinjam.style.display = 'none'; tbodyPinjam.innerHTML = aktif.map(p => `<tr><td>${p.nama}</td><td>${p.judulBuku}</td><td>${formatDate(p.tglPinjam)}</td></tr>`).join(''); }
}

// ===== SEED DATA CONTOH =====
function seedData() {
    if (getData('buku').length > 0) return;

    const contohBuku = [
        { id: 1, judul: "Basis Data", pengarang: "Abdul Kadir", penerbit: "Andi Offset", tahun: "2020", isbn: "978-602-262-xxx", kategori: "Pelajaran", stok: 5, rak: "Rak A1" },
        { id: 2, judul: "Pemrograman Web", pengarang: "Andi Kristanto", penerbit: "Informatika", tahun: "2021", isbn: "978-602-xxx-xx", kategori: "Pelajaran", stok: 3, rak: "Rak A2" },
        { id: 3, judul: "Laskar Pelangi", pengarang: "Andrea Hirata", penerbit: "Bentang Pustaka", tahun: "2005", isbn: "978-979-3062-79-0", kategori: "Fiksi", stok: 4, rak: "Rak B1" },
        { id: 4, judul: "Bumi Manusia", pengarang: "Pramoedya Ananta Toer", penerbit: "Hasta Mitra", tahun: "1980", isbn: "978-979-xxx-xx", kategori: "Fiksi", stok: 2, rak: "Rak B1" },
        { id: 5, judul: "KBBI", pengarang: "Tim Redaksi", penerbit: "Gramedia", tahun: "2018", isbn: "978-979-xxx-xx", kategori: "Referensi", stok: 3, rak: "Rak C1" },
        { id: 6, judul: "Jaringan Komputer", pengarang: "Denny Setiawan", penerbit: "Informatika", tahun: "2022", isbn: "978-602-xxx-xx", kategori: "Pelajaran", stok: 6, rak: "Rak A3" },
        { id: 7, judul: "Filosofi Teras", pengarang: "Henry Manampiring", penerbit: "Kompas", tahun: "2018", isbn: "978-602-xxx-xx", kategori: "Non-Fiksi", stok: 3, rak: "Rak B2" },
        { id: 8, judul: "Naruto Vol. 1", pengarang: "Masashi Kishimoto", penerbit: "Elex Media", tahun: "2008", isbn: "978-979-xxx-xx", kategori: "Komik", stok: 4, rak: "Rak D1" }
    ];
    setData('buku', contohBuku);

    const contohHadir = [
        { id: 101, nama: "Ahmad Fauzi", kelas: "XII RPL 1", keperluan: "Membaca", tanggal: todayStr(), jamMasuk: "08:15", jamKeluar: "09:30" },
        { id: 102, nama: "Siti Nurhaliza", kelas: "XI TKJ 2", keperluan: "Mengerjakan Tugas", tanggal: todayStr(), jamMasuk: "09:00", jamKeluar: null },
        { id: 103, nama: "Budi Santoso", kelas: "X MM 3", keperluan: "Meminjam Buku", tanggal: todayStr(), jamMasuk: "10:20", jamKeluar: null }
    ];
    setData('hadir', contohHadir);

    const contohPinjam = [
        { id: 201, nama: "Siti Nurhaliza", kelas: "XI TKJ 2", telp: "081234567890", bukuId: 2, judulBuku: "Pemrograman Web", tglPinjam: todayStr(), batasKembali: new Date(Date.now() + 7*86400000).toISOString().split('T')[0], tglKembali: null, status: "Dipinjam", keterangan: "" },
        { id: 202, nama: "Rina Wulandari", kelas: "XII AKL 1", telp: "087654321098", bukuId: 3, judulBuku: "Laskar Pelangi", tglPinjam: new Date(Date.now() - 3*86400000).toISOString().split('T')[0], batasKembali: new Date(Date.now() + 4*86400000).toISOString().split('T')[0], tglKembali: null, status: "Dipinjam", keterangan: "" }
    ];
    setData('pinjaman', contohPinjam);

    let buku = getData('buku');
    buku.find(b => b.id === 2).stok--; buku.find(b => b.id === 3).stok--;
    setData('buku', buku);

    const contohRiwayat = [
        { id: 301, tanggal: todayStr(), waktu: "08:15", jenis: "Kehadiran", nama: "Ahmad Fauzi", detail: "Masuk perpustakaan - Membaca" },
        { id: 302, tanggal: todayStr(), waktu: "09:00", jenis: "Kehadiran", nama: "Siti Nurhaliza", detail: "Masuk perpustakaan - Mengerjakan Tugas" },
        { id: 303, tanggal: todayStr(), waktu: "09:30", jenis: "Kehadiran", nama: "Ahmad Fauzi", detail: "Keluar perpustakaan" },
        { id: 304, tanggal: todayStr(), waktu: "09:10", jenis: "Peminjaman", nama: "Siti Nurhaliza", detail: `Meminjam "Pemrograman Web" — Batas: ${formatDate(new Date(Date.now() + 7*86400000).toISOString().split('T')[0])}` },
        { id: 305, tanggal: new Date(Date.now() - 3*86400000).toISOString().split('T')[0], waktu: "10:00", jenis: "Peminjaman", nama: "Rina Wulandari", detail: `Meminjam "Laskar Pelangi"` },
    ];
    setData('riwayat', contohRiwayat);
}

// ===== INIT =====
seedData();
refreshDashboard();