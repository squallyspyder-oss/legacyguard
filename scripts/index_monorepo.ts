import path from 'path';
import fs from 'fs';
import os from 'os';
import { loadCodeFiles, CodeFile, buildGraphFromFiles } from '../src/lib/indexer';
import { createPgVectorIndexer } from '../src/lib/indexer-pgvector';

// Execução concorrente simples sem dependências externas
async function runLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers: Promise<void>[] = [];
  const runWorker = async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await fn(item);
    }
  };
  for (let i = 0; i < limit; i++) {
    workers.push(runWorker());
  }
  await Promise.all(workers);
}

async function findPackageRoots(root: string) {
  const roots = new Set<string>();
  roots.add(root);
  const candidates = ['packages', 'apps', 'services'];
  for (const c of candidates) {
    const p = path.join(root, c);
    if (!fs.existsSync(p)) continue;
    const entries = fs.readdirSync(p, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const pkgJson = path.join(p, e.name, 'package.json');
      if (fs.existsSync(pkgJson)) roots.add(path.join(p, e.name));
    }
  }

  // support workspaces field in root package.json
  try {
    const rootPkg = path.join(root, 'package.json');
    if (fs.existsSync(rootPkg)) {
      const pj = JSON.parse(fs.readFileSync(rootPkg, 'utf8'));
      if (pj.workspaces) {
        const ws = Array.isArray(pj.workspaces) ? pj.workspaces : Object.values(pj.workspaces || {});
        for (const pattern of ws) {
          // basic glob for pattern like 'packages/*'
          if (pattern.endsWith('/*')) {
            const base = pattern.replace(/\/*$/, '').replace(/\*$/, '');
            const p = path.join(root, base.replace(/\/^\//, ''));
            if (!fs.existsSync(p)) continue;
            const entries = fs.readdirSync(p, { withFileTypes: true });
            for (const e of entries) {
              const candidate = path.join(p, e.name);
              const pkgJson2 = path.join(candidate, 'package.json');
              if (fs.existsSync(pkgJson2)) roots.add(candidate);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Falha ao ler package.json workspaces', err);
  }

  return Array.from(roots);
}

async function indexRoot(root: string) {
  console.log(`\nIndexando: ${root}`);
  const files = await loadCodeFiles(root, 2000);
  console.log(`Arquivos carregados: ${files.length}`);
  const graph = buildGraphFromFiles(files);
  console.log(`Grafo: ${graph.nodes.size} nós, ${graph.edges.length} arestas`);

  const usePg = Boolean(process.env.PGVECTOR_URL && process.env.OPENAI_API_KEY);
  if (!usePg) {
    console.log('PGVECTOR_URL ou OPENAI_API_KEY não configurados — pulando ingestão vetorial.');
    return { root, files: files.length, nodes: graph.nodes.size, edges: graph.edges.length, vectorUpserted: 0 };
  }

  const indexer = createPgVectorIndexer();
  const concurrency = Math.max(2, Math.min(os.cpus().length, 8));
  let upserted = 0;
  const failures: any[] = [];

  await runLimited(files, concurrency, async (f) => {
    try {
      await indexer.upsertFile(f);
      upserted += 1;
    } catch (err) {
      failures.push({ file: f.path, err: String(err) });
    }
  });

  console.log(`Upsert vetorial concluído: ${upserted} files (falhas: ${failures.length})`);
  return { root, files: files.length, nodes: graph.nodes.size, edges: graph.edges.length, vectorUpserted: upserted, failures };
}

async function main() {
  console.log('Iniciando indexação do monorepo...');
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const roots = await findPackageRoots(root);
  console.log('Raízes detectadas para indexação:', roots);
  const reports = [] as any[];
  for (const r of roots) {
    const rep = await indexRoot(r);
    reports.push(rep);
  }
  const out = path.join(root, 'scripts', 'index_monorepo_report.json');
  fs.writeFileSync(out, JSON.stringify({ timestamp: new Date().toISOString(), reports }, null, 2));
  console.log(`Relatório salvo em ${out}`);
}

if (require.main === module) {
  main().catch((e) => { console.error('Erro no indexador', e); process.exit(1); });
}
