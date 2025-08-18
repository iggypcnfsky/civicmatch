import { Section } from '@react-email/components';

// Use production domain for email assets (images need to be publicly accessible)
const baseUrl = 'https://civicmatch.app';

// Icon image using URL for email compatibility
const IconImage = () => (
  <table cellPadding="0" cellSpacing="0" border={0} style={{ margin: '0 auto' }}>
    <tbody>
      <tr>
        <td style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${baseUrl}/email-logo.png`}
            alt="CivicMatch"
            width="48"
            height="48"
            style={{ 
              display: 'block',
              borderRadius: '100%'
            }}
          />
        </td>
      </tr>
    </tbody>
  </table>
);

export const EmailHeader = () => {
  return (
    <Section className="text-center py-32">
      <IconImage />
      <div style={{ marginTop: '16px' }}>
        <div className="text-24 font-bold text-text" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          CivicMatch
        </div>
      </div>
    </Section>
  );
};
