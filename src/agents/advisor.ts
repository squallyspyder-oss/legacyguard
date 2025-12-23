import { Octokit } from 'octokit';
import path from 'path';
import { buildGraphFromFiles, searchGraph, loadCodeFiles, CodeFile } from '../lib/indexer';
import { createPgVectorIndexer } from '../lib/indexer-pgvector';

export async function runAdvisor(task: any) {
  // task: { repoPath, files?, diff?, summary?, query? }
  const suggestions: string[] = [];
  let files: CodeFile[] = task.files || [];
  let graphSummary: { nodes: number; edges: number } | undefined;
  const vectorEnabled = Boolean(process.env.PGVECTOR_URL && process.env.OPENAI_API_KEY);

  // Se pgvector estiver configurado, upsert dos arquivos principais (limitado) antes de buscar
  let vectorHits: any[] = [];

  // Carrega arquivos do repositório (limite para performance)
  if (!files.length && task.repoPath) {
    try {
      files = await loadCodeFiles(path.resolve(task.repoPath));
    } catch (err) {
      console.error('Falha ao carregar arquivos para o Advisor', err);
    }
  }

  // Indexa em grafo leve e faz busca de contexto
  if (files.length) {
    try {
      const graph = buildGraphFromFiles(files);
      graphSummary = { nodes: graph.nodes.size, edges: graph.edges.length };
      const hits = searchGraph(task.query || task.summary || 'refatoração', graph, 5);
      hits.forEach((hit) => {
        suggestions.push(`Revisar ${hit.path} (símbolos: ${hit.symbols.slice(0, 5).join(', ')})`);
      });

      if (vectorEnabled) {
        try {
          const indexer = createPgVectorIndexer();
          const slice = files.slice(0, 40); // limite para não estourar tempo
          await Promise.allSettled(slice.map((f) => indexer.upsertFile(f)));
          vectorHits = await indexer.search(task.query || task.summary || 'refatoração', 5);
          vectorHits.forEach((hit) => {
            suggestions.push(`(vetor) Similar em ${hit.path} (símbolos: ${hit.symbols.slice(0, 5).join(', ')})`);
          });
        } catch (err) {
          console.error('pgvector search falhou', err);
        }
      }
    } catch (err) {
      console.error('Falha ao indexar/buscar grafo', err);
    }
  }

  // Sugestões padrão se nada foi encontrado
  if (!suggestions.length) {
    suggestions.push('Adicionar testes unitários para módulos críticos');
    suggestions.push('Refatorar funções extensas em helpers menores');
  }

  return {
    role: 'advisor',
    suggestions,
    evidence: task.diff || task.summary || 'sem evidência',
    graph: graphSummary,
  };
}
