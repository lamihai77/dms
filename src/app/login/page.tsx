'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Citim eroarea direct din browser, evităm useSearchParams() care dă crash la SSR
        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err === 'Invalid') setErrorMessage('Parolă incorectă');
        if (err === 'ServerFail') setErrorMessage('Eroare tehnică la Autentificare');
    }, []);

    // Eliminat funcția asincronă handleLogin. Totul se gestionează acum server-side primit din formData.

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
                maxWidth: '400px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>DMS Admin</h1>
                    <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                        Autentificare necesară
                    </p>
                </div>

                {/* Formular Standard HTML (Fără React handle sub-submit) */}
                <form action="/api/auth/login" method="POST">
                    {errorMessage && (
                        <div style={{
                            color: '#ef4444',
                            backgroundColor: '#fef2f2',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            marginBottom: '1.5rem',
                            fontSize: '0.85rem',
                            border: '1px solid #fee2e2'
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>
                            Parolă de acces
                        </label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Introduceți parola"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                    >
                        Autentificare
                    </button>
                </form>
            </div>
        </div>
    );
}
