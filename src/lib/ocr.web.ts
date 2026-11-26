/* Web: Texterkennung mit Tesseract.js im Browser (wird beim ersten Mal nachgeladen) */
type Worker = { recognize(src: string): Promise<{ data: { text: string } }>; terminate(): Promise<unknown> };
declare global { interface Window { Tesseract?: { createWorker(lang: string, oem?: number): Promise<Worker> } } }

async function load() {
  if (window.Tesseract) return;
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('Texterkennung konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
}
export const ocrSupported = () => true;
export async function readText(uri: string): Promise<string> {
  await load();
  const w = await window.Tesseract!.createWorker('deu', 1);
  try { return (await w.recognize(uri)).data.text || ''; } finally { w.terminate().catch(() => {}); }
}
