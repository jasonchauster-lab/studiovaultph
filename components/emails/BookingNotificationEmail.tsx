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
} from '@react-email/components';

interface BookingNotificationEmailProps {
    recipientName: string;
    bookingType: 'New Booking' | 'Booking Confirmed' | 'Booking Rejected';
    studioName?: string;
    instructorName?: string;
    clientName?: string;
    date: string;
    time: string;
    address?: string;
    rejectionReason?: string; // Added reason
}

export default function BookingNotificationEmail({
    recipientName,
    bookingType,
    studioName,
    instructorName,
    clientName,
    date,
    time,
    address,
    rejectionReason,
}: BookingNotificationEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>{bookingType} - Pilates Bridge</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>{bookingType}</Heading>
                    <Text style={text}>Hi {recipientName},</Text>
                    <Text style={text}>
                        {bookingType === 'New Booking'
                            ? `You have a new booking request.`
                            : bookingType === 'Booking Rejected'
                                ? `Unfortunately, your booking request has been rejected.`
                                : `Your booking has been successfully confirmed.`}
                    </Text>

                    {bookingType === 'Booking Rejected' && rejectionReason && (
                        <Section style={rejectionBox}>
                            <Text style={paragraph}>
                                <strong>Reason:</strong> {rejectionReason}
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
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>Pilates Bridge Notification</Text>
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
