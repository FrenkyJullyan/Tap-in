'use client';

import { useState } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabase';

export default function PortalMagang() {
  const [uniqueId, setUniqueId] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // State untuk form alasan pulang cepat jika jam < 16:00
  const [showAlasanModal, setShowAlasanModal] = useState(false);
  const [alasan, setAlasan] = useState('');

  // Fungsi Absen Masuk (Tanpa Instansi)
  const handleAbsenMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniqueId || !nama) {
      setMessage({ type: 'error', text: 'Mohon lengkapi ID Unik dan Nama Lengkap Anda!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Cek apakah sudah absen masuk hari ini
      const { data: existing } = await supabase
        .from('absensi')
        .select('*')
        .eq('unique_id', uniqueId.trim().toUpperCase())
        .eq('tanggal', today)
        .single();

      if (existing) {
        setMessage({ type: 'error', text: 'ID ini sudah tercatat melakukan Absen Masuk hari ini.' });
        setLoading(false);
        return;
      }

      // Simpan ke database (instansi dikosongkan atau diatur default)
      const { error } = await supabase.from('absensi').insert([
        {
          unique_id: uniqueId.trim().toUpperCase(),
          nama: nama.trim(),
          instansi: '-',
          tanggal: today,
          jam_masuk: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          status: 'Hadir',
        },
      ]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Absen Masuk berhasil dicatat! Selamat beraktivitas.' });
      setUniqueId('');
      setNama('');
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memproses absen: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi Absen Pulang
  const handleAbsenPulang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniqueId) {
      setMessage({ type: 'error', text: 'Masukkan ID Unik Peserta terlebih dahulu!' });
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    
    // Jika pulang sebelum jam 16:00 WIB, wajib isi alasan
    if (currentHour < 16 && !showAlasanModal) {
      setShowAlasanModal(true);
      return;
    }

    processPulang(alasan);
  };

  const processPulang = async (keteranganAlasan = '') => {
    setLoading(true);
    setMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing, error: fetchError } = await supabase
        .from('absensi')
        .select('*')
        .eq('unique_id', uniqueId.trim().toUpperCase())
        .eq('tanggal', today)
        .single();

      if (fetchError || !existing) {
        setMessage({ type: 'error', text: 'Data absen masuk hari ini tidak ditemukan untuk ID tersebut.' });
        setLoading(false);
        return;
      }

      if (existing.jam_pulang) {
        setMessage({ type: 'error', text: 'Anda sudah melakukan Absen Pulang hari ini.' });
        setLoading(false);
        return;
      }

      const currentHour = new Date().getHours();
      const statusPulang = currentHour < 16 ? 'Pending (Pulang Cepat)' : 'Selesai';

      const { error: updateError } = await supabase
        .from('absensi')
        .update({
          jam_pulang: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          alasan_pulang_cepat: keteranganAlasan,
          status_pulang: statusPulang,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;

      setMessage({ 
        type: 'success', 
        text: currentHour < 16 
          ? 'Absen pulang dicatat. Karena sebelum jam 16:00, status menunggu verifikasi admin.' 
          : 'Absen Pulang berhasil dicatat. Hati-hati di jalan!' 
      });
      
      setUniqueId('');
      setShowAlasanModal(false);
      setAlasan('');
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memproses absen pulang: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-body animated-fade-in">
          
          {/* Header Banner Portal */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bpn-navy), var(--bpn-navy-dark))', color: 'white', marginBottom: '1.75rem' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: 'var(--bpn-gold)', marginBottom: '0.5rem', display: 'inline-block' }}>
                <i className="fa-solid fa-clock"></i> Portal Resmi Harian
              </span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#fff', marginBottom: '0.35rem' }}>
                Portal Absensi Peserta Magang
              </h1>
              <p style={{ color: 'var(--slate-200)', fontSize: '0.92rem', maxWidth: '650px' }}>
                Silakan lakukan absensi kehadiran masuk dan pulang menggunakan ID Unik Anda format <strong style={{ color: 'var(--bpn-gold)' }}>DDMMYY + Inisial</strong>.
              </p>
            </div>
          </div>

          {/* Notifikasi Alert */}
          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} style={{ fontSize: '1.1rem' }}></i>
              <span>{message.text}</span>
            </div>
          )}

          {/* Grid Formulir Absensi */}
          <div className="grid-2">
            
            {/* Card Absen Masuk */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3><i className="fa-solid fa-arrow-right-to-bracket" style={{ color: 'var(--bpn-green)' }}></i> Absen Masuk</h3>
                <span className="badge badge-success">Kehadiran</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                Lakukan absensi saat tiba di Kantor Pertanahan Kabupaten Subang.
              </p>

              <form onSubmit={handleAbsenMasuk} style={{ display: 'flex', flexDirection: 'column', flex: '1', justifyContent: 'space-between' }}>
                <div>
                  <div className="form-group">
                    <label>ID Unik Peserta</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 170804AS" 
                      value={uniqueId}
                      onChange={(e) => setUniqueId(e.target.value)}
                      required 
                    />
                    <small style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                      Format: TanggalLahir(DDMMYY) + InisialNama
                    </small>
                  </div>
                  <div className="form-group">
                    <label>Nama Lengkap</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama lengkap Anda" 
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-success btn-full" disabled={loading} style={{ marginTop: '1.25rem' }}>
                  <i className="fa-solid fa-check-circle"></i> {loading ? 'Memproses...' : 'Kirim Absen Masuk'}
                </button>
              </form>
            </div>

            {/* Card Absen Pulang */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3><i className="fa-solid fa-arrow-right-from-bracket" style={{ color: 'var(--bpn-gold-dark)' }}></i> Absen Pulang</h3>
                <span className="badge badge-warning">Jam Kerja: 16:00 WIB</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                Lakukan absensi saat jam kerja selesai atau saat izin meninggalkan kantor lebih awal.
              </p>

              <form onSubmit={handleAbsenPulang} style={{ display: 'flex', flexDirection: 'column', flex: '1', justifyContent: 'space-between' }}>
                <div>
                  <div className="form-group">
                    <label>ID Unik Peserta</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 170804AS" 
                      value={uniqueId}
                      onChange={(e) => setUniqueId(e.target.value)}
                      required 
                    />
                    <small style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                      Masukkan ID unik yang sama seperti saat absen masuk.
                    </small>
                  </div>

                  {showAlasanModal && (
                    <div className="form-group animated-fade-in" style={{ background: '#fef3c7', padding: '1rem', borderRadius: '10px', border: '1.5px solid #fcd34d', marginTop: '1rem' }}>
                      <label style={{ color: '#92400e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> Pulang Sebelum Jam 16:00 WIB
                      </label>
                      <p style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: '0.6rem' }}>
                        Jam kepulangan kurang dari ketentuan instansi. Wajib mengisi alasan untuk verifikasi admin:
                      </p>
                      <textarea 
                        rows={3}
                        placeholder="Contoh: Izin ada keperluan mendadak dari pihak sekolah..."
                        value={alasan}
                        onChange={(e) => setAlasan(e.target.value)}
                        required
                        style={{ background: '#fff' }}
                      ></textarea>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ background: 'var(--slate-50)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--slate-200)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                    <i className="fa-solid fa-circle-info" style={{ color: 'var(--bpn-navy)', marginRight: '0.4rem' }}></i>
                    Jam operasional kantor berakhir pukul 16:00 WIB. Pulang lebih awal memerlukan persetujuan admin.
                  </div>

                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    <i className="fa-solid fa-person-walking-arrow-right"></i> {loading ? 'Memproses...' : (showAlasanModal ? 'Kirim Absen dengan Alasan' : 'Kirim Absen Pulang')}
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}