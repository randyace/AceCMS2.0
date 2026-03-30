import React, { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical, ImageIcon, Star } from 'lucide-react';

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

const PLACEHOLDER_COLORS = ['e2e8f0', 'fef3c7', 'dbeafe', 'dcfce7', 'fce7f3', 'f3e8ff'];

export function ImageGallery({ images, onChange }: ImageGalleryProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
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

  const addImage = () => {
    const id = `img-${Date.now()}`;
    const color = PLACEHOLDER_COLORS[images.length % PLACEHOLDER_COLORS.length];
    onChange([
      ...images,
      {
        id,
        url: `https://placehold.co/300x300/${color}/666666?text=Image+${images.length + 1}`,
        alt: `Image ${images.length + 1}`,
      },
    ]);
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative group aspect-square rounded-lg border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
              dragOverIndex === index
                ? 'border-primary ring-2 ring-primary/30 scale-105'
                : dragIndex === index
                ? 'border-accent opacity-40'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {img.url ? (
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {/* Primary badge */}
            {index === 0 && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-accent text-xs rounded flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" />
              </div>
            )}

            {/* Number badge */}
            <div className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded text-white text-xs flex items-center justify-center">
              {index + 1}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <GripVertical className="w-5 h-5 text-white" />
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

        {/* Add image button */}
        <button
          type="button"
          onClick={addImage}
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Add</span>
        </button>
      </div>

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="text-accent-foreground font-medium">★ Primary</span> is the first image · Drag handles to reorder
        </p>
      )}
    </div>
  );
}
