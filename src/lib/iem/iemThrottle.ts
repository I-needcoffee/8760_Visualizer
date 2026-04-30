import { IEM_MIN_REQUEST_GAP_MS } from './constants';

let lastIemOutboundMs = 0;

/**
 * Enforce a minimum time between throttled calls. Used only while holding the IEM serialization lock
 * so parallel React trees cannot pass this check in the same tick.
 */
export async function throttleIemRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastIemOutboundMs;
  const wait = Math.max(0, IEM_MIN_REQUEST_GAP_MS - elapsed);
  if (wait > 0) await new Promise<void>(resolve => setTimeout(resolve, wait));
  lastIemOutboundMs = Date.now();
}

let iemOpChain: Promise<unknown> = Promise.resolve();

/**
 * Serialize every Mesonet HTTP round-trip so rapid mounts (e.g. Wind Explorer + Wind Rose + resolver)
 * cannot issue concurrent requests that trigger 429.
 */
export function runSerializedIem<T>(fn: () => Promise<T>): Promise<T> {
  const p = iemOpChain.then(() => fn());
  iemOpChain = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}
