import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Simple endpoint to trigger indexing of a repo for RAG
// In production, this would queue a background job

type IndexRequest = {
  repoPath?: string;
  githubUrl?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: IndexRequest = await req.json();
    const repoPath = body.repoPath || process.env.LEGACYGUARD_REPO_PATH;

    if (!repoPath) {
      return NextResponse.json({ error: 'repoPath ou LEGACYGUARD_REPO_PATH necessário' }, { status: 400 });
    }

    // Validate path exists
    if (!fs.existsSync(repoPath)) {
      return NextResponse.json({ error: `Caminho não encontrado: ${repoPath}` }, { status: 404 });
    }

    // Collect files for indexing
    const files: { path: string; size: number }[] = [];
    const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.md', '.json'];

    function walk(dir: string, base = '') {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const rel = path.join(base, entry.name);
          const full = path.join(dir, entry.name);

          // Skip common non-code dirs
          if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv'].includes(entry.name)) continue;
            walk(full, rel);
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (allowedExts.includes(ext)) {
              const stat = fs.statSync(full);
              if (stat.size < 100_000) {
                files.push({ path: rel, size: stat.size });
              }
            }
          }
        }
      } catch {
        // ignore permission errors
      }
    }

    walk(repoPath);

    // TODO: In production, store embeddings in pgvector
    // For now, return summary of indexed files

    return NextResponse.json({
      indexed: true,
      repoPath,
      fileCount: files.length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      files: files.slice(0, 50).map((f) => f.path), // sample
      message: 'Indexação concluída (in-memory). Para persistência, configure pgvector.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao indexar' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST para indexar repo. Body: { repoPath?: string, githubUrl?: string }',
  });
}
