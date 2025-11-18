import React, { useState } from 'react';
import { ProductData } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { DownloadIcon, CopyIcon } from './icons';
import { exportToJSON, exportToCSV } from '../utils/exportUtils';

interface ExportControlsProps {
  data: ProductData[];
}

const ExportControls: React.FC<ExportControlsProps> = ({ data }) => {
    const { t } = useTranslation();
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    return (
        <div className="flex space-x-2">
            <button 
                onClick={() => exportToJSON(data)} 
                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
                <DownloadIcon />
                <span>JSON</span>
            </button>
            <button 
                onClick={() => exportToCSV(data)} 
                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
                <DownloadIcon />
                <span>CSV</span>
            </button>
            <button 
                onClick={handleCopy} 
                className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
                <CopyIcon />
                <span>{copyStatus === 'copied' ? t('resultsCopied') : t('resultsCopyAll')}</span>
            </button>
        </div>
    );
};

export default ExportControls;