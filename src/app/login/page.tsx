'use client';

import { useEffect, useState, type FormEvent } from 'react';

export default function LoginPage() {
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showAccessDeniedPopup, setShowAccessDeniedPopup] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err === 'Invalid') setErrorMessage('Parolă incorectă');
        if (err === 'NoAccess') {
            setErrorMessage('Nu aveți dreptul să accesați aplicația. Vă rugăm să vă adresați departamentului IT.');
            setShowAccessDeniedPopup(true);
        }
        if (err === 'ServerFail') setErrorMessage('Eroare tehnică la Autentificare');
    }, []);

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const formData = new FormData();
            formData.set('username', username);
            formData.set('password', password);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (response.ok) {
                window.location.href = '/';
                return;
            }

            const payload = await response.json().catch(() => ({} as { error?: string }));
            if (payload.error === 'Invalid') {
                setErrorMessage('Parolă incorectă');
            } else if (payload.error === 'NoAccess') {
                setErrorMessage('Nu aveți dreptul să accesați aplicația. Vă rugăm să vă adresați departamentului IT.');
                setShowAccessDeniedPopup(true);
            } else {
                setErrorMessage('Eroare tehnică la Autentificare');
            }
        } catch {
            setErrorMessage('Eroare tehnică la Autentificare');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9'
        }}>
            {showAccessDeniedPopup && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        width: '92%',
                        maxWidth: '560px',
                        background: 'white',
                        borderRadius: '14px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{ margin: 0, marginBottom: '0.8rem', color: '#991b1b', fontSize: '1.2rem' }}>
                            Acces neautorizat
                        </h3>
                        <p style={{ margin: 0, color: '#334155', lineHeight: 1.45 }}>
                            Nu aveți dreptul să accesați aplicația. Vă rugăm să vă adresați departamentului IT.
                        </p>
                        <div style={{ marginTop: '1.2rem', textAlign: 'right' }}>
                            <button
                                type="button"
                                onClick={() => setShowAccessDeniedPopup(false)}
                                style={{
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.55rem 0.9rem',
                                    background: '#b91c1c',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                <form onSubmit={handleLogin}>
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>
                            Utilizator
                        </label>
                        <input
                            type="text"
                            name="username"
                            placeholder="ex: laurentiu.mihai"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.9rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>
                            Parolă de acces
                        </label>
                        <input
                            type="password"
                            name="password"
                            placeholder="Introduceți parola"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.9rem',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: '#2563eb',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.8 : 1
                        }}
                    >
                        {isSubmitting ? 'Se autentifică...' : 'Autentificare'}
                    </button>
                </form>
            </div>
        </div>
    );
}
