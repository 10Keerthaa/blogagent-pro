import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

/**
 * Utility to get Google Auth client supporting both:
 * 1. Local Dev (credentials.json file)
 * 2. Vercel/Production (GOOGLE_APPLICATION_CREDENTIALS as JSON string or Base64)
 */
export async function getGoogleAuth(scopes: string[]) {
    let credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credsEnv) {
        try {
            // 1. Check if it's Base64 encoded (common Vercel workaround)
            if (!credsEnv.startsWith('{')) {
                try {
                    const decoded = Buffer.from(credsEnv, 'base64').toString('utf8');
                    if (decoded.startsWith('{')) {
                        credsEnv = decoded;
                    }
                } catch (e) {
                    // Not base64, continue
                }
            }

            // 2. Sanitize: Remove potential newlines or hidden chars if pasted poorly
            const sanitized = credsEnv.trim().replace(/[\n\r]/g, '');

            if (sanitized.startsWith('{')) {
                const credentials = JSON.parse(sanitized);
                return new GoogleAuth({
                    credentials,
                    scopes,
                });
            }
        } catch (error) {
            console.error("GOOGLE_APPLICATION_CREDENTIALS parse error:", error);
            // Don't throw, let it fallback to file or default
        }
    }

    // Local Dev: Use physical file
    const keyFile = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(keyFile)) {
        return new GoogleAuth({
            keyFile,
            scopes,
        });
    }

    // Fallback (e.g. built-in Compute Engine auth or env-based default)
    return new GoogleAuth({ scopes });
}
