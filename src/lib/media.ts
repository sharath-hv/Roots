import { MEDIA } from '../config';

let chosen: number | null = null;

/** One width per visit: the smallest encode for phones and small screens, the largest above. */
export function mediaWidth() {
  if (chosen) return chosen;
  const sorted = [...MEDIA.widths].sort((a, b) => a - b);
  const devicePx = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  chosen = window.innerWidth >= 900 && devicePx > 1600 ? sorted[sorted.length - 1] : sorted[0];
  return chosen;
}

export const clipUrl = (name: string) => `${MEDIA.base}/${name}-${mediaWidth()}.mp4`;
export const stillUrl = (name: string) => `${MEDIA.base}/${name}-${mediaWidth()}.jpg`;
export const framesBase = (name: string) => `${MEDIA.base}/frames/${name}`;

export function isSafari() {
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Android/.test(ua);
}

/** Fetch with byte progress. Reports 1 at the end when Content-Length is missing. */
export async function fetchWithProgress(url: string, onProgress: (p: number) => void, signal?: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  if (!res.body || !total) {
    const blob = await res.blob();
    onProgress(1);
    return blob;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.min(loaded / total, 1));
  }
  return new Blob(chunks, { type: res.headers.get('Content-Type') || 'video/mp4' });
}
