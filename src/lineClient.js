import { lineHeader } from './time.js';

async function linePush(config, messages) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.lineChannelAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: config.lineTargetId,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE push failed: ${response.status} ${body}`);
  }
}

export async function sendFlashcardsToLine(uploadedCards, config, slot) {
  await linePush(config, [
    {
      type: 'text',
      text: lineHeader(slot)
    }
  ]);

  await linePush(
    config,
    uploadedCards.map((card) => ({
      type: 'image',
      originalContentUrl: card.url,
      previewImageUrl: card.url
    }))
  );
}
