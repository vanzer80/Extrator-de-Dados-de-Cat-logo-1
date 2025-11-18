import React from 'react';
import { ProcessingStatus, ProcessingProgress } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface ProcessingViewProps {
  status: ProcessingStatus;
  progress: ProcessingProgress | null;
  error: string | null;
  onReset: () => void;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ status, progress, error, onReset }) => {
  const { t } = useTranslation();

  if (status === 'idle' || status === 'success') return null;

  const getStatusMessage = () => {
    if (status === 'error') {
      return t('processingErrorTitle');
    }
    if (status === 'rendering') {
      return t('processingRenderingTitle');
    }
    if (status === 'processing') {
      return t('processingExtractingTitle');
    }
    return '';
  };
  
  const percentage = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg border border-gray-700">
        <h2 className="text-xl font-bold text-sky-400 mb-4">{getStatusMessage()}</h2>
        
        {error ? (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-md">
            <p className="font-semibold">{t('processingErrorEncountered')}</p>
            <p className="text-sm mt-2 font-mono bg-gray-900 p-2 rounded">{error}</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2 text-sm text-gray-400">
                <span>
                    {progress?.filename ? `${t('processingCurrentFile')}: ${progress.filename}` : t('processingPreparing')}
                </span>
                <span>{progress ? `${progress.current} / ${progress.total}` : ''}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-sky-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
            <div className="mt-6 flex justify-end">
                <button
                onClick={onReset}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                {t('processingErrorReset')}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingView;
