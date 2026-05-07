import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface AbandonedBookingEmailProps {
  clientName: string;
  studioName: string;
  bookingUrl: string;
  studioLogo?: string;
  primaryColor?: string;
}

export const AbandonedBookingEmail = ({
  clientName,
  studioName,
  bookingUrl,
  studioLogo,
  primaryColor,
}: AbandonedBookingEmailProps) => {
  const brandColor = primaryColor || '#2D3282';
  const logoUrl = studioLogo || "https://studiovaultph.com/logo4.png";

  return (
    <Html>
      <Head />
      <Preview>Did you forget something? Your booking at {studioName} is waiting.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: brandColor }}>
            {studioLogo && <Img src={logoUrl} width="48" height="48" alt={studioName} style={logoImage} />}
            <Heading style={h1}>Complete Your Booking</Heading>
          </Section>
          <Section style={section}>
            <Text style={text}>Hi {clientName},</Text>
            <Text style={text}>
              We noticed you started booking a session at <strong>{studioName}</strong> but didn&apos;t quite finish.
            </Text>
            <Text style={text}>
              We&apos;ve saved your spot for a little while longer. Click the button below to complete your reservation before someone else takes it!
            </Text>
            <Link
              href={bookingUrl}
              style={{ ...button, backgroundColor: brandColor }}
            >
              Finish My Booking
            </Link>
            <Hr style={hr} />
            <Text style={footer}>
              Sent via StudioVaultPH for {studioName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AbandonedBookingEmail;

const main = {
  backgroundColor: "#f9f9f9",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  width: "580px",
};

const header = {
  backgroundColor: "#2D3282",
  padding: "40px",
  borderRadius: "12px 12px 0 0",
};

const logoImage = {
  margin: "0 auto",
  marginBottom: "16px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0",
};

const section = {
  backgroundColor: "#ffffff",
  padding: "40px",
  borderRadius: "0 0 12px 12px",
  border: "1px solid #eeeeee",
};

const text = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "24px",
};

const button = {
  backgroundColor: "#2D3282",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "16px",
  marginTop: "24px",
};

const hr = {
  borderColor: "#eeeeee",
  margin: "40px 0",
};

const footer = {
  color: "#888888",
  fontSize: "12px",
  textAlign: "center" as const,
};
