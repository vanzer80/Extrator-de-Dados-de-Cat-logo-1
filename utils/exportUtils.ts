import { ProductData } from '../types';
import JSZip from 'jszip';

/**
 * Triggers a file download in the browser.
 * @param content The content of the file (Blob or string).
 * @param fileName The name of the file to be downloaded.
 * @param contentType The MIME type of the file.
 */
const downloadBlob = (content: Blob | string, fileName: string, contentType: string) => {
  const blob = typeof content === 'string' ? new Blob([content], { type: contentType }) : content;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

/**
 * Exports product data to a JSON file (or ZIP if images exist).
 */
export const exportToJSON = async (data: ProductData[]) => {
  const hasImages = data.some(p => !!p.imagem_produto_base64);

  if (hasImages) {
      await exportToZip(data, 'json');
  } else {
      const jsonString = JSON.stringify(data, null, 2);
      downloadBlob(jsonString, 'nuvemshop_products.json', 'application/json');
  }
};

/**
 * Converts a value to a CSV-safe string.
 */
const toCSVString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  let str = String(value);
  if (str.search(/("|,|\n|\r)/g) >= 0) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 * Converts product data to a CSV string.
 */
const convertToCSV = (data: ProductData[], includeImageColumn: boolean): string => {
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

  if (includeImageColumn) {
      headers.push('Nome do Arquivo de Imagem');
  }

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
    
    if (includeImageColumn) {
        values.push(toCSVString(product.imagem_arquivo_nome || ''));
    }

    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Exports product data to a CSV file (or ZIP if images exist).
 */
export const exportToCSV = async (data: ProductData[]) => {
  const hasImages = data.some(p => !!p.imagem_produto_base64);

  if (hasImages) {
      await exportToZip(data, 'csv');
  } else {
      const bom = '\uFEFF';
      const csvString = bom + convertToCSV(data, false);
      downloadBlob(csvString, 'nuvemshop_products.csv', 'text/csv;charset=utf-8;');
  }
};

/**
 * Internal helper to create a ZIP file with images and data.
 */
const exportToZip = async (data: ProductData[], format: 'csv' | 'json') => {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");

    // Process data to assign filenames and add images to zip
    const processedData = data.map((product, index) => {
        if (product.imagem_produto_base64) {
            // Clean up filename: Remove accents first, then keep only alphanumerics
            // e.g., "Calça de Verão" -> "Calca de Verao" -> "Calca_de_Verao"
            const baseName = (product.sku || product.codigo || product.nome || `produto_${index}`);
            const normalized = baseName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const safeName = normalized
                .replace(/[^a-zA-Z0-9]/g, '_')
                .substring(0, 30); // Increased length for better uniqueness
                
            const fileName = `${safeName}_${index}.jpg`;
            
            // Add to zip (remove data:image/jpeg;base64, prefix)
            const base64Data = product.imagem_produto_base64.split(',')[1];
            imgFolder?.file(fileName, base64Data, { base64: true });

            return { ...product, imagem_arquivo_nome: `images/${fileName}` };
        }
        return product;
    });

    // Add Data File
    if (format === 'csv') {
        const bom = '\uFEFF';
        const csvString = bom + convertToCSV(processedData, true);
        zip.file("catalog.csv", csvString);
    } else {
        zip.file("catalog.json", JSON.stringify(processedData, null, 2));
    }

    // Generate ZIP
    const zipContent = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipContent, "nuvemshop_export_images.zip", "application/zip");
};