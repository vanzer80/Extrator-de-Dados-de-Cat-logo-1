import React, { useState } from 'react';
import { ProductData, ProcessingStatus } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ExportControls from './ExportControls';
import { CopyIcon, XIcon } from './icons';

// Props for ResultsView
interface ResultsViewProps {
  data: ProductData[];
  status: ProcessingStatus;
  onClear?: () => void;
}

// A component for a single copyable field row
const CopyableField: React.FC<{ label: string; value: string | null }> = ({ label, value }) => {
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

    if (!value) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex items-center justify-between bg-gray-800/80 p-2 rounded mb-1 border border-gray-700 hover:border-sky-600/50 transition-colors group">
            <div className="flex flex-col min-w-0 mr-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
                <span className="text-sm text-gray-200 truncate font-medium" title={value}>{value}</span>
            </div>
            <button 
                onClick={handleCopy} 
                className={`p-1.5 rounded transition-all duration-200 flex-shrink-0 ${copied ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400 hover:bg-sky-600 hover:text-white'}`}
                title={t('resultsCopy')}
                aria-label={`${t('resultsCopy')} ${label}`}
            >
                {copied ? <span className="text-xs font-bold px-1">✓</span> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
};

// Main component
const ResultsView: React.FC<ResultsViewProps> = ({ data, status, onClear }) => {
  const { t } = useTranslation();

  if (status !== 'success' && data.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
            <h3 className="text-lg font-semibold">{t('resultsTitle')}</h3>
            <p className="mt-1 text-sm">{t('resultsWaiting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold">{t('resultsTitle')} ({data.length})</h3>
            {onClear && data.length > 0 && (
                <button 
                    onClick={onClear}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1 bg-red-900/20 px-2 py-1 rounded border border-red-900/50 hover:border-red-800 transition-colors"
                    title={t('resultsClear')}
                >
                    <XIcon />
                    <span>{t('resultsClear')}</span>
                </button>
            )}
        </div>
        {data.length > 0 && <ExportControls data={data} />}
      </div>
      
      {data.length > 0 ? (
        <div className="space-y-6 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
          {data.map((product, index) => (
            <div key={`${product.origem.source_pdf}-${product.origem.page}-${index}`} className="bg-gray-900/80 rounded-lg p-4 border border-gray-600 shadow-lg animate-fade-in">
              
              {/* Header with Image and basic info */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {product.imagens[0]?.base64 && (
                  <div className="flex-shrink-0 sm:w-32 bg-white/5 rounded p-1 self-start">
                    <img 
                      src={product.imagens[0].base64} 
                      alt={product.nome || 'Product'} 
                      className="rounded w-full object-contain"
                    />
                    <p className="text-[10px] text-center text-gray-500 mt-1 truncate">{product.origem.source_pdf} (p.{product.origem.page})</p>
                  </div>
                )}
                
                <div className="flex-grow space-y-1">
                     <h4 className="text-md font-bold text-sky-400 mb-2">{product.nome || t('resultsUnknownProduct')}</h4>
                     <CopyableField label={t('field_nome')} value={product.nome} />
                     <CopyableField label={t('field_descricao')} value={product.descricao} />
                </div>
              </div>

              {/* Nuvemshop / Grid Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {/* Identifiers */}
                <div className="space-y-1">
                     <h5 className="text-xs font-bold text-gray-400 mb-1 uppercase border-b border-gray-700 pb-1">Identificação</h5>
                     <CopyableField label={t('field_codigo')} value={product.codigo} />
                     <CopyableField label={t('field_modelo')} value={product.modelo} />
                     <CopyableField label={t('field_sku')} value={product.sku} />
                     <CopyableField label={t('field_codigo_barras')} value={product.codigo_barras} />
                     <CopyableField label={t('field_ncm')} value={product.ncm} />
                     <CopyableField label={t('field_categoria')} value={product.categoria} />
                </div>

                {/* Dimensions */}
                <div className="space-y-1">
                     <h5 className="text-xs font-bold text-gray-400 mb-1 uppercase border-b border-gray-700 pb-1">Dimensões & Peso</h5>
                     <div className="grid grid-cols-2 gap-2">
                        <CopyableField label={t('field_peso_kg')} value={product.peso_kg} />
                        <CopyableField label={t('field_altura_cm')} value={product.altura_cm} />
                        <CopyableField label={t('field_largura_cm')} value={product.largura_cm} />
                        <CopyableField label={t('field_comprimento_cm')} value={product.comprimento_cm} />
                     </div>
                </div>
                
                {/* Marketing / Google Shopping */}
                <div className="space-y-1 sm:col-span-2">
                     <h5 className="text-xs font-bold text-gray-400 mb-1 uppercase border-b border-gray-700 pb-1">Google Shopping / Instagram</h5>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <CopyableField label={t('field_mpn')} value={product.mpn} />
                        <CopyableField label={t('field_sexo')} value={product.sexo} />
                        <CopyableField label={t('field_faixa_etaria')} value={product.faixa_etaria} />
                     </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
            <p>{t('resultsNoProducts')}</p>
        </div>
      )}
    </div>
  );
};

export default ResultsView;