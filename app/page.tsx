import Sidebar from '@/components/sidebar';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-body animated-fade-in">
          
          {/* Header Sambutan */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--bpn-navy), var(--bpn-navy-dark))', color: 'white' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--bpn-gold)' }}>
              Sistem Absensi Peserta Magang
            </h1>
            <p style={{ color: 'var(--slate-200)', fontSize: '1rem' }}>
              Kantor Pertanahan Kabupaten Subang — Kementerian ATR/BPN. Platform digital terpadu untuk pencatatan kehadiran dan rekapitulasi kinerja peserta PKL/Magang.
            </p>
          </div>

          {/* Menu Akses Cepat */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3><i className="fa-solid fa-clipboard-user" style={{ color: 'var(--bpn-green)' }}></i> Portal Absensi Magang</h3>
              </div>
              <p style={{ marginBottom: '1.25rem', color: 'var(--slate-600)', fontSize: '0.92rem' }}>
                Silakan lakukan absensi kehadiran masuk maupun pulang menggunakan ID unik peserta (Format: Tanggal Lahir + Inisial Nama).
              </p>
              <Link href="/magang" className="btn btn-primary">
                <i className="fa-solid fa-arrow-right-to-bracket"></i> Masuk ke Portal Absensi
              </Link>
            </div>

            <div className="card">
              <div className="card-header">
                <h3><i className="fa-solid fa-chart-line" style={{ color: 'var(--bpn-gold)' }}></i> Rekapitulasi & Admin</h3>
              </div>
              <p style={{ marginBottom: '1.25rem', color: 'var(--slate-600)', fontSize: '0.92rem' }}>
                Pantau statistik kehadiran harian, filter data per instansi/sekolah, serta unduh laporan bersih dalam format CSV Excel.
              </p>
              <Link href="/rekap" className="btn btn-outline">
                <i className="fa-solid fa-file-excel"></i> Lihat Rekap & Laporan
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}