import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs/promises';
import { logger } from './logger.js';

export function configureCloudinary(config) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true
  });
}

export async function uploadImages(renderedCards, config, windowKey) {
  configureCloudinary(config);

  const uploaded = [];
  for (const card of renderedCards) {
    const stat = await fs.stat(card.path);
    const publicId = `english-vocab-flashcards/${windowKey}/${card.item.category}-${card.item.id}`.replaceAll(':', '');
    await logger.info('Uploading newly generated flashcard PNG', {
      category: card.item.category,
      word: card.item.word,
      pngPath: card.path,
      bytes: stat.size,
      publicId
    });

    const result = await cloudinary.uploader.upload(card.path, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image'
    });
    await logger.info('Uploaded flashcard image', {
      category: card.item.category,
      word: card.item.word,
      pngPath: card.path,
      uploadedImageUrl: result.secure_url
    });

    uploaded.push({
      ...card,
      url: result.secure_url
    });
  }

  return uploaded;
}
