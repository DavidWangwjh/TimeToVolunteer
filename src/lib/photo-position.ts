import { z } from "zod";

export const photoPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(3),
});
export type PhotoPosition = z.infer<typeof photoPositionSchema>;
export const defaultPhotoPosition: PhotoPosition = { x: 50, y: 50, zoom: 1 };
export function photoPosition(value: unknown): PhotoPosition {
  const result = photoPositionSchema.safeParse(value);
  return result.success ? result.data : defaultPhotoPosition;
}
export function photoStyle(value: unknown) {
  const { x, y, zoom } = photoPosition(value);
  return { objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: `scale(${zoom})` };
}

// The same cover geometry is used by CSS rendering and the drag controls.
export function photoOverflow(imageWidth: number, imageHeight: number, width: number, height: number, zoom: number) {
  const scale = Math.max(width / imageWidth, height / imageHeight) * zoom;
  return { x: Math.max(0, imageWidth * scale - width), y: Math.max(0, imageHeight * scale - height) };
}
