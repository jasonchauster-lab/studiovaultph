import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Button,
} from '@react-email/components';
import * as React from 'react';

interface ApplicationRejectionEmailProps {
    recipientName: string;
    applicationType: 'Instructor' | 'Studio' | 'Studio Payout Setup';
    itemName?: string; // Studio name or Certification name
    dashboardUrl: string;
    reason?: string;
}

export const ApplicationRejectionEmail = ({
    recipientName,
    applicationType,
    itemName,
    dashboardUrl,
    reason,
}: ApplicationRejectionEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Update regarding your {applicationType} application</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>Application Update</Heading>
                    <Text style={text}>
                        Hi {recipientName},
                    </Text>
                    <Text style={text}>
                        Thank you for applying. We have reviewed your {applicationType.toLowerCase()} application
                        {itemName ? ` (${itemName})` : ''}, and unfortunately, we cannot approve it at this time.
                    </Text>

                    {reason && (
                        <Text style={{ ...text, backgroundColor: '#fee2e2', padding: '12px', borderRadius: '4px', color: '#991b1b' }}>
                            <strong>Reason for rejection:</strong> {reason}
                        </Text>
                    )}

                    <Text style={text}>
                        You are welcome to resolve any issues and submit a new application through your dashboard.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={dashboardUrl}>
                            Go to Dashboard
                        </Button>
                    </Section>

                    <Text style={text}>
                        If you have any questions or need clarification, please reach out to our support team.
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>
                        StudioVaultPH - Empowering your Pilates practice.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default ApplicationRejectionEmail;

const main = {
    backgroundColor: '#FAF9F6',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
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
    fontFamily: 'serif',
    color: '#1a1f2c',
    textAlign: 'center' as const,
};

const heading = {
    fontSize: '28px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: 'bold',
    color: '#1a1f2c',
    padding: '17px 0 0',
    textAlign: 'center' as const,
};

const text = {
    margin: '0',
    marginTop: '16px',
    color: '#4a5568',
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
    backgroundColor: '#1a1f2c',
    borderRadius: '8px',
    color: '#FAF9F6',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};

const hr = {
    borderColor: '#e2e8f0',
    margin: '40px 0 20px',
};

const footer = {
    color: '#718096',
    fontSize: '13px',
    lineHeight: '22px',
    textAlign: 'center' as const,
};
