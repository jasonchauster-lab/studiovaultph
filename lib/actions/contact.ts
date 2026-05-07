'use server';

import { sendEmail } from '@/lib/email';
import DemoRequestEmail from '@/components/emails/DemoRequestEmail';
import React from 'react';

export async function submitDemoRequest(formData: FormData) {
    // Honeypot check
    const honeypot = formData.get('website_url');
    if (honeypot) {
        console.warn('Spam submission detected via honeypot.');
        return { success: true }; // Silent fail for bots
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const studioName = formData.get('studioName') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
        return { success: false, error: 'Please fill in all required fields.' };
    }

    try {
        console.log(`Processing demo request for: ${email}`);
        
        const result = await sendEmail({
            to: 'hello@studiovaultph.com', // Recipient
            subject: `New Demo Request from ${name}`,
            react: React.createElement(DemoRequestEmail, {
                name,
                email,
                studioName,
                message,
            }),
        });

        if (!result.success) {
            // Fallback logging for development
            console.error('Email failed to send. Submission data:', { name, email, studioName, message });
            
            // If the failure is due to missing API key, we might still want to "succeed" in dev mode if we logged it
            if (result.error === 'Missing API Key') {
                return { success: true, warning: 'Development mode: Submission logged but email not sent (Missing API Key).' };
            }
            
            return { success: false, error: 'Failed to send request. Please try again later.' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error submitting demo request:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
