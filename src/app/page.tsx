"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Euro, Calendar, MessageCircle, Target, ArrowDown } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";

export default function LandingPage() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";
  const router = useRouter();
  
  // Redirect authenticated users to explore
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/explore");
    }
  }, [isAuthenticated, router]);
  
  // Show loading state during auth resolution
  if (status === null) {
    return null;
  }

  // Don't render landing page for authenticated users (they'll redirect)
    if (isAuthenticated) {
    return null;
  }

    return (
    <div className="w-full">
      {/* Hero Section - 100vh */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-4 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Logo className="size-12 md:size-14 text-[color:var(--accent)]" />
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Civic Match</h1>
          </div>
          
          <h2 className="text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed px-4">
            The platform for civic founders to find co-founders, discover funding, and build impact together
          </h2>
          
          <p className="text-xs md:text-sm opacity-60 max-w-xl mx-auto leading-relaxed px-4">
            Connect with changemakers who share your values. Access community-curated funding opportunities. 
            Build the projects that matter.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/explore"
              className="h-11 px-8 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link
              href="/explore"
              className="h-11 px-8 inline-flex items-center justify-center rounded-full border border-divider bg-[color:var(--muted)]/20 hover:bg-[color:var(--muted)]/30 text-sm transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs">Scroll to explore</span>
          <ArrowDown className="size-4 animate-bounce" />
          </div>
        </section>

      {/* Main Features Section - 100vh */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-4 border-t border-divider">
        <div className="max-w-4xl mx-auto w-full">
          <h3 className="text-center text-xs font-medium uppercase tracking-wider opacity-50 mb-12 md:mb-16">
            What You Can Do
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 px-4">
            {/* Feature 1: Find People */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <Users className="size-6 md:size-7 text-[color:var(--accent)]" />
                </div>
              </div>
              <h3 className="text-sm md:text-base font-semibold">
                Discover Co-Founders
              </h3>
              <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                Search by values, skills, and causes to find collaborators aligned with your mission. 
                Filter by location and see changemakers positioned on an interactive world map.
              </p>
            </div>

            {/* Feature 2: Funding Opportunities */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <Euro className="size-6 md:size-7 text-[color:var(--accent)]" />
                    </div>
                  </div>
              <h3 className="text-sm md:text-base font-semibold">
                Access Funding Sources
              </h3>
              <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                Browse community-shared grants and funding opportunities. 
                Express collaboration interest and connect with others pursuing similar funding.
              </p>
                  </div>

            {/* Feature 3: Connect & Collaborate */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <MessageCircle className="size-6 md:size-7 text-[color:var(--accent)]" />
              </div>
              </div>
              <h3 className="text-sm md:text-base font-semibold">
                Start Conversations
              </h3>
              <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                Send personalized invites and message directly within the platform. 
                Build genuine relationships with weekly AI-powered match suggestions.
              </p>
              </div>
            </div>
          </div>
        </section>

      {/* How It Works Section - 100vh */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-4 border-t border-divider">
        <div className="max-w-2xl mx-auto w-full">
          <h3 className="text-center text-xs font-medium uppercase tracking-wider opacity-50 mb-12 md:mb-16">
            How It Works
          </h3>
          
          <div className="space-y-8 md:space-y-10 px-4">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-[color:var(--accent)]/20 flex items-center justify-center">
                <span className="text-xs md:text-sm font-semibold text-[color:var(--accent)]">1</span>
              </div>
                  <div>
                <h4 className="text-sm md:text-base font-medium mb-2">Create Your Profile</h4>
                <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                  Share your mission, skills, and what you&apos;re building. Showcase your values and the causes you care about.
                    </p>
                  </div>
                  </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-[color:var(--accent)]/20 flex items-center justify-center">
                <span className="text-xs md:text-sm font-semibold text-[color:var(--accent)]">2</span>
              </div>
                  <div>
                <h4 className="text-sm md:text-base font-medium mb-2">Explore the Community</h4>
                <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                  Browse profiles on an interactive map or filter by specific criteria. Discover funding opportunities shared by the community.
                </p>
              </div>
                  </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 rounded-full bg-[color:var(--accent)]/20 flex items-center justify-center">
                <span className="text-xs md:text-sm font-semibold text-[color:var(--accent)]">3</span>
              </div>
                  <div>
                <h4 className="text-sm md:text-base font-medium mb-2">Connect & Build</h4>
                <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                  Reach out to potential co-founders, collaborate on funding applications, and build meaningful projects together.
                    </p>
                  </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section - 100vh */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-4 border-t border-divider">
        <div className="max-w-3xl mx-auto w-full">
          <h3 className="text-center text-xs font-medium uppercase tracking-wider opacity-40 mb-12 md:mb-16">
            Coming Soon
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 md:gap-12 px-4">
            <div className="text-center space-y-4 opacity-60">
              <div className="flex justify-center">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--foreground)]/5 flex items-center justify-center">
                  <Calendar className="size-6 md:size-7 opacity-60" />
                </div>
              </div>
              <h3 className="text-sm md:text-base font-medium">Event Finder</h3>
              <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                Discover impact events, conferences, and workshops
              </p>
              </div>

            <div className="text-center space-y-4 opacity-60">
              <div className="flex justify-center">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-[color:var(--foreground)]/5 flex items-center justify-center">
                  <Target className="size-6 md:size-7 opacity-60" />
                </div>
              </div>
              <h3 className="text-sm md:text-base font-medium">Project Matching</h3>
              <p className="text-xs md:text-sm opacity-60 leading-relaxed">
                AI-powered suggestions for projects seeking collaborators
              </p>
            </div>
          </div>
      </div>
      </section>

      {/* Footer CTA Section - 100vh */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center px-4 border-t border-divider">
        <div className="text-center space-y-8">
          <p className="text-sm md:text-base opacity-70">Ready to make an impact?</p>
          <Link
            href="/explore"
            className="h-11 px-8 inline-flex items-center justify-center rounded-full border border-transparent bg-[color:var(--accent)] text-[color:var(--background)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Join Civic Match
          </Link>
          <p className="text-xs opacity-40 pt-4">Free to join · No credit card required</p>
      </div>
      </section>
    </div>
  );
}
