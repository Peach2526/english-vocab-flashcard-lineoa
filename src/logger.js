import fs from 'node:fs/promises';
import path from 'node:path';
import { logsDir } from './paths.js';

function stamp() {
  return new Date().toISOString();
}

export async function log(level, message, meta = {}) {
  await fs.mkdir(logsDir, { recursive: true });
  const line = JSON.stringify({ ...meta, time: stamp(), level, message });
  console.log(line);
  const file = path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`);
  await fs.appendFile(file, `${line}\n`, 'utf8');
}

export const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta)
};
