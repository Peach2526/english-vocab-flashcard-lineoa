import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { projectRoot } from './paths.js';

const envPath = path.join(projectRoot, '.env');
dotenv.config({ path: envPath, override: false });

export const requiredForSend = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_TARGET_ID',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

export const categories = ['economics', 'politics', 'military'];

export function envPresenceReport() {
  return {
    envPath,
    envFileExists: fs.existsSync(envPath),
    required: Object.fromEntries(
      requiredForSend.map((key) => [
        key,
        {
          exists: Boolean(process.env[key] && String(process.env[key]).trim())
        }
      ])
    )
  };
}

function logEnvPresence(mode) {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level: 'info',
      message: 'Config environment variable presence',
      mode,
      ...envPresenceReport()
    })
  );
}

export function getConfig(mode) {
  logEnvPresence(mode);

  const slot = process.env.SLOT;
  const config = {
    mode,
    timezone: 'Asia/Bangkok',
    slot,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    lineTargetId: process.env.LINE_TARGET_ID,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
  };

  if (mode === 'send-test' || mode === 'send-test-next' || mode === 'send' || mode === 'schedule') {
    const missing = requiredForSend.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  return config;
}
