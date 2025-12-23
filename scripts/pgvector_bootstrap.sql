-- Habilita extensão pgvector (requer permissões de superuser ou role apropriada)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela para chunks de código indexados
CREATE TABLE IF NOT EXISTS code_chunks (
  path TEXT PRIMARY KEY,
  embedding vector(1536),
  content TEXT,
  symbols TEXT[]
);

-- Índice aproximado opcional (ivfflat) para acelerar buscas em bases grandes
-- Para usar, garanta "CREATE EXTENSION IF NOT EXISTS vector" e escolha list size adequado.
-- CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding ON code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Limpeza opcional
-- TRUNCATE TABLE code_chunks;
