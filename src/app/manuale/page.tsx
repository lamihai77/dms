export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { getDocsList } from '@/lib/docs';

type DocGroup = {
  label: string;
  items: Awaited<ReturnType<typeof getDocsList>>;
};

function groupLabelBySlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes('deploy') || s.includes('rollback') || s.includes('ops')) return 'Operare';
  if (s.includes('user') || s.includes('guide')) return 'Utilizare';
  if (s.includes('technical')) return 'Tehnic';
  if (s.includes('conversation') || s.includes('summary')) return 'Istoric';
  return 'Altele';
}

export default async function ManualePage() {
  const docs = await getDocsList();
  const groupsMap = new Map<string, Awaited<ReturnType<typeof getDocsList>>>();

  for (const doc of docs) {
    const label = groupLabelBySlug(doc.slug);
    const list = groupsMap.get(label) || [];
    list.push(doc);
    groupsMap.set(label, list);
  }

  const orderedLabels = ['Operare', 'Utilizare', 'Tehnic', 'Istoric', 'Altele'];
  const groups: DocGroup[] = orderedLabels
    .filter((label) => groupsMap.has(label))
    .map((label) => ({
      label,
      items: (groupsMap.get(label) || []).sort((a, b) => a.title.localeCompare(b.title, 'ro')),
    }));

  return (
    <div className="card">
      <div className="page-header">
        <h2>Manuale</h2>
        <p>Documentație și ghiduri pentru administratori (vizualizare tip arbore)</p>
      </div>

      {docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h4>Nu există documente disponibile</h4>
          <p>Adaugă fișiere .md în directorul docs/</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {groups.map((group) => (
            <details key={group.label} open style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                {group.label} ({group.items.length})
              </summary>
              <ul style={{ listStyle: 'none', padding: '10px 0 2px 16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map((doc) => (
                  <li key={doc.slug}>
                    <Link href={`/manuale/${doc.slug}`} className="btn btn-ghost" style={{ display: 'inline-flex' }}>
                      📘 {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
