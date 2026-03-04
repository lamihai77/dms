'use client';

import { useState } from 'react';

interface Duplicate {
    COD_CUI: string;
    record_count: number;
    tert_ids: number[];
    tert_names: string;
    allocated_users: {
        USER_ID: number;
        NUME: string;
        PRENUME: string;
        EMAIL: string;
        ID_TERT: number;
    }[];
}

export default function CleanupPage() {
    const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

    const showToast = (type: string, message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const scanDuplicates = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/cleanup');
            const data = await res.json();
            if (data.success) {
                setDuplicates(data.data);
                if (data.data.length === 0) {
                    setError('Nu s-au găsit duplicate!');
                }
            } else {
                setError(data.error);
            }
        } catch {
            setError('Eroare de conexiune');
        }
        setLoading(false);
    };

    const executeCleanup = async (dup: Duplicate, keepId: number) => {
        const removeIds = dup.tert_ids.filter(id => id !== keepId);

        if (!confirm(`Ești sigur că vrei să păstrezi ID ${keepId} și să blochezi ${removeIds.join(', ')}?\n\n${dup.allocated_users.length} utilizatori vor fi reasociați automat.`)) {
            return;
        }

        setProcessing(dup.COD_CUI);
        try {
            const res = await fetch('/api/cleanup/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keepId, removeIds }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Cleanup executat: ${data.data.processed} înregistrări procesate`);
                setDuplicates(duplicates.filter(d => d.COD_CUI !== dup.COD_CUI));
            } else {
                showToast('error', data.error);
            }
        } catch {
            showToast('error', 'Eroare la executarea cleanup-ului');
        }
        setProcessing(null);
    };

    return (
        <div>
            <div className="page-header">
                <h2>🧹 Curățare Companii Duplicate</h2>
                <p>Detectează și curăță companiile cu CUI duplicat din tabela TERT</p>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ marginBottom: '4px' }}>Scanare Duplicate</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Caută CUI-uri cu mai mult de o înregistrare în TERT
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={scanDuplicates} disabled={loading}>
                        {loading ? '⏳ Scanare...' : '🔍 Scanează'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {error}
                </div>
            )}

            {duplicates.map((dup) => (
                <div key={dup.COD_CUI} className="card">
                    <div className="card-header">
                        <div>
                            <h3>
                                CUI: <span style={{ fontFamily: 'monospace', color: 'var(--accent-warning)' }}>{dup.COD_CUI}</span>
                                <span className="badge badge-warning" style={{ marginLeft: '8px' }}>
                                    {dup.record_count} înregistrări
                                </span>
                            </h3>
                        </div>
                    </div>

                    {/* TERT IDs */}
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            ID-uri TERT:
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {dup.tert_ids.map((id) => (
                                <div key={id} style={{
                                    padding: '8px 16px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>ID: {id}</span>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={() => executeCleanup(dup, id)}
                                        disabled={processing === dup.COD_CUI}
                                    >
                                        ✅ Păstrează
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {dup.tert_names}
                        </div>
                    </div>

                    {/* Allocated Users */}
                    {dup.allocated_users.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--accent-warning)' }}>
                                ⚠️ Utilizatori alocați ({dup.allocated_users.length}):
                            </h4>
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>User ID</th>
                                            <th>Nume</th>
                                            <th>Email</th>
                                            <th>ID_TERT curent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dup.allocated_users.map((u) => (
                                            <tr key={u.USER_ID}>
                                                <td>{u.USER_ID}</td>
                                                <td>{u.NUME} {u.PRENUME}</td>
                                                <td>{u.EMAIL}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{u.ID_TERT}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {dup.allocated_users.length === 0 && (
                        <p style={{ color: 'var(--accent-success)', fontSize: '0.85rem' }}>
                            ✅ Niciun utilizator alocat — curățare sigură
                        </p>
                    )}
                </div>
            ))}

            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}
