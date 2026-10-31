import { photoStyle } from "@/lib/photo-position";

export function PhotoFrame({ src, alt, position, className = "", onError }: { src: string; alt: string; position?: unknown; className?: string; onError?: () => void }) {
  return <div className={`overflow-hidden ${className}`}>
    {/* Full source stays intact; each viewport crops around the saved position. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} draggable={false} className="h-full w-full object-cover" style={photoStyle(position)} onError={onError} />
  </div>;
}
