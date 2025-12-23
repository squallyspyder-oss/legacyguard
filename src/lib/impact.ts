import { buildGraphFromFiles, loadCodeFiles, CodeFile, searchGraph } from './indexer';

export type ImpactResult = {
  hotspots: { path: string; symbols: string[]; reason: string }[];
  dependents: string[];
  summary: string;
};

/**
 * Heurística de impacto: encontra arquivos mais relacionados à query e lista dependentes diretos (import).
 */
export async function analyzeImpact(root: string, query: string, limit = 5): Promise<ImpactResult> {
  const files: CodeFile[] = await loadCodeFiles(root, 500);
  const graph = buildGraphFromFiles(files);
  const hits = searchGraph(query, graph, limit);

  // Dependentes (arquivos que importam o hit)
  const dependents: string[] = [];
  graph.edges.forEach((e) => {
    hits.forEach((hit) => {
      if (e.to === hit.path && !dependents.includes(e.from)) {
        dependents.push(e.from);
      }
    });
  });

  const hotspots = hits.map((h) => ({
    path: h.path,
    symbols: h.symbols.slice(0, 5),
    reason: 'Similaridade lexical com a query',
  }));

  return {
    hotspots,
    dependents: dependents.slice(0, 20),
    summary: `Arquivos mais afetados: ${hotspots.map((h) => h.path).join(', ')}`,
  };
}
