import React, { useState, useRef, useCallback } from 'react';
import { Trash2, GripVertical, Star, Upload, CloudUpload } from 'lucide-react';

export interface GalleryImage {
  id: string;
  image_id?: number;  // cms_images.id - only present for existing (not pending) images
  url: string;       // object URL for pending uploads, real URL for saved images
  alt: string;
  file?: File;       // present only for pending (not-yet-uploaded) images
  pending?: boolean; // true = awaiting server upload on save
}

interface ImageGalleryProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function ImageGallery({ images, onChange }: ImageGalleryProps) {
  // Reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // File-drop state
  const [fileDropActive, setFileDropActive] = useState(false);
  const [zoneHover, setZoneHover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isFileDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files');

  const addFiles = useCallback(
    (files: File[]) => {
      const images_: GalleryImage[] = files
        .filter((f) => f.type.startsWith('image/'))
        .map((file, i) => ({
          id: `upload-${Date.now()}-${i}`,
          url: URL.createObjectURL(file),
          alt: file.name.replace(/\.[^.]+$/, ''),
          file,
          pending: true,
        }));
      if (images_.length) onChange([...images, ...images_]);
    },
    [images, onChange]
  );

  const removeImage = (id: string) => {
    const img = images.find((i) => i.id === id);
    if (img?.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
    onChange(images.filter((i) => i.id !== id));
  };

  // ─── Tile reorder handlers (skip when OS files are being dragged) ────────────

  const handleTileDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'reorder');
  };

  const handleTileDragOver = (e: React.DragEvent, index: number) => {
    if (isFileDrag(e)) return; // let file drags fall through to the zone
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleTileDrop = (e: React.DragEvent, dropIndex: number) => {
    if (isFileDrag(e)) return;
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...images];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    onChange(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ─── Drop-zone handlers (OS file drag) ──────────────────────────────────────

  const handleZoneDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setFileDropActive(true);
  };

  const handleZoneDragLeave = (e: React.DragEvent) => {
    // only clear if leaving the zone entirely (not entering a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setFileDropActive(false);
      setZoneHover(false);
    }
  };

  const handleZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDropActive(false);
    setZoneHover(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  // ─── Full-component overlay so files dropped anywhere on component work ──────

  const handleWrapperDragOver = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setFileDropActive(true);
  };

  const handleWrapperDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setFileDropActive(false);
    }
  };

  const handleWrapperDrop = (e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    setFileDropActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const pendingCount = images.filter((i) => i.pending).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="space-y-3"
      onDragOver={handleWrapperDragOver}
      onDragLeave={handleWrapperDragLeave}
      onDrop={handleWrapperDrop}
    >
      {/* ── Empty state: large drop zone ─────────────────────────────────── */}
      {images.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleZoneDragOver}
          onDragLeave={handleZoneDragLeave}
          onDrop={handleZoneDrop}
          onMouseEnter={() => setZoneHover(true)}
          onMouseLeave={() => setZoneHover(false)}
          className={`relative w-full rounded-xl border-2 border-dashed transition-all cursor-pointer py-14 flex flex-col items-center justify-center gap-3 ${
            fileDropActive
              ? 'border-[#0f2942] bg-[#0f2942]/8 scale-[1.01]'
              : zoneHover
              ? 'border-[#0f2942]/60 bg-[#0f2942]/4'
              : 'border-border bg-muted/20'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            fileDropActive ? 'bg-[#0f2942]/15' : 'bg-muted'
          }`}>
            <CloudUpload className={`w-7 h-7 transition-colors ${
              fileDropActive ? 'text-[#0f2942]' : 'text-muted-foreground'
            }`} />
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium transition-colors ${
              fileDropActive ? 'text-[#0f2942]' : 'text-foreground'
            }`}>
              {fileDropActive ? 'Release to upload images' : 'Drag & drop images here'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or <span className="text-[#0f2942] underline underline-offset-2">browse files</span> · PNG, JPG, WEBP, GIF
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ── Filled state: grid of thumbnails + upload cell ───────────────── */}
      {images.length > 0 && (
        <>
          {/* Full-width drop overlay (shown when dragging files over the grid) */}
          {fileDropActive && (
            <div className="absolute inset-0 z-10 m-2 rounded-xl border-2 border-dashed border-[#0f2942] bg-[#0f2942]/10 pointer-events-none flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <CloudUpload className="w-8 h-8 text-[#0f2942]" />
                <span className="text-sm font-medium text-[#0f2942]">Release to add images</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {/* Existing image tiles */}
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => handleTileDragStart(e, index)}
                onDragOver={(e) => handleTileDragOver(e, index)}
                onDrop={(e) => handleTileDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group aspect-square rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                  dragOverIndex === index
                    ? 'border-[#0f2942] ring-2 ring-[#0f2942]/30 scale-105'
                    : dragIndex === index
                    ? 'border-[#cec18a] opacity-40'
                    : 'border-border hover:border-[#0f2942]/50'
                }`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />

                {/* Primary badge */}
                {index === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#cec18a] text-[#0f2942] text-xs rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                  </div>
                )}

                {/* Number badge */}
                <div className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded text-white text-xs flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Pending badge */}
                {img.pending && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#0f2942]/80 text-white text-[9px] text-center py-0.5 leading-tight">
                    Pending
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <GripVertical className="w-5 h-5 text-white opacity-70" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="p-1 bg-destructive rounded-md text-white hover:bg-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Upload drop zone cell */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleZoneDragOver}
              onDragLeave={handleZoneDragLeave}
              onDrop={handleZoneDrop}
              onMouseEnter={() => setZoneHover(true)}
              onMouseLeave={() => setZoneHover(false)}
              className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                fileDropActive || zoneHover
                  ? 'border-[#0f2942] bg-[#0f2942]/8'
                  : 'border-border hover:border-[#0f2942]/60 hover:bg-[#0f2942]/4'
              }`}
            >
              <Upload className={`w-4 h-4 transition-colors ${
                fileDropActive || zoneHover ? 'text-[#0f2942]' : 'text-muted-foreground'
              }`} />
              <span className={`text-[10px] text-center leading-tight transition-colors ${
                fileDropActive || zoneHover ? 'text-[#0f2942]' : 'text-muted-foreground'
              }`}>
                {fileDropActive ? 'Drop here' : 'Drop or\nclick'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground flex-1">
              <span className="font-medium text-[#cec18a]">★ Primary</span>
              {' '}is the first image · Drag thumbnails to reorder
            </p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                <Upload className="w-3 h-3" />
                {pendingCount} image{pendingCount > 1 ? 's' : ''} will upload on Save
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
