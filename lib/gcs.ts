import { Storage } from '@google-cloud/storage';
import path from 'path';

/**
 * GOOGLE CLOUD STORAGE UTILITY
 * Handles bucket auto-creation, public permissions, and binary uploads.
 * This is the ultimate bypass for Sucuri's payload size limits.
 */

const keyFilename = path.join(process.cwd(), 'credentials.json');
const storage = new Storage({ keyFilename });

const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'kj-blog-images-2026';

export async function uploadToGCS(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
        const bucket = storage.bucket(bucketName);

        // 1. Attempt Graceful Bucket Creation (Optional)
        // Note: Requires Project-level Storage Admin. If it fails, we assume bucket exists.
        try {
            const [exists] = await bucket.exists();
            if (!exists) {
                console.log(`Attempting to create GCS Bucket: ${bucketName}...`);
                await storage.createBucket(bucketName);

                // 2. Set Public Read Permissions (allUsers)
                await bucket.iam.setPolicy({
                    bindings: [
                        {
                            role: 'roles/storage.objectViewer',
                            members: ['allUsers'],
                        },
                    ],
                });
                console.log(`Bucket ${bucketName} created and made public.`);
            }
        } catch (setupErr: any) {
            console.warn("GCS Bucket Setup Warning (likely already exists or insufficient permissions):", setupErr.message);
        }

        // 2. Upload the Binary Buffer
        const file = bucket.file(fileName);
        await file.save(buffer, {
            metadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000',
            },
            resumable: false,
        });

        // 4. Return the Public URL
        return `https://storage.googleapis.com/${bucketName}/${fileName}`;
    } catch (error) {
        console.error("GCS Upload Error:", error);
        throw error;
    }
}
