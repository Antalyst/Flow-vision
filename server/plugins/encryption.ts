import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

declare module 'nitropack' {
    interface NitroApp {
        encryption: {
        encryptBuffer: (buffer: Buffer) => Buffer;
        decryptBuffer: (combinedBuffer: Buffer) => Buffer;
        };
    }
}

export default defineNitroPlugin((nitroApp) => {
    const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');
    const algorithm = 'aes-256-gcm';

    const encryptBuffer = (buffer: Buffer): Buffer => {
        const iv = randomBytes(12);
        const cipher = createCipheriv(algorithm, encryptionKey, iv);
        
        const part1 = cipher.update(buffer);
        const part2 = cipher.final();
        const encrypted = Buffer.concat([part1, part2]);
        
        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, authTag, encrypted]);
    };

    const decryptBuffer = (combinedBuffer: Buffer): Buffer => {
        const iv = combinedBuffer.subarray(0, 12);
        const authTag = combinedBuffer.subarray(12, 28);
        const encrypted = combinedBuffer.subarray(28);

        const decipher = createDecipheriv(algorithm, encryptionKey, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    };

    nitroApp.encryption = { encryptBuffer, decryptBuffer };
});