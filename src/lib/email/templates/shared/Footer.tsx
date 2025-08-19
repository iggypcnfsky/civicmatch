import {
  Container,
  Link,
  Section,
  Text,
} from '@react-email/components';

interface EmailFooterProps {
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export const EmailFooter = ({ unsubscribeUrl, preferencesUrl }: EmailFooterProps) => {
  return (
    <Container className="mt-32">
      <Section className="text-center">
        <div className="mb-16">
          {preferencesUrl && (
            <Link 
              href={preferencesUrl}
              className="text-text-muted underline text-sm mr-16"
            >
              Email Preferences
            </Link>
          )}
          {unsubscribeUrl && (
            <Link 
              href={unsubscribeUrl}
              className="text-text-muted underline text-sm"
            >
              Unsubscribe
            </Link>
          )}
        </div>
      </Section>
      <Text className="mb-32 text-center text-text-muted text-sm">
        CivicMatch - Connecting changemakers for impact projects
      </Text>
      <Text className="mb-48 text-center text-text-muted text-xs">
        Made with ❤️ for social impact
      </Text>
    </Container>
  );
};
