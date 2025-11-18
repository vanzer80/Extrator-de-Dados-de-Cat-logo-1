export interface Specification {
  key: string;
  value: string;
}

export interface ImageInfo {
  filename: string;
  page: number;
  hash: string;
  base64: string;
}

export interface Origin {
  source_pdf: string;
  page: number;
}

export interface ProductData {
  nome: string | null;
  modelo: string | null;
  descricao: string | null;
  codigo: string | null;
  sku: string | null;
  codigo_barras: string | null;
  ncm: string | null;
  categoria: string | null;
  
  // Dimensions & Weight
  peso_kg: string | null;
  altura_cm: string | null;
  largura_cm: string | null;
  comprimento_cm: string | null;

  // Google Shopping / Instagram
  mpn: string | null;
  faixa_etaria: string | null;
  sexo: string | null;

  // Internal
  origem: Origin;
  imagens: ImageInfo[];
}

export interface ApiKeyConfig {
  mode: 'default' | 'custom';
  customKey: string;
}

export type ProcessingStatus = 'idle' | 'rendering' | 'processing' | 'success' | 'error';

export interface ProcessingProgress {
  current: number;
  total: number;
  filename: string;
}
