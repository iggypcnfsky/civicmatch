import {
  Column,
  Container,
  Link,
  Row,
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
      <Section>
        <Row>
          <Column className="px-20 text-right">
            {unsubscribeUrl && (
              <Link 
                href={unsubscribeUrl}
                className="text-text-muted underline text-sm"
              >
                Unsubscribe
              </Link>
            )}
          </Column>
          <Column className="text-left">
            {preferencesUrl && (
              <Link 
                href={preferencesUrl}
                className="text-text-muted underline text-sm"
              >
                Email Preferences
              </Link>
            )}
          </Column>
        </Row>
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
