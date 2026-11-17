'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabase';

interface AbsensiRecord {
  id: string;
  unique_id: string;
  nama: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string | null;
  status_pulang: string | null;
  alasan_pulang_cepat: string | null;
}

export default function AdminDashboard() {
  const [dataPending, setDataPending] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ambil data yang status pulangnya masih pending (pulang cepat)
  const fetchPendingData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .ilike('status_pulang', '%Pending%')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setDataPending(data || []);
    } catch (err: any) {
      console.error('Gagal memuat data pending:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  // Fungsi Verifikasi (Setujui Pulang Cepat)
  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('absensi')
        .update({ status_pulang: 'Disetujui (Pulang Cepat)' })
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Izin pulang cepat berhasil disetujui!' });
      fetchPendingData();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menyetujui izin: ' + err.message });
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-body animated-fade-in">
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bpn-navy), var(--bpn-navy-dark))', color: 'white', marginBottom: '1.75rem' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: 'var(--bpn-gold)', marginBottom: '0.5rem', display: 'inline-block' }}>
                <i className="fa-solid fa-lock"></i> Panel Administrator
              </span>
              <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#fff', marginBottom: '0.35rem' }}>
                Verifikasi Pulang Cepat Peserta Magang
              </h1>
              <p style={{ color: 'var(--slate-200)', fontSize: '0.92rem', maxWidth: '650px' }}>
                Daftar peserta magang yang melakukan absensi kepulangan sebelum pukul 16:00 WIB dan memerlukan tinjauan admin.
              </p>
            </div>
          </div>

          {/* Notifikasi */}
          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
              <span>{message.text}</span>
            </div>
          )}

          {/* Tabel Pending */}
          <div className="card">
            <div className="card-header">
              <h3><i className="fa-solid fa-list-check" style={{ color: 'var(--bpn-gold-dark)' }}></i> Daftar Menunggu Verifikasi ({dataPending.length})</h3>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '0.75rem', color: 'var(--bpn-navy)' }}></i>
                <p>Memuat data verifikasi...</p>
              </div>
            ) : dataPending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                <i className="fa-solid fa-circle-check fa-2x" style={{ marginBottom: '0.75rem', color: 'var(--bpn-green)' }}></i>
                <p>Tidak ada pengajuan izin pulang cepat yang tertunda saat ini.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID Unik</th>
                      <th>Nama Peserta</th>
                      <th>Tanggal</th>
                      <th>Jam Pulang</th>
                      <th>Alasan Pulang Cepat</th>
                      <th>Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPending.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.unique_id}</strong></td>
                        <td>{item.nama}</td>
                        <td>{item.tanggal}</td>
                        <td><span className="badge badge-warning">{item.jam_pulang}</span></td>
                        <td style={{ color: 'var(--slate-700)', fontStyle: 'italic' }}>
                          "{item.alasan_pulang_cepat || 'Tidak ada alasan'}"
                        </td>
                        <td>
                          <button 
                            onClick={() => handleApprove(item.id)}
                            className="btn btn-success btn-sm"
                          >
                            <i className="fa-solid fa-check"></i> Setujui
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}