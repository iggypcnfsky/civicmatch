import {
  Button,
  Container,
  Heading,
  Section,
  Text,
  Row,
  Column,
  Link,
  Img,
} from '@react-email/components';
import { EmailLayout, baseUrl } from './shared/Layout';
import { EmailHeader } from './shared/Header';
import { EmailFooter } from './shared/Footer';
import { MailIcon, UserIcon, SearchIcon, WrenchIcon, HeartIcon, LightbulbIcon, SparklesIcon } from './shared/Icons';

interface MatchedProfile {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  location?: {
    city: string;
    country: string;
  };
  tags?: string[];
  skills?: string[];
  causes?: string[];
  values?: string[];

  fame?: string; // What I'm Known For
  aim?: Array<{ title: string; summary: string }>; // What I'm Focused On
  game?: string; // Long-term Strategy
  portfolio?: string[];
  workStyle?: string;
  helpNeeded?: string;
  avatarUrl?: string;
  matchScore: number;
  matchReasons?: string[];
  profileUrl: string;
  connectUrl: string;
}

interface WeeklyMatchEmailProps {
  currentUser?: {
    displayName: string;
    avatarUrl?: string;
  };
  match?: MatchedProfile;
  exploreMoreUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

const formatMatchScore = (score: number): string => {
  if (score >= 90) return 'Excellent match';
  if (score >= 80) return 'Great match';
  if (score >= 70) return 'Good match';
  return 'Potential match';
};

const formatLocation = (location?: { city: string; country: string }): string => {
  if (!location) return 'Location not specified';
  return `${location.city}, ${location.country}`;
};

const normalizeUrl = (url: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const renderWithLinks = (text: string | undefined) => {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi);
  return parts.map((part, i) => {
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      const href = normalizeUrl(part);
      return (
        <Link key={i} href={href} className="text-primary underline break-words">
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const WeeklyMatchEmail = ({
  currentUser = { displayName: 'User', avatarUrl: undefined },
  match,
  exploreMoreUrl = `${baseUrl}/`,
  unsubscribeUrl,
  preferencesUrl = `${baseUrl}/profile#email-preferences`,
}: WeeklyMatchEmailProps) => {
  // Ensure we have valid data before rendering
  if (!currentUser || !match) {
    return (
      <EmailLayout preview="Weekly Match Email">
        <EmailHeader />
        <Container className="bg-background px-48 py-32 rounded-lg shadow-sm">
          <Text>Loading...</Text>
        </Container>
      </EmailLayout>
    );
  }

  return (
    <EmailLayout preview={``}>
      <EmailHeader />
      
      <Container className="bg-background px-48 py-32 rounded-lg shadow-sm">
        <Heading className="my-0 text-center text-28 leading-tight text-text">
          Meet Your Weekly Match! 🎯
        </Heading>

        <Section className="mt-32">
          <Text className="text-16 text-text">
            Hi {currentUser.displayName},
          </Text>
          
          <Text className="text-16 text-text leading-relaxed">
            We found someone special who shares your passion for impact and could be 
            a perfect collaboration partner!
          </Text>
        </Section>

        {/* Profile Pictures Row */}
        <Section className="mt-32 text-center">
          <Row>
            <Column className="w-1/3 text-center">
              <Img
                src={currentUser.avatarUrl || `${baseUrl}/icon.png`}
                alt={currentUser.displayName}
                width="80"
                height="80"
                className="rounded-full mx-auto border-4 border-primary"
              />
              <Text className="text-14 font-semibold text-text mt-8 m-0">
                {currentUser.displayName}
              </Text>
              <Text className="text-12 text-text-muted m-0">You</Text>
            </Column>
            <Column className="w-1/3 text-center">
              <div className="text-32">🤝</div>
            </Column>
            <Column className="w-1/3 text-center">
              <Img
                src={match.avatarUrl || `${baseUrl}/icon.png`}
                alt={match.displayName}
                width="80"
                height="80"
                className="rounded-full mx-auto border-4 border-primary"
              />
              <Text className="text-14 font-semibold text-text mt-8 m-0">
                {match.displayName}
              </Text>
              <Text className="text-12 text-text-muted m-0">
                {formatMatchScore(match.matchScore)}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Profile Header */}
        <Section className="mt-40">
          <div className="border border-border rounded-lg p-24 bg-background mb-16">
            <Text className="font-semibold text-20 text-text text-center m-0 mb-8">
              {match.displayName}
            </Text>
            <Text className="text-14 text-text-muted text-center m-0 mb-16">
              📍 {formatLocation(match.location)}
            </Text>

            {/* Tags */}
            {match.tags && match.tags.length > 0 && (
              <div className="text-center mb-16">
                {match.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="inline-block border border-border px-8 py-4 rounded-full text-12 mr-8 mb-8"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            <Text className="text-14 text-text leading-relaxed text-center m-0">
              {match.bio ? renderWithLinks(match.bio) : (
                <span className="italic opacity-60">No information from the founder</span>
              )}
            </Text>
          </div>
        </Section>

        {/* Profile Sections */}
        <Section className="mt-24">
          {/* Skills & What I Do */}
          {match.skills && match.skills.length > 0 && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <WrenchIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>Skills & What I Do</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {match.skills.join(", ")}
                </Text>
            </div>
          )}

          {/* What I'm Known For */}
          {match.fame && match.fame.trim() && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <HeartIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>What I&apos;m Known For</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {renderWithLinks(match.fame)}
                </Text>
            </div>
          )}

          {/* What I'm Focused On */}
          {match.aim && match.aim[0]?.title && match.aim[0].title.trim() && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <LightbulbIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>What I&apos;m Focused On</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {renderWithLinks(match.aim[0].title)}
                </Text>
            </div>
          )}

          {/* Long-term Strategy */}
          {match.game && match.game.trim() && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <SparklesIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>Long-term Strategy</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {renderWithLinks(match.game)}
                </Text>
            </div>
          )}

          {/* Work Style */}
          {match.workStyle && match.workStyle.trim() && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <WrenchIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>Work Style</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {renderWithLinks(match.workStyle)}
                </Text>
            </div>
          )}

          {/* What do I need help with */}
          {match.helpNeeded && match.helpNeeded.trim() && (
            <div className="border border-border rounded-lg p-20 bg-background mb-16">
                <div className="mb-12">
                  <LightbulbIcon size={16} className="text-primary" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                  <Text className="font-semibold text-16 text-text m-0" style={{ display: 'inline-block', verticalAlign: 'middle' }}>What do I need help with</Text>
                </div>
                <Text className="text-14 text-text m-0">
                  {renderWithLinks(match.helpNeeded)}
                </Text>
            </div>
          )}
        </Section>

        {/* Match Reasons */}
        {match.matchReasons && match.matchReasons.length > 0 && (
          <Section className="mt-32">
            <div className="p-20 bg-muted rounded-lg border-l-4 border-primary">
              <Text className="font-semibold text-16 text-text m-0 mb-12 text-center">
                🎯 Why you&apos;re a great match:
              </Text>
              {match.matchReasons.slice(0, 3).map((reason, index) => (
                <Text key={index} className="text-14 text-text-muted m-0 mb-8 text-center">
                  • {reason}
                </Text>
              ))}
            </div>
          </Section>
        )}

        {/* CTA Buttons */}
        <Section className="text-center mt-32">
          <Button 
            href={match.connectUrl}
            className="rounded-full bg-primary px-32 py-16 text-background font-semibold text-16 no-underline mr-16"
          >
            <MailIcon size={16} className="mr-8" />
            Send Message
          </Button>
          <Button 
            href={match.profileUrl}
            className="rounded-full border border-border bg-background px-32 py-16 text-text font-semibold text-16 no-underline"
          >
            <UserIcon size={16} className="mr-8" />
            View Profile
          </Button>
        </Section>

        {/* Explore More CTA */}
        <Section className="text-center mt-40 p-24 bg-muted rounded-lg">
          <Text className="text-16 font-semibold text-text mb-16">
            Want to explore more profiles?
          </Text>
          <Button 
            href={exploreMoreUrl}
            className="rounded-full bg-primary px-32 py-12 text-background font-semibold text-16 no-underline"
          >
            <SearchIcon size={16} className="mr-8" />
            Discover More Changemakers
          </Button>
        </Section>

        {/* Tips */}
        <Section className="mt-32 p-20 border border-border rounded-lg">
          <Text className="font-semibold text-14 text-text mb-12">
            💡 Connection Tips:
          </Text>
          <Text className="text-12 text-text-muted m-0 mb-8">
            • Mention shared interests or values in your first message
          </Text>
          <Text className="text-12 text-text-muted m-0 mb-8">
            • Be specific about potential collaboration ideas
          </Text>
          <Text className="text-12 text-text-muted m-0">
            • Keep initial messages friendly and professional
          </Text>
        </Section>

        <Section className="mt-32">
          <Text className="text-14 text-text-muted">
            Happy connecting!
            <br />
            Iggy, CivicMatch
          </Text>
        </Section>
      </Container>

      <EmailFooter 
        unsubscribeUrl={unsubscribeUrl}
        preferencesUrl={preferencesUrl}
      />
    </EmailLayout>
  );
};

// Preview props for email development
WeeklyMatchEmail.PreviewProps = {
  currentUser: {
    displayName: 'Maya Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b765?w=80&h=80&fit=crop&crop=face'
  },
  match: {
    userId: 'user-1',
    displayName: 'Carlos Rodriguez',
    username: 'carlos.rodriguez',
    bio: 'Building sustainable urban farming solutions in Mexico City. Looking for technical co-founders and policy experts to scale impact across Latin America.',
    location: { city: 'Mexico City', country: 'Mexico' },
    tags: ['Social Entrepreneur', 'AgTech', 'Impact Focused'],
    skills: ['Sustainable Agriculture', 'Business Development', 'Community Organizing', 'Systems Thinking'],
    causes: ['Climate Change', 'Food Security', 'Urban Development'],
    values: ['Impact', 'Innovation', 'Community'],

    fame: 'Built 3 community gardens serving 500+ families in underserved neighborhoods. Featured in Tech for Good magazine for innovative hydroponic systems.',
    aim: [{ 
      title: 'Scaling urban farming solutions to 10 cities across Latin America by 2026', 
      summary: 'Focus on replicable models and local partnerships' 
    }],
    game: 'Long-term vision: Create a network of self-sustaining urban farms that can be replicated globally. Working towards policy changes that support urban agriculture at the municipal level.',
    workStyle: 'Collaborative approach with weekly check-ins. I believe in fast iteration and learning from the community. Prefer working with people who share the mission over those just looking for profit.',
    helpNeeded: 'Seeking a technical co-founder with IoT/agriculture experience and a policy expert who understands municipal regulations around urban farming.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face',
    matchScore: 92,
    matchReasons: [
      'You both focus on sustainable agriculture and climate solutions',
      'Shared values: Impact and Innovation', 
      'Both seeking technical co-founders for scaling projects',
      'Similar community-first approach to problem solving'
    ],
    profileUrl: `${baseUrl}/profiles/carlos.rodriguez`,
    connectUrl: `${baseUrl}/connect/carlos.rodriguez`,
  },
  exploreMoreUrl: `${baseUrl}/`,
  preferencesUrl: `${baseUrl}/profile#email-preferences`,
} satisfies WeeklyMatchEmailProps;

export default WeeklyMatchEmail;
