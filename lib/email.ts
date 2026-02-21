import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
    to,
    subject,
    react
}: {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is missing. Email not sent.');
        return { success: false, error: 'Missing API Key' };
    }

    try {
        const emailHtml = await render(react);

        const fromAddress = 'Studio Vault PH <bookings@studiovaultph.com>';
        console.log(`Attempting to send email FROM: ${fromAddress} TO: ${to} with subject: ${subject}`);
        const data = await resend.emails.send({
            from: fromAddress, // Validated domain
            to,
            subject,
            html: emailHtml, // Send as HTML
        });
        console.log('Resend Response Data:', JSON.stringify(data, null, 2));
        return { success: true, data };
    } catch (error: unknown) {
        console.error('Failed to send email. Error details:', error);
        return { success: false, error };
    }
}
