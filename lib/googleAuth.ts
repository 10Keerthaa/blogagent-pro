import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

/**
 * Utility to get Google Auth client supporting both:
 * 1. Local Dev (credentials.json file)
 * 2. Cloud/Netlify (GOOGLE_APPLICATION_CREDENTIALS as JSON string)
 */
export async function getGoogleAuth(scopes: string[]) {
    const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credsEnv && credsEnv.startsWith('{')) {
        // Netlify/Production: Use JSON string
        const credentials = JSON.parse(credsEnv);
        return new GoogleAuth({
            credentials,
            scopes,
        });
    }

    // Local Dev: Use physical file
    const keyFile = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(keyFile)) {
        return new GoogleAuth({
            keyFile,
            scopes,
        });
    }

    // Fallback (e.g. built-in Compute Engine auth)
    return new GoogleAuth({ scopes });
}
