/* Texterkennung auf dem Gerät: Apple Vision (iOS) bzw. Google ML Kit (Android) – kein Upload */
import { extractTextFromImage, isSupported } from 'expo-text-extractor';

export const ocrSupported = () => isSupported;
export async function readText(uri: string): Promise<string> {
  const lines = await extractTextFromImage(uri);
  return lines.join('\n');
}
