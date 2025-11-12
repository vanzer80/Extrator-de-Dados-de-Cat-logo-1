
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
  produto_nome: string | null;
  modelo: string | null;
  codigo: string | null;
  categoria: string | null;
  descricao: string | null;
  especificacoes: Specification[];
  imagens: ImageInfo[];
  origem: Origin;
  avisos?: string[];
}

export interface ApiKeyConfig {
  mode: 'default' | 'custom';
  customKey: string;
}
