import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Button,
    Img,
} from '@react-email/components';
import * as React from 'react';

// When using this in Supabase, we use their Go template syntax for the URL
// {{ .ConfirmationURL }}

interface ResetPasswordEmailProps {
    resetUrl?: string;
    siteUrl?: string;
}

export const ResetPasswordEmail = ({
    resetUrl = '{{ .ConfirmationURL }}',
}: ResetPasswordEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Reset your StudioVaultPH password</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>Reset your password</Heading>
                    <Text style={text}>
                        We received a request to change the password for your StudioVaultPH account.
                        Click the button below to choose a new password.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={resetUrl}>
                            Reset Password
                        </Button>
                    </Section>

                    <Text style={text}>
                        Or copy and paste this link into your browser:<br />
                        <Link href={resetUrl} style={link}>{resetUrl}</Link>
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        If you didn&apos;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default ResetPasswordEmail;

const main = {
    backgroundColor: '#FAF9F6', // cream-50
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    maxWidth: '580px',
};

const header = {
    padding: '24px 0',
};

const logoText = {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'serif', // font-serif for logo
    color: '#1a1f2c', // charcoal-900
    textAlign: 'center' as const,
};

const logoImage = {
    margin: '0 auto',
    marginBottom: '16px',
};

const heading = {
    fontSize: '24px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: 'normal',
    color: '#1a1f2c', // charcoal-900
    padding: '17px 0 0',
    textAlign: 'center' as const,
};

const text = {
    margin: '0',
    marginTop: '16px',
    color: '#4a5568', // charcoal-600
    fontSize: '16px',
    lineHeight: '24px',
    textAlign: 'center' as const,
};

const buttonContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    backgroundColor: '#1a1f2c', // charcoal-900
    borderRadius: '8px',
    color: '#FAF9F6', // cream-50
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const link = {
    color: '#1a1f2c',
    textDecoration: 'underline',
};

const hr = {
    borderColor: '#e2e8f0', // cream-200
    margin: '40px 0 20px',
};

const footer = {
    color: '#718096', // charcoal-400
    fontSize: '13px',
    lineHeight: '22px',
    textAlign: 'center' as const,
};
