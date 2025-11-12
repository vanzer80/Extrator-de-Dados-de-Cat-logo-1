import React, { useState } from 'react';
import { ProductData } from '../types';
import {
  exportAsJson, copyJson,
  exportAsCsv, copyCsv,
  exportAsMarkdown, copyMarkdown
} from '../utils/exportUtils';
import { DownloadIcon, CopyIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface ExportControlsProps {
  data: ProductData[];
}

const ExportControls: React.FC<ExportControlsProps> = ({ data }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleCopy = (format: 'json' | 'csv' | 'md') => {
    if (format === 'json') copyJson(data);
    if (format === 'csv') copyCsv(data);
    if (format === 'md') copyMarkdown(data);
    
    setCopied(format);
    setTimeout(() => setCopied(null), 2000);
  };

  const ExportButton: React.FC<{
    format: 'json' | 'csv' | 'md',
    onDownload: () => void,
    onCopy: () => void,
    label: string,
  }> = ({ format, onDownload, onCopy, label }) => (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-gray-700/50 p-3 rounded-lg">
      <span className="font-semibold">{label}</span>
      <div className="flex space-x-2 mt-2 sm:mt-0">
        <button
          onClick={onDownload}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-sky-600 px-3 py-1.5 rounded-md text-sm transition-colors"
        >
          <DownloadIcon />
          <span>{t('download')}</span>
        </button>
        <button
          onClick={onCopy}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-sky-600 px-3 py-1.5 rounded-md text-sm transition-colors"
        >
          <CopyIcon />
          <span>{copied === format ? t('copied') : t('copy')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-md font-semibold mb-3">{t('exportResultsTitle')}</h3>
      <div className="space-y-3">
        <ExportButton format="json" label="JSON" onDownload={() => exportAsJson(data)} onCopy={() => handleCopy('json')} />
        <ExportButton format="csv" label="CSV" onDownload={() => exportAsCsv(data)} onCopy={() => handleCopy('csv')} />
        <ExportButton format="md" label="Markdown" onDownload={() => exportAsMarkdown(data)} onCopy={() => handleCopy('md')} />
      </div>
    </div>
  );
};

export default ExportControls;