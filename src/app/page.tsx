'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>DMS Administration Panel — Sistem intern ANRE</p>
      </div>

      <div className="stats-grid">
        <Link href="/users" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              👤
            </div>
            <div className="stat-info">
              <h4>Utilizatori</h4>
              <p>Căutare, editare, status</p>
            </div>
          </div>
        </Link>

        <Link href="/notifications" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              📧
            </div>
            <div className="stat-info">
              <h4>Notificări</h4>
              <p>Log email-uri trimise</p>
            </div>
          </div>
        </Link>

        <Link href="/roles" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              🔑
            </div>
            <div className="stat-info">
              <h4>Roluri</h4>
              <p>Management roluri utilizatori</p>
            </div>
          </div>
        </Link>

        <Link href="/companies" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              🏢
            </div>
            <div className="stat-info">
              <h4>Companii</h4>
              <p>Căutare TERT, licențe</p>
            </div>
          </div>
        </Link>

        <Link href="/cleanup" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              🧹
            </div>
            <div className="stat-info">
              <h4>Curățare</h4>
              <p>Duplicate companii (CUI)</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>🔒 Informații Securitate</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.8' }}>
          Această aplicație este accesibilă exclusiv membrilor grupului <strong>INTERN\Domain Admins</strong>.
          <br />
          Autentificarea se face automat prin Windows Authentication (SSO).
          <br />
          Toate modificările sunt înregistrate cu utilizatorul și timestamp-ul.
        </p>
      </div>
    </div>
  );
}
