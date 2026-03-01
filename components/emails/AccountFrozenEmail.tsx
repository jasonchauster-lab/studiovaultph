import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface AccountFrozenEmailProps {
    studioName: string;
}

export const AccountFrozenEmail = ({
    studioName,
}: AccountFrozenEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Action Required: Your Studio Vault PH Listing has been Suspended</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>Account Suspended</Heading>
                    <Text style={text}>
                        Hi {studioName},
                    </Text>
                    <Text style={text}>
                        We are reaching out to inform you that your studio listing has been temporarily suspended from the Studio Vault PH marketplace.
                    </Text>
                    <Text style={text}>
                        Our records show 3 late cancellations (less than 24 hours' notice) within the last 30 days. To maintain a reliable experience for our instructors and clients, accounts with multiple late cancellations are automatically frozen.
                    </Text>

                    <Section style={infoSection}>
                        <Text style={infoHeading}>What this means:</Text>
                        <ul style={list}>
                            <li style={listItem}>Your current listings are hidden from search results.</li>
                            <li style={listItem}>You cannot create new bookable slots.</li>
                            <li style={listItem}>Payout requests are temporarily disabled.</li>
                        </ul>
                    </Section>

                    <Section style={infoSection}>
                        <Text style={infoHeading}>How to reinstate your account:</Text>
                        <Text style={text}>
                            Please reply to this email or message us via the Admin Support Center to discuss these cancellations. We want to understand if these were due to one-time emergencies or equipment issues so we can help you get back to hosting.
                        </Text>
                    </Section>

                    <Text style={text}>
                        Best regards,<br />
                        The Studio Vault PH Team
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

export default AccountFrozenEmail;

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
    textAlign: 'left' as const,
};

const infoSection = {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
};

const infoHeading = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1a1f2c',
    margin: '0',
    marginBottom: '8px',
};

const list = {
    margin: '0',
    paddingLeft: '20px',
    color: '#4a5568',
};

const listItem = {
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '8px',
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
