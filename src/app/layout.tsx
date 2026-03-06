'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import './globals.css';

const navItems = [
  { label: 'Utilizatori', href: '/users', icon: '👤', section: 'Administrare' },
  { label: 'Notificări Email', href: '/notifications', icon: '📧', section: 'Administrare' },
  { label: 'Roluri', href: '/roles', icon: '🔑', section: 'Administrare' },
  { label: 'Companii (TERT)', href: '/companies', icon: '🏢', section: 'Companii' },
  { label: 'Curățare Duplicate', href: '/cleanup', icon: '🧹', section: 'Companii' },
];

interface UserInfo {
  authenticated: boolean;
  fullName: string;
  username: string;
  initials: string;
  group: string;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <title>DMS Admin — ANRE</title>
        <meta name="description" content="DMS Administration Panel - ANRE" />
      </head>
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <h1>DMS Admin</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => {
          const showSection = index === 0 || item.section !== navItems[index - 1].section;

          return (
            <div key={item.href}>
              {showSection && (
                <div className="sidebar-section-label">{item.section}</div>
              )}
              <Link
                href={item.href}
                className={pathname === item.href ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.initials || '...'}</div>
        <div className="user-info">
          <div className="user-name">{user?.username || 'Se încarcă...'}</div>
          <div className="user-role">INTERN\Domain Admins</div>
        </div>
      </div>
    </aside>
  );
}
