export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The rectangle an image of natural size (nw, nh) occupies inside a box of
 * (cw, ch) under `object-fit: cover` with `object-position: px py` (0..1).
 * Same maths the browser uses, so anything positioned in this rect in image
 * fractions lines up with the pixels underneath at any aspect ratio.
 */
export function coverRect(cw: number, ch: number, nw: number, nh: number, px = 0.5, py = 0.5): Rect {
  const scale = Math.max(cw / nw, ch / nh);
  const width = nw * scale;
  const height = nh * scale;
  return { x: (cw - width) * px, y: (ch - height) * py, width, height };
}
