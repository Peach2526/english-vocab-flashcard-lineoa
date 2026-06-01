import fs from 'node:fs/promises';
import path from 'node:path';
import { outputDir, storageDir } from './paths.js';
import { logger } from './logger.js';

const generatedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.html']);

async function removeGeneratedFilesFrom(dir) {
  let removed = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!generatedExtensions.has(extension)) {
        continue;
      }

      const filePath = path.join(dir, entry.name);
      await fs.unlink(filePath);
      removed.push(filePath);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
  return removed;
}

export async function cleanGeneratedArtifacts() {
  const removed = [
    ...(await removeGeneratedFilesFrom(outputDir)),
    ...(await removeGeneratedFilesFrom(storageDir))
  ];

  await logger.info('Old generated images and HTML removed before test run', {
    removedCount: removed.length,
    removed
  });
}
