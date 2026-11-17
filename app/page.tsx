'use client';

import Link from 'next/link';

export default function HomePerfectCenter() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url("/kantor-bpn.jpg") center/cover no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 100,
      }}
    >
      {/* Card Utama Tepat di Tengah */}
      <div
        className="animated-fade-in"
        style={{
          width: '100%',
          maxWidth: '410px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2.25rem 1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          textAlign: 'center',
        }}
      >
        <img
          src="/logo-bpn.png"
          alt="Logo ATR/BPN"
          style={{ width: '68px', height: '68px', objectFit: 'contain', margin: '0 auto 1rem' }}
        />

        <span
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            color: 'var(--bpn-gold-dark)',
            fontWeight: '700',
            fontSize: '0.7rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '20px',
            marginBottom: '0.5rem',
            display: 'inline-block',
            letterSpacing: '0.5px',
          }}
        >
          SISTEM ABSENSI MAGANG & PKL
        </span>

        <h1
          style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: 'var(--bpn-navy)',
            marginBottom: '0.25rem',
          }}
        >
          Kantor Pertanahan Kab. Subang
        </h1>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--slate-500)',
            marginBottom: '1.75rem',
          }}
        >
          Silakan pilih akses masuk sesuai peran Anda:
        </p>

        {/* Tombol Pilihan Peran */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Link
            href="/magang"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bpn-navy)',
              color: '#ffffff',
              padding: '1.05rem 1.25rem',
              borderRadius: '14px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bpn-gold)' }}>
                <i className="fa-solid fa-user-graduate"></i>
              </div>
              Peserta Magang
            </span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.8rem', color: 'var(--bpn-gold)' }}></i>
          </Link>

          <Link
            href="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              color: 'var(--bpn-navy)',
              border: '1.5px solid #cbd5e1',
              padding: '1.05rem 1.25rem',
              borderRadius: '14px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '0.95rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(22, 101, 52, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bpn-green)' }}>
                <i className="fa-solid fa-user-shield"></i>
              </div>
              Administrator
            </span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}></i>
          </Link>
        </div>

        <div style={{ marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.72rem', color: 'var(--slate-400)' }}>
          Kementerian ATR / Badan Pertanahan Nasional
        </div>
      </div>
    </div>
  );
}