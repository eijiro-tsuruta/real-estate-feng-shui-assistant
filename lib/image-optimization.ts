const MAX_LONG_EDGE = 2_000;
const OPTIMIZE_FROM_BYTES = 1_200_000;
const MAX_DECODED_PIXELS = 50_000_000;

function toWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

function optimizedName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").slice(0, 80) || "floorplan";
  return `${base}-optimized.webp`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))}KB`;
  return `${(bytes / 1_000_000).toFixed(1)}MB`;
}

export async function optimizeFloorPlanImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const decodedPixels = bitmap.width * bitmap.height;
    if (decodedPixels > MAX_DECODED_PIXELS) {
      throw new Error(
        "画像の縦横サイズが大きすぎます。長辺を小さくしてからお試しください。",
      );
    }

    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
    const needsResize = scale < 1;
    if (!needsResize && file.size < OPTIMIZE_FROM_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const firstPass = await toWebp(canvas, 0.88);
    if (!firstPass || firstPass.type !== "image/webp") return file;
    const optimized =
      firstPass.size > OPTIMIZE_FROM_BYTES
        ? (await toWebp(canvas, 0.8)) ?? firstPass
        : firstPass;

    if (optimized.size >= file.size * 0.95) return file;

    return new File([optimized], optimizedName(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
