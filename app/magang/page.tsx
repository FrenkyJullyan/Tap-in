'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabase';

interface SiswaProfile {
  id: number;
  unique_id: string;
  nama: string;
  status_aktif: boolean;
}

interface AbsensiRecord {
  id: number;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string | null;
  status: string;
  status_pulang: string | null;
  alasan_pulang_cepat: string | null;
  bukti_izin_url: string | null;
}

export default function PortalMagang() {
  const [inputUniqueId, setInputUniqueId] = useState('');
  const [siswa, setSiswa] = useState<SiswaProfile | null>(null);
  const [riwayat, setRiwayat] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // State untuk form izin / pulang cepat
  const [alasan, setAlasan] = useState('');
  const [fileIzin, setFileIzin] = useState<File | null>(null);

  // Cek apakah sudah pernah login di sesi ini (localStorage)
  useEffect(() => {
    const savedId = localStorage.getItem('magang_unique_id');
    if (savedId) {
      setInputUniqueId(savedId);
      handleLogin(savedId);
    }
  }, []);

  // Fungsi Login / Cari Siswa Berdasarkan ID Unik
  const handleLogin = async (idToSearch?: string) => {
    const targetId = (idToSearch || inputUniqueId).trim().toUpperCase();
    if (!targetId) {
      setErrorMsg('Masukkan ID Unik terlebih dahulu (Contoh: 170804AS)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Cek data siswa di tabel siswa
      let { data: siswaData, error: siswaErr } = await supabase
        .from('siswa')
        .select('*')
        .eq('unique_id', targetId)
        .single();

      // Jika siswa belum terdaftar di tabel siswa, kita buatkan otomatis atau cek dari tabel absensi
      if (siswaErr || !siswaData) {
        // Cek apakah ID pernah absen sebelumnya
        const { data: absensiLama } = await supabase
          .from('absensi')
          .select('nama')
          .eq('unique_id', targetId)
          .limit(1);

        const namaDefault = absensiLama && absensiLama.length > 0 ? absensiLama[0].nama : 'Peserta Magang';

        // Daftarkan otomatis ke tabel siswa
        const { data: newSiswa, error: insertErr } = await supabase
          .from('siswa')
          .insert([{ unique_id: targetId, nama: namaDefault, status_aktif: true }])
          .select()
          .single();

        if (insertErr) throw new Error('ID Unik tidak ditemukan atau belum terdaftar.');
        siswaData = newSiswa;
      }

      if (!siswaData.status_aktif) {
        throw new Error('Akun Anda sudah dinonaktifkan karena masa magang telah selesai.');
      }

      setSiswa(siswaData);
      localStorage.setItem('magang_unique_id', targetId);
      fetchRiwayat(targetId);
    } catch (err: any) {
      setErrorMsg(err.message);
      setSiswa(null);
    } finally {
      setLoading(false);
    }
  };

  // Ambil riwayat absen siswa
  const fetchRiwayat = async (uniqueId: string) => {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .eq('unique_id', uniqueId)
      .order('tanggal', { ascending: false });

    if (!error) {
      setRiwayat(data || []);
    }
  };

  // Logout Session
  const handleLogout = () => {
    localStorage.removeItem('magang_unique_id');
    setSiswa(null);
    setInputUniqueId('');
    setRiwayat([]);
  };

  // Fungsi Absen Masuk Hari Ini
  const handleAbsenMasuk = async () => {
    if (!siswa) return;
    const hariIni = new Date().toISOString().split('T')[0];
    const jamSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Cek apakah sudah absen hari ini
    const sudahAbsen = riwayat.some((item) => item.tanggal === hariIni);
    if (sudahAbsen) {
      alert('Anda sudah melakukan absensi hari ini!');
      return;
    }

    const { error } = await supabase.from('absensi').insert([
      {
        unique_id: siswa.unique_id,
        nama: siswa.nama,
        tanggal: hariIni,
        jam_masuk: jamSekarang,
        status: 'Hadir',
        status_pulang: 'Belum Pulang',
      },
    ]);

    if (error) {
      alert('Gagal melakukan absen masuk: ' + error.message);
    } else {
      setSuccessMsg('Absen masuk berhasil dicatat!');
      fetchRiwayat(siswa.unique_id);
    }
  };

  // Fungsi Absen Pulang
  const handleAbsenPulang = async (idAbsensi: number, jamMasuk: string) => {
    const jamSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const jam16 = '16:00';

    let statusPulang = 'Selesai';
    if (jamSekarang < jam16 && !alasan) {
      alert('Karena pulang sebelum pukul 16:00 WIB, wajib menyertakan alasan pulang cepat!');
      return;
    }

    if (jamSekarang < jam16) {
      statusPulang = 'Pending (Pulang Cepat)';
    }

    const { error } = await supabase
      .from('absensi')
      .update({
        jam_pulang: jamSekarang,
        status_pulang: statusPulang,
        alasan_pulang_cepat: alasan || null,
      })
      .eq('id', idAbsensi);

    if (error) {
      alert('Gagal absen pulang: ' + error.message);
    } else {
      setSuccessMsg('Absen pulang berhasil dicatat!');
      setAlasan('');
      if (siswa) fetchRiwayat(siswa.unique_id);
    }
  };

  const hariIni = new Date().toISOString().split('T')[0];
  const absenHariIni = riwayat.find((item) => item.tanggal === hariIni);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-body animated-fade-in" style={{ maxWidth: '480px', margin: '0 auto' }}>
          
          {/* Header Banner */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--bpn-gold-dark)', marginBottom: '0.4rem', display: 'inline-block' }}>
              Portal Siswa Magang
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--bpn-navy)' }}>
              Absensi Kehadiran Harian
            </h1>
          </div>

          {/* JIKA BELUM LOGIN / MASUKKAN ID */}
          {!siswa ? (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: '50px', height: '50px', background: 'rgba(30, 58, 138, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', color: 'var(--bpn-navy)', fontSize: '1.2rem' }}>
                  <i className="fa-solid fa-id-card"></i>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--bpn-navy)', marginBottom: '0.25rem' }}>
                  Masukkan ID Unik Anda
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Format: TanggalLahir (DDMMYY) + Inisial Nama (Contoh: 170804AS)
                </p>
              </div>

              {errorMsg && (
                <div className="alert alert-error" style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Cth: 170804AS"
                  value={inputUniqueId}
                  onChange={(e) => setInputUniqueId(e.target.value.toUpperCase())}
                  style={{ textAlign: 'center', fontWeight: '700', letterSpacing: '1px', fontSize: '1.1rem' }}
                />
              </div>

              <button
                onClick={() => handleLogin()}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrow-right-to-bracket"></i>}
                <span>Masuk ke Portal</span>
              </button>
            </div>
          ) : (
            /* JIKA SUDAH MASUK (DASHBOARD SISWA) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Kartu Profil Singkat */}
              <div className="card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--bpn-navy), var(--bpn-navy-dark))', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--bpn-gold)', fontWeight: '700', textTransform: 'uppercase' }}>
                      ID: {siswa.unique_id}
                    </span>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', margin: '0.15rem 0 0.5rem' }}>
                      {siswa.nama}
                    </h2>
                    <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Status: Aktif PKL</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> Keluar
                  </button>
                </div>
              </div>

              {successMsg && (
                <div className="alert alert-success" style={{ fontSize: '0.82rem' }}>
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Aksi Absen Hari Ini */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--bpn-navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-clock"></i> Absensi Hari Ini ({hariIni})
                </h3>

                {!absenHariIni ? (
                  <div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
                      Anda belum melakukan absen masuk hari ini. Silakan klik tombol di bawah:
                    </p>
                    <button onClick={handleAbsenMasuk} className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}>
                      <i className="fa-solid fa-right-to-bracket"></i> Lakukan Absen Masuk
                    </button>
                  </div>
                ) : !absenHariIni.jam_pulang ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                      <div>Absen Masuk Tercatat: <strong>{absenHariIni.jam_masuk}</strong></div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
<label style={{ fontSize: '0.8rem' }}>Alasan Pulang Cepat (Jika &lt; 16:00 WIB)</label>                      <input
                        type="text"
                        placeholder="Contoh: Ada keperluan keluarga / Sakit"
                        value={alasan}
                        onChange={(e) => setAlasan(e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={() => handleAbsenPulang(absenHariIni.id, absenHariIni.jam_masuk)} 
                      className="btn btn-warning" 
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <i className="fa-solid fa-person-walking-arrow-right"></i> Lakukan Absen Pulang
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f1f5f9', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--bpn-green)' }}></i> Absensi hari ini telah selesai (Masuk: {absenHariIni.jam_masuk} | Pulang: {absenHariIni.jam_pulang})
                  </div>
                )}
              </div>

              {/* Riwayat Absen Pribadi */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--bpn-navy)', marginBottom: '1rem' }}>
                  <i className="fa-solid fa-clock-rotate-left"></i> Riwayat Kehadiran Anda
                </h3>
                {riwayat.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-400)', textAlign: 'center', padding: '1rem' }}>Belum ada riwayat absensi.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {riwayat.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px', fontSize: '0.82rem' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--bpn-navy)' }}>{item.tanggal}</div>
                          <div style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>Masuk: {item.jam_masuk} | Pulang: {item.jam_pulang || 'Belum'}</div>
                        </div>
                        <span className={`badge ${item.status_pulang?.includes('Pending') ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                          {item.status_pulang || 'Hadir'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}