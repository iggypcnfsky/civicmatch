"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Target, MapPin, Users, Calendar, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { Project } from "@/types/project";

interface VisionContentProps {
  project: Project;
  compact?: boolean;
}

// Grid cell types
interface ImageCell {
  type: 'image';
  src: string;
  alt: string;
}

interface TextCell {
  type: 'text';
  content: string;
  label?: string;
  icon?: React.ReactNode;
}

interface StatCell {
  type: 'stat';
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface VideoCell {
  type: 'video';
  thumbnail: string;
  onPlay: () => void;
}

type GridCell = ImageCell | TextCell | StatCell | VideoCell;

export default function VisionContent({ project, compact = false }: VisionContentProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<number, number>>({});

  // Generate grid cells based on project data
  const generateCells = useCallback((): GridCell[] => {
    const cells: GridCell[] = [];
    
    // Cell 0: Main Vision Statement (Large)
    const hasVision = project.manifesto && project.manifesto.trim().length > 0;
    const content = hasVision ? project.manifesto : project.description;
    cells.push({
      type: 'text',
      content: content || "",
      label: "Vision & Mission",
      icon: <Target className="size-4" />,
    });

    // Cell 1: Project Logo/Identity
    if (project.logoUrl) {
      cells.push({
        type: 'image',
        src: project.logoUrl,
        alt: `${project.name} logo`,
      });
    } else {
      cells.push({
        type: 'stat',
        value: project.name.charAt(0).toUpperCase(),
        label: project.name,
        icon: <Target className="size-6" />,
      });
    }

    // Cell 2: Founder Info
    if (project.founderName) {
      cells.push({
        type: 'text',
        content: `Founded by ${project.founderName}`,
        label: "Leadership",
        icon: <Users className="size-4" />,
      });
    }

    // Cell 3: Location
    if (project.location?.city) {
      cells.push({
        type: 'text',
        content: [project.location.city, project.location.country].filter(Boolean).join(", "),
        label: "Location",
        icon: <MapPin className="size-4" />,
      });
    }

    // Cell 4: Video (if available)
    if (project.videoUrl) {
      cells.push({
        type: 'video',
        thumbnail: project.backgroundImageUrl || project.logoUrl || "",
        onPlay: () => setShowVideo(true),
      });
    }

    // Cell 5: Tags/Focus Areas
    if (project.tags && project.tags.length > 0) {
      cells.push({
        type: 'text',
        content: project.tags.join(" • "),
        label: "Focus Areas",
      });
    }

    // Cell 6: Description (if different from manifesto)
    if (project.manifesto && project.description && project.manifesto !== project.description) {
      cells.push({
        type: 'text',
        content: project.description,
        label: "About",
      });
    }

    // Cell 7-8: Background images or placeholders for rotating images
    const imagePool = [
      project.backgroundImageUrl,
      project.logoUrl,
      // Add some civic-themed placeholder patterns
    ].filter(Boolean) as string[];

    if (imagePool.length > 0) {
      cells.push({
        type: 'image',
        src: imagePool[0],
        alt: "Project visual",
      });
      
      if (imagePool.length > 1) {
        cells.push({
          type: 'image',
          src: imagePool[1],
          alt: "Project visual",
        });
      } else {
        // Add a stat cell as filler
        cells.push({
          type: 'stat',
          value: "2024",
          label: "Established",
          icon: <Calendar className="size-5" />,
        });
      }
    } else {
      // Add stat cells as fillers
      cells.push(
        {
          type: 'stat',
          value: "2024",
          label: "Established",
          icon: <Calendar className="size-5" />,
        },
        {
          type: 'stat',
          value: "∞",
          label: "Impact Potential",
          icon: <Target className="size-5" />,
        }
      );
    }

    return cells;
  }, [project]);

  const cells = generateCells();

  // Auto-rotate images in image cells
  useEffect(() => {
    const imageCellIndices = cells
      .map((cell, idx) => ({ cell, idx }))
      .filter(({ cell }) => cell.type === 'image')
      .map(({ idx }) => idx);

    if (imageCellIndices.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndices(prev => {
        const next = { ...prev };
        imageCellIndices.forEach(cellIdx => {
          const currentIdx = prev[cellIdx] || 0;
          // Cycle through available images (we'll use a pool of 3-4 images)
          next[cellIdx] = (currentIdx + 1) % 4;
        });
        return next;
      });
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [cells]);

  // Get rotating image for a cell
  const getRotatingImage = (baseSrc: string, cellIndex: number) => {
    const imagePool = [
      baseSrc,
      project.backgroundImageUrl,
      project.logoUrl,
      // Gradient placeholders as fallbacks
    ].filter((src, idx, arr) => src && arr.indexOf(src) === idx); // Remove duplicates

    const currentIdx = currentImageIndices[cellIndex] || 0;
    return imagePool[currentIdx % imagePool.length] || baseSrc;
  };

  // Grid layout configuration - defines the size of each cell
  // Using a 4-column grid system
  const getCellSpan = (index: number, totalCells: number): string => {
    // First cell (Vision) is large - spans 2x2
    if (index === 0) return "col-span-2 row-span-2";
    
    // Video cell is medium-large
    if (cells[index]?.type === 'video') return "col-span-2 row-span-1";
    
    // Stats are small
    if (cells[index]?.type === 'stat') return "col-span-1 row-span-1";
    
    // Images can vary
    if (cells[index]?.type === 'image') {
      // Alternate between medium and small
      return index % 3 === 0 ? "col-span-1 row-span-1" : "col-span-1 row-span-2";
    }
    
    // Default
    return "col-span-1 row-span-1";
  };

  const renderCell = (cell: GridCell, index: number) => {
    const spanClass = getCellSpan(index, cells.length);
    
    switch (cell.type) {
      case 'image':
        return (
          <div
            key={index}
            className={`${spanClass} relative overflow-hidden rounded-2xl group`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--muted)]/20 to-[color:var(--accent)]/10">
              <Image
                src={getRotatingImage(cell.src, index)}
                alt={cell.alt}
                fill
                className="object-cover transition-all duration-1000 ease-in-out group-hover:scale-105"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
            
            {/* Transition indicator */}
            <div className="absolute bottom-3 right-3 flex gap-1">
              {[0, 1, 2, 3].map((dot) => (
                <div
                  key={dot}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    (currentImageIndices[index] || 0) === dot
                      ? "bg-white w-4"
                      : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div
            key={index}
            className={`${spanClass} p-6 lg:p-8 rounded-2xl bg-[color:var(--background)] border border-[color:var(--divider)] flex flex-col`}
          >
            {cell.label && (
              <div className="flex items-center gap-2 mb-3">
                {cell.icon && (
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color:var(--accent)]/10 text-[color:var(--accent)]">
                    {cell.icon}
                  </span>
                )}
                <span className="text-xs font-medium text-[color:var(--foreground)]/50 uppercase tracking-wider">
                  {cell.label}
                </span>
              </div>
            )}
            <div className={`text-[color:var(--foreground)] leading-relaxed whitespace-pre-line ${
              index === 0 ? "text-lg lg:text-xl" : "text-sm lg:text-base"
            }`}>
              {cell.content}
            </div>
          </div>
        );

      case 'stat':
        return (
          <div
            key={index}
            className={`${spanClass} p-6 rounded-2xl bg-gradient-to-br from-[color:var(--accent)]/10 to-[color:var(--accent)]/5 border border-[color:var(--accent)]/20 flex flex-col justify-between`}
          >
            {cell.icon && (
              <span className="text-[color:var(--accent)] opacity-60">
                {cell.icon}
              </span>
            )}
            <div>
              <div className="text-3xl lg:text-4xl font-bold text-[color:var(--foreground)]">
                {cell.value}
              </div>
              <div className="text-sm text-[color:var(--foreground)]/60 mt-1">
                {cell.label}
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div
            key={index}
            className={`${spanClass} relative overflow-hidden rounded-2xl cursor-pointer group`}
            onClick={cell.onPlay}
          >
            {cell.thumbnail ? (
              <Image
                src={cell.thumbnail}
                alt="Video thumbnail"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent)]/20 to-[color:var(--muted)]/20" />
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-all duration-300 group-hover:bg-black/40">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/90 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Play className="size-6 lg:size-8 text-[color:var(--foreground)] fill-current ml-1" />
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Play className="size-4 fill-current" />
                Watch the Vision
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-full">
        {/* Full-width bento grid */}
        <div className="grid grid-cols-4 auto-rows-[180px] lg:auto-rows-[200px] gap-3 lg:gap-4">
          {cells.map((cell, index) => renderCell(cell, index))}
          
          {/* Additional decorative/animated cells if we have room */}
          {cells.length < 8 && (
            <>
              <div className="col-span-1 row-span-1 rounded-2xl bg-gradient-to-br from-[color:var(--muted)]/10 to-transparent flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center mb-2">
                    <ExternalLink className="size-5 text-[color:var(--accent)]" />
                  </div>
                  <span className="text-xs text-[color:var(--foreground)]/50">Learn More</span>
                </div>
              </div>
              
              {cells.length < 7 && (
                <div className="col-span-1 row-span-1 rounded-2xl bg-[color:var(--background)] border border-[color:var(--divider)] p-4 flex flex-col justify-center">
                  <div className="flex -space-x-2 mb-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--accent)]/30 to-[color:var(--muted)]/30 border-2 border-[color:var(--background)]"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[color:var(--foreground)]/50">Join the mission</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && project.videoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-5xl aspect-video">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 text-white hover:text-[color:var(--accent)] transition-colors"
            >
              Close
            </button>
            <iframe
              src={project.videoUrl}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
