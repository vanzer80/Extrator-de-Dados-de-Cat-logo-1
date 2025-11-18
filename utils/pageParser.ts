
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { ImageInfo } from '../types';

// Configuração do Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const DEFAULT_SCALE = 1.5;

// PDF.js Operator List Mapping
let OPS: any = null;

/**
 * Helper to convert CMYK buffer to RGB
 * CMYK is 4 bytes per pixel, RGB is 3 (or 4 for RGBA)
 */
const convertCMYKtoRGB = (cmykData: Uint8Array | Uint8ClampedArray): Uint8ClampedArray => {
    const pixelCount = cmykData.length / 4;
    const rgbData = new Uint8ClampedArray(pixelCount * 4); // RGBA output

    for (let i = 0, j = 0; i < cmykData.length; i += 4, j += 4) {
        const c = cmykData[i] / 255;
        const m = cmykData[i + 1] / 255;
        const y = cmykData[i + 2] / 255;
        const k = cmykData[i + 3] / 255;

        // Simple CMYK to RGB formula
        // Note: In strict color management, this needs ICC profiles, 
        // but for web display this approximation is standard.
        let r = 255 * (1 - c) * (1 - k);
        let g = 255 * (1 - m) * (1 - k);
        let b = 255 * (1 - y) * (1 - k);

        rgbData[j] = Math.round(r);
        rgbData[j + 1] = Math.round(g);
        rgbData[j + 2] = Math.round(b);
        rgbData[j + 3] = 255; // Alpha
    }
    return rgbData;
};

/**
 * Loads a PDF document from a File object.
 */
export const loadPdfDocument = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return loadingTask.promise;
};

/**
 * Renders a single page to a base64 image string for AI analysis.
 */
export const renderSinglePage = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  filename: string,
  scale: number = DEFAULT_SCALE
): Promise<ImageInfo> => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  const base64 = canvas.toDataURL('image/jpeg', 0.85);
  
  // Cleanup
  canvas.width = 1;
  canvas.height = 1; 
  
  return {
    filename: `${filename}-page-${pageNumber}`,
    page: pageNumber,
    hash: `${filename}-${pageNumber}`,
    base64: base64
  };
};

/**
 * "Text Suppressor" Engine + High Quality Crop
 * Renders a specific region of the PDF with text layers disabled.
 */
export const renderHighQualityCrop = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  box_2d: [number, number, number, number],
  scale: number = 4.0
): Promise<string | null> => {
  try {
      const page = await pdf.getPage(pageNumber);
      
      const ymin = Math.max(0, Math.min(1000, box_2d[0]));
      const xmin = Math.max(0, Math.min(1000, box_2d[1]));
      const ymax = Math.max(0, Math.min(1000, box_2d[2]));
      const xmax = Math.max(0, Math.min(1000, box_2d[3]));

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      
      const cropX = (xmin / 1000) * unscaledViewport.width;
      const cropY = (ymin / 1000) * unscaledViewport.height;
      const cropWidth = ((xmax - xmin) / 1000) * unscaledViewport.width;
      const cropHeight = ((ymax - ymin) / 1000) * unscaledViewport.height;

      if (cropWidth <= 0 || cropHeight <= 0) return null;

      // Safety Cap
      const MAX_CANVAS_DIM = 4096;
      let finalScale = scale;
      
      if ((cropWidth * finalScale) > MAX_CANVAS_DIM) {
          finalScale = MAX_CANVAS_DIM / cropWidth;
      }
      if ((cropHeight * finalScale) > MAX_CANVAS_DIM) {
          finalScale = MAX_CANVAS_DIM / cropHeight;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
      if (!ctx) return null;

      canvas.width = Math.floor(cropWidth * finalScale);
      canvas.height = Math.floor(cropHeight * finalScale);

      ctx.translate(-cropX * finalScale, -cropY * finalScale);

      const viewport = page.getViewport({ scale: finalScale });

      // TEXT SUPPRESSION LOGIC
      const opList = await page.getOperatorList();
      
      if (!OPS) {
          OPS = (pdfjsLib as any).OPS; 
      }

      if (OPS) {
          const textOps = new Set([
              OPS.showText, 
              OPS.showSpacedText, 
              OPS.nextLineShowText, 
              OPS.nextLineSetSpacingShowText,
              OPS.beginText,
              OPS.endText,
              OPS.setCharSpacing,
              OPS.setWordSpacing
          ]);

          for (let i = 0; i < opList.fnArray.length; i++) {
              if (textOps.has(opList.fnArray[i])) {
                  opList.argsArray[i] = []; 
              }
          }
      }

      await page.render({
          canvasContext: ctx,
          viewport: viewport,
      }).promise;

      // Export Lossless PNG
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const base64 = canvas.toDataURL('image/png');

      canvas.width = 1;
      canvas.height = 1;
      
      return base64;

  } catch (e) {
      console.error("Error in High Quality Crop:", e);
      return null;
  }
};

/**
 * "God Mode" Extraction
 * Attempts to extract the raw bitmap image object directly from the PDF stream.
 */
export const extractBestImageForBox = async (
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    box_2d: [number, number, number, number]
): Promise<string | null> => {
    try {
        const page = await pdf.getPage(pageNumber);
        const opList = await page.getOperatorList();
        const commonObjs = page.commonObjs;
        const objs = page.objs;

        const ymin = box_2d[0];
        const xmin = box_2d[1];
        const ymax = box_2d[2];
        const xmax = box_2d[3];
        
        const boxWidth = xmax - xmin;
        const boxHeight = ymax - ymin;
        // Normalized Page Size roughly 1000x1000 units for simple math
        // In reality we check overlap ratio
        
        if (!OPS) OPS = (pdfjsLib as any).OPS;
        
        let bestImage: string | null = null;
        let bestScore = -1;

        for (let i = 0; i < opList.fnArray.length; i++) {
            if (opList.fnArray[i] === OPS.paintImageXObject) {
                const imgName = opList.argsArray[i][0];
                
                let imgObj = null;
                if (commonObjs.has(imgName)) {
                    imgObj = commonObjs.get(imgName);
                } else if (objs.has(imgName)) {
                    imgObj = objs.get(imgName);
                }

                if (imgObj && imgObj.width > 100 && imgObj.height > 100) {
                    
                    // Heuristics
                    const imgAspect = imgObj.width / imgObj.height;
                    const boxAspect = boxWidth / boxHeight;
                    const aspectDiff = Math.abs(imgAspect - boxAspect);
                    const resolution = imgObj.width * imgObj.height;

                    // STRICT "Background vs Object" Check
                    // We estimate if the image is significantly larger than the box
                    // Since we don't have the full transformation matrix here (it's complex in PDF.js),
                    // We use aspect ratio as a proxy for fit.
                    
                    // If the aspect ratio is wildly different (> 0.5 difference), 
                    // it's likely a background or a sprite sheet.
                    // TIGHTENED from 0.8 to 0.5
                    if (aspectDiff > 0.5) continue; 

                    let score = 0;
                    score += (1 - aspectDiff) * 100;
                    if (resolution > 1000000) score += 50; // Boost for HD

                    if (score > bestScore) {
                        bestScore = score;
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = imgObj.width;
                        canvas.height = imgObj.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) continue;

                        const imgData = ctx.createImageData(imgObj.width, imgObj.height);
                        
                        // Handle Data Types
                        if (imgObj.kind === 4) { 
                             // CMYK Conversion
                             const rgbData = convertCMYKtoRGB(imgObj.data);
                             imgData.data.set(rgbData);
                        } else if (imgObj.data.length === imgObj.width * imgObj.height * 3) {
                            // RGB (24-bit) to RGBA (32-bit)
                            const data = imgObj.data;
                            for (let p = 0, d = 0; p < data.length; p += 3, d += 4) {
                                imgData.data[d] = data[p];
                                imgData.data[d + 1] = data[p + 1];
                                imgData.data[d + 2] = data[p + 2];
                                imgData.data[d + 3] = 255;
                            }
                        } else if (imgObj.data.length === imgObj.width * imgObj.height * 4) {
                            // RGBA (32-bit)
                            imgData.data.set(imgObj.data);
                        } else {
                            // Unsupported format (Grayscale etc), skip
                            continue;
                        }
                        
                        ctx.putImageData(imgData, 0, 0);
                        bestImage = canvas.toDataURL('image/png');
                    }
                }
            }
        }
        
        // TIGHT Threshold: Only return if we are fairly confident.
        // Otherwise, fallback to the Crop method which is safer for alignment.
        if (bestScore < 70) return null;

        return bestImage;

    } catch (e) {
        console.warn("Native extraction fallback invoked due to error:", e);
        return null;
    }
}
