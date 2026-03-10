// ============================================
// UTILIZATORI table
// ============================================
export interface Utilizator {
    ID: number;
    NUME: string;
    PRENUME: string;
    USERNAME: string;
    PAROLA: string;
    EMAIL: string;
    NR_ORE: number;
    ID_UNITATE: number;
    ACTIV: number; // 0 = inactive, 1 = active
    SECURITY_CODE: string | null;
    DATA_ACTIV_START: Date | null;
    DATA_ACTIV_END: Date | null;
    CREAT_DE: string | null;
    CREAT_LA: Date | null;
    MODIFICAT_DE: string | null;
    MODIFICAT_LA: Date | null;
    PASS_SET_DATE: Date | null;
    LOGIN_FAIL_REMAINS: number | null;
    LOCKED: number; // 0 = unlocked, 1 = locked
    SHOW_FIRST_LOGIN: number | null;
    USERNAME_LDAP: string | null;
    BLOCK_TRIGGER: number | null;
    READ_ONLY: number | null;
    PRIORITAR: number | null;
    CHEIE_SECURITATE: string | null;
    ROWID: string | null;
    parola_c: string | null;
    ticket_emails: string | null;
    adrese_mail_alternative: string | null;
    block_download: number | null;
    ID_TERT: number | null;
    COOKIE_ACCEPTED: number | null;
    DATA_COOKIE_ACCEPTED: Date | null;
    LOCKED_AT: Date | null;
    DLP: number | null;
    import_info2: string | null;
    TERT_NUME?: string | null;
    TERT_CUI?: string | null;
    TERT_CNP?: string | null;
    TERT_JUDET?: string | null;
    TERT_LOCALITATE?: string | null;
    NR_SUBCONTURI?: number | null;
}

// ============================================
// TERT table (Companies)
// ============================================
export interface Tert {
    ID: number;
    PREFIX: string | null;
    NUME: string;
    SUFIX: string | null;
    RJ: string | null;
    COD_CUI: string | null;
    COD_FISCAL: string | null;
    CLIENT: number | null;
    FURNIZOR: number | null;
    PFA: number | null;
    ID_UNITATE: number | null;
    BLOCAT: number | null;
    CREAT_DE: string | null;
    CREAT_LA: Date | null;
    MODIFICAT_DE: string | null;
    MODIFICAT_LA: Date | null;
    ADRESA: string | null;
    ID_JUDET: number | null;
    COD_POSTAL: string | null;
    TELEFON: string | null;
    EMAIL: string | null;
    WEB: string | null;
    INFO: string | null;
    PERSOANA_CONTACT: string | null;
    PERS_FIZ: number | null;
    CNP: string | null;
    SERIE_ACT: string | null;
    NUMAR_ACT: string | null;
    ELIBERAT_DE: string | null;
    DATA_ELIBERARII: Date | null;
    REPREZ_LEGAL: string | null;
    ID_TIP_ACT: string | null;
    ACTIV: number | null;
    Suspendat: number | null;
    Radiat: number | null;
    AUTORIZAT: number | null;
    LICENTE_AUTORIZATII: number | null;
    PROIECTARE_INST_ELEC: number | null;
    EXECUTIE_INST_ELEC: number | null;
    ID_TERT_PARINTE: number | null;
}

// ============================================
// Search & Filter types
// ============================================
export interface UserSearchParams {
    email?: string;
    cnp?: string;
    username?: string;
    nume?: string;
}

export interface TertSearchParams {
    cui?: string;
    denumire?: string;
    id?: number;
}

export interface UserUpdateData {
    NUME?: string;
    PRENUME?: string;
    EMAIL?: string;
    ACTIV?: number;
    LOCKED?: number;
    PAROLA?: string;
    ticket_emails?: string;
    adrese_mail_alternative?: string;
}

export interface AuditLog {
    action: string;
    table_name: string;
    record_id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    modified_by: string;
    modified_at: Date;
}

export interface DuplicateCompany {
    COD_CUI: string;
    records: Tert[];
    hasFinancialEvents: boolean;
    hasLicenses: boolean;
    allocatedUsers: Utilizator[];
    recommendedKeepId: number;
    redundantIds: number[];
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    total?: number;
    _meta?: {
        source?: string;
        db?: string;
    };
}
