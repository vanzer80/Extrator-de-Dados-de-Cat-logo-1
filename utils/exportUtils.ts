import { ProductData } from '../types';

/**
 * Triggers a file download in the browser.
 * @param content The content of the file.
 * @param fileName The name of the file to be downloaded.
 * @param contentType The MIME type of the file.
 */
const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

/**
 * Exports product data to a JSON file.
 * @param data The array of ProductData to export.
 */
export const exportToJSON = (data: ProductData[]) => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, 'nuvemshop_products.json', 'application/json');
};


/**
 * Converts a value to a CSV-safe string.
 * @param value The value to convert.
 */
const toCSVString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // For objects or arrays, stringify them.
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }

  let str = String(value);

  // If the string contains a comma, double quote, or newline, wrap it in double quotes.
  // Also escape double quotes by doubling them.
  if (str.search(/("|,|\n|\r)/g) >= 0) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};


/**
 * Converts product data to a CSV string.
 * @param data The array of ProductData to convert.
 */
const convertToCSV = (data: ProductData[]): string => {
  if (data.length === 0) {
    return '';
  }
  
  // Headers based on Nuvemshop requirements
  const headers = [
    'Nome',
    'Modelo',
    'Descrição',
    'Código',
    'SKU',
    'Código de barras',
    'NCM',
    'Categoria',
    'Peso (kg)',
    'Altura (cm)',
    'Largura (cm)',
    'Comprimento (cm)',
    'MPN',
    'Faixa Etária',
    'Sexo',
    'Origem PDF',
    'Origem Pagina'
  ];

  const csvRows = [headers.join(',')];

  for (const product of data) {
    const values = [
      toCSVString(product.nome),
      toCSVString(product.modelo),
      toCSVString(product.descricao),
      toCSVString(product.codigo),
      toCSVString(product.sku),
      toCSVString(product.codigo_barras),
      toCSVString(product.ncm),
      toCSVString(product.categoria),
      toCSVString(product.peso_kg),
      toCSVString(product.altura_cm),
      toCSVString(product.largura_cm),
      toCSVString(product.comprimento_cm),
      toCSVString(product.mpn),
      toCSVString(product.faixa_etaria),
      toCSVString(product.sexo),
      toCSVString(product.origem.source_pdf),
      toCSVString(product.origem.page),
    ];
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};


/**
 * Exports product data to a CSV file.
 * @param data The array of ProductData to export.
 */
export const exportToCSV = (data: ProductData[]) => {
  // Add Byte Order Mark (BOM) for Excel UTF-8 compatibility
  const bom = '\uFEFF';
  const csvString = bom + convertToCSV(data);
  downloadFile(csvString, 'nuvemshop_products.csv', 'text/csv;charset=utf-8;');
};