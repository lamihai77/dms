'use client';

import { useState } from 'react';

interface User {
    ID: number;
    NUME: string;
    PRENUME: string;
    USERNAME: string;
    EMAIL: string;
    ACTIV: number;
    LOCKED: number;
    LOCKED_AT: string | null;
    LOGIN_FAIL_REMAINS: number | null;
    DATA_ACTIV_START: string | null;
    DATA_ACTIV_END: string | null;
    CREAT_DE: string | null;
    CREAT_LA: string | null;
    MODIFICAT_DE: string | null;
    MODIFICAT_LA: string | null;
    PASS_SET_DATE: string | null;
    USERNAME_LDAP: string | null;
    READ_ONLY: number | null;
    ID_TERT: number | null;
    ticket_emails: string | null;
    adrese_mail_alternative: string | null;
    TERT_NUME: string | null;
    TERT_CUI: string | null;
}

export default function UsersPage() {
    const [searchType, setSearchType] = useState<'email' | 'cnp' | 'username' | 'nume'>('email');
    const [searchValue, setSearchValue] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editUser, setEditUser] = useState<User | null>(null);
    const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

    const showToast = (type: string, message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSearch = async () => {
        if (!searchValue.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/users?${searchType}=${encodeURIComponent(searchValue)}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
                if (data.data.length === 0) {
                    setError('Nu s-au găsit utilizatori');
                }
            } else {
                setError(data.error);
            }
        } catch {
            setError('Eroare de conexiune');
        }
        setLoading(false);
    };

    const toggleStatus = async (user: User) => {
        const newStatus = user.ACTIV === 1 ? 0 : 1;
        try {
            const res = await fetch(`/api/users/${user.ID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activ: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setUsers(users.map(u => u.ID === user.ID ? { ...u, ACTIV: newStatus } : u));
                showToast('success', `Utilizatorul ${user.NUME} ${user.PRENUME} a fost ${newStatus ? 'activat' : 'dezactivat'}`);
            }
        } catch {
            showToast('error', 'Eroare la actualizarea statusului');
        }
    };

    const handleSaveEdit = async (formData: Record<string, string>) => {
        if (!editUser) return;
        try {
            const res = await fetch(`/api/users/${editUser.ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Utilizatorul a fost actualizat');
                setEditUser(null);
                handleSearch(); // Refresh
            } else {
                showToast('error', data.error);
            }
        } catch {
            showToast('error', 'Eroare la salvare');
        }
    };

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('ro-RO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div>
            <div className="page-header">
                <h2>👤 Căutare Utilizatori</h2>
                <p>Caută, vizualizează și editează utilizatori din DMS</p>
            </div>

            {/* Search Card */}
            <div className="card">
                <div className="search-bar">
                    <div className="search-input-group" style={{ maxWidth: 180 }}>
                        <label>Caută după</label>
                        <select
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                        >
                            <option value="email">Email</option>
                            <option value="cnp">CNP</option>
                            <option value="username">Username</option>
                            <option value="nume">Nume</option>
                        </select>
                    </div>
                    <div className="search-input-group">
                        <label>Valoare</label>
                        <input
                            type="text"
                            placeholder={`Introdu ${searchType}...`}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="search-input-group" style={{ maxWidth: 120, alignSelf: 'flex-end' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleSearch}
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            {loading ? '⏳' : '🔍'} Caută
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="card" style={{ borderColor: 'var(--accent-danger)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {error}
                </div>
            )}

            {/* Results Table */}
            {users.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3>Rezultate ({users.length})</h3>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nume</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Locked</th>
                                    <th>Companie</th>
                                    <th>Modificat</th>
                                    <th>Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.ID}>
                                        <td style={{ color: 'var(--text-muted)' }}>{user.ID}</td>
                                        <td>
                                            <strong>{user.NUME}</strong> {user.PRENUME}
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{user.USERNAME}</td>
                                        <td>{user.EMAIL}</td>
                                        <td>
                                            <label className="toggle" title={user.ACTIV ? 'Activ' : 'Inactiv'}>
                                                <input
                                                    type="checkbox"
                                                    checked={user.ACTIV === 1}
                                                    onChange={() => toggleStatus(user)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </td>
                                        <td>
                                            {user.LOCKED ? (
                                                <span className="badge badge-danger">
                                                    <span className="badge-dot"></span> Blocat
                                                </span>
                                            ) : (
                                                <span className="badge badge-success">
                                                    <span className="badge-dot"></span> OK
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {user.TERT_NUME ? (
                                                <span title={`CUI: ${user.TERT_CUI}`} style={{ fontSize: '0.82rem' }}>
                                                    {user.TERT_NUME}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {formatDate(user.MODIFICAT_LA)}
                                            {user.MODIFICAT_DE && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    de {user.MODIFICAT_DE}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setEditUser(user)}
                                            >
                                                ✏️ Editează
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* Toast */}
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

function EditUserModal({
    user,
    onClose,
    onSave,
}: {
    user: User;
    onClose: () => void;
    onSave: (data: Record<string, string>) => void;
}) {
    const [formData, setFormData] = useState({
        NUME: user.NUME || '',
        PRENUME: user.PRENUME || '',
        EMAIL: user.EMAIL || '',
        ticket_emails: user.ticket_emails || '',
        adrese_mail_alternative: user.adrese_mail_alternative || '',
    });

    const updateField = (field: string, value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>✏️ Editare: {user.NUME} {user.PRENUME}</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        ID: {user.ID} | Username: {user.USERNAME} |
                        {user.ID_TERT ? ` TERT: ${user.TERT_NUME} (${user.TERT_CUI})` : ' Fără TERT'}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Nume</label>
                            <input
                                type="text"
                                value={formData.NUME}
                                onChange={(e) => updateField('NUME', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Prenume</label>
                            <input
                                type="text"
                                value={formData.PRENUME}
                                onChange={(e) => updateField('PRENUME', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={formData.EMAIL}
                            onChange={(e) => updateField('EMAIL', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Ticket Emails</label>
                        <input
                            type="text"
                            value={formData.ticket_emails}
                            onChange={(e) => updateField('ticket_emails', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Adrese Mail Alternative</label>
                        <input
                            type="text"
                            value={formData.adrese_mail_alternative}
                            onChange={(e) => updateField('adrese_mail_alternative', e.target.value)}
                        />
                    </div>

                    <div className="card" style={{ background: 'var(--bg-secondary)', marginBottom: 0 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px' }}>ℹ️ Info Cont</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                            <div>Status: {user.ACTIV ? '✅ Activ' : '❌ Inactiv'}</div>
                            <div>Locked: {user.LOCKED ? '🔒 Da' : '🔓 Nu'}</div>
                            <div>LDAP: {user.USERNAME_LDAP || '—'}</div>
                            <div>Parolă setată: {user.PASS_SET_DATE ? new Date(user.PASS_SET_DATE).toLocaleDateString('ro-RO') : '—'}</div>
                            <div>Creat de: {user.CREAT_DE || '—'} la {user.CREAT_LA ? new Date(user.CREAT_LA).toLocaleDateString('ro-RO') : '—'}</div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
                    <button className="btn btn-primary" onClick={() => onSave(formData)}>
                        💾 Salvează
                    </button>
                </div>
            </div>
        </div>
    );
}
