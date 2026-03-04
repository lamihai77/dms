'use client';

import { useState } from 'react';

interface Company {
    ID: number;
    NUME: string;
    COD_CUI: string | null;
    COD_FISCAL: string | null;
    RJ: string | null;
    ADRESA: string | null;
    TELEFON: string | null;
    EMAIL: string | null;
    REPREZ_LEGAL: string | null;
    PERS_FIZ: number | null;
    ACTIV: number | null;
    BLOCAT: number | null;
    Suspendat: number | null;
    Radiat: number | null;
    AUTORIZAT: number | null;
    LICENTE_AUTORIZATII: number | null;
    PROIECTARE_INST_ELEC: number | null;
    EXECUTIE_INST_ELEC: number | null;
    CREAT_DE: string | null;
    CREAT_LA: string | null;
    MODIFICAT_DE: string | null;
    MODIFICAT_LA: string | null;
}

export default function CompaniesPage() {
    const [searchType, setSearchType] = useState<'cui' | 'denumire'>('cui');
    const [searchValue, setSearchValue] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const handleSearch = async () => {
        if (!searchValue.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/companies?${searchType}=${encodeURIComponent(searchValue)}`);
            const data = await res.json();
            if (data.success) {
                setCompanies(data.data);
                if (data.data.length === 0) setError('Nu s-au găsit companii');
            } else {
                setError(data.error);
            }
        } catch {
            setError('Eroare de conexiune');
        }
        setLoading(false);
    };

    const getStatusBadges = (c: Company) => {
        const badges = [];
        if (c.ACTIV) badges.push(<span key="a" className="badge badge-success"><span className="badge-dot"></span> Activ</span>);
        if (c.BLOCAT) badges.push(<span key="b" className="badge badge-danger"><span className="badge-dot"></span> Blocat</span>);
        if (c.Suspendat) badges.push(<span key="s" className="badge badge-warning"><span className="badge-dot"></span> Suspendat</span>);
        if (c.Radiat) badges.push(<span key="r" className="badge badge-danger"><span className="badge-dot"></span> Radiat</span>);
        if (badges.length === 0) badges.push(<span key="n" className="badge badge-info">Necunoscut</span>);
        return badges;
    };

    return (
        <div>
            <div className="page-header">
                <h2>🏢 Companii (TERT)</h2>
                <p>Caută companii după CUI sau denumire — vizualizează licențe și date fiscale</p>
            </div>

            <div className="card">
                <div className="search-bar">
                    <div className="search-input-group" style={{ maxWidth: 180 }}>
                        <label>Caută după</label>
                        <select value={searchType} onChange={(e) => setSearchType(e.target.value as typeof searchType)}>
                            <option value="cui">CUI</option>
                            <option value="denumire">Denumire</option>
                        </select>
                    </div>
                    <div className="search-input-group">
                        <label>Valoare</label>
                        <input
                            type="text"
                            placeholder={searchType === 'cui' ? 'Ex: RO12345678' : 'Ex: SC Exemplu SRL'}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div className="search-input-group" style={{ maxWidth: 120, alignSelf: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleSearch} disabled={loading} style={{ width: '100%' }}>
                            {loading ? '⏳' : '🔍'} Caută
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {error}
                </div>
            )}

            {companies.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3>Rezultate ({companies.length})</h3>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Denumire</th>
                                    <th>CUI</th>
                                    <th>Cod Fiscal</th>
                                    <th>Status</th>
                                    <th>Licențe</th>
                                    <th>Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((c) => (
                                    <tr key={c.ID}>
                                        <td style={{ color: 'var(--text-muted)' }}>{c.ID}</td>
                                        <td><strong>{c.NUME}</strong></td>
                                        <td style={{ fontFamily: 'monospace' }}>{c.COD_CUI || '—'}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{c.COD_FISCAL || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {getStatusBadges(c)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {c.AUTORIZAT ? <span className="badge badge-info">Autorizat</span> : null}
                                                {c.PROIECTARE_INST_ELEC ? <span className="badge badge-info">Proiectare</span> : null}
                                                {c.EXECUTIE_INST_ELEC ? <span className="badge badge-info">Execuție</span> : null}
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCompany(c)}>
                                                📋 Detalii
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Company Detail Modal */}
            {selectedCompany && (
                <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h3>🏢 {selectedCompany.NUME}</h3>
                            <button className="modal-close" onClick={() => setSelectedCompany(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>ID_TERT</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        {selectedCompany.ID}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>CUI</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace' }}>
                                        {selectedCompany.COD_CUI || '—'}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Cod Fiscal</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace' }}>
                                        {selectedCompany.COD_FISCAL || '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Adresă</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        {selectedCompany.ADRESA || '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Telefon</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        {selectedCompany.TELEFON || '—'}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        {selectedCompany.EMAIL || '—'}
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Reprezentant Legal</label>
                                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    {selectedCompany.REPREZ_LEGAL || '—'}
                                </div>
                            </div>

                            <h4 style={{ marginTop: '8px', fontSize: '0.9rem' }}>Licențe & Autorizații</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span className={`badge ${selectedCompany.AUTORIZAT ? 'badge-success' : 'badge-danger'}`}>
                                    {selectedCompany.AUTORIZAT ? '✅' : '❌'} Autorizat
                                </span>
                                <span className={`badge ${selectedCompany.LICENTE_AUTORIZATII ? 'badge-success' : 'badge-danger'}`}>
                                    {selectedCompany.LICENTE_AUTORIZATII ? '✅' : '❌'} Licențe
                                </span>
                                <span className={`badge ${selectedCompany.PROIECTARE_INST_ELEC ? 'badge-success' : 'badge-danger'}`}>
                                    {selectedCompany.PROIECTARE_INST_ELEC ? '✅' : '❌'} Proiectare Inst. Elec.
                                </span>
                                <span className={`badge ${selectedCompany.EXECUTIE_INST_ELEC ? 'badge-success' : 'badge-danger'}`}>
                                    {selectedCompany.EXECUTIE_INST_ELEC ? '✅' : '❌'} Execuție Inst. Elec.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
