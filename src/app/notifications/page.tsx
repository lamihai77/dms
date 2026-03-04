'use client';

export default function NotificationsPage() {
    return (
        <div>
            <div className="page-header">
                <h2>📧 Verificare Notificări Email</h2>
                <p>Verifică dacă s-au trimis notificări către utilizatori — log din AUTO_EMAILS</p>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon">📧</div>
                    <h4>Funcționalitate în dezvoltare</h4>
                    <p>Necesită structura tabelei AUTO_EMAILS pentru implementare completă.</p>
                    <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Va afișa: email-uri trimise, status (reușit/eșuat), dată, subiect, destinatar
                    </p>
                </div>
            </div>
        </div>
    );
}
