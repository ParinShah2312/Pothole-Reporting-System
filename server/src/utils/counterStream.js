import { getCounters } from '../repositories/statsRepository.js';

const subscribers = new Set();

function writeEvent(res, data) {
  res.write(`event: counters\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Subscribe an HTTP response to live Total/Active/Solved counter Server-Sent Events. */
export async function subscribeCounters(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  subscribers.add(res);
  try {
    writeEvent(res, await getCounters());
  } catch {
    // Ignore transient startup DB errors; client keeps polling fallback.
  }

  const keepalive = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepalive);
    subscribers.delete(res);
  });
}

/** Broadcast fresh counters to all active SSE listeners after a state change commits. */
export async function broadcastCounters() {
  if (!subscribers.size) return;
  const counts = await getCounters();
  for (const res of subscribers) {
    if (res.writableEnded) {
      subscribers.delete(res);
    } else {
      writeEvent(res, counts);
    }
  }
}
