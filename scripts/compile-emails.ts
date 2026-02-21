import { render } from '@react-email/render';
import VerificationEmail from '../components/emails/VerificationEmail';
import ResetPasswordEmail from '../components/emails/ResetPasswordEmail';
import fs from 'fs';
import path from 'path';
import * as React from 'react';

// Using async IIFE to allow await
(async () => {
    try {
        let verificationHtml = await render(React.createElement(VerificationEmail, {}));
        let resetHtml = await render(React.createElement(ResetPasswordEmail, {}));

        // Remove the zero-width non-joiner characters that React Email's <Preview> injects
        // These show up as weird symbols when pasted into Supabase
        const stripWeirdChars = (html: string) => html.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\u200E\u200F]/g, '');

        verificationHtml = stripWeirdChars(verificationHtml);
        resetHtml = stripWeirdChars(resetHtml);

        const outDir = path.join(process.cwd(), 'emails-output');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
        }

        fs.writeFileSync(path.join(outDir, 'verification.html'), verificationHtml);
        fs.writeFileSync(path.join(outDir, 'reset-password.html'), resetHtml);

        console.log('✅ Successfully generated HTML emails in ./emails-output/');
    } catch (error) {
        console.error('Error rendering emails:', error);
    }
})();
