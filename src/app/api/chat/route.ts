import { NextRequest, NextResponse } from 'next/server';
import { runChat } from '@/agents/chat';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message || '';
    if (!message.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const deep = Boolean(body?.deep);
    const repoPath = body?.repoPath as string | undefined;

    const result = await runChat({ message, deep, repoPath });

    return NextResponse.json({
      reply: result.reply,
      suggestOrchestrate: result.suggestOrchestrate,
      costTier: result.costTier,
      usage: result.usage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro no modo chat' }, { status: 500 });
  }
}
