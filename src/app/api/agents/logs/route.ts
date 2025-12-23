import { sandboxLogEmitter } from '../../../../lib/sandbox-logs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const taskIdFilter = url.searchParams.get('taskId');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const listener = (event: { taskId?: string; message: string; scope?: string }) => {
        if (taskIdFilter && event.taskId !== taskIdFilter) return;
        send({ type: 'sandbox-log', ...event });
      };

      sandboxLogEmitter.on('log', listener);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(':\n\n'));
      }, 15000);

      req.signal.addEventListener('abort', () => {
        sandboxLogEmitter.off('log', listener);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
