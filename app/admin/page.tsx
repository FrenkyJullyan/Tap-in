'use client';

import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ---------- Helper ----------
const pad = (n: number) => String(n).padStart(2, '0');

const getTanggalLokal = (offsetHari = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetHari);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtJam = (j?: string | null) => (j ? j.replace(/\./g, ':') : '-');

const fmtTanggal = (t?: string | null) => {
  if (!t) return '-';
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const capitalize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');

const sensorTelp = (no?: string | null) => {
  if (!no) return '-';
  if (no.length < 6) return '***';
  return `${no.substring(0, 4)}****${no.substring(no.length - 2)}`;
};

const generateUniqueSiswaID = (nama: string, tglLahir: string) => {
  if (!nama || !tglLahir) return '';
  const [tahun, bulan, tanggal] = tglLahir.split('-');
  const inisial = nama.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase()).join('');
  return `${tanggal}${bulan}${tahun.substring(2)}${inisial}`;
};

// CSV dengan pemisah ';' agar rapi di Excel Indonesia
const downloadCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------- Komponen kecil ----------
const ctl: CSSProperties = { width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.85rem' };
const nowrap: CSSProperties = { whiteSpace: 'nowrap' };

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
    {label}
    {children}
  </label>
);

const BadgePulang = ({ a }: { a: any }) => {
  if (a.status_pulang_cepat === 'pending') return <span className="badge badge-warning">Menunggu ACC Admin</span>;
  if (a.status_pulang_cepat === 'approved') return <span className="badge badge-success">Pulang Cepat (Disetujui)</span>;
  if (a.status_pulang_cepat === 'rejected') return <span className="badge badge-danger">Pulang Cepat (Ditolak)</span>;
  if (!a.jam_pulang) return <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>Belum Pulang</span>;
  return <span className="badge badge-success">Hadir / Normal</span>;
};

type Tab = 'verifikasi' | 'peserta' | 'absensi' | 'registrasi' | 'instansi';

export default function AdminPage() {
  const router = useRouter();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [dataError, setDataError] = useState('');
  const [tab, setTab] = useState<Tab>('verifikasi');

  // State Data Database
  const [sekolahList, setSekolahList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [absensiList, setAbsensiList] = useState<any[]>([]);
  const [todayDate, setTodayDate] = useState('');

  // State Form Input
  const [namaSekolahBaru, setNamaSekolahBaru] = useState('');
  const [namaSiswaBaru, setNamaSiswaBaru] = useState('');
  const [tglLahirBaru, setTglLahirBaru] = useState('');
  const [telpBaru, setTelpBaru] = useState('');
  const [sekolahBaruId, setSekolahBaruId] = useState('');

  // Filter verifikasi
  const [verStatus, setVerStatus] = useState('pending');

  // Filter daftar peserta
  const [pesertaSekolah, setPesertaSekolah] = useState('all');
  const [pesertaStatus, setPesertaStatus] = useState('aktif');
  const [pesertaCari, setPesertaCari] = useState('');

  // Filter rekap absensi
  const [rekapSekolah, setRekapSekolah] = useState('all');
  const [rekapSiswa, setRekapSiswa] = useState('all');
  const [dariTgl, setDariTgl] = useState('');
  const [sampaiTgl, setSampaiTgl] = useState('');
  const [rekapStatus, setRekapStatus] = useState('all');
  const [rekapPulang, setRekapPulang] = useState('all');

  useEffect(() => {
    setTodayDate(getTanggalLokal());
  }, []);

  // Pulihkan sesi admin dan pantau perubahan status autentikasi
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setLoginError('Gagal memeriksa sesi admin. Silakan masuk kembali.');
        setIsAdminLoggedIn(false);
        return;
      }
      setIsAdminLoggedIn(!!data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(!!session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Data & Listener Realtime Supabase
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    fetchAllData();

    const channel = supabase
      .channel('admin-realtime-absensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, () => fetchAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminLoggedIn]);

  // Data diambil terpisah lalu digabung di sisi klien (tidak bergantung pada relasi FK)
  const fetchAllData = async () => {
    const [sek, sis, abs] = await Promise.all([
      supabase.from('sekolah').select('*').order('nama', { ascending: true }),
      supabase.from('siswa').select('*').order('nama', { ascending: true }),
      supabase.from('absensi').select('*').order('tanggal', { ascending: false }).range(0, 4999),
    ]);

    const err = sek.error || sis.error || abs.error;
    setDataError(err ? 'Gagal memuat data: ' + err.message : '');
    setSekolahList(sek.data || []);
    setSiswaList(sis.data || []);
    setAbsensiList(abs.data || []);
  };

  // ---------- Data turunan ----------
  const sekolahMap = useMemo(() => Object.fromEntries(sekolahList.map((s) => [s.id, s])), [sekolahList]);
  const siswaMap = useMemo(() => Object.fromEntries(siswaList.map((s) => [s.id, s])), [siswaList]);

  const absensiFull = useMemo(
    () =>
      absensiList.map((a) => {
        const s = siswaMap[a.siswa_id];
        const idSekolah = s?.id_sekolah ?? a.sekolah_id;
        return { ...a, siswa: s, idSekolah, sekolahNama: sekolahMap[idSekolah]?.nama || '-' };
      }),
    [absensiList, siswaMap, sekolahMap]
  );

  const siswaAktif = siswaList.filter((s) => s.aktif);
  const absenHariIni = absensiFull.filter((a) => a.tanggal === todayDate);
  const pendingCount = absensiFull.filter((a) => a.status_pulang_cepat === 'pending').length;

  // ---------- Aksi ----------
  const handleAdminLogin = async () => {
    const email = username.trim();
    if (!email || !password) {
      setLoginError('Masukkan email dan kata sandi admin terlebih dahulu.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError('Email atau kata sandi tidak valid.');
      return;
    }

    setLoginError('');
    setIsAdminLoggedIn(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('Gagal keluar: ' + error.message);
      return;
    }

    setIsAdminLoggedIn(false);
    setUsername('');
    setPassword('');
    setTab('verifikasi');
  };

  const handleTambahSekolah = async () => {
    const nama = namaSekolahBaru.trim();
    if (!nama) return alert('Masukkan nama instansi mitra!');
    if (sekolahList.some((s) => s.nama.toLowerCase() === nama.toLowerCase())) return alert('Instansi tersebut sudah terdaftar!');

    const { error } = await supabase.from('sekolah').insert([{ nama, aktif: true }]);
    if (error) {
      alert(`Gagal menambah sekolah: ${error.message}`);
    } else {
      setNamaSekolahBaru('');
      fetchAllData();
    }
  };

  const toggleSekolah = async (id: number, status: boolean) => {
    const { error } = await supabase.from('sekolah').update({ aktif: status }).eq('id', id);
    if (error) alert('Gagal memperbarui instansi: ' + error.message);
    else fetchAllData();
  };

  const handleTambahSiswa = async () => {
    const nama = namaSiswaBaru.trim();
    const telp = telpBaru.trim();
    const idSekolah = parseInt(sekolahBaruId);

    if (!nama || !tglLahirBaru || !telp || isNaN(idSekolah)) {
      return alert('Mohon lengkapi seluruh data formulir peserta!');
    }

    const generatedID = generateUniqueSiswaID(nama, tglLahirBaru);
    if (siswaList.some((s) => (s.nis || '').toUpperCase() === generatedID)) {
      return alert(`ID Absen ${generatedID} sudah dipakai peserta lain. Periksa kembali nama dan tanggal lahir.`);
    }

    const { error } = await supabase.from('siswa').insert([
      { nama, nis: generatedID, no_telp: telp, id_sekolah: idSekolah, aktif: true },
    ]);

    if (error) {
      alert(`Gagal menambah siswa: ${error.message}`);
    } else {
      alert(`Peserta berhasil didaftarkan.\nID Absen: ${generatedID}`);
      setNamaSiswaBaru('');
      setTglLahirBaru('');
      setTelpBaru('');
      fetchAllData();
    }
  };

  const handleToggleSiswa = async (s: any) => {
    const aksi = s.aktif ? 'Nonaktifkan' : 'Aktifkan kembali';
    if (!confirm(`${aksi} status magang untuk peserta ${s.nama}?`)) return;
    const { error } = await supabase.from('siswa').update({ aktif: !s.aktif }).eq('id', s.id);
    if (error) alert('Gagal memperbarui peserta: ' + error.message);
    else fetchAllData();
  };

  // Admin menyetujui atau menolak pulang cepat
  const handleUpdateStatusPulangCepat = async (absensiId: number, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('absensi').update({ status_pulang_cepat: status }).eq('id', absensiId);
    if (error) alert('Gagal memperbarui status: ' + error.message);
    else fetchAllData();
  };

  // ---------- Verifikasi pulang cepat ----------
  const verList = absensiFull.filter((a) =>
    verStatus === 'all' ? ['pending', 'approved', 'rejected'].includes(a.status_pulang_cepat) : a.status_pulang_cepat === verStatus
  );

  // ---------- Daftar peserta (per sekolah / keseluruhan) ----------
  const statusCocok = (s: any) => pesertaStatus === 'all' || (pesertaStatus === 'aktif' ? s.aktif : !s.aktif);

  const pesertaRows = useMemo(() => {
    const q = pesertaCari.trim().toLowerCase();
    return siswaList
      .filter((s) => statusCocok(s))
      .filter((s) => pesertaSekolah === 'all' || String(s.id_sekolah) === pesertaSekolah)
      .filter((s) => !q || (s.nama || '').toLowerCase().includes(q) || (s.nis || '').toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (sekolahMap[a.id_sekolah]?.nama || '').localeCompare(sekolahMap[b.id_sekolah]?.nama || '') ||
          (a.nama || '').localeCompare(b.nama || '')
      );
  }, [siswaList, pesertaSekolah, pesertaStatus, pesertaCari, sekolahMap]);

  const handleExportPeserta = () => {
    const label = pesertaSekolah === 'all' ? 'Semua' : (sekolahMap[Number(pesertaSekolah)]?.nama || 'Sekolah').replace(/\s+/g, '_');
    downloadCSV(
      `Data_Peserta_${label}_${todayDate || 'export'}.csv`,
      ['Nama Peserta', 'ID Absen', 'Asal Instansi', 'Status'],
      pesertaRows.map((s) => [s.nama, s.nis, sekolahMap[s.id_sekolah]?.nama || '-', s.aktif ? 'Aktif' : 'Nonaktif'])
    );
  };

  // ---------- Rekap absensi (keseluruhan / per sekolah / perorangan) ----------
  const siswaDropdown = siswaList.filter((s) => rekapSekolah === 'all' || String(s.id_sekolah) === rekapSekolah);

  const rekapRows = useMemo(() => {
    return absensiFull
      .filter((a) => {
        if (rekapSekolah !== 'all' && String(a.idSekolah) !== rekapSekolah) return false;
        if (rekapSiswa !== 'all' && String(a.siswa_id) !== rekapSiswa) return false;
        if (dariTgl && a.tanggal < dariTgl) return false;
        if (sampaiTgl && a.tanggal > sampaiTgl) return false;
        if (rekapStatus !== 'all' && a.status_masuk !== rekapStatus) return false;
        if (rekapPulang === 'belum' && a.jam_pulang) return false;
        if (rekapPulang === 'normal' && (!a.jam_pulang || a.status_pulang_cepat)) return false;
        if (['pending', 'approved', 'rejected'].includes(rekapPulang) && a.status_pulang_cepat !== rekapPulang) return false;
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.siswa?.nama || '').localeCompare(b.siswa?.nama || ''));
  }, [absensiFull, rekapSekolah, rekapSiswa, dariTgl, sampaiTgl, rekapStatus, rekapPulang]);

  const ringkas = {
    total: rekapRows.length,
    hadir: rekapRows.filter((a) => a.status_masuk === 'hadir').length,
    sakit: rekapRows.filter((a) => a.status_masuk === 'sakit').length,
    izin: rekapRows.filter((a) => a.status_masuk === 'izin').length,
    cepat: rekapRows.filter((a) => a.status_pulang_cepat).length,
  };

  const setRentang = (hari: number | 'all') => {
    if (hari === 'all') {
      setDariTgl('');
      setSampaiTgl('');
    } else {
      setDariTgl(getTanggalLokal(-(hari - 1)));
      setSampaiTgl(getTanggalLokal());
    }
  };

  const handleExportRekap = () => {
    const siswaDipilih = rekapSiswa !== 'all' ? siswaMap[Number(rekapSiswa)] : null;
    const label = siswaDipilih
      ? siswaDipilih.nama.replace(/\s+/g, '_')
      : rekapSekolah !== 'all'
      ? (sekolahMap[Number(rekapSekolah)]?.nama || 'Sekolah').replace(/\s+/g, '_')
      : 'Semua';

    downloadCSV(
      `Laporan_Absensi_${label}_${todayDate || 'export'}.csv`,
      ['Tanggal', 'Nama Peserta', 'ID Absen', 'Instansi Asal', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Status Pulang Cepat', 'Alasan Pulang Cepat'],
      rekapRows.map((a) => [
        a.tanggal,
        a.siswa?.nama || '-',
        a.siswa?.nis || '-',
        a.sekolahNama,
        fmtJam(a.jam_masuk),
        fmtJam(a.jam_pulang),
        capitalize(a.status_masuk),
        a.status_pulang_cepat || '-',
        a.alasan_pulang_cepat || '-',
      ])
    );
  };

  // ======================= LOGIN ADMIN =======================
  if (!isAdminLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card animated-fade-in" style={{ width: '100%', maxWidth: '420px', margin: 0, padding: '2rem', borderRadius: '20px' }}>
          <div className="card-header">
            <h2 style={{ color: 'var(--bpn-gold-dark)' }}><i className="fas fa-user-shield"></i> Portal Pembimbing & Admin</h2>
          </div>
          {loginError && (
            <div className="alert alert-error">
              <i className="fas fa-times-circle"></i> {loginError}
            </div>
          )}
          <div className="form-group">
            <label><i className="fas fa-user"></i> Email Admin</label>
            <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan email admin" autoComplete="username" />
          </div>
          <div className="form-group">
            <label><i className="fas fa-key"></i> Kata Sandi</label>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
          </div>
          <button className="btn btn-primary btn-full" onClick={handleAdminLogin}>
            <i className="fas fa-lock-open"></i> Otorisasi Masuk
          </button>
          <div className="text-center mt-3">
            <button className="btn btn-danger btn-sm" onClick={() => router.push('/')}>
              <i className="fas fa-arrow-left"></i> Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================= DASHBOARD ADMIN =======================
  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'verifikasi', label: 'Verifikasi Pulang Cepat', icon: 'fa-user-clock', badge: pendingCount },
    { id: 'peserta', label: 'Daftar Peserta', icon: 'fa-address-book' },
    { id: 'absensi', label: 'Data Absensi', icon: 'fa-file-export' },
    { id: 'registrasi', label: 'Registrasi Peserta', icon: 'fa-user-plus' },
    { id: 'instansi', label: 'Instansi Mitra', icon: 'fa-building' },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      {/* Header + menu horizontal (tetap di atas saat digulir) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <header
          style={{
            background: 'var(--bpn-navy)',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#fff' }}>
            <img src="/logo-bpn.jpg" alt="Logo ATR/BPN" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>Panel Pembimbing & Admin</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--bpn-gold)' }}>Tap-in ATR/BPN Kabupaten Subang</div>
            </div>
          </Link>
          <button
            className="btn btn-sm"
            onClick={handleLogout}
            style={{ background: '#dc2626', color: '#fff', whiteSpace: 'nowrap' }}
          >
            <i className="fas fa-sign-out-alt"></i> Keluar
          </button>
        </header>

        <nav
          style={{
            background: '#ffffff',
            borderBottom: '1px solid var(--slate-200)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            overflowX: 'auto',
            padding: '0 0.75rem',
          }}
        >
          {tabs.map((t) => {
            const aktif = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap',
                  padding: '0.95rem 1.1rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `3px solid ${aktif ? 'var(--bpn-gold)' : 'transparent'}`,
                  color: aktif ? 'var(--bpn-navy)' : 'var(--slate-500)',
                  fontWeight: aktif ? 800 : 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <i className={`fas ${t.icon}`}></i> {t.label}
                {!!t.badge && (
                  <span style={{ background: '#dc2626', color: '#fff', borderRadius: 999, fontSize: '0.7rem', padding: '0.05rem 0.5rem' }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <main style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
          {dataError && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i> {dataError}
            </div>
          )}


          {tab === 'verifikasi' && (
            <>
          <div className="card animated-fade-in" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div className="card-header">
              <h3><i className="fas fa-user-clock"></i> Verifikasi Pengajuan Pulang Cepat (&lt; 16.00 WIB)</h3>
              <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} Menunggu Persetujuan</span>}
                <select value={verStatus} onChange={(e) => setVerStatus(e.target.value)} style={ctl}>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                  <option value="all">Semua</option>
                </select>
              </div>
            </div>
            <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama Peserta</th>
                    <th>Instansi</th>
                    <th>Jam Pulang</th>
                    <th>Alasan Siswa</th>
                    <th>Aksi Pembimbing</th>
                  </tr>
                </thead>
                <tbody>
                  {verList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center" style={{ color: 'var(--slate-500)' }}>
                        Tidak ada pengajuan pulang cepat pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    verList.map((a) => (
                      <tr key={a.id}>
                        <td style={nowrap}>{fmtTanggal(a.tanggal)}</td>
                        <td style={nowrap}><strong>{a.siswa?.nama || '-'}</strong></td>
                        <td>{a.sekolahNama}</td>
                        <td style={nowrap}><code>{fmtJam(a.jam_pulang)}</code></td>
                        <td><em>"{a.alasan_pulang_cepat || '-'}"</em></td>
                        <td style={nowrap}>
                          {a.status_pulang_cepat === 'pending' ? (
                            <div className="flex gap-2">
                              <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatusPulangCepat(a.id, 'approved')}>
                                <i className="fas fa-check"></i> Setujui
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatusPulangCepat(a.id, 'rejected')}>
                                <i className="fas fa-times"></i> Tolak
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                              <BadgePulang a={a} />
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleUpdateStatusPulangCepat(a.id, a.status_pulang_cepat === 'approved' ? 'rejected' : 'approved')}
                              >
                                {a.status_pulang_cepat === 'approved' ? 'Ubah: Tolak' : 'Ubah: Setujui'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


            </>
          )}

          {tab === 'peserta' && (
            <>
          <div className="card animated-fade-in">
            <div className="card-header">
              <h3><i className="fas fa-address-book"></i> Daftar Peserta Magang ({pesertaRows.length})</h3>
              <button className="btn btn-success btn-sm" onClick={handleExportPeserta} disabled={pesertaRows.length === 0}>
                <i className="fas fa-file-excel"></i> Export Peserta (CSV)
              </button>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <Field label="Instansi / Sekolah">
                <select value={pesertaSekolah} onChange={(e) => setPesertaSekolah(e.target.value)} style={{ ...ctl, minWidth: 220 }}>
                  <option value="all">Semua Instansi (Keseluruhan)</option>
                  {sekolahList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({siswaList.filter((x) => x.id_sekolah === s.id && statusCocok(x)).length})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status peserta">
                <select value={pesertaStatus} onChange={(e) => setPesertaStatus(e.target.value)} style={ctl}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                  <option value="all">Semua</option>
                </select>
              </Field>
              <Field label="Cari nama / ID">
                <input type="text" value={pesertaCari} onChange={(e) => setPesertaCari(e.target.value)} placeholder="Ketik untuk mencari..." style={{ ...ctl, minWidth: 200 }} />
              </Field>
            </div>

            <div className="table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Nama Peserta</th><th>ID Absen</th><th>Asal Instansi</th><th>Kontak WA</th><th>Status</th><th>Tindakan</th></tr>
                </thead>
                <tbody>
                  {pesertaRows.length === 0 ? (
                    <tr><td colSpan={6} className="text-center">Tidak ada peserta yang cocok dengan filter ini</td></tr>
                  ) : (
                    pesertaRows.map((s) => (
                      <tr key={s.id}>
                        <td style={nowrap}><strong>{s.nama}</strong></td>
                        <td>
                          <code style={{ background: 'var(--slate-100)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>{s.nis}</code>
                        </td>
                        <td>{sekolahMap[s.id_sekolah]?.nama || '-'}</td>
                        <td style={nowrap}>{sensorTelp(s.no_telp)}</td>
                        <td>{s.aktif ? <span className="badge badge-success">Aktif</span> : <span className="badge badge-danger">Nonaktif</span>}</td>
                        <td style={nowrap}>
                          <button className={`btn btn-sm ${s.aktif ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggleSiswa(s)}>
                            <i className={`fas ${s.aktif ? 'fa-user-times' : 'fa-user-check'}`}></i> {s.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


            </>
          )}

          {tab === 'absensi' && (
            <>
          <div className="card animated-fade-in">
            <div className="card-header">
              <h3><i className="fas fa-file-export"></i> Data Absensi ({rekapRows.length})</h3>
              <button className="btn btn-success btn-sm" onClick={handleExportRekap} disabled={rekapRows.length === 0}>
                <i className="fas fa-file-excel"></i> Export Data (CSV)
              </button>
            </div>

            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.9rem' }}>
              <Field label="Instansi / Sekolah">
                <select
                  value={rekapSekolah}
                  onChange={(e) => { setRekapSekolah(e.target.value); setRekapSiswa('all'); }}
                  style={{ ...ctl, minWidth: 210 }}
                >
                  <option value="all">Semua Instansi (Keseluruhan)</option>
                  {sekolahList.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </Field>
              <Field label="Peserta (perorangan)">
                <select value={rekapSiswa} onChange={(e) => setRekapSiswa(e.target.value)} style={{ ...ctl, minWidth: 220 }}>
                  <option value="all">Semua Peserta</option>
                  {siswaDropdown.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nis}){s.aktif ? '' : ' - nonaktif'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dari tanggal">
                <input type="date" value={dariTgl} onChange={(e) => setDariTgl(e.target.value)} style={ctl} />
              </Field>
              <Field label="Sampai tanggal">
                <input type="date" value={sampaiTgl} onChange={(e) => setSampaiTgl(e.target.value)} style={ctl} />
              </Field>
              <Field label="Kehadiran">
                <select value={rekapStatus} onChange={(e) => setRekapStatus(e.target.value)} style={ctl}>
                  <option value="all">Semua</option>
                  <option value="hadir">Hadir</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                </select>
              </Field>
              <Field label="Status pulang">
                <select value={rekapPulang} onChange={(e) => setRekapPulang(e.target.value)} style={ctl}>
                  <option value="all">Semua</option>
                  <option value="normal">Pulang normal</option>
                  <option value="pending">Menunggu ACC</option>
                  <option value="approved">Pulang cepat disetujui</option>
                  <option value="rejected">Pulang cepat ditolak</option>
                  <option value="belum">Belum pulang</option>
                </select>
              </Field>
            </div>

            {/* Rentang cepat */}
            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 700 }}>Rentang cepat:</span>
              <button className="btn btn-outline btn-sm" onClick={() => setRentang(1)}>Hari ini</button>
              <button className="btn btn-outline btn-sm" onClick={() => setRentang(7)}>7 hari</button>
              <button className="btn btn-outline btn-sm" onClick={() => setRentang(30)}>30 hari</button>
              <button className="btn btn-outline btn-sm" onClick={() => setRentang('all')}>Semua tanggal</button>
            </div>

            {/* Ringkasan sesuai filter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                ['Total Log', ringkas.total, 'var(--bpn-navy)'],
                ['Hadir', ringkas.hadir, 'var(--success)'],
                ['Sakit', ringkas.sakit, 'var(--warning)'],
                ['Izin', ringkas.izin, 'var(--warning)'],
                ['Pulang Cepat', ringkas.cepat, 'var(--danger)'],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '0.6rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c as string }}>{v}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="table-wrapper" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Tanggal</th><th>Peserta Magang</th><th>Asal Instansi</th><th>Masuk</th><th>Pulang</th><th>Kehadiran</th><th>Status Pulang</th></tr>
                </thead>
                <tbody>
                  {rekapRows.length === 0 ? (
                    <tr><td colSpan={7} className="text-center">Belum ada data absensi untuk filter ini</td></tr>
                  ) : (
                    rekapRows.map((a) => (
                      <tr key={a.id}>
                        <td style={nowrap}>{fmtTanggal(a.tanggal)}</td>
                        <td style={nowrap}><strong>{a.siswa?.nama || '-'}</strong></td>
                        <td>{a.sekolahNama}</td>
                        <td style={nowrap}><code>{fmtJam(a.jam_masuk)}</code></td>
                        <td style={nowrap}><code>{fmtJam(a.jam_pulang)}</code></td>
                        <td>
                          <span className={`badge badge-${a.status_masuk === 'hadir' ? 'success' : 'warning'}`}>{capitalize(a.status_masuk)}</span>
                        </td>
                        <td style={nowrap}><BadgePulang a={a} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


            </>
          )}

          {tab === 'registrasi' && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-user-plus"></i> Registrasi Peserta Baru</h3>
              </div>
              <div className="form-group">
                <input
                  type="text"
                  value={namaSiswaBaru}
                  onChange={(e) => setNamaSiswaBaru(e.target.value)}
                  placeholder="Nama Lengkap Siswa/Mahasiswa"
                  className="mb-2"
                />
              </div>
              <div className="form-group">
                <label><i className="fas fa-calendar-alt"></i> Tanggal Lahir (Kombinasi ID Sistem)</label>
                <input type="date" value={tglLahirBaru} onChange={(e) => setTglLahirBaru(e.target.value)} className="mb-2" />
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  value={telpBaru}
                  onChange={(e) => setTelpBaru(e.target.value)}
                  placeholder="Nomor WhatsApp (Contoh: 081234567xxx)"
                  className="mb-2"
                />
              </div>
              <div className="form-group">
                <select value={sekolahBaruId} onChange={(e) => setSekolahBaruId(e.target.value)} className="mb-2">
                  <option value="">-- Pilih Instansi / Sekolah --</option>
                  {sekolahList.filter((s) => s.aktif).map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>
              {namaSiswaBaru && tglLahirBaru && (
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '0.85rem' }}>
                  ID Absen peserta: <code style={{ fontWeight: 700 }}>{generateUniqueSiswaID(namaSiswaBaru, tglLahirBaru)}</code>
                </p>
              )}
              <button className="btn btn-primary btn-full" onClick={handleTambahSiswa}>
                <i className="fas fa-save"></i> Daftarkan Ke Sistem
              </button>
            </div>
            </div>
          )}

          {tab === 'instansi' && (
            <>
            <div className="card">
              <div className="card-header">
                <h3><i className="fas fa-building"></i> Kelola Instansi / Sekolah Mitra</h3>
              </div>
              <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={namaSekolahBaru}
                  onChange={(e) => setNamaSekolahBaru(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTambahSekolah()}
                  placeholder="Nama instansi baru/sekolah"
                  style={{ flex: 2 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleTambahSekolah}>
                  <i className="fas fa-plus"></i> Tambah Mitra
                </button>
              </div>
              <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Instansi Mitra</th><th>Peserta Aktif</th><th>Status</th><th>Kontrol</th></tr>
                  </thead>
                  <tbody>
                    {sekolahList.length === 0 ? (
                      <tr><td colSpan={4} className="text-center">Belum ada instansi mitra</td></tr>
                    ) : (
                      sekolahList.map((sek) => (
                        <tr key={sek.id}>
                          <td><strong>{sek.nama}</strong></td>
                          <td>{siswaList.filter((s) => s.id_sekolah === sek.id && s.aktif).length}</td>
                          <td>{sek.aktif ? <span className="badge badge-success">Aktif</span> : <span className="badge badge-danger">Nonaktif</span>}</td>
                          <td>
                            <button className={`btn btn-sm ${sek.aktif ? 'btn-outline' : 'btn-primary'}`} onClick={() => toggleSekolah(sek.id, !sek.aktif)}>
                              {sek.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>


            </>
          )}
      </main>
    </div>
  );
}