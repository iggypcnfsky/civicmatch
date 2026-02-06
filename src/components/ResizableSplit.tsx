'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizableSplitProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
  storageKey?: string; // localStorage key to persist width
}

export default function ResizableSplit({
  left,
  right,
  defaultLeftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  storageKey = 'resizable-split-width',
}: ResizableSplitProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const width = parseFloat(saved);
        if (width >= minLeftWidth && width <= maxLeftWidth) {
          setLeftWidth(width);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey, minLeftWidth, maxLeftWidth]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate new left width as percentage
      let newLeftWidth = (mouseX / containerWidth) * 100;
      
      // Clamp to min/max
      newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
      
      setLeftWidth(newLeftWidth);
      
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, newLeftWidth.toString());
      } catch {
        // Ignore localStorage errors
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth, storageKey]);

  return (
    <div ref={containerRef} className="flex h-screen relative">
      {/* Left panel */}
      <div
        style={{ width: `${leftWidth}%` }}
        className="overflow-y-auto"
      >
        {left}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`hidden md:flex w-1 bg-[color:var(--divider)] hover:bg-[color:var(--accent)] cursor-col-resize items-center justify-center transition-colors group relative ${
          isDragging ? 'bg-[color:var(--accent)]' : ''
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
          <div className="p-1 rounded bg-[color:var(--background)] border border-[color:var(--divider)] opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-[color:var(--muted-foreground)]" />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="hidden md:block overflow-hidden"
      >
        {right}
      </div>
    </div>
  );
}

