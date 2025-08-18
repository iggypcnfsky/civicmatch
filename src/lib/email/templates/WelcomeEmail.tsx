import {
  Button,

  Container,
  Heading,
  Link,

  Section,
  Text,
} from '@react-email/components';
import type * as React from 'react';
import { EmailLayout, baseUrl } from './shared/Layout';
import { EmailHeader } from './shared/Header';
import { EmailFooter } from './shared/Footer';
import { EditIcon, SearchIcon } from './shared/Icons';

interface WelcomeEmailProps {
  displayName: string;
  username: string;
  profileCompletionUrl?: string;
  exploreUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

const steps = [
  {
    id: 1,
    title: 'Complete your profile',
    description: (
      <>
        Add your skills, causes, and what you&apos;re working on. A complete profile helps us connect you with the right collaborators.{' '}
        <Link href={`${baseUrl}/profile`} className="text-primary underline">
          Complete your profile
        </Link>
      </>
    ),
  },
  {
    id: 2,
    title: 'Explore changemakers',
    description: (
      <>
        Browse profiles of other impact-driven individuals and organizations. Filter by values, skills, and causes that matter to you.{' '}
        <Link href={`${baseUrl}/`} className="text-primary underline">
          Start exploring
        </Link>
      </>
    ),
  },
  {
    id: 3,
    title: 'Connect and collaborate',
    description: (
      <>
        Found someone interesting? Send them a message to start a conversation about potential collaboration opportunities.
      </>
    ),
  },
  {
    id: 4,
    title: 'Build your network',
    description: (
      <>
        Follow up on connections, share your projects, and discover new opportunities to make an impact together.
      </>
    ),
  },
];



export const WelcomeEmail = ({
  displayName = 'there',

  profileCompletionUrl = `${baseUrl}/profile`,
  exploreUrl = `${baseUrl}/`,
  unsubscribeUrl,
  preferencesUrl = `${baseUrl}/profile#email-preferences`,
}: WelcomeEmailProps) => {
  // Extract first name from displayName
  const firstName = displayName.split(' ')[0];
  
  return (
    <EmailLayout preview={''}>
      <EmailHeader />
      
      <Container className="bg-background px-48 py-32 rounded-lg shadow-sm">
        <Heading className="my-0 text-center text-32 leading-tight text-text">
          Welcome {firstName}!
        </Heading>

        <Section className="mt-32">
          <Text className="text-16 text-text leading-relaxed">
            You&apos;re now part of a growing community of changemakers, social entrepreneurs, 
            and impact-driven individuals who are building a better world together.
          </Text>

          <Text className="text-16 text-text leading-relaxed">
            CivicMatch connects people who share your passion for creating positive change. 
            Whether you&apos;re looking for co-founders, collaborators, or just want to expand 
            your impact network, you&apos;re in the right place.
          </Text>

          <Text className="text-16 text-text leading-relaxed mt-24 font-semibold">
            Here&apos;s how to get started:
          </Text>
        </Section>

        {/* Steps List */}
        <Section className="mt-24">
          <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
            <tbody>
              {steps.map((step) => (
                <tr key={step.id}>
                  <td width="40" style={{ paddingRight: '16px', verticalAlign: 'top', paddingBottom: '24px' }}>
                    <div 
                      style={{
                        backgroundColor: '#ff6b35',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        lineHeight: '24px',
                        margin: '0 auto'
                      }}
                    >
                      {step.id}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', paddingBottom: '24px' }}>
                    <Text className="font-semibold text-16 text-text m-0 mb-4">
                      {step.title}
                    </Text>
                    <Text className="text-14 text-text-muted m-0 leading-relaxed">
                      {step.description}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* CTA Buttons */}
        <Section className="text-center mt-40">
          <Button 
            href={profileCompletionUrl}
            className="rounded-full bg-primary px-32 py-12 text-background font-semibold text-16 no-underline mr-16"
          >
            <EditIcon size={16} className="mr-8" />
            Complete Your Profile
          </Button>
          <Button 
            href={exploreUrl}
            className="rounded-full border border-border bg-gray-100 px-32 py-12 text-text font-semibold text-16 no-underline"
          >
            <SearchIcon size={16} className="mr-8" />
            Explore Profiles
          </Button>
        </Section>

        

        {/* Welcome Message */}
        <Section className="mt-32 p-24 bg-muted rounded-lg">
          <Text className="text-14 text-text-muted text-center italic m-0">
            &ldquo;The best way to find yourself is to lose yourself in the service of others.&rdquo; - Gandhi
          </Text>
        </Section>

        <Section className="mt-32">
          <Text className="text-16 text-text">
            Questions? Just reply to this email or reach out to our community team. 
            We&apos;re here to help you make meaningful connections.
          </Text>
          
          <Text className="text-16 text-text font-semibold">
            Welcome aboard!
            <br />
            Iggy, CivicMatch
          </Text>
          
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseUrl}/email-logo.png`}
              alt="CivicMatch"
              width="32"
              height="32"
              style={{ 
                display: 'inline-block',
                borderRadius: '100%'
              }}
            />
          </div>
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
WelcomeEmail.PreviewProps = {
  displayName: 'Sarah Chen',
  username: 'sarah.chen',
  profileCompletionUrl: `${baseUrl}/profile`,
  exploreUrl: `${baseUrl}/`,
  preferencesUrl: `${baseUrl}/profile#email-preferences`,
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
