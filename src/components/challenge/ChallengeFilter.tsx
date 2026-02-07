// Challenge filter component for the map
// Allows filtering by category and severity

import { Leaf, Home, Bus, Shield, Landmark, GraduationCap, Heart, ThermometerSun,
         X, Filter, Eye } from 'lucide-react';
import { useState } from 'react';
import type { ChallengeCategory, ChallengeSeverity } from '@/types/challenge';
import { CHALLENGE_CATEGORIES, getSeverityColor, getSeverityLabel } from '@/types/challenge';

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

interface ChallengeFilterProps {
  selectedCategories: ChallengeCategory[];
  onCategoriesChange: (categories: ChallengeCategory[]) => void;
  minSeverity: ChallengeSeverity | null;
  onSeverityChange: (severity: ChallengeSeverity | null) => void;
  challengeCount: number;
  isLoading: boolean;
}

export function ChallengeFilter({
  selectedCategories,
  onCategoriesChange,
  minSeverity,
  onSeverityChange,
  challengeCount,
  isLoading,
}: ChallengeFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleCategory = (category: ChallengeCategory) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const selectAllCategories = () => {
    onCategoriesChange(CHALLENGE_CATEGORIES.map(c => c.name));
  };

  const clearAllCategories = () => {
    onCategoriesChange([]);
  };

  const hasActiveFilters = selectedCategories.length > 0 || minSeverity !== null;

  return (
    <div className="bg-[var(--background)] border border-[var(--divider)] rounded-xl shadow-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--muted)]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-medium text-sm">News</span>
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
          ) : (
            <span className="text-xs text-[var(--muted)]">
              {challengeCount} visible
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--divider)] p-3 space-y-4">
          {/* Severity filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-70">Minimum Severity</span>
              {minSeverity && (
                <button
                  onClick={() => onSeverityChange(null)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['critical', 'high', 'medium', 'low'] as ChallengeSeverity[]).map((severity) => (
                <button
                  key={severity}
                  onClick={() => onSeverityChange(minSeverity === severity ? null : severity)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    minSeverity === severity
                      ? 'ring-2'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: minSeverity === severity ? `${getSeverityColor(severity)}20` : 'var(--muted)',
                    color: getSeverityColor(severity),
                    ['--tw-ring-color' as string]: getSeverityColor(severity),
                  }}
                >
                  <Eye className="w-3 h-3" />
                  {getSeverityLabel(severity)}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium opacity-70">Categories</span>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  All
                </button>
                <button
                  onClick={clearAllCategories}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CHALLENGE_CATEGORIES.map((category) => {
                const Icon = ICONS[category.name];
                const isSelected = selectedCategories.includes(category.name);
                
                return (
                  <button
                    key={category.name}
                    onClick={() => toggleCategory(category.name)}
                    className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs transition-all ${
                      isSelected
                        ? 'ring-1'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${category.color}15` : 'var(--muted)',
                      color: isSelected ? category.color : 'currentColor',
                      ['--tw-ring-color' as string]: category.color,
                    }}
                    title={category.description}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChallengeFilter;
