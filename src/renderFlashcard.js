import fs from 'node:fs/promises';
import path from 'node:path';
import { outputDir, templatesDir } from './paths.js';
import { logger } from './logger.js';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categoryLabel(category) {
  return {
    economics: 'Economics Vocabulary',
    politics: 'Politics Vocabulary',
    military: 'Military Vocabulary'
  }[category] || category;
}

function fillTemplate(template, css, item, slot) {
  const values = {
    CSS: css,
    CATEGORY_LABEL: categoryLabel(item.category),
    WORD: item.word,
    PRONUNCIATION: item.pronunciation,
    PART_OF_SPEECH: item.partOfSpeech,
    THAI_MEANING: item.thaiMeaning,
    EXAMPLE: item.example,
    EXAMPLE_THAI: item.exampleThai,
    ICON: item.icon || 'ABC',
    SLOT: slot
  };

  return Object.entries(values).reduce((html, [key, value]) => {
    const safeValue = key === 'CSS' ? value : escapeHtml(value);
    return html.replaceAll(`{{${key}}}`, safeValue);
  }, template);
}

export async function renderFlashcards(items, slot) {
  await fs.mkdir(outputDir, { recursive: true });
  const templatePath = path.join(templatesDir, 'flashcard.html');
  const cssPath = path.join(templatesDir, 'flashcard.css');
  const [template, css] = await Promise.all([fs.readFile(templatePath, 'utf8'), fs.readFile(cssPath, 'utf8')]);

  await logger.info('Flashcard template loaded', {
    templatePath,
    cssPath
  });

  process.env.PLAYWRIGHT_BROWSERS_PATH ||= '0';
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 2 });

  const rendered = [];
  try {
    for (const item of items) {
      const html = fillTemplate(template, css, item, slot);
      const baseName = `${slot.replace(':', '')}-${item.category}-${item.id}`;
      const htmlPath = path.join(outputDir, `${baseName}.html`);
      const outputPath = path.join(outputDir, `${baseName}.png`);

      const requiredRenderedValues = [item.word, item.example, item.thaiMeaning].map(escapeHtml);
      const missingValues = requiredRenderedValues.filter((value) => !html.includes(value));
      if (missingValues.length > 0) {
        throw new Error(`Rendered HTML is missing vocabulary data for ${item.category}:${item.id}`);
      }

      await fs.writeFile(htmlPath, html, 'utf8');
      await logger.info('Generated flashcard HTML', {
        category: item.category,
        word: item.word,
        htmlPath
      });

      await page.setContent(html, { waitUntil: 'networkidle' });
      const flashcard = page.locator('.flashcard');
      await flashcard.waitFor();
      const count = await flashcard.count();
      if (count !== 1) {
        throw new Error(`Expected exactly one .flashcard container, found ${count}`);
      }

      await flashcard.screenshot({ path: outputPath, animations: 'disabled' });
      await logger.info('Generated flashcard PNG from .flashcard container', {
        category: item.category,
        word: item.word,
        htmlPath,
        pngPath: outputPath
      });

      rendered.push({ item, htmlPath, path: outputPath });
    }
  } finally {
    await browser.close();
  }

  return rendered;
}
