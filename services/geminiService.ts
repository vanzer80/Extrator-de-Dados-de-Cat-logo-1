import { GoogleGenAI, GenerateContentParameters, Type } from "@google/genai";
import { ImageInfo, ProductData, ApiKeyConfig } from '../types';

const getAiClient = (config: ApiKeyConfig): GoogleGenAI => {
    let apiKey: string | undefined;
    if (config.mode === 'custom') {
        apiKey = config.customKey;
    } else {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey) {
        throw new Error("API Key not found. Please configure it in the settings.");
    }
    return new GoogleGenAI({ apiKey });
};

const productSchema = {
  type: Type.OBJECT,
  properties: {
    products: {
      type: Type.ARRAY,
      description: 'List of all products found on the page.',
      items: {
        type: Type.OBJECT,
        description: 'A single product extracted from the page.',
        properties: {
            produto_nome: { type: Type.STRING, description: 'Product name or title.' },
            modelo: { type: Type.STRING, description: 'Product model identifier, if available.' },
            codigo: { type: Type.STRING, description: 'Product code or SKU, if available.' },
            categoria: { type: Type.STRING, description: 'Product category.' },
            descricao: { type: Type.STRING, description: 'A brief description of the product.' },
            especificacoes: {
                type: Type.ARRAY,
                description: 'List of technical specifications.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING, description: 'The name of the specification (e.g., "Voltage").' },
                        value: { type: Type.STRING, description: 'The value of the specification (e.g., "220V").' }
                    },
                    required: ['key', 'value']
                }
            },
            avisos: {
                type: Type.ARRAY,
                description: 'Any warnings or important notes about the extraction for this product.',
                items: { type: Type.STRING }
            }
        },
        required: ['produto_nome', 'especificacoes']
      }
    }
  },
  required: ['products']
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseGeminiError = (error: any): string => {
    if (typeof error === 'object' && error !== null && 'message' in error) {
        // Attempt to parse nested JSON if the message is a stringified JSON
        try {
            const nestedError = JSON.parse(error.message);
            if (nestedError.error && nestedError.error.message) {
                return nestedError.error.message;
            }
        } catch (e) {
            // Not a JSON string, fall through to use the original message
        }
        return error.message;
    }
    return String(error);
}

export const extractProductInfo = async (
  image: ImageInfo,
  language: 'en' | 'pt' = 'en',
  apiKeyConfig: ApiKeyConfig,
  addLog: (message: string) => void
): Promise<ProductData[]> => {
  const genAI = getAiClient(apiKeyConfig);
  const model = 'gemini-2.5-flash';

  const langInstruction = language === 'pt' 
    ? "Analise a imagem da página do catálogo. Extraia informações detalhadas para cada produto listado. Retorne os dados no esquema JSON fornecido. Se um campo não for encontrado, use `null`. Mantenha os valores de especificação exatamente como estão no texto original. O nome do produto (`produto_nome`) é obrigatório."
    : "Analyze the catalog page image. Extract detailed information for each product listed. Return the data in the provided JSON schema. If a field isn't found, use `null`. Keep specification values exactly as they are in the original text. The product name (`produto_nome`) is mandatory.";

  const request: GenerateContentParameters = {
    model,
    contents: [
      {
        parts: [
          { text: langInstruction },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image.base64.split(',')[1],
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: productSchema
    }
  };

  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await genAI.models.generateContent(request);
      
      const text = response.text;
      if (!text) {
          console.error("Gemini API returned an empty response text.");
          return [];
      }

      const result = JSON.parse(text);

      if (!result.products || !Array.isArray(result.products)) {
        console.warn('JSON response is not in the expected format:', result);
        return [];
      }

      const extractedProducts: ProductData[] = result.products.map((p: any) => ({
        ...p,
        especificacoes: p.especificacoes || [],
        imagens: [
          {
            filename: image.filename,
            page: image.page,
            hash: image.hash,
            base64: image.base64
          }
        ],
        origem: {
          source_pdf: image.filename.replace(/-page-\\d+\\.jpg$/, ''),
          page: image.page,
        },
      }));

      return extractedProducts; // Success, exit the loop

    } catch (error: any) {
      console.error(`Error calling Gemini API (attempt ${attempt}):`, error);
      const errorMessage = parseGeminiError(error);
      
      const isRateLimitError = error.toString().includes('429') || errorMessage.includes('quota');

      if (isRateLimitError && attempt < MAX_RETRIES) {
        const delayDuration = (2 ** attempt) * 1000 + Math.random() * 1000;
        addLog(`Pausing for ${(delayDuration / 1000).toFixed(1)}s to manage API rate limits (attempt ${attempt}/${MAX_RETRIES})...`);
        await delay(delayDuration);
      } else {
        throw new Error(`Failed to extract product information from Gemini: ${errorMessage}`);
      }
    }
  }
  // This line is only reached if all retries fail.
  throw new Error('Failed to extract product information from Gemini after multiple attempts.');
};