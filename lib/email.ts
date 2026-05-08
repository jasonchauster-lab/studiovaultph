import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
    to,
    subject,
    react,
    html,
    text,
    fromName
}: {
    to: string | string[];
    subject: string;
    react?: React.ReactElement;
    html?: string;
    text?: string;
    fromName?: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is missing. Email not sent.');
        return { success: false, error: 'Missing API Key' };
    }

    try {
        let emailHtml = html;
        if (react) {
            emailHtml = await render(react);
        }

        const name = fromName || 'Studio Vault PH';
        const fromAddress = `${name} <bookings@studiovaultph.com>`;
        console.log(`Attempting to send email FROM: ${fromAddress} TO: ${to} with subject: ${subject}`);
        
        const emailOptions: any = {
            from: fromAddress,
            to,
            subject,
        };

        if (emailHtml) emailOptions.html = emailHtml;
        if (text) emailOptions.text = text;
        
        const data = await resend.emails.send(emailOptions);
        
        console.log('Resend Response Data:', JSON.stringify(data, null, 2));
        return { success: true, data };
    } catch (error: unknown) {
        console.error('Failed to send email. Error details:', error);
        return { success: false, error };
    }
}
