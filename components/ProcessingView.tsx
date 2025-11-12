import React, { useState, useRef, useEffect } from 'react';
import { ProductData } from '../types';
import { 
    exportAsJson, copyJson,
    exportAsCsv, copyCsv,
    exportAsMarkdown, copyMarkdown
} from '../utils/exportUtils';
import { EllipsisVerticalIcon, DownloadIcon, CopyIcon, FileIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface ProcessingViewProps {
  logs: string[];
  extractedData: ProductData[];
  processingState: 'idle' | 'processing' | 'done' | 'error' | 'cancelling';
  error: string | null;
  progress: { processed: number, total: number };
}

const ProductCard: React.FC<{ product: ProductData }> = ({ product }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCopy = (format: 'json' | 'csv' | 'md') => {
    if (format === 'json') copyJson([product]);
    if (format === 'csv') copyCsv([product]);
    if (format === 'md') copyMarkdown([product]);
    
    setCopied(format);
    setIsMenuOpen(false);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handleDownload = (format: 'json' | 'csv' | 'md') => {
    const sanitizedName = (product.produto_nome || product.codigo || `product-${Math.random()}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (format === 'json') exportAsJson([product], `${sanitizedName}.json`);
    if (format === 'csv') exportAsCsv([product], `${sanitizedName}.csv`);
    if (format === 'md') exportAsMarkdown([product], `${sanitizedName}.md`);
    setIsMenuOpen(false);
  };
  
  const renderCopyLabel = (format: 'json' | 'csv' | 'md') => {
      return copied === format ? t('copied') : t('copy');
  }

  return (
    <div className="bg-gray-800/70 p-4 rounded-lg animate-fade-in flex space-x-4">
      {product.imagens?.[0]?.base64 && (
        <img 
          src={product.imagens[0].base64} 
          alt={`Preview of ${product.produto_nome}`}
          className="w-20 h-20 object-cover rounded-md flex-shrink-0 bg-gray-700"
        />
      )}
      <div className="flex-1 flex justify-between items-start min-w-0">
        <div className="flex-1 overflow-hidden pr-2">
            <h4 className="font-bold text-sky-400 truncate">{product.produto_nome || t('unnamedProduct')}</h4>
            <p className="text-sm text-gray-400 truncate">
                {product.modelo && `${t('productCardModel', {model: product.modelo})}`}
                {product.codigo && ` | ${t('productCardCode', {code: product.codigo})}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('productCardSource', {pdf: product.origem.source_pdf, page: product.origem.page})}</p>
            {product.especificacoes && product.especificacoes.length > 0 && (
                <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-gray-400 hover:text-white">{t('showSpecs', {count: product.especificacoes.length})}</summary>
                    <div className="mt-2 text-xs bg-gray-900/50 p-2 rounded max-h-24 overflow-y-auto">
                        <ul className="space-y-1">
                        {product.especificacoes.map(({ key, value }, index) => (
                            <li key={`${key}-${index}`} className="flex justify-between">
                                <span className="font-semibold text-gray-300 mr-2">{key}:</span>
                                <span className="text-gray-400 text-right">{value}</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                </details>
            )}
        </div>
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 text-gray-400 hover:text-white rounded-full transition-colors"
                aria-label={t('exportOptions')}
            >
                <EllipsisVerticalIcon />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-10 animate-fade-in-fast ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400">JSON</div>
                        <button onClick={() => handleDownload('json')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                           <DownloadIcon /> <span className="ml-2">{t('download')}</span>
                        </button>
                        <button onClick={() => handleCopy('json')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                            <CopyIcon /> <span className="ml-2">{renderCopyLabel('json')}</span>
                        </button>
                         <div className="border-t border-gray-600 my-1"></div>
                         <div className="px-3 py-2 text-xs font-semibold text-gray-400">CSV</div>
                        <button onClick={() => handleDownload('csv')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                           <DownloadIcon /> <span className="ml-2">{t('download')}</span>
                        </button>
                        <button onClick={() => handleCopy('csv')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                            <CopyIcon /> <span className="ml-2">{renderCopyLabel('csv')}</span>
                        </button>
                        <div className="border-t border-gray-600 my-1"></div>
                         <div className="px-3 py-2 text-xs font-semibold text-gray-400">Markdown</div>
                        <button onClick={() => handleDownload('md')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                           <DownloadIcon /> <span className="ml-2">{t('download')}</span>
                        </button>
                        <button onClick={() => handleCopy('md')} className="w-full text-left flex items-center px-3 py-2 text-sm text-gray-200 hover:bg-sky-600">
                            <CopyIcon /> <span className="ml-2">{renderCopyLabel('md')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

const IdleView = () => {
    const { t } = useTranslation();
    return (
        <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
            <FileIcon />
            <h3 className="mt-4 text-lg font-semibold text-gray-400">{t('idleViewTitle')}</h3>
            <p className="mt-1 max-w-sm">{t('idleViewBody')}</p>
        </div>
    );
};

const LoadingView: React.FC<{progress: { processed: number, total: number }}> = ({ progress }) => {
    const { t } = useTranslation();
    const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
        <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
            <svg className="animate-spin h-8 w-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-400">{t('loadingViewTitle')}</h3>
            <p className="mt-1 max-w-sm">{t('loadingViewBody')}</p>
            <div className="w-full max-w-xs bg-gray-700 rounded-full h-2.5 mt-4">
                <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-300" style={{width: `${percentage}%`}}></div>
            </div>
            <p className="text-sm mt-2 text-gray-400">{percentage}% ({progress.processed} / {progress.total})</p>
        </div>
    );
};

const EmptyResultsView = () => {
    const { t } = useTranslation();
    return (
        <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-gray-600"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="15" x2="16" y2="15"></line><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-400">{t('emptyResultsViewTitle')}</h3>
            <p className="mt-1 max-w-sm">{t('emptyResultsViewBody')}</p>
        </div>
    );
};

const ErrorView: React.FC<{error: string | null}> = ({ error }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center text-red-400 h-full flex flex-col justify-center items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h3 className="mt-4 text-lg font-semibold text-red-300">{t('errorViewTitle')}</h3>
            <p className="mt-1 max-w-sm text-sm text-red-400/80">{error || t('errorViewBody')}</p>
        </div>
    );
};


const ProcessingView: React.FC<ProcessingViewProps> = ({ logs, extractedData, processingState, error, progress }) => {
  const { t } = useTranslation();
  
  const renderContent = () => {
    if (processingState === 'error') {
      return <ErrorView error={error} />;
    }
    if (processingState === 'processing' || processingState === 'cancelling') {
      return <LoadingView progress={progress} />;
    }
    if (processingState === 'done' && extractedData.length === 0) {
      return <EmptyResultsView />;
    }
    if (processingState === 'idle' && extractedData.length === 0) {
      return <IdleView />;
    }
    
    return (
        <div className="space-y-4">
             {extractedData.map((product, index) => (
                <ProductCard key={`${product.origem.source_pdf}-${product.origem.page}-${index}`} product={product} />
            ))}
        </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg h-[80vh] flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-300">{t('processingStatusTitle')}</h2>
        <p className="text-sm text-gray-400">{t('itemsExtracted', { count: extractedData.length })}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>

      <div className="bg-gray-900/70 p-4 border-t border-gray-700 h-48 overflow-y-auto">
        <h3 className="font-semibold text-sm text-gray-400 mb-2">{t('logsTitle')}</h3>
        <div className="font-mono text-xs text-gray-400 space-y-1">
          {logs.map((log, index) => (
            <p key={index} className="animate-fade-in">{log}</p>
          ))}
          {(processingState === 'processing' || processingState === 'cancelling') && (
              <p className="animate-pulse">{processingState === 'cancelling' ? t('cancelling') : t('processing')}...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingView;