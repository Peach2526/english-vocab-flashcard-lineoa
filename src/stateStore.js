import fs from 'node:fs/promises';
import { categories } from './config.js';
import { statePath, storageDir } from './paths.js';

function blankState() {
  return {
    usedIds: Object.fromEntries(categories.map((category) => [category, []])),
    sentWindows: {}
  };
}

export async function readState(filePath = statePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...blankState(),
      ...parsed,
      usedIds: {
        ...blankState().usedIds,
        ...(parsed.usedIds || {})
      },
      sentWindows: parsed.sentWindows || {}
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return blankState();
    }
    throw error;
  }
}

export async function writeState(state, filePath = statePath) {
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}
