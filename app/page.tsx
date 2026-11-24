import Link from 'next/link';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="animated-fade-in"
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
      >
        <img
          src="/logo-bpn.jpg"
          alt="Logo ATR/BPN"
          style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 0.75rem' }}
        />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--bpn-navy, #0f2a4a)', marginBottom: '0.25rem' }}>
          Tap-in ATR/BPN
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.75rem' }}>
          Kantor Pertanahan Kabupaten Subang
        </p>

        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
          Masuk sebagai:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/magang" className="btn btn-primary btn-full" style={{ padding: '0.9rem' }}>
            <i className="fa-solid fa-user-graduate"></i> Peserta Magang
          </Link>
          <Link href="/admin" className="btn btn-warning btn-full" style={{ padding: '0.9rem' }}>
            <i className="fa-solid fa-user-shield"></i> Admin
          </Link>
        </div>
      </div>
    </div>
  );
}