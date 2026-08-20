export type CropBox = { x: number; y: number; width: number; height: number };

export function clampCropBox(box: CropBox): CropBox {
  const width = Math.min(100, Math.max(10, box.width));
  const height = Math.min(100, Math.max(10, box.height));
  const x = Math.min(100 - width, Math.max(0, box.x));
  const y = Math.min(100 - height, Math.max(0, box.y));
  return { x, y, width, height };
}

export function moveCropBox(initial: CropBox, dx: number, dy: number): CropBox {
  return clampCropBox({ ...initial, x: initial.x + dx, y: initial.y + dy });
}

export function resizeCropBox(initial: CropBox, dw: number, dh: number): CropBox {
  return clampCropBox({ ...initial, width: initial.width + dw, height: initial.height + dh });
}
