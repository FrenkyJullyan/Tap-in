'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabase';

// ---------- Helper waktu (waktu lokal perangkat, bukan UTC) ----------
const pad = (n: number) => String(n).padStart(2, '0');

const getTanggalLokal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getJamLokal = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Data lama tersimpan dengan titik (10.56.18); tampilkan seragam dengan titik dua
const fmtJam = (j?: string | null) => (j ? j.replace(/\./g, ':') : '-');

const fmtTanggal = (t?: string | null) => {
  if (!t) return '-';
  const d = new Date(t + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const capitalize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// ---------- Style bersama ----------
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '1.5rem',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 16px rgba(15, 23, 42, 0.04)',
};

const cardTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '1.05rem',
  fontWeight: 700,
  color: 'var(--bpn-navy, #0f2a4a)',
  paddingBottom: '0.85rem',
  marginBottom: '1.1rem',
  borderBottom: '1px solid #e2e8f0',
};

const nowrap: React.CSSProperties = { whiteSpace: 'nowrap' };

export default function MagangPage() {
  const router = useRouter();
  const [nisInput, setNisInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [siswaData, setSiswaData] = useState<any>(null);
  const [sekolahNama, setSekolahNama] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [statusMasuk, setStatusMasuk] = useState('hadir');
  const [keteranganKehadiran, setKeteranganKehadiran] = useState('');
  const [dokumenPerizinan, setDokumenPerizinan] = useState<File | null>(null);
  const [riwayatSaya, setRiwayatSaya] = useState<any[]>([]);
  const [absenHariIni, setAbsenHariIni] = useState<any>(null);
  const [pesanSukses, setPesanSukses] = useState('');
  const [loading, setLoading] = useState(false);

  // State untuk form alasan pulang cepat
  const [showAlasanModal, setShowAlasanModal] = useState(false);
  const [alasanText, setAlasanText] = useState('');

  useEffect(() => {
    const tick = () => {
      setCurrentTime(getJamLokal());
      setCurrentDate(
        new Date().toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async () => {
    const cleanId = nisInput.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Masukkan ID Absensi terlebih dahulu!');
      return;
    }

    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('*')
      .ilike('nis', cleanId)
      .eq('aktif', true)
      .maybeSingle();

    if (error) {
      console.error('Login error:', error.message, error.code, error.details, error.hint);
      setErrorMsg('Gagal terhubung ke database: ' + error.message);
      return;
    }

    if (!siswa) {
      setErrorMsg('ID Peserta tidak terdaftar atau dalam status nonaktif!');
      return;
    }

    const { data: sek } = await supabase
      .from('sekolah')
      .select('nama')
      .eq('id', siswa.id_sekolah)
      .maybeSingle();

    setErrorMsg('');
    setPesanSukses('');
    setSiswaData(siswa);
    setSekolahNama(sek?.nama || 'Tidak diketahui');
    await fetchAbsensiData(siswa.id);
  };

  const fetchAbsensiData = async (siswaId: number) => {
    const today = getTanggalLokal();

    const { data: absHariIni } = await supabase
      .from('absensi')
      .select('*')
      .eq('siswa_id', siswaId)
      .eq('tanggal', today)
      .maybeSingle();

    setAbsenHariIni(absHariIni);

    const { data: riwPribadi } = await supabase
      .from('absensi')
      .select('*')
      .eq('siswa_id', siswaId)
      .order('tanggal', { ascending: false });

    setRiwayatSaya(riwPribadi || []);
  };

  const handleKirimKehadiran = async () => {
    if (loading || !siswaData || absenHariIni) return;

    const isIzin = statusMasuk === 'izin' || statusMasuk === 'sakit';
    if (isIzin && !keteranganKehadiran.trim()) {
      alert('Keterangan wajib diisi untuk pengajuan sakit atau izin.');
      return;
    }

    if (dokumenPerizinan) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(dokumenPerizinan.type)) {
        alert('Format dokumen harus JPG, PNG, WEBP, PDF, DOC, atau DOCX.');
        return;
      }
      if (dokumenPerizinan.size > 5 * 1024 * 1024) {
        alert('Ukuran dokumen maksimal 5 MB.');
        return;
      }
    }

    setLoading(true);
    let dokumenPath: string | null = null;

    try {
      if (isIzin && dokumenPerizinan) {
        const safeName = dokumenPerizinan.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        dokumenPath = `${siswaData.id}/${getTanggalLokal()}-${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('dokumen-perizinan')
          .upload(dokumenPath, dokumenPerizinan, { upsert: false, contentType: dokumenPerizinan.type });

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from('absensi').insert([
        {
          siswa_id: siswaData.id,
          sekolah_id: siswaData.id_sekolah,
          tanggal: getTanggalLokal(),
          jam_masuk: isIzin ? null : getJamLokal(),
          jam_pulang: null,
          status_masuk: statusMasuk,
          jenis_kehadiran: capitalize(statusMasuk),
          keterangan: isIzin ? keteranganKehadiran.trim() : null,
          dokumen_perizinan: dokumenPath,
        },
      ]);

      if (error) throw error;

      setPesanSukses(
        isIzin
          ? `Pengajuan ${statusMasuk} berhasil dikirim. Menunggu pencatatan oleh Admin/Pembimbing.`
          : 'Absen masuk berhasil dicatat ke dalam sistem!'
      );
      setKeteranganKehadiran('');
      setDokumenPerizinan(null);
      await fetchAbsensiData(siswaData.id);
    } catch (error: any) {
      alert('Gagal mengirim kehadiran: ' + (error?.message || 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  };

  // Tombol Absen Pulang ditekan
  const triggerAbsenPulang = () => {
    if (new Date().getHours() < 16) {
      setShowAlasanModal(true); // sebelum 16:00 wajib isi alasan
    } else {
      processAbsenPulang('');
    }
  };

  const processAbsenPulang = async (alasan: string) => {
    if (loading || !absenHariIni?.id) return;
    setLoading(true);

    const isPulangCepat = new Date().getHours() < 16;

    const { error } = await supabase
      .from('absensi')
      .update({
        jam_pulang: getJamLokal(),
        status_pulang: 'hadir',
        alasan_pulang_cepat: isPulangCepat ? alasan : null,
        status_pulang_cepat: isPulangCepat ? 'pending' : null,
      })
      .eq('id', absenHariIni.id);

    if (error) {
      alert('Gagal melakukan absen pulang: ' + error.message);
    } else {
      setShowAlasanModal(false);
      setAlasanText('');
      setPesanSukses(
        isPulangCepat
          ? 'Permintaan pulang cepat dikirim. Menunggu persetujuan Admin/Pembimbing.'
          : 'Absen pulang terekam. Terima kasih atas dedikasi hari ini!'
      );
      await fetchAbsensiData(siswaData.id);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setSiswaData(null);
    setAbsenHariIni(null);
    setRiwayatSaya([]);
    setNisInput('');
    setPesanSukses('');
    setErrorMsg('');
    setShowAlasanModal(false);
    setAlasanText('');
  };

  // ======================= TAMPILAN LOGIN =======================
  if (!siswaData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background:
            'linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.92)), url("/kantor-bpn.jpg") center/cover no-repeat, #0f172a',
        }}
      >
        <div
          className="animated-fade-in"
          style={{ ...cardStyle, width: '100%', maxWidth: '420px', padding: '2rem', borderRadius: '20px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(30, 58, 138, 0.1)',
                color: 'var(--bpn-navy, #0f2a4a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                fontSize: '1.25rem',
              }}
            >
              <i className="fas fa-user-graduate"></i>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--bpn-navy, #0f2a4a)', marginBottom: '0.25rem' }}>
              Portal Peserta Magang
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Masukkan Nomor ID Absensi Anda untuk mulai</p>
          </div>

          {errorMsg && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <i className="fas fa-exclamation-circle"></i> {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 700, color: 'var(--bpn-navy, #0f2a4a)' }}>
              <i className="fas fa-id-card"></i> Nomor ID Absensi
            </label>
            <input
              type="text"
              value={nisInput}
              onChange={(e) => setNisInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Contoh: 150709FJS"
              style={{ textTransform: 'uppercase', textAlign: 'center', fontWeight: 700, letterSpacing: '1px' }}
            />
          </div>

          <button className="btn btn-primary btn-full" onClick={handleLogin} style={{ marginTop: '0.5rem', fontWeight: 700 }}>
            <i className="fas fa-sign-in-alt"></i> Masuk Ke Portal
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button className="btn btn-danger btn-sm" onClick={() => router.push('/')}>
              <i className="fas fa-arrow-left"></i> Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sudahMengirimKehadiran = !!absenHariIni;
  const sudahMasuk = !!absenHariIni && absenHariIni.jam_masuk !== null;
  const sudahPulang = !!absenHariIni && absenHariIni.jam_pulang !== null;
  const statusIzinSakit = absenHariIni && ['sakit', 'izin'].includes(absenHariIni.status_masuk);

  // ======================= TAMPILAN DASHBOARD =======================
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background:
          'linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.9)), url("/kantor-bpn.jpg") center/cover no-repeat, #0f172a',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar role="magang" />

      <main style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '1.25rem 1rem 3rem' }}>
        {/* Sapaan */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.15rem' }}>
            Halo, {siswaData.nama}
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>{currentDate}</p>
        </div>

        <div
          className="animated-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          {/* ============ KOLOM KIRI ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Jam digital */}
            <div
              style={{
                ...cardStyle,
                background: 'linear-gradient(135deg, var(--bpn-navy, #0f2a4a), var(--bpn-navy-dark, #0a1c33))',
                color: '#ffffff',
                textAlign: 'center',
                padding: '1.75rem 1.5rem',
              }}
            >
              <i className="fas fa-clock" style={{ fontSize: '1.4rem', color: 'var(--bpn-gold, #d4a017)' }}></i>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '2px', margin: '0.35rem 0', fontVariantNumeric: 'tabular-nums' }}>
                {currentTime || '00:00:00'}
              </div>
              <small style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>
                *Jam kerja resmi pulang mulai pukul 16.00 WIB
              </small>
            </div>

            {/* Profil & aksi */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>
                <i className="fas fa-id-card-clip" style={{ color: 'var(--bpn-gold-dark, #b8860b)' }}></i>
                Profil Peserta Magang
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.55rem 1rem', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                <span style={{ color: '#64748b' }}>Nama Lengkap</span>
                <strong>{siswaData.nama}</strong>
                <span style={{ color: '#64748b' }}>Asal Instansi</span>
                <strong>{sekolahNama}</strong>
                <span style={{ color: '#64748b' }}>ID Absensi</span>
                <span>
                  <code style={{ background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                    {siswaData.nis}
                  </code>
                </span>
              </div>

              {/* Ringkasan hari ini */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Masuk hari ini</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: sudahMasuk ? '#15803d' : statusIzinSakit ? '#b45309' : '#94a3b8' }}>
                    {sudahMasuk ? fmtJam(absenHariIni.jam_masuk) : statusIzinSakit ? capitalize(absenHariIni.status_masuk) : 'Belum'}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pulang hari ini</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: sudahPulang ? '#b91c1c' : '#94a3b8' }}>
                    {sudahPulang ? fmtJam(absenHariIni.jam_pulang) : statusIzinSakit ? 'Tidak Perlu' : 'Belum'}
                  </div>
                </div>
              </div>

              {pesanSukses && (
                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                  <i className="fas fa-check-circle"></i> {pesanSukses}
                </div>
              )}

              {/* 1. BELUM ABSEN SAMA SEKALI HARI INI */}
              {!sudahMengirimKehadiran && (
                <>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label style={{ fontWeight: 700 }}>
                      <i className="fas fa-clipboard-check"></i> Status Kehadiran Hari Ini
                    </label>
                    <select value={statusMasuk} onChange={(e) => setStatusMasuk(e.target.value)}>
                      <option value="hadir">Hadir (Dinas Kerja/Normal)</option>
                      <option value="sakit">Sakit (Melampirkan Surat)</option>
                      <option value="izin">Izin (Kepentingan Resmi/Mendesak)</option>
                    </select>
                  </div>

                  {statusMasuk === 'hadir' && (
                    <button
                      className="btn btn-success btn-full"
                      style={{ padding: '0.85rem', fontWeight: 700 }}
                      onClick={handleKirimKehadiran}
                      disabled={loading}
                    >
                      <i className="fas fa-sign-in-alt"></i> {loading ? 'Memproses...' : 'Absen Masuk Sekarang'}
                    </button>
                  )}

                  {['sakit', 'izin'].includes(statusMasuk) && (
                    <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>
                        <i className="fas fa-file-circle-check"></i> Pengajuan {capitalize(statusMasuk)}
                      </h4>
                      <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                        <label style={{ fontWeight: 700 }}>
                          Keterangan <span style={{ color: '#dc2626' }}>*Wajib diisi</span>
                        </label>
                        <textarea
                          rows={3}
                          value={keteranganKehadiran}
                          onChange={(e) => setKeteranganKehadiran(e.target.value)}
                          placeholder={statusMasuk === 'sakit' ? 'Jelaskan kondisi atau alasan tidak dapat hadir...' : 'Jelaskan keperluan izin...'}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                        <label style={{ fontWeight: 700 }}>
                          Lampiran dokumen / foto <span style={{ color: '#64748b', fontWeight: 400 }}>(Opsional)</span>
                        </label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
                          onChange={(e) => setDokumenPerizinan(e.target.files?.[0] || null)}
                        />
                        <small style={{ display: 'block', color: '#64748b', marginTop: '0.35rem' }}>
                          Format JPG, PNG, WEBP, PDF, DOC, DOCX. Maksimal 5 MB.
                        </small>
                        {dokumenPerizinan && (
                          <small style={{ display: 'block', color: '#166534', marginTop: '0.35rem' }}>
                            Dipilih: {dokumenPerizinan.name}
                          </small>
                        )}
                      </div>
                      <button
                        className="btn btn-primary btn-full"
                        style={{ padding: '0.8rem', fontWeight: 700 }}
                        onClick={handleKirimKehadiran}
                        disabled={loading || !keteranganKehadiran.trim()}
                      >
                        <i className="fas fa-paper-plane"></i> {loading ? 'Mengirim...' : `Kirim Pengajuan ${capitalize(statusMasuk)}`}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* 2. SUDAH ABSEN HADIR, TAPI BELUM ABSEN PULANG */}
              {sudahMasuk && !sudahPulang && !statusIzinSakit && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-danger btn-full"
                    style={{ padding: '0.85rem', fontWeight: 700 }}
                    onClick={triggerAbsenPulang}
                    disabled={loading}
                  >
                    <i className="fas fa-sign-out-alt"></i> {loading ? 'Memproses...' : 'Absen Pulang'}
                  </button>
                </div>
              )}

              {/* 3. SUDAH SELESAI (SUDAH PULANG ATAU STATUSNYA IZIN/SAKIT) */}
              {(sudahPulang || statusIzinSakit) && (
                <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>
                  <i className="fas fa-check-circle"></i>{' '}
                  {statusIzinSakit ? (
                    <>
                      Pengajuan <strong>{capitalize(absenHariIni.status_masuk)}</strong> hari ini sudah tercatat. Anda tidak perlu melakukan absen pulang.
                    </>
                  ) : (
                    <>
                      Absensi hari ini sudah lengkap (Masuk &amp; Pulang). Terima kasih!
                    </>
                  )}
                </div>
              )}

              {/* Form alasan pulang cepat */}
              {showAlasanModal && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    background: '#fffbeb',
                    border: '1px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <h4 style={{ color: '#b45309', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <i className="fas fa-exclamation-triangle"></i> Konfirmasi Pulang Sebelum Jam 16:00
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Anda melakukan absen pulang sebelum pukul 16.00 WIB. Wajib mencantumkan alasan yang valid untuk
                    ditinjau oleh Admin.
                  </p>
                  <textarea
                    rows={3}
                    value={alasanText}
                    onChange={(e) => setAlasanText(e.target.value)}
                    placeholder="Tuliskan alasan izin pulang cepat di sini..."
                    style={{ marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={loading}
                      onClick={() => {
                        if (!alasanText.trim()) {
                          alert('Alasan wajib diisi!');
                          return;
                        }
                        processAbsenPulang(alasanText.trim());
                      }}
                    >
                      Kirim Permohonan
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowAlasanModal(false)}>
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ KOLOM KANAN ============ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>
                <i className="fas fa-history" style={{ color: 'var(--bpn-gold-dark, #b8860b)' }}></i>
                Riwayat Kehadiran Pribadi
              </div>

              <div style={{ maxHeight: '420px', overflow: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bpn-navy, #0f2a4a)', color: '#ffffff' }}>
                      {['Tanggal', 'Masuk', 'Pulang', 'Status'].map((h) => (
                        <th
                          key={h}
                          style={{
                            ...nowrap,
                            textAlign: 'left',
                            padding: '0.7rem 0.85rem',
                            fontWeight: 700,
                            position: 'sticky',
                            top: 0,
                            background: 'var(--bpn-navy, #0f2a4a)',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatSaya.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                          Belum ada catatan absensi
                        </td>
                      </tr>
                    ) : (
                      riwayatSaya.map((a, i) => (
                        <tr key={a.id ?? i} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ ...nowrap, padding: '0.7rem 0.85rem' }}>{fmtTanggal(a.tanggal)}</td>
                          <td style={{ ...nowrap, padding: '0.7rem 0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtJam(a.jam_masuk)}
                          </td>
                          <td style={{ ...nowrap, padding: '0.7rem 0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtJam(a.jam_pulang)}
                          </td>
                          <td style={{ ...nowrap, padding: '0.7rem 0.85rem' }}>
                            {a.status_pulang_cepat === 'pending' ? (
                              <span className="badge badge-warning">Menunggu Admin</span>
                            ) : a.status_pulang_cepat === 'rejected' ? (
                              <span className="badge badge-danger">Ditolak Admin</span>
                            ) : (
                              <span className={`badge badge-${a.status_masuk === 'hadir' ? 'success' : 'warning'}`}>
                                {capitalize(a.status_masuk)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-sm"
                onClick={handleLogout}
                style={{ padding: '0.65rem 1.75rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
              >
                <i className="fas fa-sign-out-alt"></i> Keluar Portal
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}