import { Storage } from '@google-cloud/storage';
import { getGoogleAuth } from './googleAuth';

/**
 * GOOGLE CLOUD STORAGE UTILITY
 * Handles bucket auto-creation, public permissions, and binary uploads.
 */

async function getStorageClient() {
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/cloud-platform']);
    const credentials = await auth.getCredentials();
    return new Storage({ credentials });
}

export async function uploadToGCS(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
        const storage = await getStorageClient();
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'kj-blog-images-2026';
        const bucket = storage.bucket(bucketName);

        // 1. Attempt Graceful Bucket Creation (Optional)
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
            console.warn("GCS Bucket Setup Warning:", setupErr.message);
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
