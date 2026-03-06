import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

/** Call once at server startup to attach the WS server to the HTTP server. */
export function initWss(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log(`[wss] client connected  (total: ${wss!.clients.size})`);
    ws.on('close', () =>
      console.log(`[wss] client disconnected (total: ${wss!.clients.size})`),
    );
    ws.on('error', (err) => console.error('[wss] socket error', err));
  });

  console.log('[wss] WebSocket server ready on /ws');
}

/** Broadcast a JSON-serialisable payload to every connected client. */
export function broadcast(data: unknown): void {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
