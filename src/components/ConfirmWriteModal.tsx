import React, { useState } from 'react';

export interface DataDiff {
    field: string;
    oldValue: any;
    newValue: any;
}

interface ConfirmWriteModalProps {
    isOpen: boolean;
    actionTitle: string;
    tables: string[];
    diffs?: DataDiff[];
    requireTypedConfirm?: string; // e.g., "CONFIRM". If set, user must type this to proceed.
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmWriteModal({
    isOpen,
    actionTitle,
    tables,
    diffs = [],
    requireTypedConfirm,
    onConfirm,
    onCancel
}: ConfirmWriteModalProps) {
    const [step, setStep] = useState<1 | 2>(1); // 1 = Verificare prealabilă, 2 = Confirmare finală scriere
    const [typedConfirm, setTypedConfirm] = useState('');

    if (!isOpen) return null;

    const handleNextStep = () => {
        setStep(2);
    };

    const isConfirmDisabled = requireTypedConfirm
        ? typedConfirm.toLowerCase() !== requireTypedConfirm.toLowerCase()
        : false;

    return (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
            <div className="modal-content" style={{ maxWidth: '550px', borderTop: '4px solid var(--accent-warning)' }}>
                <div className="modal-header">
                    <h3>⚠️ Validare Scriere PROD</h3>
                    <button className="btn-close" onClick={onCancel}>&times;</button>
                </div>

                <div className="modal-body">
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '15px', fontSize: '1rem', borderBottom: '1px solid #475569', paddingBottom: '8px' }}>
                        {actionTitle}
                    </h4>

                    {diffs.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                Diferențe Detectate:
                            </strong>
                            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a', color: '#94a3b8' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #334155' }}>Câmp</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155' }}>Valoare Veche</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #334155', borderLeft: '1px solid #334155' }}>Valoare Nouă</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diffs.map((diff, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < diffs.length - 1 ? '1px solid #334155' : 'none' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e2e8f0' }}>{diff.field}</td>
                                                <td style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderLeft: '1px solid #334155', textDecoration: 'line-through' }}>
                                                    {diff.oldValue !== null && diff.oldValue !== '' ? String(diff.oldValue) : '(gol)'}
                                                </td>
                                                <td style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', borderLeft: '1px solid #334155', fontWeight: 600 }}>
                                                    {diff.newValue !== null && diff.newValue !== '' ? String(diff.newValue) : '(gol)'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#0f172a', fontSize: '0.95rem' }}>
                            Tabele Afectate (PROD SQL):
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#334155' }}>
                            {tables.map(table => (
                                <li key={table} style={{ marginBottom: '4px' }}>
                                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                                        {table}
                                    </code>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {step === 1 ? (
                        <div style={{ padding: '12px', background: '#fffbeb', color: '#b45309', borderLeft: '4px solid #f59e0b', borderRadius: '4px', fontSize: '0.85rem' }}>
                            Te rugăm să verifici cu atenție diferențele evidențiate mai sus. Dacă totul este corect, poți continua validarea pentru a salva noile date.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ padding: '12px', background: '#fef2f2', color: '#b91c1c', borderLeft: '4px solid #ef4444', borderRadius: '4px', fontSize: '0.85rem' }}>
                                Ești pe cale să modifici ireversibil datele din mediul de Producție (PROD). Te rugăm să fii absolut sigur înainte de a confirma operațiunea.
                            </div>

                            {requireTypedConfirm && (
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                                        Căsuță de siguranță: Pentru a preveni click-uri accidentale, tastați <strong>{requireTypedConfirm}</strong> mai jos:
                                    </label>
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid #ef4444', borderRadius: '4px', background: 'var(--bg-input)', color: '#fca5a5' }}
                                        placeholder={requireTypedConfirm}
                                        value={typedConfirm}
                                        onChange={(e) => setTypedConfirm(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onCancel}>Anulează</button>
                    {step === 1 ? (
                        <button className="btn" style={{ background: '#f59e0b', color: 'white' }} onClick={handleNextStep}>
                            1. Datele sunt Corecte
                        </button>
                    ) : (
                        <button
                            className="btn"
                            style={{ background: isConfirmDisabled ? '#64748b' : '#ef4444', color: 'white', opacity: isConfirmDisabled ? 0.7 : 1, transition: 'all 0.2s' }}
                            onClick={onConfirm}
                            disabled={isConfirmDisabled}
                        >
                            2. Confirmare Execuție Scriere
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
