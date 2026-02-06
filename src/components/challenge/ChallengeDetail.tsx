// Challenge detail panel component
// Shows challenge info when hovering or clicking on a marker

import { Leaf, Home, Bus, Shield, Landmark, GraduationCap, Heart, ThermometerSun, 
         AlertTriangle, ExternalLink, MapPin, Users, Wrench } from 'lucide-react';
import type { ChallengeForMap, ChallengeCategory } from '@/types/challenge';
import { getCategoryInfo, getSeverityColor, getSeverityLabel } from '@/types/challenge';

const ICONS: Record<ChallengeCategory, React.ElementType> = {
  environment: Leaf,
  housing: Home,
  transport: Bus,
  public_safety: Shield,
  governance: Landmark,
  education: GraduationCap,
  health: Heart,
  climate: ThermometerSun,
};

interface ChallengeDetailProps {
  challenge: ChallengeForMap;
  compact?: boolean;
}

export function ChallengeDetail({ challenge, compact = false }: ChallengeDetailProps) {
  const category = getCategoryInfo(challenge.category);
  const Icon = ICONS[challenge.category];
  const severityColor = getSeverityColor(challenge.severity);
  const severityLabel = getSeverityLabel(challenge.severity);

  if (compact) {
    // Compact version for hover tooltip
    return (
      <div className="space-y-2">
        {/* Category & Severity */}
        <div className="flex items-center gap-2">
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            <Icon className="w-3 h-3" />
            {category.label}
          </span>
          <span 
            className="text-xs font-medium"
            style={{ color: severityColor }}
          >
            {severityLabel}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-sm leading-tight">
          {challenge.title}
        </h4>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs opacity-60">
          <MapPin className="w-3 h-3" />
          {challenge.location_name}
        </div>
      </div>
    );
  }

  // Full version for detail panel
  return (
    <div className="space-y-4">
      {/* Header with category badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            <Icon className="w-3.5 h-3.5" />
            {category.label}
          </span>
          <span 
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: severityColor }}
          >
            <AlertTriangle className="w-3 h-3" />
            {severityLabel}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-base leading-snug">
        {challenge.title}
      </h3>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-sm opacity-70">
        <MapPin className="w-4 h-4" />
        {challenge.location_name}
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed opacity-90">
        {challenge.summary}
      </p>

      {/* Call to Action */}
      {challenge.call_to_action && (
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] mb-1">
            <Users className="w-3.5 h-3.5" />
            What you can do
          </div>
          <p className="text-sm leading-relaxed">
            {challenge.call_to_action}
          </p>
        </div>
      )}

      {/* Skills Needed */}
      {challenge.skills_needed && challenge.skills_needed.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-60">
            <Wrench className="w-3.5 h-3.5" />
            Skills needed
          </div>
          <div className="flex flex-wrap gap-1.5">
            {challenge.skills_needed.map((skill, idx) => (
              <span 
                key={idx}
                className="px-2 py-0.5 bg-[var(--muted)]/30 rounded text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer with source and date */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--divider)] text-xs opacity-60">
        <div className="flex items-center gap-1">
          {challenge.source_title || 'News Source'}
        </div>
        <div>
          {new Date(challenge.published_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* Read source link */}
      <a
        href={challenge.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <ExternalLink className="w-4 h-4" />
        Read Source Article
      </a>
    </div>
  );
}

export default ChallengeDetail;
