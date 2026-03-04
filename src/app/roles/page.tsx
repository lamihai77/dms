'use client';

export default function RolesPage() {
    return (
        <div>
            <div className="page-header">
                <h2>🔑 Management Roluri</h2>
                <p>Vizualizează și editează rolurile utilizatorilor — contribuții, monitorizare EE/GN</p>
            </div>

            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon">🔑</div>
                    <h4>Funcționalitate în dezvoltare</h4>
                    <p>Necesită structura tabelelor ALOCARE_ROLURI și CATEGORII_ROLURI pentru implementare.</p>
                    <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Va permite: adăugare/ștergere roluri, vizualizare contribuții EE/GN per utilizator
                    </p>
                </div>
            </div>
        </div>
    );
}
