import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { ImageInfo } from '../types';

// Fix: Set workerSrc to load the PDF.js worker from the same CDN specified in the importmap.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const RENDER_SCALE = 1.5;

/**
 * Renders selected pages of a PDF file into images.
 * @param file The PDF file.
 * @param pagesToRender A set of 1-based page numbers to render.
 * @returns A promise that resolves to an array of ImageInfo objects.
 */
export const renderPdfPages = async (
  file: File,
  pagesToRender: Set<number>
): Promise<ImageInfo[]> => {
  const imageInfos: ImageInfo[] = [];
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error('Failed to read file.'));
      }
      
      try {
        const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (!pagesToRender.has(i)) continue;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            console.warn(`Could not get canvas context for page ${i}`);
            continue;
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          const base64 = canvas.toDataURL('image/jpeg', 0.9);

          // Simple hash function to identify unique images
          const hash = await createHash(base64);

          imageInfos.push({
            filename: `${file.name}-page-${i}.jpg`,
            page: i,
            hash,
            base64: base64,
          });
        }
        resolve(imageInfos);
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = (error) => {
      reject(error);
    };

    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * Creates a simple hash from a string.
 * This is not for cryptographic purposes, just for a quick unique ID.
 */
const createHash = async (str: string): Promise<string> => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}