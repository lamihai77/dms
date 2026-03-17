'use client';

export default function AccessDenied() {
    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9'
        }}>
            <div style={{
                background: 'white',
                padding: '2.5rem',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                width: '100%',
                maxWidth: '420px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ margin: '0 0 0.75rem', color: '#0f172a', fontSize: '1.4rem' }}>
                    Acces Restricționat
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: '1.7', marginBottom: '1rem' }}>
                    Contul tău de rețea este valid, dar <strong>nu ai drepturi de acces</strong> la panoul DMS Admin.
                </p>
                <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                    Dacă consideri că este o eroare, contactează <strong>echipa IT</strong> pentru a solicita accesul.
                </p>
                <a href="/login" style={{
                    display: 'inline-block',
                    padding: '10px 24px',
                    background: '#f1f5f9',
                    color: '#334155',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    border: '1px solid #e2e8f0'
                }}>← Înapoi la Login</a>
            </div>
        </div>
    );
}
