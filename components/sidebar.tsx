'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Halaman Utama', icon: 'fa-house' },
    { href: '/magang', label: 'Portal Peserta Magang', icon: 'fa-user-graduate' },
    { href: '/admin', label: 'Panel Administrator', icon: 'fa-user-shield' },
  ];

  return (
    <>
      {/* Top Bar Header (Muncul di HP & Desktop secara bersih) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--bpn-navy)',
          color: '#fff',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: '#fff',
          }}
        >
          <img
            src="/logo-bpn.png"
            alt="Logo BPN"
            style={{ width: '34px', height: '34px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', lineHeight: '1.2' }}>
              Tap-in ATR/BPN
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--bpn-gold)' }}>
              Kabupaten Subang
            </div>
          </div>
        </Link>

        {/* Tombol Buka/Tutup Menu */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            cursor: 'pointer',
          }}
        >
          <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
      </header>

      {/* Latar Gelap (Backdrop) saat menu terbuka */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            zIndex: 45,
          }}
        />
      )}

      {/* Drawer Menu Buka-Tutup */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-280px',
          width: '260px',
          height: '100vh',
          background: '#fff',
          zIndex: 50,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          transition: 'right 0.25s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '1rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--slate-200)',
          }}
        >
          <span style={{ fontWeight: '700', color: 'var(--bpn-navy)', fontSize: '0.95rem' }}>
            Menu Navigasi
          </span>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--slate-500)',
              fontSize: '1.2rem',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: active ? '700' : '500',
                  background: active ? 'var(--bpn-navy)' : 'transparent',
                  color: active ? '#fff' : 'var(--slate-700)',
                }}
              >
                <i
                  className={`fa-solid ${item.icon}`}
                  style={{ width: '20px', textAlign: 'center', color: active ? 'var(--bpn-gold)' : 'var(--slate-400)' }}
                ></i>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)' }}>
          ATR/BPN Kab. Subang
        </div>
      </aside>
    </>
  );
}