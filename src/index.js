import 'dotenv/config';
import util from 'node:util';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { readState, writeState } from './stateStore.js';
import { readVocabulary, markVocabularyUsed, selectVocabularyItems } from './vocabStore.js';
import { renderFlashcards } from './renderFlashcard.js';
import { uploadImages } from './uploadCloudinary.js';
import { sendFlashcardsToLine } from './lineClient.js';
import { dueSlotsForBangkokNow, lineHeader, resolveSlot, windowKey as makeWindowKey } from './time.js';
import { cleanGeneratedArtifacts } from './cleanup.js';
import { statePath, testStatePath } from './paths.js';

function getArg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function isProductionMode(mode) {
  return mode === 'schedule' || mode === 'send';
}

function shouldSend(mode) {
  return mode === 'send-test' || mode === 'send-test-next' || isProductionMode(mode);
}

function usesAdvancingTestState(mode) {
  return mode === 'send-test-next';
}

async function runSingle(mode, slot) {
  const config = getConfig(mode);
  const currentWindowKey = makeWindowKey(slot);

  await logger.info('Run started', { mode, slot, currentWindowKey });

  if (mode === 'render-test' || mode === 'send-test' || mode === 'send-test-next') {
    await cleanGeneratedArtifacts();
  }

  const activeStatePath = usesAdvancingTestState(mode) ? testStatePath : statePath;
  const state = await readState(activeStatePath);
  await logger.info('State loaded', {
    statePath: activeStatePath,
    productionState: activeStatePath === statePath
  });

  if (isProductionMode(mode) && state.sentWindows[currentWindowKey]) {
    await logger.warn('Duplicate schedule window skipped because it already completed', {
      currentWindowKey,
      completedAt: state.sentWindows[currentWindowKey].sentAt,
      itemIds: state.sentWindows[currentWindowKey].itemIds || []
    });
    return;
  }

  const vocabulary = await readVocabulary();
  const selectedItems = selectVocabularyItems(vocabulary, state);
  for (const item of selectedItems) {
    await logger.info('Selected vocabulary word', {
      category: item.category,
      word: item.word,
      id: item.id,
      usedStatus: item.usedStatus
    });
  }

  if (mode === 'dry-run') {
    await logger.info('Dry run completed without rendering, uploading, sending, or marking state', {
      lineMessage: lineHeader(slot),
      selectedItems
    });
    return;
  }

  const renderedCards = await renderFlashcards(selectedItems, slot);
  await logger.info('Flashcards rendered', {
    files: renderedCards.map((card) => ({
      category: card.item.category,
      word: card.item.word,
      htmlPath: card.htmlPath,
      pngPath: card.path
    }))
  });

  if (mode === 'render-test') {
    await logger.info('Render test completed without upload, LINE send, or state changes');
    return;
  }

  if (!shouldSend(mode)) {
    throw new Error(`Unsupported mode after rendering: ${mode}`);
  }

  const uploadPrefix = usesAdvancingTestState(mode) ? 'test-next' : 'test';
  const uploadWindowKey = isProductionMode(mode) ? currentWindowKey : `${uploadPrefix}-${currentWindowKey}`;
  const uploadedCards = await uploadImages(renderedCards, config, uploadWindowKey);
  await logger.info('Flashcards uploaded', {
    urls: uploadedCards.map((card) => card.url)
  });

  await sendFlashcardsToLine(uploadedCards, config, slot);
  await logger.info('LINE messages sent', { lineTargetIdExists: Boolean(config.lineTargetId), slot });

  if (usesAdvancingTestState(mode)) {
    markVocabularyUsed(state, selectedItems);
    await writeState(state, testStatePath);
    await logger.info('Send test-next completed and advanced separate test state only', {
      currentWindowKey,
      testStatePath,
      selected: selectedItems.map((item) => ({
        category: item.category,
        word: item.word,
        id: item.id,
        usedStatus: item.usedStatus
      }))
    });
    return;
  }

  if (!isProductionMode(mode)) {
    await logger.info('Send test completed without marking vocabulary used or completing schedule window', {
      currentWindowKey
    });
    return;
  }

  markVocabularyUsed(state, selectedItems);
  state.sentWindows[currentWindowKey] = {
    sentAt: new Date().toISOString(),
    slot,
    itemIds: selectedItems.map((item) => item.id),
    imageUrls: uploadedCards.map((card) => card.url)
  };
  await writeState(state);
  await logger.info('Production schedule window completed and state updated', {
    completedWindowKey: currentWindowKey,
    selected: selectedItems.map((item) => ({
      category: item.category,
      word: item.word,
      id: item.id,
      usedStatus: item.usedStatus
    }))
  });
}

async function main() {
  const mode = getArg('mode', 'dry-run');

  if (mode === 'catch-up') {
    const dueSlots = dueSlotsForBangkokNow();
    await logger.info('Catch-up run resolved due slots', { dueSlots });

    if (dueSlots.length === 0) {
      await logger.info('Catch-up run found no due slots yet');
      return;
    }

    for (const slot of dueSlots) {
      await runSingle('schedule', slot);
    }
    return;
  }

  const slot = resolveSlot(getArg('slot', process.env.SLOT));
  await runSingle(mode, slot);
}

main().catch(async (error) => {
  await logger.error('Run failed', {
    errorName: error?.name,
    errorMessage: error?.message || String(error),
    errorCode: error?.code,
    errorHttpCode: error?.http_code,
    stack: error?.stack,
    errorDetails: util.inspect(error, { depth: 4 })
  });
  process.exitCode = 1;
});
