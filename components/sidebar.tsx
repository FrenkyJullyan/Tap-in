'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Beranda', href: '/', icon: 'fa-house' },
    { name: 'Portal Magang', href: '/magang', icon: 'fa-user-check' },
    { name: 'Rekap Laporan', href: '/rekap', icon: 'fa-file-excel' },
    { name: 'Admin Dashboard', href: '/admin', icon: 'fa-lock' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Image src="/logo-bpn.jpg" alt="Logo ATR/BPN" width={42} height={42} />
        <div className="sidebar-brand-text">
          <h2>ATR / BPN</h2>
          <p>Kabupaten Subang</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--slate-300)', textAlign: 'center' }}>
          &copy; 2026 ATR/BPN Subang
        </p>
      </div>
    </aside>
  );
}