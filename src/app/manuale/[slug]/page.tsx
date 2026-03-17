export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDoc } from '@/lib/docs';

export default async function ManualPage({ params }: { params: { slug: string } }) {
  try {
    const md = await getDoc(params.slug);
    return (
      <div className="card">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Manual</h2>
            <p>Document: {params.slug}.md</p>
          </div>
          <Link href="/manuale" className="btn btn-ghost">← Înapoi la listă</Link>
        </div>
        <article style={{ lineHeight: 1.7 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{md}</pre>
        </article>
      </div>
    );
  } catch {
    notFound();
  }
}
