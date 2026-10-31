"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoFrame } from "./PhotoFrame";
import { defaultPhotoPosition, photoOverflow, photoPosition, photoStyle, type PhotoPosition } from "@/lib/photo-position";

export function PhotoEditor({ src, initialPosition, kind, busy = false, onSave, onCancel }: {
  src: string; initialPosition?: unknown; kind: "cover" | "avatar"; busy?: boolean;
  onSave: (position: PhotoPosition) => void; onCancel: () => void;
}) {
  const [position, setPosition] = useState(() => photoPosition(initialPosition));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; position: PhotoPosition } | null>(null);
  const avatar = kind === "avatar";
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth) setReady(true);
  }, []);
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
    <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{avatar ? "Edit profile photo" : "Edit cover photo"}</DialogTitle>
        <DialogDescription>{avatar ? "Drag to reposition, or use the sliders. The circle shows how your profile photo will appear." : "Drag to reposition, or use the sliders. Preview both screen sizes, choose Use photo, then Save Profile to apply."}</DialogDescription></DialogHeader>
      {!avatar && <div className="flex gap-2"><Button type="button" size="sm" variant={!mobile ? "default" : "outline"} onClick={() => setMobile(false)}>Desktop</Button><Button type="button" size="sm" variant={mobile ? "default" : "outline"} onClick={() => setMobile(true)}>Mobile</Button></div>}
      <div ref={viewport} className={`relative mx-auto touch-none overflow-hidden bg-slate-100 ${avatar ? "aspect-square w-64 max-w-full" : mobile ? "aspect-video w-80 max-w-full rounded-lg" : "aspect-[3/1] w-full rounded-lg"} ${busy ? "" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={(event) => { if (!ready || busy) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, position }; }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        onPointerMove={(event) => {
          if (!drag.current || !image.current || !viewport.current) return;
          const rect = viewport.current.getBoundingClientRect();
          const overflow = photoOverflow(image.current.naturalWidth, image.current.naturalHeight, rect.width, rect.height, position.zoom);
          const start = drag.current;
          const clamp = (value: number) => Math.max(0, Math.min(100, value));
          setPosition({ ...start.position, x: overflow.x > 0 ? clamp(start.position.x - (event.clientX - start.x) / overflow.x * 100) : start.position.x, y: overflow.y > 0 ? clamp(start.position.y - (event.clientY - start.y) / overflow.y * 100) : start.position.y });
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={image} src={src} alt="Photo framing preview" draggable={false} style={photoStyle(position)} className="h-full w-full select-none object-cover" onLoad={() => setReady(true)} onError={() => { setFailed(true); setReady(false); }} />
        {avatar && <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_80px_rgba(0,0,0,0.45)]" />}
      </div>
      {failed && <p role="alert" className="text-sm text-red-700">This photo could not be loaded. Cancel and choose another image.</p>}
      <div className="space-y-3">
        {([['zoom', 'Zoom', 1, 3, 0.05], ['x', 'Horizontal position', 0, 100, 1], ['y', 'Vertical position', 0, 100, 1]] as const).map(([key, label, min, max, step]) => <label key={key} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-sm"><span>{label}</span><input aria-label={label} type="range" className="w-full cursor-pointer accent-emerald-700" min={min} max={max} step={step} disabled={busy || !ready} value={position[key]} onChange={(event) => setPosition({ ...position, [key]: Number(event.target.value) })} /><span className="text-right tabular-nums">{key === 'zoom' ? `${position.zoom.toFixed(1)}×` : `${Math.round(position[key])}%`}</span></label>)}
      </div>
      {avatar && <div className="flex items-center gap-3 text-sm text-slate-600"><PhotoFrame src={src} alt="Circular profile preview" position={position} className="size-16 rounded-full" />Your profile preview</div>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={() => setPosition(defaultPhotoPosition)}>Reset</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="button" disabled={busy || !ready} onClick={() => onSave(position)}>{busy ? "Saving…" : "Use photo"}</Button></div>
    </DialogContent>
  </Dialog>;
}
