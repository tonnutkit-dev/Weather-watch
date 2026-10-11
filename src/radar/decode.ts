/** Decode before qualifying transport/cache admission. This is not viewport/GPU pixel verification. */
export async function decodeRadarImage(data: ArrayBuffer, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const blob = new Blob([data], { type: 'image/png' });
  if (typeof createImageBitmap === 'function') {
    const image = await createImageBitmap(blob);
    try { signal.throwIfAborted(); } finally { image.close(); }
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const image = new Image(), url = URL.createObjectURL(blob);
    const cleanup = () => { image.onload = null; image.onerror = null; signal.removeEventListener('abort', abort); URL.revokeObjectURL(url); };
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Aborted', 'AbortError')); };
    image.onload = () => { cleanup(); signal.aborted ? reject(new DOMException('Aborted', 'AbortError')) : resolve(); };
    image.onerror = () => { cleanup(); reject(new Error('Radar image decoding failed')); };
    signal.addEventListener('abort', abort, { once: true });
    image.src = url;
  });
}
