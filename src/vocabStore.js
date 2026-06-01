import fs from 'node:fs/promises';
import { categories } from './config.js';
import { vocabularyPath } from './paths.js';

export async function readVocabulary() {
  const raw = await fs.readFile(vocabularyPath, 'utf8');
  const vocabulary = JSON.parse(raw);

  for (const category of categories) {
    if (!Array.isArray(vocabulary[category]) || vocabulary[category].length === 0) {
      throw new Error(`Vocabulary category is missing or empty: ${category}`);
    }
  }

  return vocabulary;
}

export function selectVocabularyItems(vocabulary, state) {
  return categories.map((category) => {
    const used = new Set(state.usedIds[category] || []);
    let available = vocabulary[category].filter((item) => !used.has(item.id));
    const resetUsedIds = available.length === 0;

    if (resetUsedIds) {
      available = vocabulary[category];
    }

    const item = available[0];
    return {
      ...item,
      category,
      usedStatus: {
        alreadyUsedBeforeSelection: used.has(item.id),
        resetUsedIdsBeforeSelection: resetUsedIds,
        usedCountBeforeSelection: used.size,
        availableCountBeforeSelection: available.length
      }
    };
  });
}

export function markVocabularyUsed(state, selectedItems) {
  for (const item of selectedItems) {
    if (item.usedStatus?.resetUsedIdsBeforeSelection) {
      state.usedIds[item.category] = [];
    }
    state.usedIds[item.category] = Array.from(new Set([...(state.usedIds[item.category] || []), item.id]));
  }
}
