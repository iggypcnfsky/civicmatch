import {
  Body,
  Head,
  Html,
  Tailwind,
  pixelBasedPreset,
  Font,
  Preview,
} from '@react-email/components';
import type * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

// Use production domain for email assets and links (images need to be publicly accessible)
const baseUrl = 'https://civicmatch.app';

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="DM Sans"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <style>{`
          /* Ensure proper link styling */
          a { text-decoration: underline; }
          .underline { text-decoration: underline; }
        `}</style>
      </Head>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                // CivicMatch brand colors
                primary: '#ff6b35', // Orange accent from architecture
                secondary: '#4a5568',
                background: '#ffffff',
                muted: '#f7fafc',
                border: '#e2e8f0',
                text: '#2d3748',
                'text-muted': '#718096',
              },
              spacing: {
                0: '0px',
                4: '4px',
                8: '8px',
                12: '12px',
                16: '16px',
                20: '20px',
                24: '24px',
                32: '32px',
                40: '40px',
                48: '48px',
              },
            },
          },
        }}
      >
        <Preview>{preview}</Preview>
        <Body className="bg-muted text-base text-text" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          {children}
        </Body>
      </Tailwind>
    </Html>
  );
};

export { baseUrl };
