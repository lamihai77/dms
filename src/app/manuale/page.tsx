export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { getDocsList } from '@/lib/docs';

export default async function ManualePage() {
  const docs = await getDocsList();

  return (
    <div className="card">
      <div className="page-header">
        <h2>Manuale</h2>
        <p>Documentație și ghiduri pentru administratori</p>
      </div>

      {docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h4>Nu există documente disponibile</h4>
          <p>Adaugă fișiere .md în directorul docs/</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {docs.map(doc => (
            <li key={doc.slug}>
              <Link href={`/manuale/${doc.slug}`} className="btn btn-ghost" style={{ display: 'inline-flex' }}>
                📘 {doc.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
