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

interface PackageExpiryEmailProps {
  clientName: string;
  packageName: string;
  expiryDate: string;
  remainingCredits: number;
  studioName: string;
  studioSlug: string;
  studioLogo?: string;
  primaryColor?: string;
}

export const PackageExpiryEmail = ({
  clientName,
  packageName,
  expiryDate,
  remainingCredits,
  studioName,
  studioSlug,
  studioLogo,
  primaryColor,
}: PackageExpiryEmailProps) => {
  const brandColor = primaryColor || '#2D3282';
  const logoUrl = studioLogo || "https://studiovaultph.com/logo4.png";

  return (
    <Html>
      <Head />
      <Preview>Your package at {studioName} is expiring soon!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: brandColor }}>
            {studioLogo && <Img src={logoUrl} width="48" height="48" alt={studioName} style={logoImage} />}
            <Heading style={h1}>Don&apos;t let your credits go to waste!</Heading>
          </Section>
          <Section style={section}>
            <Text style={text}>Hi {clientName},</Text>
            <Text style={text}>
              We noticed that your <strong>{packageName}</strong> at <strong>{studioName}</strong> is expiring on <strong>{expiryDate}</strong>.
            </Text>
            <Text style={text}>
              You still have <strong>{remainingCredits} credits</strong> left. Book your next session now to make the most of your package!
            </Text>
            <Link
              href={`https://studiovaultph.com/s/${studioSlug}`}
              style={{ ...button, backgroundColor: brandColor }}
            >
              Book a Session
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

export default PackageExpiryEmail;

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
