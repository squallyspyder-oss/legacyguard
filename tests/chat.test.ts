import { describe, it, expect, vi } from 'vitest';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked reply' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        }),
      },
    };
  },
}));

import { runChat } from '../src/agents/chat';

describe('chat agent', () => {
  it('returns reply and usage', async () => {
    const result = await runChat({ message: 'Olá, explique o projeto' });
    expect(result.reply).toBe('Mocked reply');
    expect(result.costTier).toBe('cheap');
    expect(result.usage).toBeDefined();
    expect(result.usage?.totalTokens).toBe(150);
  });

  it('suggests orchestration for action keywords', async () => {
    const result = await runChat({ message: 'crie um PR para corrigir o bug' });
    expect(result.suggestOrchestrate).toBe(true);
  });

  it('does not suggest orchestration for questions', async () => {
    const result = await runChat({ message: 'o que é esse projeto?' });
    expect(result.suggestOrchestrate).toBe(false);
  });

  it('uses deep model when deep=true', async () => {
    const result = await runChat({ message: 'Análise profunda', deep: true });
    expect(result.costTier).toBe('deep');
  });
});
