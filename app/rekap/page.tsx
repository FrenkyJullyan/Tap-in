'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/sidebar';
import { supabase } from '@/lib/supabase';

interface AbsensiRecord {
  id: string;
  unique_id: string;
  nama: string;
  instansi: string;
  tanggal: string;
  jam_masuk: string;
  jam_pulang: string | null;
  status: string;
  status_pulang: string | null;
  alasan_pulang_cepat: string | null;
}

export default function RekapLaporan() {
  const [dataAbsensi, setDataAbsensi] = useState<AbsensiRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Ambil data dari Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('jam_masuk', { ascending: false });

      if (error) throw error;

      setDataAbsensi(data || []);
      setFilteredData(data || []);
    } catch (err) {
      console.error('Gagal memuat data rekap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Data berdasarkan Tanggal & Pencarian Nama/ID
  useEffect(() => {
    let result = dataAbsensi;

    if (selectedDate) {
      result = result.filter((item) => item.tanggal === selectedDate);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          item.unique_id.toLowerCase().includes(q)
      );
    }

    setFilteredData(result);
  }, [searchQuery, selectedDate, dataAbsensi]);

  // Fungsi Ekspor ke CSV (Pemisah titik koma ';' khusus Excel Indonesia)
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    // Header CSV dengan pemisah titik koma (;)
    const headers = ['ID Unik;Nama Peserta;Tanggal;Jam Masuk;Jam Pulang;Status Kehadiran;Status Pulang;Alasan Pulang Cepat'];
    
    const rows = filteredData.map((item) => [
      `"${item.unique_id}"`,
      `"${item.nama}"`,
      `"${item.tanggal}"`,
      `"${item.jam_masuk || '-'}"`,
      `"${item.jam_pulang || '-'}"`,
      `"${item.status}"`,
      `"${item.status_pulang || 'Selesai'}"`,
      `"${item.alasan_pulang_cepat || '-'}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n'); // Tambah BOM UTF-8 agar karakter tidak rusak di Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Absensi_Magang_${selectedDate || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-body animated-fade-in">
          
          {/* Header Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bpn-navy), var(--bpn-navy-dark))', color: 'white', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.2)', color: 'var(--bpn-gold)', marginBottom: '0.5rem', display: 'inline-block' }}>
                  <i className="fa-solid fa-file-excel"></i> Laporan & Rekapitulasi
                </span>
                <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#fff', marginBottom: '0.35rem' }}>
                  Rekap Kehadiran Peserta Magang
                </h1>
                <p style={{ color: 'var(--slate-200)', fontSize: '0.92rem', maxWidth: '600px' }}>
                  Pantau daftar kehadiran harian, lakukan pencarian data, dan unduh laporan bersih dalam format CSV kompatibel Excel.
                </p>
              </div>
              <button onClick={handleExportCSV} className="btn btn-success">
                <i className="fa-solid fa-download"></i> Ekspor CSV (.csv)
              </button>
            </div>
          </div>

          {/* Filter & Pencarian Bar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Filter Berdasarkan Tanggal</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cari Nama atau ID Unik</label>
                <input 
                  type="text" 
                  placeholder="Ketik nama atau ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabel Data Rekap */}
          <div className="card">
            <div className="card-header">
              <h3><i className="fa-solid fa-table" style={{ color: 'var(--bpn-navy)' }}></i> Data Absensi Harian ({filteredData.length} Data)</h3>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '0.75rem', color: 'var(--bpn-navy)' }}></i>
                <p>Memuat data rekapitulasi...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                <i className="fa-solid fa-folder-open fa-2x" style={{ marginBottom: '0.75rem' }}></i>
                <p>Tidak ada data absensi ditemukan untuk filter tersebut.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID Unik</th>
                      <th>Nama Peserta</th>
                      <th>Tanggal</th>
                      <th>Jam Masuk</th>
                      <th>Jam Pulang</th>
                      <th>Status Kehadiran</th>
                      <th>Status Pulang</th>
                      <th>Keterangan Pulang Cepat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.unique_id}</strong></td>
                        <td>{item.nama}</td>
                        <td>{item.tanggal}</td>
                        <td><span className="badge badge-success">{item.jam_masuk}</span></td>
                        <td>
                          {item.jam_pulang ? (
                            <span className="badge badge-warning">{item.jam_pulang}</span>
                          ) : (
                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.82rem' }}>Belum Pulang</span>
                          )}
                        </td>
                        <td>{item.status}</td>
                        <td>
                          <span className={`badge ${item.status_pulang?.includes('Pending') ? 'badge-danger' : 'badge-success'}`}>
                            {item.status_pulang || 'Selesai'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                          {item.alasan_pulang_cepat || '-'}
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