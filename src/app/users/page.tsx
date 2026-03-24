'use client';

import { useState, useEffect } from 'react';

interface User {
    ID: number;
    NUME: string;
    PRENUME: string;
    USERNAME: string;
    EMAIL: string;
    PAROLA?: string | null;
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
    PASSWORD_SET?: boolean;
    USERNAME_LDAP: string | null;
    READ_ONLY: number | null;
    ID_TERT: number | null;
    ticket_emails: string | null;
    adrese_mail_alternative: string | null;
    TERT_NUME: string | null;
    TERT_CUI: string | null;
    TERT_CNP: string | null;
    TERT_JUDET?: string | null;
    TERT_LOCALITATE?: string | null;
    NR_SUBCONTURI?: number | null;
}

interface EditPayload {
    user: User;
    formData: Record<string, string | number>;
    expectedModificatLa: string | null;
}

interface StatusPayload {
    user: User;
    newStatus: number;
    expectedModificatLa: string | null;
}

interface TableFilters {
    status: 'all' | 'active' | 'inactive';
    denumire: string;
    cuiCnp: string;
    email: string;
    username: string;
    subconturi: 'all' | 'none' | 'has';
    tip: 'all' | 'pf' | 'pj';
    tertNume: string;
    modificare: string;
    judet: string;
    localitate: string;
}

const TABLE_FILTERS_STORAGE_KEY = 'dms_users_table_filters_v1';
const DEFAULT_TABLE_FILTERS: TableFilters = {
    status: 'all',
    denumire: '',
    cuiCnp: '',
    email: '',
    username: '',
    subconturi: 'all',
    tip: 'all',
    tertNume: '',
    modificare: '',
    judet: '',
    localitate: '',
};

function normalizeStoredFilters(raw: Partial<TableFilters> | null | undefined): TableFilters {
    const next: TableFilters = { ...DEFAULT_TABLE_FILTERS };
    if (!raw || typeof raw !== 'object') return next;

    const asString = (value: unknown) => typeof value === 'string' ? value : '';
    const isIn = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
        typeof value === 'string' && (values as readonly string[]).includes(value) ? value as T : fallback;

    next.status = isIn(raw.status, ['all', 'active', 'inactive'] as const, 'all');
    next.denumire = asString(raw.denumire);
    next.cuiCnp = asString(raw.cuiCnp);
    next.email = asString(raw.email);
    next.username = asString(raw.username);
    next.subconturi = isIn(raw.subconturi, ['all', 'none', 'has'] as const, 'all');
    next.tip = isIn(raw.tip, ['all', 'pf', 'pj'] as const, 'all');
    next.tertNume = asString(raw.tertNume);
    next.modificare = asString(raw.modificare);
    next.judet = asString(raw.judet);
    next.localitate = asString(raw.localitate);
    return next;
}

export default function UsersPage() {
    const [searchValue, setSearchValue] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editUser, setEditUser] = useState<User | null>(null);
    const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
    const [filterCategory, setFilterCategory] = useState<'all' | 'ad' | 'pf' | 'pj'>('all');
    const [dataSource, setDataSource] = useState<string | null>(null);
    const [tableFilters, setTableFilters] = useState<TableFilters>({ ...DEFAULT_TABLE_FILTERS });

    // Stare pentru modalul de confirmare scriere cu 2 pași
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'status' | 'edit';
        data: StatusPayload | EditPayload | null;
        diffs: Array<{ field: string; oldValue: string; newValue: string }>;
        title: string;
        requireTyped?: string;
    }>({ isOpen: false, action: 'status', data: null, diffs: [], title: '' });

    const showToast = (type: string, message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const clearTableFilters = () => {
        setTableFilters({ ...DEFAULT_TABLE_FILTERS });
        try {
            localStorage.removeItem(TABLE_FILTERS_STORAGE_KEY);
        } catch {
            // ignore storage errors in restricted environments
        }
    };

    useEffect(() => {
        try {
            const stored = localStorage.getItem(TABLE_FILTERS_STORAGE_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored) as Partial<TableFilters>;
            setTableFilters(normalizeStoredFilters(parsed));
        } catch {
            // ignore invalid JSON or storage access issues
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(TABLE_FILTERS_STORAGE_KEY, JSON.stringify(tableFilters));
        } catch {
            // ignore storage errors in restricted environments
        }
    }, [tableFilters]);

    const handleSearch = async () => {
        const trimmedValue = searchValue.trim();
        if (!trimmedValue) return;
        setLoading(true);
        setError('');
        setFilterCategory('all'); // Reset filter to show all search results
        try {
            const res = await fetch(`/api/users?q=${encodeURIComponent(trimmedValue)}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
                setDataSource(data._meta?.source || null);
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

    const filteredUsers = users.filter(user => {
        if (filterCategory === 'all') return true;

        // AD = Active Directory users (those with LDAP username)
        if (filterCategory === 'ad') return !!user.USERNAME_LDAP;

        // PF = Persoane Fizice (Linked to a tert where PERS_FIZ = 1 or it has a CNP)
        if (filterCategory === 'pf') return !!user.TERT_CNP;

        // PJ = Persoane Juridice (Linked to a tert where PERS_FIZ = 0 or it has a CUI)
        if (filterCategory === 'pj') return !!user.TERT_CUI;

        return true;
    });

    const tableVisibleUsers = filteredUsers.filter((user) => {
        if (tableFilters.status === 'active' && user.ACTIV !== 1) return false;
        if (tableFilters.status === 'inactive' && user.ACTIV !== 0) return false;

        const denumire = `${user.NUME || ''} ${user.PRENUME || ''}`.toLowerCase();
        if (tableFilters.denumire && !denumire.includes(tableFilters.denumire.toLowerCase())) return false;

        const cuiCnp = `${user.TERT_CUI || ''} ${user.TERT_CNP || ''}`.toLowerCase();
        if (tableFilters.cuiCnp && !cuiCnp.includes(tableFilters.cuiCnp.toLowerCase())) return false;

        if (tableFilters.email && !(user.EMAIL || '').toLowerCase().includes(tableFilters.email.toLowerCase())) return false;
        if (tableFilters.username && !(user.USERNAME || '').toLowerCase().includes(tableFilters.username.toLowerCase())) return false;

        const nrSubconturi = Number(user.NR_SUBCONTURI || 0);
        if (tableFilters.subconturi === 'none' && nrSubconturi > 0) return false;
        if (tableFilters.subconturi === 'has' && nrSubconturi <= 0) return false;

        if (tableFilters.tip === 'pf' && !user.TERT_CNP) return false;
        if (tableFilters.tip === 'pj' && !user.TERT_CUI) return false;

        if (tableFilters.tertNume && !(user.TERT_NUME || '').toLowerCase().includes(tableFilters.tertNume.toLowerCase())) return false;
        if (tableFilters.judet && !(user.TERT_JUDET || '').toLowerCase().includes(tableFilters.judet.toLowerCase())) return false;
        if (tableFilters.localitate && !(user.TERT_LOCALITATE || '').toLowerCase().includes(tableFilters.localitate.toLowerCase())) return false;

        if (tableFilters.modificare) {
            const modText = `${user.MODIFICAT_DE || ''} ${formatDate(user.MODIFICAT_LA)}`.toLowerCase();
            if (!modText.includes(tableFilters.modificare.toLowerCase())) return false;
        }

        return true;
    });

    const hasActiveTableFilters =
        tableFilters.status !== DEFAULT_TABLE_FILTERS.status
        || tableFilters.denumire.trim() !== ''
        || tableFilters.cuiCnp.trim() !== ''
        || tableFilters.email.trim() !== ''
        || tableFilters.username.trim() !== ''
        || tableFilters.subconturi !== DEFAULT_TABLE_FILTERS.subconturi
        || tableFilters.tip !== DEFAULT_TABLE_FILTERS.tip
        || tableFilters.tertNume.trim() !== ''
        || tableFilters.modificare.trim() !== ''
        || tableFilters.judet.trim() !== ''
        || tableFilters.localitate.trim() !== '';

    const toggleStatus = async (user: User) => {
        const newStatus = user.ACTIV === 1 ? 0 : 1;
        try {
            const dryRunRes = await fetch(`/api/users/${user.ID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activ: newStatus, dryRun: true }),
            });
            const dryRunData = await dryRunRes.json();
            if (!dryRunData.success) {
                showToast('error', dryRunData.error || 'Eroare la prevalidare status');
                return;
            }

            const apiDiffs = Array.isArray(dryRunData.data?.changes)
                ? dryRunData.data.changes as Array<{ field: string; oldValue: string; newValue: string }>
                : [];
            const isIdempotent = !!dryRunData.data?.idempotent;
            const currentVersion = typeof dryRunData.data?.currentVersion === 'string' || dryRunData.data?.currentVersion === null
                ? dryRunData.data.currentVersion as string | null
                : (user.MODIFICAT_LA ?? null);

            if (isIdempotent || apiDiffs.length === 0) {
                showToast('success', 'Idempotent: statusul era deja setat. Nu se face scriere în DB.');
                return;
            }

            setConfirmModal({
                isOpen: true,
                action: 'status',
                data: { user, newStatus, expectedModificatLa: currentVersion },
                diffs: apiDiffs,
                title: `Schimbare status pentru: ${user.NUME} ${user.PRENUME}`,
                requireTyped: 'CONFIRM' // Solicită tastare explicită pentru schimbări de statut / acces.
            });
        } catch {
            showToast('error', 'Eroare la prevalidarea statusului');
        }
    };

    const handleSaveEdit = async (formData: Record<string, string | number>) => {
        if (!editUser) return;
        try {
            // Dry-run obligatoriu: validare server-side + diffs reale + versiune concurență.
            const dryRunRes = await fetch(`/api/users/${editUser.ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, dryRun: true }),
            });
            const dryRunData = await dryRunRes.json();
            if (!dryRunData.success) {
                showToast('error', dryRunData.error || 'Eroare la prevalidare (dry-run)');
                return;
            }

            const apiDiffs = Array.isArray(dryRunData.data?.changes)
                ? dryRunData.data.changes as Array<{ field: string; oldValue: string; newValue: string }>
                : [];
            const isIdempotent = !!dryRunData.data?.idempotent;
            const currentVersion = typeof dryRunData.data?.currentVersion === 'string' || dryRunData.data?.currentVersion === null
                ? dryRunData.data.currentVersion as string | null
                : (editUser.MODIFICAT_LA ?? null);

            if (isIdempotent || apiDiffs.length === 0) {
                showToast('success', 'Idempotent: nicio modificare reală detectată. Nu se face scriere în DB.');
                return;
            }

            setConfirmModal({
                isOpen: true,
                action: 'edit',
                data: { user: editUser, formData, expectedModificatLa: currentVersion },
                diffs: apiDiffs,
                title: `Actualizare date pentru: ${editUser.NUME} ${editUser.PRENUME}`,
                requireTyped: apiDiffs.some((d) => d.field === 'PAROLA' || d.field === 'ACTIV') ? 'CONFIRM' : undefined
            });
        } catch {
            showToast('error', 'Eroare la prevalidarea modificărilor');
        }
    };

    // Funcția care execută efectiv scrierea după confirmare
    const executeWriteAction = async () => {
        const { action, data } = confirmModal;
        if (!data) return;

        if (action === 'status') {
            const { user, newStatus, expectedModificatLa } = data as StatusPayload;
            try {
                const res = await fetch(`/api/users/${user.ID}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activ: newStatus, expectedModificatLa }),
                });
                const resData = await res.json();
                if (res.status === 409) {
                    showToast('error', 'Statusul a fost modificat între timp de alt operator. Reîncarcă și reîncearcă.');
                    if (searchValue.trim()) {
                        handleSearch();
                    }
                    return;
                }
                if (resData.success) {
                    setUsers(users.map(u => u.ID === user.ID ? { ...u, ACTIV: newStatus } : u));
                    showToast('success', resData.data.idempotent
                        ? `Idempotent: Statusul era deja setat corect. Nu a fost necesară nicio scriere în DB.`
                        : `Succes: Utilizatorul ${user.NUME} ${user.PRENUME} a fost ${newStatus ? 'activat' : 'dezactivat'} in baza de date.`);
                    if (searchValue.trim()) {
                        handleSearch();
                    }
                }
            } catch {
                showToast('error', 'Eroare la actualizarea statusului');
            }
        } else if (action === 'edit') {
            const { user, formData, expectedModificatLa } = data as EditPayload;
            try {
                const res = await fetch(`/api/users/${user.ID}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, expectedModificatLa }),
                });
                const resData = await res.json();
                if (res.status === 409) {
                    showToast('error', 'Datele au fost modificate între timp de alt operator. Reîncarcă utilizatorul și reîncearcă.');
                    setEditUser(null);
                    if (searchValue.trim()) {
                        handleSearch();
                    }
                    return;
                }
                if (resData.success) {
                    showToast('success', resData.data.idempotent
                        ? `Idempotent: Nicio modificare reală detectată față de DB. Nu s-a executat scrierea.`
                        : `Succes: Utilizatorul a fost actualizat corect in baza de date.`);
                    setEditUser(null);
                    handleSearch(); // Refresh
                } else {
                    showToast('error', resData.error || 'Eroare la actualizare');
                }
            } catch {
                showToast('error', 'Eroare la salvare');
            }
        }

        setConfirmModal({ ...confirmModal, isOpen: false });
    };

    const openEditModal = async (user: User) => {
        try {
            const res = await fetch(`/api/users/${user.ID}`);
            const data = await res.json();
            if (data.success && data.data) {
                setEditUser(data.data as User);
                return;
            }
            showToast('error', data.error || 'Nu s-au putut încărca detaliile utilizatorului');
        } catch {
            showToast('error', 'Eroare la încărcarea detaliilor utilizatorului');
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
                <h2>👤 Gestiune Utilizatori</h2>
                <p>Categorisire AD, PF, PJ și detalii contractuale</p>
                {dataSource && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span role="img" aria-label="db">📖</span> Citit din: <strong>{dataSource}</strong>
                    </div>
                )}
            </div>

            {/* Search Card */}
            <div className="card">
                <div className="search-bar" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div className="search-input-group">
                        <label>Căutare universală</label>
                        <input
                            type="text"
                            placeholder="Introdu Nume, Email, CUI, CNP sau Username..."
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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    className={`btn ${filterCategory === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilterCategory('all')}
                >
                    Toți ({users.length})
                </button>
                <button
                    className={`btn ${filterCategory === 'ad' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilterCategory('ad')}
                >
                    AD ({users.filter(u => !!u.USERNAME_LDAP).length})
                </button>
                <button
                    className={`btn ${filterCategory === 'pf' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilterCategory('pf')}
                >
                    Persoane Fizice ({users.filter(u => !!u.TERT_CNP).length})
                </button>
                <button
                    className={`btn ${filterCategory === 'pj' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilterCategory('pj')}
                >
                    Persoane Juridice ({users.filter(u => !!u.TERT_CUI).length})
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={clearTableFilters}
                    title="Șterge toate filtrele din tabel (inclusiv cele salvate)"
                >
                    🧹 Șterge filtre
                </button>
            </div>

            {hasActiveTableFilters && (
                <div
                    className="card"
                    style={{
                        marginBottom: '14px',
                        borderColor: '#f59e0b',
                        background: '#fffbeb',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                    }}
                >
                    <span>⚠️ Atenție: sunt filtre active în tabelul de rezultate.</span>
                    <button className="btn btn-ghost btn-sm" onClick={clearTableFilters}>Șterge filtre</button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="card" style={{ borderColor: 'var(--accent-danger)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {error}
                </div>
            )}

            {/* Importăm componenta de validare cu doi pași */}
            {confirmModal.isOpen && (
                <ConfirmWriteModalWrapper
                    isOpen={confirmModal.isOpen}
                    actionTitle={confirmModal.title}
                    tables={['DMS.UTILIZATORI']}
                    diffs={confirmModal.diffs}
                    requireTypedConfirm={confirmModal.requireTyped}
                    onConfirm={executeWriteAction}
                    onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false, diffs: [] })}
                />
            )}

            {/* Results Table */}
            {filteredUsers.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3>
                            Rezultate {
                                filterCategory === 'ad' ? 'AD' :
                                    filterCategory === 'pf' ? 'Persoane Fizice' :
                                        filterCategory === 'pj' ? 'Persoane Juridice' :
                                            'Toți'
                            } ({tableVisibleUsers.length}/{filteredUsers.length})
                        </h3>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Denumire</th>
                                    {filterCategory === 'pj' ? (
                                        <>
                                            <th>Cod CUI</th>
                                            <th>Email</th>
                                            <th>Username</th>
                                            <th>Județ</th>
                                            <th>Localitate</th>
                                            <th>Nr. subconturi</th>
                                        </>
                                    ) : (
                                        <>
                                            <th>Cod CUI / CNP</th>
                                            <th>Email</th>
                                            <th>Username</th>
                                            <th>Subconturi</th>
                                            <th>Tip</th>
                                            <th>TERT (Nume)</th>
                                        </>
                                    )}
                                    <th>Acțiuni</th>
                                    <th>Ultima modificare</th>
                                </tr>
                                <tr>
                                    <th>
                                        <select
                                            value={tableFilters.status}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, status: e.target.value as TableFilters['status'] }))}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="all">Toate</option>
                                            <option value="active">Activ</option>
                                            <option value="inactive">Inactiv</option>
                                        </select>
                                    </th>
                                    <th>
                                        <input
                                            value={tableFilters.denumire}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, denumire: e.target.value }))}
                                            placeholder="Filtru denumire"
                                        />
                                    </th>
                                    <th>
                                        <input
                                            value={tableFilters.cuiCnp}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, cuiCnp: e.target.value }))}
                                            placeholder="CUI/CNP"
                                        />
                                    </th>
                                    <th>
                                        <input
                                            value={tableFilters.email}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, email: e.target.value }))}
                                            placeholder="Email"
                                        />
                                    </th>
                                    <th>
                                        <input
                                            value={tableFilters.username}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, username: e.target.value }))}
                                            placeholder="Username"
                                        />
                                    </th>

                                    {filterCategory === 'pj' ? (
                                        <>
                                            <th>
                                                <input
                                                    value={tableFilters.judet}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, judet: e.target.value }))}
                                                    placeholder="Județ"
                                                />
                                            </th>
                                            <th>
                                                <input
                                                    value={tableFilters.localitate}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, localitate: e.target.value }))}
                                                    placeholder="Localitate"
                                                />
                                            </th>
                                            <th>
                                                <select
                                                    value={tableFilters.subconturi}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, subconturi: e.target.value as TableFilters['subconturi'] }))}
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="all">Toate</option>
                                                    <option value="none">Fără</option>
                                                    <option value="has">Cu</option>
                                                </select>
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th>
                                                <select
                                                    value={tableFilters.subconturi}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, subconturi: e.target.value as TableFilters['subconturi'] }))}
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="all">Toate</option>
                                                    <option value="none">Fără</option>
                                                    <option value="has">Cu</option>
                                                </select>
                                            </th>
                                            <th>
                                                <select
                                                    value={tableFilters.tip}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, tip: e.target.value as TableFilters['tip'] }))}
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="all">Toate</option>
                                                    <option value="pf">PF</option>
                                                    <option value="pj">PJ</option>
                                                </select>
                                            </th>
                                            <th>
                                                <input
                                                    value={tableFilters.tertNume}
                                                    onChange={(e) => setTableFilters((prev) => ({ ...prev, tertNume: e.target.value }))}
                                                    placeholder="TERT"
                                                />
                                            </th>
                                        </>
                                    )}

                                    <th style={{ whiteSpace: 'nowrap' }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={clearTableFilters}
                                        >
                                            Reset
                                        </button>
                                    </th>
                                    <th>
                                        <input
                                            value={tableFilters.modificare}
                                            onChange={(e) => setTableFilters((prev) => ({ ...prev, modificare: e.target.value }))}
                                            placeholder="User/data"
                                        />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableVisibleUsers.map((user) => (
                                    <tr key={user.ID}>
                                        <td>
                                            {user.ACTIV ? (
                                                <span className="badge badge-success" style={{ cursor: 'pointer' }} onClick={() => toggleStatus(user)}>
                                                    Activ
                                                </span>
                                            ) : (
                                                <span className="badge badge-danger" style={{ cursor: 'pointer' }} onClick={() => toggleStatus(user)}>
                                                    Inactiv
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <strong>{user.NUME} {user.PRENUME}</strong>
                                            {user.USERNAME_LDAP && <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>AD Account</div>}
                                        </td>
                                        <td>
                                            {user.TERT_CUI || user.TERT_CNP || '—'}
                                        </td>
                                        <td>{user.EMAIL}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{user.USERNAME}</td>

                                        {filterCategory === 'pj' ? (
                                            <>
                                                <td>{user.TERT_JUDET || '—'}</td>
                                                <td>{user.TERT_LOCALITATE || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', minWidth: '30px', textAlign: 'center' }}>
                                                        {user.NR_SUBCONTURI}
                                                    </span>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>
                                                    <span className="badge" style={{ background: '#f1f5f9', color: '#475569', minWidth: '30px', textAlign: 'center' }}>
                                                        {user.NR_SUBCONTURI}
                                                    </span>
                                                </td>
                                                <td>
                                                    {user.ID_TERT ? (
                                                        user.TERT_CNP ? (
                                                            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>PF</span>
                                                        ) : (
                                                            <span className="badge" style={{ background: '#fce7f3', color: '#be185d' }}>PJ</span>
                                                        )
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {user.TERT_NUME || '—'}
                                                </td>
                                            </>
                                        )}

                                        <td>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => openEditModal(user)}
                                            >
                                                ✏️ Detalii
                                            </button>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.78rem' }}>
                                                <strong>{user.MODIFICAT_DE || '—'}</strong>
                                                <div style={{ color: 'var(--text-muted)' }}>{formatDate(user.MODIFICAT_LA)}</div>
                                            </div>
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

// Import dinamic pentru componenta grea de vizualizare
import dynamic from 'next/dynamic';
const ConfirmWriteModalWrapper = dynamic(() => import('../../components/ConfirmWriteModal'), { ssr: false });

interface Subaccount {
    ID: number;
    ID_USER: number;
    ID_TERT: number;
    TERT_NUME: string | null;
    TERT_CUI: string | null;
    TERT_CNP: string | null;
    TERT_ACTIV: number | null;
    TERT_BLOCAT: number | null;
    TERT_JUDET: string | null;
    TERT_LOCALITATE: string | null;
}

function EditUserModal({ user, onClose, onSave }: { user: User, onClose: () => void, onSave: (data: Record<string, string | number>) => void }) {
    const [formData, setFormData] = useState({
        USERNAME: user.USERNAME || '',
        EMAIL: user.EMAIL || '',
        ACTIV: user.ACTIV ?? 0,
    });
    const [changePassword, setChangePassword] = useState(false);
    const [newPasswordValue, setNewPasswordValue] = useState('');
    const [subaccounts, setSubaccounts] = useState<Subaccount[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [subError, setSubError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSubaccounts = async () => {
            setLoadingSubs(true);
            setSubError(null);
            try {
                const res = await fetch(`/api/users/${user.ID}/subaccounts?t=${Date.now()}`);
                const data = await res.json();
                if (data.success) {
                    setSubaccounts(data.data);
                } else {
                    setSubError(data.error || 'Eroare necunoscută la API');
                }
            } catch {
                setSubError('Nu s-a putut contacta serverul');
            }
            setLoadingSubs(false);
        };
        fetchSubaccounts();
    }, [user.ID]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'ACTIV' ? Number(value) : value
        });
    };

    const handleSave = () => {
        const payload: Record<string, string | number> = { ...formData };
        const nextPassword = newPasswordValue.trim();
        if (changePassword && nextPassword.length > 0) {
            payload.PAROLA = nextPassword;
        }
        onSave(payload);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h3>Detalii Utilizator: {user.NUME} {user.PRENUME}</h3>
                    <button className="btn-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div><strong>ID:</strong> {user.ID}</div>
                            <div><strong>Username:</strong> {user.USERNAME}</div>
                            <div><strong>TERT Principal:</strong> {user.TERT_NUME || 'Fără TERT'}</div>
                            <div><strong>Identitate:</strong> {user.TERT_CUI ? 'CUI: ' + user.TERT_CUI : user.TERT_CNP ? 'CNP: ' + user.TERT_CNP : '—'}</div>
                            {user.TERT_JUDET && <div style={{ gridColumn: 'span 2' }}><strong>Locație:</strong> {user.TERT_JUDET}, {user.TERT_LOCALITATE || ''}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input name="USERNAME" value={formData.USERNAME} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label>Email Principal</label>
                        <input name="EMAIL" value={formData.EMAIL} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label>Parolă</label>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            <div><strong>Parolă setată:</strong> {(user.PASSWORD_SET ?? false) || !!user.PASS_SET_DATE ? 'Da' : 'Nu'}</div>
                            <div>
                                <strong>Ultima schimbare:</strong>{' '}
                                {user.PASS_SET_DATE
                                    ? new Date(user.PASS_SET_DATE).toLocaleString('ro-RO')
                                    : ((user.PASSWORD_SET ?? false) ? 'indisponibilă (legacy)' : '—')}
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={changePassword}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setChangePassword(enabled);
                                    if (!enabled) setNewPasswordValue('');
                                }}
                            />
                            Schimbă parola
                        </label>
                        {changePassword && (
                            <input
                                name="PAROLA_NEW"
                                type="text"
                                value={newPasswordValue}
                                onChange={(e) => setNewPasswordValue(e.target.value)}
                                placeholder="Introdu valoarea parolei pentru update"
                                style={{ marginTop: '8px' }}
                            />
                        )}
                    </div>

                    <div className="form-group">
                        <label>Status utilizator</label>
                        <select name="ACTIV" value={String(formData.ACTIV)} onChange={handleChange}>
                            <option value="1">Activ</option>
                            <option value="0">Inactiv</option>
                        </select>
                    </div>

                    {/* Subaccounts Section */}
                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{ marginBottom: '10px', fontSize: '0.95rem', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                            🏢 Subconturi / Asocieri ({subaccounts.length})
                        </h4>
                        {loadingSubs ? (
                            <div style={{ textAlign: 'center', padding: '10px' }}>Se încarcă...</div>
                        ) : subError ? (
                            <div style={{ padding: '10px', color: 'red', background: '#fee2e2', borderRadius: '4px', fontSize: '0.85rem' }}>
                                ⚠️ {subError}
                            </div>
                        ) : subaccounts.length > 0 ? (
                            // ... existing table rendering ...
                            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white' }}>
                                        <tr>
                                            <th>Denumire Tert</th>
                                            <th>CUI / CNP</th>
                                            <th>Status</th>
                                            <th>Locație</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subaccounts.map(sub => (
                                            <tr key={sub.ID}>
                                                <td>
                                                    {sub.TERT_NUME || <span style={{ color: 'red' }}>⚠️ Tert inexistent (ID: {sub.ID_TERT})</span>}
                                                </td>
                                                <td>{sub.TERT_CUI || sub.TERT_CNP || '—'}</td>
                                                <td>
                                                    {sub.TERT_ACTIV === 0 ? (
                                                        <span className="badge badge-danger">Inactiv</span>
                                                    ) : sub.TERT_BLOCAT === 1 ? (
                                                        <span className="badge badge-danger">Blocat</span>
                                                    ) : sub.TERT_ACTIV === 1 ? (
                                                        <span className="badge badge-success">Activ</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                    )}
                                                </td>
                                                <td>{sub.TERT_JUDET ? `${sub.TERT_JUDET}, ${sub.TERT_LOCALITATE || ''}` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Nu există subconturi asociate.
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ background: 'var(--bg-secondary)', marginTop: '20px', marginBottom: 0 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px' }}>ℹ️ Info Sistem</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                            <div><strong>Status:</strong> {user.ACTIV ? 'Activ' : 'Inactiv'}</div>
                            <div><strong>Locked:</strong> {user.LOCKED ? 'Da' : 'Nu'}</div>
                            <div><strong>LDAP:</strong> {user.USERNAME_LDAP || '—'}</div>
                            <div><strong>Creat la:</strong> {user.CREAT_LA ? new Date(user.CREAT_LA).toLocaleDateString() : '—'}</div>
                            <div><strong>Ultima modificare de:</strong> {user.MODIFICAT_DE || '—'}</div>
                            <div><strong>Ultima modificare la:</strong> {user.MODIFICAT_LA ? new Date(user.MODIFICAT_LA).toLocaleString('ro-RO') : '—'}</div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Anulează</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        💾 Salvează
                    </button>
                </div>
            </div>
        </div>
    );
}
