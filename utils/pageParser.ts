import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { ImageInfo } from '../types';

// Configuração do Worker para corresponder à versão do importmap
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const RENDER_SCALE = 1.5;

/**
 * Carrega o documento PDF para memória.
 */
export const loadPdfDocument = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
    const arrayBuffer = await file.arrayBuffer();
    return await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
};

/**
 * Cria um hash simples para a imagem.
 */
const createHash = async (str: string): Promise<string> => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Renderiza uma única página de um documento PDF já carregado.
 * Isso permite processamento sequencial para economizar memória.
 */
export const renderSinglePage = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    fileName: string
): Promise<ImageInfo> => {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    
    const canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    
    if (!context) {
        throw new Error(`Could not get canvas context for page ${pageNumber}`);
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    const hash = await createHash(base64);

    // Clean up to assist Garbage Collection
    canvas.width = 0;
    canvas.height = 0;
    context = null;
    // Note: The 'canvas' element itself will be garbage collected once it goes out of scope,
    // but setting dimensions to 0 clears the buffer immediately.

    return {
        filename: `${fileName}-page-${pageNumber}.jpg`,
        page: pageNumber,
        hash,
        base64: base64,
    };
};

/**
 * Mantido para compatibilidade, mas recomenda-se usar a abordagem sequencial no App.tsx
 */
export const renderPdfPages = async (
  file: File,
  pagesToRender: Set<number>
): Promise<ImageInfo[]> => {
  const pdf = await loadPdfDocument(file);
  const imageInfos: ImageInfo[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    if (!pagesToRender.has(i)) continue;
    try {
        const imgInfo = await renderSinglePage(pdf, i, file.name);
        imageInfos.push(imgInfo);
    } catch (err) {
        console.warn(`Failed to render page ${i}`, err);
    }
  }
  return imageInfos;
};