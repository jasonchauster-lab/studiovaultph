import {
    Html, Head, Body, Container, Section, Text, Button, Hr, Img
} from '@react-email/components';

interface DocumentExpiryEmailProps {
    entityName: string;
    entityType?: 'studio' | 'instructor';
    type: 'reminder_30' | 'reminder_7' | 'suspended';
    expiredDocuments: string[];
    uploadUrl?: string;
}

export default function DocumentExpiryEmail({
    entityName,
    entityType = 'studio',
    type,
    expiredDocuments,
    uploadUrl = 'https://studiovaultph.com/studio'
}: DocumentExpiryEmailProps) {
    const isSuspended = type === 'suspended';
    const isUrgent = type === 'reminder_7';

    const entityLabel = entityType === 'studio' ? 'studio' : 'instructor account';

    const heading = isSuspended
        ? `⚠️ ${entityName} — Profile Suspended`
        : isUrgent
            ? `🔴 Urgent: Documents expiring in 7 days`
            : `📋 Reminder: Documents expiring in 30 days`;

    const description = isSuspended
        ? `Your ${entityLabel} "${entityName}" has been temporarily suspended because the following mandatory documents have expired.Bookings and payouts are disabled until updated documents are submitted.`
        : `This is a ${isUrgent ? 'final' : 'friendly'} reminder that the following documents for "${entityName}" will expire ${isUrgent ? 'within 7 days' : 'within 30 days'}. Please upload updated versions to avoid suspension.`;

    return (
        <Html>
            <Head />
            <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9f7f4', padding: '20px' }}>
                <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e8e4df' }}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Text style={{ fontSize: '20px', fontWeight: 'bold', color: isSuspended ? '#b91c1c' : '#1a1a1a', marginBottom: '8px' }}>
                        {heading}
                    </Text>
                    <Text style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
                        {description}
                    </Text>

                    <Section style={{ backgroundColor: isSuspended ? '#fef2f2' : '#fffbeb', border: `1px solid ${isSuspended ? '#fecaca' : '#fde68a'} `, borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                        <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#444', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Affected Documents
                        </Text>
                        {expiredDocuments.map((doc, i) => (
                            <Text key={i} style={{ fontSize: '14px', color: isSuspended ? '#b91c1c' : '#92400e', margin: '4px 0' }}>
                                • {doc}
                            </Text>
                        ))}
                    </Section>

                    <Button
                        href={uploadUrl}
                        style={{ display: 'block', textAlign: 'center' as const, backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                        {isSuspended ? 'Upload Updated Documents' : 'Update Documents Now'}
                    </Button>

                    <Hr style={{ borderColor: '#e8e4df', margin: '24px 0' }} />
                    <Text style={{ fontSize: '11px', color: '#999', textAlign: 'center' as const }}>
                        Studio Vault PH — The premium marketplace for Pilates professionals.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}

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
