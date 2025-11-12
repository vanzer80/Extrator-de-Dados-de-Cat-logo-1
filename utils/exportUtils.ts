import { ProductData } from '../types';

// Function to trigger file download
const downloadFile = (content: string, fileName: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- JSON ---
export const exportAsJson = (data: ProductData[], fileName: string = 'extracao.json') => {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, fileName, 'application/json');
};

export const copyJson = (data: ProductData[]) => {
  const jsonString = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(jsonString).catch(err => console.error('Failed to copy JSON:', err));
};

// --- CSV ---
const convertToCsv = (data: ProductData[]): string => {
  if (data.length === 0) return '';
  
  const headers = [
    'produto_nome', 'modelo', 'codigo', 'categoria', 'descricao', 
    'especificacoes_json', 'imagens_json', 'source_pdf', 'page'
  ];
  
  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      `"${item.produto_nome || ''}"`,
      `"${item.modelo || ''}"`,
      `"${item.codigo || ''}"`,
      `"${item.categoria || ''}"`,
      `"${(item.descricao || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(item.especificacoes).replace(/"/g, '""')}"`,
      `"${JSON.stringify(item.imagens.map(img => ({filename: img.filename, page: img.page}))).replace(/"/g, '""')}"`,
      `"${item.origem.source_pdf}"`,
      item.origem.page,
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

export const exportAsCsv = (data: ProductData[], fileName: string = 'extracao.csv') => {
  const csvString = convertToCsv(data);
  downloadFile(csvString, fileName, 'text/csv;charset=utf-8;');
};

export const copyCsv = (data: ProductData[]) => {
  const csvString = convertToCsv(data);
  navigator.clipboard.writeText(csvString).catch(err => console.error('Failed to copy CSV:', err));
};

// --- Markdown ---
const convertToMarkdown = (data: ProductData[]): string => {
  if (data.length === 0) return '';

  return data.map(item => {
    const title = `## ${item.produto_nome || 'Unnamed Product'} (${item.modelo || 'N/A'} | ${item.codigo || 'N/A'})`;
    
    const category = item.categoria ? `**Category:** ${item.categoria}\n` : '';
    
    const description = item.descricao ? `### Description\n\n${item.descricao}\n` : '';

    let specsTable = '';
    if (item.especificacoes && item.especificacoes.length > 0) {
      specsTable = '### Specifications\n\n| Parameter | Value |\n|---|---|\n';
      item.especificacoes.forEach(({ key, value }) => {
        specsTable += `| ${key} | ${value} |\n`;
      });
    }

    let imagesList = '### Images\n\n';
    item.imagens.forEach(img => {
      imagesList += `- ${img.filename} (from page ${img.page})\n`;
    });
    
    const origin = `\n---\n*Source: ${item.origem.source_pdf}, Page: ${item.origem.page}*\n\n`;

    return [title, category, description, specsTable, imagesList, origin].join('\n');
  }).join('');
};

export const exportAsMarkdown = (data: ProductData[], fileName: string = 'extracao.md') => {
  const mdString = convertToMarkdown(data);
  downloadFile(mdString, fileName, 'text/markdown;charset=utf-8;');
};

export const copyMarkdown = (data: ProductData[]) => {
  const mdString = convertToMarkdown(data);
  navigator.clipboard.writeText(mdString).catch(err => console.error('Failed to copy Markdown:', err));
};