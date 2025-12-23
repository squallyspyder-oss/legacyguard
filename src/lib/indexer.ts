import fs from 'fs';
import path from 'path';

export type CodeFile = { path: string; content: string };
export type CodeNode = { id: string; path: string; symbols: string[]; contentSnippet: string };
export type CodeEdge = { from: string; to: string; kind: 'import' | 'call' | 'ref' | 'test' };
export type GraphIndex = { nodes: Map<string, CodeNode>; edges: CodeEdge[]; inverted: Map<string, Set<string>> };

/** Load code files from disk with conservative limits to avoid huge scans. */
export async function loadCodeFiles(root: string, maxFiles = 200, maxBytesPerFile = 200 * 1024, exts = ['.ts', '.tsx', '.js', '.jsx', '.json']) {
  const files: CodeFile[] = [];
  const stack = [root];
  while (stack.length && files.length < maxFiles) {
    const current = stack.pop();
    if (!current) continue;
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      const entries = fs.readdirSync(current);
      entries.forEach((e) => stack.push(path.join(current, e)));
    } else {
      const ext = path.extname(current).toLowerCase();
      if (!exts.includes(ext)) continue;
      if (stats.size > maxBytesPerFile) continue;
      const content = fs.readFileSync(current, 'utf8');
      files.push({ path: path.relative(root, current), content });
    }
  }
  return files;
}

/** Build a lightweight in-memory graph index from code files. */
export function buildGraphFromFiles(files: CodeFile[]): GraphIndex {
  const nodes = new Map<string, CodeNode>();
  const edges: CodeEdge[] = [];
  const inverted = new Map<string, Set<string>>();

  files.forEach((file) => {
    const id = file.path;
    const symbols = extractSymbols(file.content);
    nodes.set(id, {
      id,
      path: file.path,
      symbols,
      contentSnippet: file.content.slice(0, 400),
    });

    // Import edges (crude heuristic)
    const imports = Array.from(file.content.matchAll(/import\s+[^'"`]+from\s+['"]([^'"`]+)['"]/g)).map((m) => m[1]);
    imports.forEach((imp) => {
      edges.push({ from: id, to: imp, kind: 'import' });
    });

    symbols.forEach((sym) => {
      const key = sym.toLowerCase();
      if (!inverted.has(key)) inverted.set(key, new Set());
      inverted.get(key)!.add(id);
    });
  });

  return { nodes, edges, inverted };
}

/** Simple keyword-based search over the inverted index. */
export function searchGraph(query: string, graph: GraphIndex, limit = 5) {
  const tokens = tokenize(query);
  const scores: Record<string, number> = {};
  tokens.forEach((t) => {
    const set = graph.inverted.get(t);
    if (!set) return;
    set.forEach((id) => {
      scores[id] = (scores[id] || 0) + 1;
    });
  });
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => graph.nodes.get(id)!)
    .filter(Boolean);
}

/** Stub for plugging into a graph DB / vector DB later (RAG). */
export type ExternalIndexer = {
  upsertFile?: (file: CodeFile) => Promise<void>;
  search?: (query: string, limit?: number) => Promise<CodeNode[]>;
};

export function tokenize(text: string) {
  return text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
}

export function extractSymbols(content: string) {
  const symbols = new Set<string>();
  const regexes = [
    /function\s+([a-zA-Z0-9_]+)/g,
    /class\s+([a-zA-Z0-9_]+)/g,
    /const\s+([a-zA-Z0-9_]+)\s*=\s*\(/g,
    /export\s+(?:const|function|class)\s+([a-zA-Z0-9_]+)/g,
  ];
  regexes.forEach((re) => {
    let m;
    while ((m = re.exec(content)) !== null) {
      symbols.add(m[1]);
    }
  });
  return Array.from(symbols).slice(0, 50);
}

/**
 * Nota: para RAG avançado, conecte aqui um grafo (Neo4j/Memgraph) ou um vetor store (pgvector/Milvus).
 * O fluxo recomendado:
 * 1) Extrair AST e relações (import, chamada, teste) e salvar como nós/arestas.
 * 2) Enviar embeddings das funções/arquivos para vetor store.
 * 3) Consultar por similaridade + travessia de grafo para contexto preciso.
 */
