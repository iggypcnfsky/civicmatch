import {
  Button,
  Container,
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout, baseUrl } from './shared/Layout';
import { EmailHeader } from './shared/Header';
import { EmailFooter } from './shared/Footer';
import { LockIcon } from './shared/Icons';

interface PasswordResetEmailProps {
  displayName?: string;
  resetUrl: string;
  expirationTime?: string;
  supportUrl?: string;
}

export const PasswordResetEmail = ({
  displayName,
  resetUrl,
  expirationTime = '24 hours',
  supportUrl = `${baseUrl}/help`,
}: PasswordResetEmailProps) => {
  return (
    <EmailLayout preview="">
      <EmailHeader />
      
      <Container className="bg-background px-48 py-32 rounded-lg shadow-sm">
        <Heading className="my-0 text-center text-28 leading-tight text-text">
          Reset Your Password
        </Heading>

        <Section className="mt-32">
          {displayName && (
            <Text className="text-16 text-text">
              Hi {displayName},
            </Text>
          )}
          
          <Text className="text-16 text-text leading-relaxed">
            We received a request to reset your password for your CivicMatch account. 
            If you didn&apos;t make this request, you can safely ignore this email.
          </Text>

          <Text className="text-16 text-text leading-relaxed">
            To reset your password, click the button below:
          </Text>
        </Section>

        {/* CTA Button */}
        <Section className="text-center mt-32 mb-32">
          <Button 
            href={resetUrl}
            className="rounded-full bg-primary px-40 py-16 text-background font-semibold text-16 no-underline"
          >
            <LockIcon size={16} className="mr-8" />
            Reset Password
          </Button>
        </Section>

        {/* Security Info */}
        <Section className="mt-32 p-24 bg-muted rounded-lg border-l-4 border-primary">
          <Text className="text-14 text-text-muted font-semibold m-0 mb-8">
            🔒 Security Information
          </Text>
          <Text className="text-14 text-text-muted m-0 mb-8">
            • This link will expire in {expirationTime}
          </Text>
          <Text className="text-14 text-text-muted m-0 mb-8">
            • Only use this link if you requested a password reset
          </Text>
          <Text className="text-14 text-text-muted m-0">
            • After resetting, you&apos;ll be automatically signed in
          </Text>
        </Section>

        {/* Alternative Action */}
        <Section className="mt-32">
          <Text className="text-14 text-text-muted">
            If the button above doesn&apos;t work, copy and paste this link into your browser:
          </Text>
          <Text className="text-12 text-text-muted break-all bg-muted p-12 rounded border">
            {resetUrl}
          </Text>
        </Section>

        {/* Help */}
        <Section className="mt-32">
          <Text className="text-14 text-text-muted">
            If you didn&apos;t request this password reset, please ignore this email or{' '}
            <Link href={supportUrl} className="text-primary underline">
              contact our support team
            </Link>{' '}
            if you have concerns about your account security.
          </Text>
        </Section>

        <Section className="mt-32">
          <Text className="text-16 text-text">
            Best regards,
            <br />
            Iggy, CivicMatch
          </Text>
        </Section>
      </Container>

      <EmailFooter />
    </EmailLayout>
  );
};

// Preview props for email development
PasswordResetEmail.PreviewProps = {
  displayName: 'Sarah Chen',
  resetUrl: `${baseUrl}/auth/reset-password?token=example-token-123`,
  expirationTime: '24 hours',
  supportUrl: `${baseUrl}/help`,
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;
