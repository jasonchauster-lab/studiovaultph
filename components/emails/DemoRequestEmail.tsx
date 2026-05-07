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
    Img,
} from '@react-email/components';
import * as React from 'react';

interface DemoRequestEmailProps {
    name: string;
    email: string;
    studioName?: string;
    message: string;
}

export const DemoRequestEmail = ({
    name,
    email,
    studioName,
    message,
}: DemoRequestEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>New Demo Request from {name}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo4.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={heading}>New Demo Request</Heading>
                    
                    <Section style={section}>
                        <Text style={label}>Contact Name</Text>
                        <Text style={value}>{name}</Text>
                        
                        <Text style={label}>Email Address</Text>
                        <Text style={value}>
                            <Link href={`mailto:${email}`} style={link}>{email}</Link>
                        </Text>
                        
                        {studioName && (
                            <>
                                <Text style={label}>Studio Name</Text>
                                <Text style={value}>{studioName}</Text>
                            </>
                        )}
                        
                        <Text style={label}>Message</Text>
                        <Text style={value}>{message}</Text>
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        This request was submitted via the Studio Vault PH "Contact Us" page.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default DemoRequestEmail;

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
    color: '#183329', // Deep Forest Green
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
    color: '#183329',
    padding: '17px 0 0',
    textAlign: 'center' as const,
};

const section = {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    marginTop: '32px',
};

const label = {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#718096',
    marginBottom: '4px',
    marginTop: '16px',
};

const value = {
    fontSize: '16px',
    color: '#1a1f2c',
    margin: '0',
    lineHeight: '1.5',
};

const link = {
    color: '#183329',
    textDecoration: 'underline',
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
