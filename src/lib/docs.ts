import path from 'path';
import { promises as fs } from 'fs';

async function resolveDocsDir(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'docs'),
    path.join(process.cwd(), '..', 'docs'),
    path.join(process.cwd(), '..', '..', 'docs'),
    path.join(process.cwd(), '..', '..', '..', 'docs'),
    // In standalone, server.js lives in .next/standalone
    path.join(path.dirname(process.execPath), 'docs'),
  ];
  for (const dir of candidates) {
    try {
      const st = await fs.stat(dir);
      if (st.isDirectory()) return dir;
    } catch { /* skip */ }
  }
  // Fallback to CWD/docs even if missing; subsequent reads will error cleanly
  return path.join(process.cwd(), 'docs');
}

export type DocItem = {
  slug: string;
  title: string;
};

export async function getDocsList(): Promise<DocItem[]> {
  const DOCS_DIR = await resolveDocsDir();
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
  const files = entries.filter(e => e.isFile() && /\.(md|mdx)$/i.test(e.name));

  const items: DocItem[] = [];
  for (const f of files) {
    const slug = f.name.replace(/\.(md|mdx)$/i, '');
    const raw = await fs.readFile(path.join(DOCS_DIR, f.name), 'utf8');
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() || slug;
    items.push({ slug, title });
  }
  return items.sort((a, b) => a.title.localeCompare(b.title, 'ro'));
}

export async function getDoc(slug: string): Promise<string> {
  const DOCS_DIR = await resolveDocsDir();
  const candidates = [
    path.join(DOCS_DIR, `${slug}.md`),
    path.join(DOCS_DIR, `${slug}.mdx`),
  ];

  for (const p of candidates) {
    try {
      const content = await fs.readFile(p, 'utf8');
      return content;
    } catch {
      // try next candidate
    }
  }
  throw new Error('Doc not found');
}
