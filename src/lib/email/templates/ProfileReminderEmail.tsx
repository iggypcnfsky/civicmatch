import {
  Button,
  Container,
  Heading,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import { EmailLayout, baseUrl } from './shared/Layout';
import { EmailHeader } from './shared/Header';
import { EmailFooter } from './shared/Footer';
import { EditIcon } from './shared/Icons';

interface MissingField {
  field: string;
  description: string;
  importance: string;
}

interface ProfileReminderEmailProps {
  displayName: string;
  completionPercentage: number;
  missingFields: MissingField[];
  profileUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

const benefits = [
  {
    icon: '🎯',
    title: 'Better Matches',
    description: 'Complete profiles get 3x more relevant connection suggestions'
  },
  {
    icon: '🤝',
    title: 'More Connections',
    description: 'Users with complete profiles receive 5x more collaboration requests'
  },
  {
    icon: '💡',
    title: 'Project Opportunities',
    description: 'Get discovered for exciting projects that match your expertise'
  }
];

export const ProfileReminderEmail = ({
  displayName,
  completionPercentage,
  missingFields,
  profileUrl = `${baseUrl}/profile`,
  unsubscribeUrl,
  preferencesUrl = `${baseUrl}/profile#email-preferences`,
}: ProfileReminderEmailProps) => {
  const isHighCompletion = completionPercentage >= 70;
  const encouragementMessage = isHighCompletion 
    ? "You're so close to having a complete profile!" 
    : "Let's boost your profile visibility!";

  return (
    <EmailLayout preview={``}>
      <EmailHeader />
      
      <Container className="bg-background px-48 py-32 rounded-lg shadow-sm">
        <Heading className="my-0 text-center text-28 leading-tight text-text">
          {encouragementMessage}
        </Heading>

        <Section className="mt-32">
          <Text className="text-16 text-text">
            Hi {displayName},
          </Text>
          
          <Text className="text-16 text-text leading-relaxed">
            Your CivicMatch profile is <strong>{completionPercentage}% complete</strong>. 
            A few quick updates could significantly increase your visibility and help you 
            connect with amazing collaborators!
          </Text>
        </Section>

        {/* Progress Bar */}
        <Section className="mt-24 mb-32">
          <Text className="text-14 text-text-muted mb-8">Profile Completion</Text>
          <div className="w-full bg-border rounded-full h-8">
            <div 
              className="bg-primary h-8 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <Text className="text-12 text-text-muted mt-4 text-right">{completionPercentage}%</Text>
        </Section>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <Section className="mt-32">
            <Text className="text-16 font-semibold text-text mb-16">
              Quick wins to complete your profile:
            </Text>
            
            {missingFields.slice(0, 3).map((field, index) => (
              <div key={field.field} className="mb-16 p-16 bg-muted rounded-lg border-l-4 border-primary">
                <Text className="font-semibold text-14 text-text m-0 mb-4">
                  {index + 1}. Add your {field.field}
                </Text>
                <Text className="text-12 text-text-muted m-0 mb-4">
                  {field.description}
                </Text>
                <Text className="text-12 text-primary m-0 font-medium">
                  💡 {field.importance}
                </Text>
              </div>
            ))}
            
            {missingFields.length > 3 && (
              <Text className="text-14 text-text-muted">
                + {missingFields.length - 3} more field{missingFields.length > 4 ? 's' : ''} to complete
              </Text>
            )}
          </Section>
        )}

        {/* Benefits */}
        <Section className="mt-40">
          <Text className="text-16 font-semibold text-text mb-20 text-center">
            Why complete your profile?
          </Text>
          
          <Row>
            {benefits.map((benefit) => (
              <Column key={benefit.title} className="text-center mb-24">
                <div className="text-32 mb-8">{benefit.icon}</div>
                <Text className="font-semibold text-14 text-text m-0 mb-8">
                  {benefit.title}
                </Text>
                <Text className="text-12 text-text-muted m-0 leading-relaxed">
                  {benefit.description}
                </Text>
              </Column>
            ))}
          </Row>
        </Section>

        {/* CTA */}
        <Section className="text-center mt-40">
          <Button 
            href={profileUrl}
            className="rounded-full bg-primary px-40 py-16 text-background font-semibold text-16 no-underline"
          >
            <EditIcon size={16} className="mr-8" />
            Complete My Profile
          </Button>
        </Section>

        {/* Encouragement */}
        <Section className="mt-32 p-24 bg-muted rounded-lg">
          <Text className="text-14 text-text text-center m-0">
            <strong>⚡ Fun fact:</strong> It only takes 5-10 minutes to complete your profile, 
            but the connections you make could last a lifetime!
          </Text>
        </Section>

        <Section className="mt-32">
          <Text className="text-14 text-text-muted">
            Keep building the change you want to see,
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
ProfileReminderEmail.PreviewProps = {
  displayName: 'Alex Rivera',
  completionPercentage: 65,
  missingFields: [
    {
      field: 'Skills & Expertise',
      description: 'Help others understand what you bring to collaborations',
      importance: 'Increases matches by 40%'
    },
    {
      field: 'Current Focus',
      description: 'Share what projects or causes you\'re currently working on',
      importance: 'Shows you\'re actively engaged'
    },
    {
      field: 'Bio & Background',
      description: 'Tell your story and what drives your passion for change',
      importance: 'Builds trust and connection'
    },
    {
      field: 'Location',
      description: 'Connect with local changemakers in your area',
      importance: 'Enables local collaboration'
    }
  ],
  profileUrl: `${baseUrl}/profile`,
  preferencesUrl: `${baseUrl}/profile#email-preferences`,
} satisfies ProfileReminderEmailProps;

export default ProfileReminderEmail;
