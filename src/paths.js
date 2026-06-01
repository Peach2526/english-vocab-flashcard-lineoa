import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, '..');
export const dataDir = path.join(projectRoot, 'data');
export const templatesDir = path.join(projectRoot, 'templates');
export const outputDir = path.join(projectRoot, 'output');
export const logsDir = path.join(projectRoot, 'logs');
export const storageDir = path.join(projectRoot, 'storage');
export const vocabularyPath = path.join(dataDir, 'vocabulary.json');
export const statePath = path.join(storageDir, 'state.json');
