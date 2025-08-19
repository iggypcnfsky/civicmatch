'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileData {
  displayName?: string;
  bio?: string;
  location?: {
    city: string;
    country: string;
  } | string;
  tags?: string[];
  skills?: string[];
  causes?: string[];
  values?: string[];
  fame?: string;
  aim?: Array<{ title: string; summary: string }>;
  game?: string;
  workStyle?: string;
  helpNeeded?: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // supabase is already imported as instance

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setError('Profile not found');
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text mb-4">Profile Not Found</h1>
          <p className="text-text-muted mb-8">{error || 'The requested profile could not be found.'}</p>
          <Link href="/profiles" className="bg-primary text-background px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
            Browse All Profiles
          </Link>
        </div>
      </div>
    );
  }

  const profileData = profile.data as ProfileData;
  const displayName = profileData?.displayName || profile.username || 'Anonymous User';

  const formatLocation = (location?: ProfileData['location']): string => {
    if (!location) return 'Location not specified';
    if (typeof location === 'string') return location;
    if (typeof location === 'object' && location.city && location.country) {
      return `${location.city}, ${location.country}`;
    }
    return 'Location not specified';
  };

  const ensureArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Image
                src={profileData?.avatarUrl || '/icon.png'}
                alt={displayName}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-4 border-background"
              />
            </div>
            
            {/* Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
              <p className="text-background/80 mb-2">@{profile.username}</p>
              <p className="text-background/80">📍 {formatLocation(profileData?.location)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            {profileData?.bio && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">About</h2>
                <p className="text-text leading-relaxed">{profileData.bio}</p>
              </div>
            )}

            {/* What I'm Known For */}
            {profileData?.fame && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">🌟 What I&apos;m Known For</h2>
                <p className="text-text leading-relaxed">{profileData.fame}</p>
              </div>
            )}

            {/* What I'm Focused On */}
            {profileData?.aim && profileData.aim.length > 0 && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">🎯 What I&apos;m Focused On</h2>
                <div className="space-y-4">
                  {profileData.aim.map((item, index) => (
                    <div key={index}>
                      <h3 className="font-medium text-text mb-2">{item.title}</h3>
                      {item.summary && <p className="text-text-muted text-sm">{item.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Long-term Strategy */}
            {profileData?.game && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">🎮 Long-term Strategy</h2>
                <p className="text-text leading-relaxed">{profileData.game}</p>
              </div>
            )}

            {/* Work Style */}
            {profileData?.workStyle && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">💼 Work Style</h2>
                <p className="text-text leading-relaxed">{profileData.workStyle}</p>
              </div>
            )}

            {/* Help Needed */}
            {profileData?.helpNeeded && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">🤝 Help Needed</h2>
                <p className="text-text leading-relaxed">{profileData.helpNeeded}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            {ensureArray(profileData?.tags).length > 0 && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold text-text mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {ensureArray(profileData?.tags).map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-muted text-text text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {ensureArray(profileData?.skills).length > 0 && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold text-text mb-3">Skills</h3>
                <div className="space-y-2">
                  {ensureArray(profileData?.skills).map((skill, index) => (
                    <div key={index} className="text-text text-sm">
                      • {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Causes */}
            {ensureArray(profileData?.causes).length > 0 && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold text-text mb-3">Causes</h3>
                <div className="flex flex-wrap gap-2">
                  {ensureArray(profileData?.causes).map((cause, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {cause}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Values */}
            {ensureArray(profileData?.values).length > 0 && (
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="font-semibold text-text mb-3">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {ensureArray(profileData?.values).map((value, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-secondary/10 text-secondary text-sm rounded-full"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Actions */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="font-semibold text-text mb-4">Connect</h3>
              <div className="space-y-3">
                <Link
                  href="/messages"
                  className="w-full bg-primary text-background px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-center block"
                >
                  💬 Send Message
                </Link>
                <Link
                  href="/profiles"
                  className="w-full bg-muted text-text px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors text-center block"
                >
                  ← Back to Profiles
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
