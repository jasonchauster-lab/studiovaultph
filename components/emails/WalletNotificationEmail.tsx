import * as React from 'react';
import {
    Html,
    Body,
    Head,
    Heading,
    Hr,
    Container,
    Preview,
    Section,
    Text,
    Img,
} from '@react-email/components';

interface WalletNotificationEmailProps {
    recipientName: string;
    type: 'top_up_approved' | 'top_up_rejected' | 'adjustment_credit' | 'adjustment_debit';
    amount: number;
    date: string;
    rejectionReason?: string;
}

export default function WalletNotificationEmail({
    recipientName,
    type,
    amount,
    date,
    rejectionReason,
}: WalletNotificationEmailProps) {
    const isCredit = type === 'top_up_approved' || type === 'adjustment_credit';
    const isTopUp = type === 'top_up_approved' || type === 'top_up_rejected';

    const getTitle = () => {
        switch (type) {
            case 'top_up_approved': return 'Wallet Top-up Approved';
            case 'top_up_rejected': return 'Wallet Top-up Rejected';
            case 'adjustment_credit': return 'Wallet Credit Added';
            case 'adjustment_debit': return 'Wallet Balance Deducted';
        }
    };

    const getHeadline = () => {
        switch (type) {
            case 'top_up_approved': return `Your wallet top-up of ₱${amount.toLocaleString()} has been approved.`;
            case 'top_up_rejected': return `Your wallet top-up request has been rejected.`;
            case 'adjustment_credit': return `An adjustment of ₱${amount.toLocaleString()} has been credited to your wallet.`;
            case 'adjustment_debit': return `An adjustment of ₱${amount.toLocaleString()} has been deducted from your wallet.`;
        }
    };

    return (
        <Html>
            <Head />
            <Preview>{getTitle()} - StudioVaultPH</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo.png" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={h1}>{getTitle()}</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    <Text style={text}>{getHeadline()}</Text>

                    {type === 'top_up_rejected' && rejectionReason && (
                        <Section style={rejectionBox}>
                            <Text style={paragraph}>
                                <strong>Reason for Rejection:</strong> {rejectionReason}
                            </Text>
                        </Section>
                    )}

                    {!isTopUp && rejectionReason && (
                        <Section style={adjustmentBox}>
                            <Text style={paragraph}>
                                <strong>Adjustment Note:</strong> {rejectionReason}
                            </Text>
                        </Section>
                    )}

                    <Section style={box}>
                        <Text style={paragraph}>
                            <strong>Transaction Type:</strong> {isTopUp ? 'Manual Top-up' : 'Admin Adjustment'}
                        </Text>
                        <Text style={paragraph}>
                            <strong>Amount:</strong> <span style={isCredit ? creditText : debitText}>{isCredit ? '+' : '-'} ₱{amount.toLocaleString()}</span>
                        </Text>
                        <Text style={paragraph}>
                            <strong>Date:</strong> {date}
                        </Text>
                    </Section>

                    <Text style={text}>
                        {isCredit
                            ? "The funds are now available in your wallet and can be used for bookings."
                            : type === 'top_up_rejected'
                                ? "If you believe this is an error, please contact support or try uploading a clearer receipt."
                                : "This adjustment was executed by an Administrator."}
                    </Text>

                    <Hr style={hr} />
                    <Text style={footer}>StudioVaultPH Notification</Text>
                </Container>
            </Body>
        </Html>
    );
}

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
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

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
    textAlign: 'center' as const,
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 20px',
};

const box = {
    padding: '24px',
    backgroundColor: '#f2f3f3',
    borderRadius: '4px',
    margin: '24px 20px',
};

const rejectionBox = {
    padding: '24px',
    backgroundColor: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '4px',
    margin: '24px 20px',
};

const adjustmentBox = {
    padding: '24px',
    backgroundColor: '#f6f9fc',
    border: '1px solid #e6ebf1',
    borderRadius: '4px',
    margin: '24px 20px',
};

const paragraph = {
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
};

const creditText = {
    color: '#2f855a',
    fontWeight: 'bold',
};

const debitText = {
    color: '#c53030',
    fontWeight: 'bold',
};

const hr = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '16px',
    textAlign: 'center' as const,
};
