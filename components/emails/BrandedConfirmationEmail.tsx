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

interface BrandedConfirmationEmailProps {
    confirmationUrl: string;
    recipientName?: string;
    studioName?: string;
    studioLogo?: string;
    primaryColor?: string;
}

export const BrandedConfirmationEmail = ({
    confirmationUrl,
    recipientName = 'there',
    studioName,
    studioLogo,
    primaryColor,
}: BrandedConfirmationEmailProps) => {
    const brandColor = primaryColor || '#1a1f2c';
    const displayName = studioName || 'StudioVaultPH';
    const logoUrl = studioLogo || 'https://studiovaultph.com/logo4.png';

    return (
        <Html>
            <Head />
            <Preview>Confirm your email for {displayName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src={logoUrl} width="64" height="64" alt={`${displayName} Logo`} style={logoImage} />
                        <Text style={{ ...logoText, color: brandColor }}>{displayName}</Text>
                    </Section>
                    <Heading style={{ ...heading, color: brandColor }}>
                        Confirm your email address
                    </Heading>
                    <Text style={text}>
                        Hi {recipientName}! Welcome to <strong>{displayName}</strong>.
                        {studioName 
                            ? ` Please confirm your email address to start booking sessions and accessing your studio portal.`
                            : ` Please confirm your email address to get started.`
                        }
                    </Text>
                    <Text style={text}>
                        Click the button below to verify your account.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={{ ...button, backgroundColor: brandColor }} href={confirmationUrl}>
                            Verify Email
                        </Button>
                    </Section>

                    <Text style={text}>
                        Or copy and paste this link into your browser:<br />
                        <Link href={confirmationUrl} style={{ ...link, color: brandColor }}>
                            {confirmationUrl}
                        </Link>
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        {studioName
                            ? `This email was sent by ${studioName} via StudioVaultPH.`
                            : `This email was sent by StudioVaultPH.`
                        }
                        {' '}If you didn&apos;t request this email, you can safely ignore it.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default BrandedConfirmationEmail;

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '580px',
};

const header = {
    padding: '32px 0',
    textAlign: 'center' as const,
};

const logoText = {
    fontSize: '28px',
    fontWeight: 'bold',
    fontFamily: 'serif',
    textAlign: 'center' as const,
    margin: '0',
};

const logoImage = {
    margin: '0 auto',
    marginBottom: '16px',
};

const heading = {
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '30px 0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 40px',
    textAlign: 'center' as const,
};

const buttonContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
};

const button = {
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const link = {
    textDecoration: 'underline',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '40px 0 20px',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
};
