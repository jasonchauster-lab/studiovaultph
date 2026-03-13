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

interface BookingNotificationEmailProps {
    recipientName: string;
    bookingType: 'New Booking' | 'Booking Confirmed' | 'Booking Rejected' | 'Booking Cancelled';
    studioName?: string;
    instructorName?: string;
    clientName?: string;
    date: string;
    time: string;
    equipment?: string;
    quantity?: number;
    address?: string;
    rejectionReason?: string;
    cancellationReason?: string;
    hasRefund?: boolean;
}

export default function BookingNotificationEmail({
    recipientName,
    bookingType,
    studioName,
    instructorName,
    clientName,
    date,
    time,
    equipment,
    quantity,
    address,
    rejectionReason,
    cancellationReason,
    hasRefund,
}: BookingNotificationEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>{bookingType} - StudioVaultPH</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://studiovaultph.com/logo1.jpg" width="48" height="48" alt="StudioVaultPH Logo" style={logoImage} />
                        <Text style={logoText}>StudioVaultPH</Text>
                    </Section>
                    <Heading style={h1}>{bookingType}</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    <Text style={text}>
                        {bookingType === 'New Booking'
                            ? `You have a new booking request.`
                            : bookingType === 'Booking Rejected'
                                ? `Unfortunately, your booking request has been rejected.`
                                : bookingType === 'Booking Cancelled'
                                    ? `This session has been cancelled.`
                                    : `Your booking has been successfully confirmed.`}
                    </Text>

                    {hasRefund && (
                        <Text style={refundText}>
                            Your wallet has been refunded for this booking. You can view the refunded amount in your Wallet transactions.
                        </Text>
                    )}

                    {(bookingType === 'Booking Rejected' || bookingType === 'Booking Cancelled') && (rejectionReason || cancellationReason) && (
                        <Section style={rejectionBox}>
                            <Text style={paragraph}>
                                <strong>Reason for {bookingType === 'Booking Rejected' ? 'Rejection' : 'Cancellation'}:</strong> {rejectionReason || cancellationReason}
                            </Text>
                        </Section>
                    )}

                    <Section style={box}>
                        <Text style={paragraph}>
                            <strong>Studio:</strong> {studioName}
                        </Text>
                        {address && (
                            <Text style={paragraph}>
                                <strong>Address:</strong> {address}
                            </Text>
                        )}
                        {instructorName && (
                            <Text style={paragraph}>
                                <strong>Instructor:</strong> {instructorName}
                            </Text>
                        )}
                        {clientName && (
                            <Text style={paragraph}>
                                <strong>Client:</strong> {clientName}
                            </Text>
                        )}
                        <Text style={paragraph}>
                            <strong>Date:</strong> {date}
                        </Text>
                        <Text style={paragraph}>
                            <strong>Time:</strong> {time}
                        </Text>
                        {equipment && (
                            <Text style={paragraph}>
                                <strong>Equipment:</strong> {equipment}
                            </Text>
                        )}
                        {quantity !== undefined && (
                            <Text style={paragraph}>
                                <strong>Quantity:</strong> {quantity}
                            </Text>
                        )}
                    </Section>

                    {bookingType === 'Booking Confirmed' && (
                        <Section style={tncBox}>
                            <Text style={tncHeader}>Terms & Conditions</Text>
                            <ul style={tncList}>
                                <li style={tncItem}>
                                    <strong>Cancellations:</strong> Can be made up to 24 hours before the session start time for a full refund to your wallet. Cancellations within 24 hours are non-refundable.
                                </li>
                                <li style={tncItem}>
                                    <strong>No-Shows:</strong> If you do not arrive for your scheduled session, it will be considered a no-show and the session fee will be forfeited.
                                </li>
                                <li style={tncItem}>
                                    <strong>Rebooking:</strong> Strictly not allowed. Treated as a cancellation. Please cancel your existing session (if eligible) and book a new one.
                                </li>
                                <li style={tncItem}>
                                    <strong>Non-Transferable:</strong> All bookings are strictly non-transferable to other individuals or accounts.
                                </li>
                                <li style={tncItem}>
                                    <strong>Refunds:</strong> All eligible refunds are credited directly back to your StudioVaultPH Wallet and are not refundable to the original payment method.
                                </li>
                            </ul>
                        </Section>
                    )}

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

const refundText = {
    color: '#059669', // A clear green to indicate a positive financial action
    fontSize: '15px',
    lineHeight: '22px',
    padding: '0 20px',
    fontWeight: 'bold',
};

const rejectionBox = {
    padding: '24px',
    backgroundColor: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '4px',
    margin: '24px 20px',
};

const paragraph = {
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
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

const tncBox = {
    padding: '24px',
    backgroundColor: '#fafbfc',
    borderTop: '1px solid #e6ebf1',
    marginTop: '12px',
};

const tncHeader = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 12px 0',
};

const tncList = {
    margin: '0',
    paddingLeft: '20px',
};

const tncItem = {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#555',
    marginBottom: '8px',
};
