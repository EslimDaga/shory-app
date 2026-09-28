import { strings } from '@/i18n/es';

export async function captureStoryImage(): Promise<string> {
  throw new Error(strings.errors.captureWebUnsupported);
}

export async function captureStickerLayer(): Promise<string> {
  throw new Error(strings.errors.captureWebUnsupported);
}
