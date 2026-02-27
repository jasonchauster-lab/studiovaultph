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

interface ApplicationApprovalEmailProps {
    recipientName: string;
    applicationType: 'Instructor' | 'Studio';
    itemName?: string; // Studio name or Certification name
    dashboardUrl: string;
}

export const ApplicationApprovalEmail = ({
    recipientName,
    applicationType,
    itemName,
    dashboardUrl,
}: ApplicationApprovalEmailProps) => {
    const isStudio = applicationType === 'Studio';

    return (
        <Html>
            <Head />
            <Preview>Your {applicationType} application has been approved!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>Congratulations!</Heading>
                    <Text style={text}>
                        Hi {recipientName},
                    </Text>
                    <Text style={text}>
                        We are excited to inform you that your {applicationType === 'Instructor' ? 'certification' : 'studio'}
                        {itemName ? ` (${itemName})` : ''} has been successfully verified and approved.
                    </Text>

                    <Text style={text}>
                        {isStudio
                            ? "Your studio is now active and can start receiving bookings from instructors and clients."
                            : "Your instructor profile is now verified, increasing your visibility and trust with potential clients and studios."
                        }
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={dashboardUrl}>
                            Go to Dashboard
                        </Button>
                    </Section>

                    <Text style={text}>
                        If you have any questions, feel free to reach out to our support team.
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

export default ApplicationApprovalEmail;

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

const logoImage = {
    margin: '0 auto',
    marginBottom: '16px',
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
