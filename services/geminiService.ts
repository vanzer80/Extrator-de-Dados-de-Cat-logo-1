import { GoogleGenAI, Type } from '@google/genai';
import { ImageInfo, ProductData } from '../types';

type ExtractedProductData = Omit<ProductData, 'origem' | 'imagens'>;

/**
 * Helper function to extract valid JSON array from a potentially dirty string.
 * LLMs often add conversational text before or after the JSON block.
 */
const extractJsonArray = (text: string): any[] | null => {
    if (!text) return null;

    // 1. Try to find the first '[' and the last ']'
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const potentialJson = text.substring(firstBracket, lastBracket + 1);
        try {
            return JSON.parse(potentialJson);
        } catch (e) {
            console.warn("Found brackets but failed to parse inner content", e);
            // Fallback to cleaning markdown if simple extraction fails
        }
    }

    // 2. Fallback: Remove markdown code blocks and try parsing the whole string
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) return parsed;
        return null;
    } catch (e) {
        return null;
    }
};

/**
 * Extracts product data from a single page image using the Gemini API.
 * @param imageInfo The image information for the page.
 * @param prompt The prompt to guide the extraction.
 * @param apiKey The API key for authenticating with the Gemini API.
 * @returns A promise that resolves to an array of ProductData objects.
 */
export const extractProductDataFromPage = async (
  imageInfo: ImageInfo,
  prompt: string,
  apiKey: string
): Promise<ProductData[]> => {
  if (!apiKey) {
    apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      throw new Error('API Key is required. Please set it in the settings or as an environment variable.');
    }
  }

  const ai = new GoogleGenAI({ apiKey });

  // Use Flash model for speed and cost efficiency on high volume
  const model = 'gemini-2.5-flash';

  if (!imageInfo.base64.startsWith('data:image/jpeg;base64,')) {
    throw new Error('Invalid base64 image format. Expected JPEG.');
  }
  const base64Data = imageInfo.base64.split(',')[1];

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Data,
    },
  };

  const textPart = {
    text: prompt,
  };

  // Schema aligned with Nuvemshop requirements
  const responseSchema = {
    type: Type.ARRAY,
    description: "List of products found on the page with Nuvemshop specific fields.",
    items: {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: "Product Name" },
        modelo: { type: Type.STRING, description: "Product Model, Application, or Compatible Model." },
        descricao: { type: Type.STRING, description: "Product Description" },
        codigo: { type: Type.STRING, description: "Generic Code, Reference (Ref) or ID visible." },
        sku: { type: Type.STRING, description: "Explicit SKU/Ref/Code found in text. DO NOT use Model Name. If not found, return null." },
        codigo_barras: { type: Type.STRING, description: "Barcode / EAN / GTIN" },
        ncm: { type: Type.STRING, description: "NCM Code. Null if not explicitly found." },
        categoria: { type: Type.STRING, description: "Product Category" },
        
        // Dimensions & Weight
        peso_kg: { type: Type.STRING, description: "Weight in KG" },
        altura_cm: { type: Type.STRING, description: "Height in CM" },
        largura_cm: { type: Type.STRING, description: "Width in CM" },
        comprimento_cm: { type: Type.STRING, description: "Length in CM" },

        // Google Shopping / Instagram
        mpn: { type: Type.STRING, description: "Manufacturer Part Number" },
        faixa_etaria: { type: Type.STRING, description: "Age Group (e.g. adult, child)" },
        sexo: { type: Type.STRING, description: "Gender (e.g. female, male, unisex)" }
      },
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.0, // Strict extraction, no creativity
      },
    });

    const jsonString = response.text;
    
    if (!jsonString) {
        console.warn(`Received empty response for page ${imageInfo.page}`);
        return [];
    }

    const extractedData = extractJsonArray(jsonString);

    if (!extractedData) {
        console.error(`Failed to parse JSON for page ${imageInfo.page}. Raw content snippet:`, jsonString.substring(0, 100));
        return [];
    }

    // Map to internal structure adding metadata
    const productsWithOrigin: ProductData[] = extractedData.map((product: any) => ({
      ...product,
      origem: {
        source_pdf: imageInfo.filename.split('-page-')[0], // Extract PDF name
        page: imageInfo.page,
      },
      imagens: [imageInfo]
    }));

    return productsWithOrigin;
  } catch (error) {
    console.error(`Error calling Gemini API for page ${imageInfo.page}:`, error);
    
    // Enhanced error categorization
    let errorMessage = `Failed to process page ${imageInfo.page}.`;
    if (error instanceof Error) {
      // Check for common API errors
      if (error.message.includes('401') || error.message.includes('API key')) {
        throw new Error('AUTH_ERROR: The provided API Key is not valid.');
      } 
      if (error.message.includes('429')) {
         throw new Error('QUOTA_ERROR: API rate limit exceeded.');
      }
      errorMessage += ` ${error.message}`;
    } else {
      errorMessage += ` ${String(error)}`;
    }
    throw new Error(errorMessage);
  }
};