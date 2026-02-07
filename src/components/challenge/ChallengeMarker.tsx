// Challenge marker component for the map
// Creates Google Maps AdvancedMarkerElement content for challenges

import type { ChallengeForMap, ChallengeCategory } from '@/types/challenge';
import { getCategoryInfo } from '@/types/challenge';

export interface ChallengeMarkerElements {
  container: HTMLDivElement;
  markerDiv: HTMLDivElement;
}

export function createChallengeMarkerContent(
  challenge: ChallengeForMap,
  onHover?: (challenge: ChallengeForMap | null) => void
): ChallengeMarkerElements {
  const container = document.createElement('div');
  container.className = 'relative cursor-pointer';

  const size = 32; // 30% smaller than user avatar (44px -> ~32px)

  // Main marker circle - yellow background, no outline
  const markerDiv = document.createElement('div');
  markerDiv.className = `
    inline-flex items-center justify-center rounded-full 
    transition-all duration-300 hover:scale-110
  `;
  markerDiv.style.width = `${size}px`;
  markerDiv.style.height = `${size}px`;
  markerDiv.style.backgroundColor = '#fbbf24'; // Yellow (amber-400)
  markerDiv.style.opacity = '0';
  markerDiv.style.transform = 'scale(0.8)';
  markerDiv.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.4)';

  // Eye icon (Lucide) with dark color
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', '#1f2937'); // Dark gray for contrast
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  // Eye icon paths
  const path1 = document.createElementNS(svgNS, 'path');
  path1.setAttribute('d', 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z');
  svg.appendChild(path1);

  const path2 = document.createElementNS(svgNS, 'circle');
  path2.setAttribute('cx', '12');
  path2.setAttribute('cy', '12');
  path2.setAttribute('r', '3');
  svg.appendChild(path2);

  markerDiv.appendChild(svg);

  // Hover events
  container.addEventListener('mouseenter', () => {
    if (onHover) {
      onHover(challenge);
    }
  });

  container.addEventListener('mouseleave', () => {
    if (onHover) {
      onHover(null);
    }
  });

  container.appendChild(markerDiv);

  return { container, markerDiv };
}

// Create a compact cluster marker for multiple challenges
export function createChallengeClusterContent(
  count: number,
  dominantCategory: ChallengeCategory,
  maxSeverity: string
): ChallengeMarkerElements {
  const container = document.createElement('div');
  container.className = 'relative cursor-pointer';

  const size = 36; // Slightly larger than single marker but still compact

  const markerDiv = document.createElement('div');
  markerDiv.className = 'transition-all duration-300 hover:scale-110 flex items-center justify-center';
  markerDiv.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background-color: #fbbf24;
    opacity: 0;
    transform: scale(0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;

  // Count badge
  const countSpan = document.createElement('span');
  countSpan.textContent = count > 99 ? '99+' : count.toString();
  countSpan.style.cssText = `
    color: #1f2937;
    font-size: ${count > 9 ? '12px' : '14px'};
    font-weight: 700;
  `;
  markerDiv.appendChild(countSpan);

  container.appendChild(markerDiv);

  return { container, markerDiv };
}
