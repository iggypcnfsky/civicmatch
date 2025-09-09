"use client";

import { useState } from "react";
import { AlertCircle, X, DollarSign, Calendar, Globe, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface CreateFundingRequest {
  title: string;
  country_code: string;
  amount: number;
  currency: string;
  deadline: string;
  website_url: string;
  description?: string;
  eligibility?: string;
}

interface AddFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Comprehensive country options
const COUNTRIES = [
  // Major funding countries first
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'JPY'];

export default function AddFundingModal({ isOpen, onClose, onSuccess }: AddFundingModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateFundingRequest>({
    title: '',
    country_code: '',
    amount: 0,
    currency: 'EUR',
    deadline: '',
    website_url: '',
    description: '',
    eligibility: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // Validation
  const validateField = (field: string, value: unknown): string | null => {
    switch (field) {
      case 'title':
        if (!value || typeof value !== 'string' || value.length < 10) {
          return 'Title must be at least 10 characters';
        }
        if (value.length > 200) {
          return 'Title must be under 200 characters';
        }
        break;
        
      case 'website_url':
        if (!value || typeof value !== 'string') {
          return 'Website URL is required';
        }
        if (!value.startsWith('https://')) {
          return 'URL must start with https:// for security';
        }
        try {
          new URL(value);
        } catch {
          return 'Please enter a valid website URL';
        }
        break;
        
      case 'deadline':
        if (!value || typeof value !== 'string') {
          return 'Deadline is required';
        }
        const deadlineDate = new Date(value);
        if (deadlineDate <= new Date()) {
          return 'Deadline must be in the future';
        }
        break;
        
      case 'amount':
        if (!value || typeof value !== 'number' || value < 100) {
          return 'Amount is required and must be at least $1';
        }
        if (value > 100000000000) { // $1B in cents
          return 'Amount must be under $1 billion';
        }
        break;
        
      case 'country_code':
        if (!value) {
          return 'Country is required';
        }
        break;
        
      case 'description':
        if (value && typeof value === 'string' && value.length < 50) {
          return 'Description should be at least 50 characters if provided';
        }
        break;
    }
    return null;
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
      handleFieldChange('amount', Math.round(numericValue * 100)); // Convert to cents
    }
  };

  const validateAllFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate required fields
    ['title', 'country_code', 'amount', 'deadline', 'website_url'].forEach(field => {
      const error = validateField(field, formData[field as keyof CreateFundingRequest]);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Validate optional fields if provided
    if (formData.description) {
      const error = validateField('description', formData.description);
      if (error) newErrors.description = error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!validateAllFields()) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('funding_opportunities')
        .insert({
          created_by: user.id,
          data: {
            title: formData.title,
            country_code: formData.country_code,
            website_url: formData.website_url,
            amount: formData.amount,
            currency: formData.currency,
            deadline: formData.deadline,
            description: formData.description || undefined,
            eligibility: formData.eligibility || undefined,
            created_via: 'manual',
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Success feedback
      console.log('Funding opportunity added successfully!');
      
      // Reset form and close modal
      setFormData({
        title: '',
        country_code: '',
        amount: 0,
        currency: 'EUR',
        deadline: '',
        website_url: '',
        description: '',
        eligibility: '',
      });
      setErrors({});
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Failed to add opportunity:', error);
      setErrors({ submit: 'Failed to add opportunity. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[color:var(--background)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[color:var(--border)]">
            <h2 className="text-xl font-semibold">Add New Funding Opportunity</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Required Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[color:var(--border)]">
                <span className="font-medium">Required Information</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">*</span>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span>🏷️</span>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Climate Innovation Grant 2024"
                  className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                  required
                />
                {errors.title && (
                  <p className="text-xs text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Country and Website URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="size-4" />
                    Country *
                  </label>
                  <select
                    value={formData.country_code}
                    onChange={(e) => handleFieldChange('country_code', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country_code && (
                    <p className="text-xs text-red-500">{errors.country_code}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="size-4" />
                    Website URL *
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => handleFieldChange('website_url', e.target.value)}
                    placeholder="https://grants.gov/..."
                    className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                    required
                  />
                  {errors.website_url && (
                    <p className="text-xs text-red-500">{errors.website_url}</p>
                  )}
                </div>
              </div>

              {/* Amount and Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="size-4" />
                    Amount *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.amount > 0 ? (formData.amount / 100).toLocaleString() : ''}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="2,000,000"
                      className="flex-1 h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                      required
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => handleFieldChange('currency', e.target.value)}
                      className="h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                    >
                      {CURRENCIES.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-red-500">{errors.amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="size-4" />
                    Deadline *
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleFieldChange('deadline', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                    required
                  />
                  {errors.deadline && (
                    <p className="text-xs text-red-500">{errors.deadline}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Details */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              >
                <span>{showOptional ? '▼' : '▶'}</span>
                Optional Details
              </button>

              {showOptional && (
                <div className="space-y-4 pl-4 border-l-2 border-[color:var(--border)]">
                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      📝 Description (Recommended)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Supporting breakthrough climate technologies with potential for global impact..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)] resize-none"
                    />
                    <div className="text-xs text-[color:var(--muted-foreground)]">
                      Helps others understand the opportunity
                    </div>
                    {errors.description && (
                      <p className="text-xs text-red-500">{errors.description}</p>
                    )}
                  </div>

                  {/* Eligibility */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      ✅ Eligibility Requirements
                    </label>
                    <input
                      type="text"
                      value={formData.eligibility}
                      onChange={(e) => handleFieldChange('eligibility', e.target.value)}
                      placeholder="US-based startups and research institutions"
                      className="w-full h-10 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] placeholder:text-[color:var(--muted-foreground)] placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 focus:border-[color:var(--accent)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Community Guidelines */}
            <div className="bg-[color:var(--muted)]/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="size-4 text-[color:var(--accent)]" />
                <span>Community Guidelines</span>
              </div>
              <ul className="text-xs text-[color:var(--muted-foreground)] space-y-1 ml-6">
                <li>• Verify all information for accuracy before submitting</li>
                <li>• Write original descriptions - don&apos;t copy/paste from source</li>
                <li>• Include relevant details to help others understand the opportunity</li>
                <li>• Only add legitimate funding opportunities you&apos;ve verified</li>
              </ul>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="text-sm text-red-500 text-center">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[color:var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 transition-colors text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] hover:bg-[color:var(--accent)]/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
