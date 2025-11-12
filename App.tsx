import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import PageSelection from './components/PageSelection';
import ProcessingView from './components/ProcessingView';
import ExportControls from './components/ExportControls';
import HelpModal from './components/HelpModal';
import ApiKeyModal from './components/ApiKeyModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { GithubIcon, SettingsIcon } from './components/icons';
import { ProductData, ImageInfo, ApiKeyConfig } from './types';
import { renderPdfPages } from './utils/pageParser';
import { extractProductInfo } from './services/geminiService';
import { useTranslation } from './hooks/useTranslation';

type ProcessingState = 'idle' | 'processing' | 'done' | 'error' | 'cancelling';

const DEFAULT_API_CONFIG: ApiKeyConfig = { mode: 'default', customKey: '' };

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPages, setSelectedPages] = useState<Map<string, Set<number>>>(new Map());
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ProductData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isApiModalVisible, setIsApiModalVisible] = useState(false);
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>(DEFAULT_API_CONFIG);

  const isCancelledRef = useRef(false);

  const { t, language } = useTranslation();

  useEffect(() => {
    try {
      const storedConfig = localStorage.getItem('apiKeyConfig');
      if (storedConfig) {
        setApiKeyConfig(JSON.parse(storedConfig));
      } else {
        setIsApiModalVisible(true); // Open modal on first visit if no config
      }
    } catch (error) {
      console.error("Failed to load API key config from localStorage", error);
      setApiKeyConfig(DEFAULT_API_CONFIG);
    }
  }, []);

  const handleApiKeyConfigChange = (newConfig: ApiKeyConfig) => {
    setApiKeyConfig(newConfig);
    setIsApiModalVisible(false);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    // FIX: Explicitly type the new Map to preserve the generic types, preventing type inference issues.
    setSelectedPages(new Map<string, Set<number>>());
    setExtractedData([]);
    setProcessingState('idle');
    setLogs([]);
  };

  const handlePageSelectionChange = (fileName: string, pageNumber: number, isSelected: boolean) => {
    setSelectedPages(prev => {
      // FIX: Explicitly type the new Map to preserve the generic types.
      const newMap = new Map<string, Set<number>>(prev);
      const pages = newMap.get(fileName) || new Set<number>();
      if (isSelected) {
        pages.add(pageNumber);
      } else {
        pages.delete(pageNumber);
      }
      newMap.set(fileName, pages);
      return newMap;
    });
  };
  
  const handleSelectAll = (fileName: string, pageCount: number) => {
    setSelectedPages(prev => {
      // FIX: Explicitly type the new Map to preserve the generic types.
      const newMap = new Map<string, Set<number>>(prev);
      const pages = new Set(Array.from({length: pageCount}, (_, i) => i + 1));
      newMap.set(fileName, pages);
      return newMap;
    });
  };
  
  const handleDeselectAll = (fileName: string) => {
    setSelectedPages(prev => {
      // FIX: Explicitly type the new Map to preserve the generic types.
      const newMap = new Map<string, Set<number>>(prev);
      newMap.set(fileName, new Set<number>());
      return newMap;
    });
  };
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const isApiKeyValid = apiKeyConfig.mode === 'default' || (apiKeyConfig.mode === 'custom' && !!apiKeyConfig.customKey);

  const handleStartProcessing = async () => {
    if (!isApiKeyValid) {
        addLog(t('apiKeyCustomKeyMissingError'));
        setIsApiModalVisible(true);
        return;
    }
    
    setProcessingState('processing');
    setExtractedData([]);
    setError(null);
    setLogs([]);
    isCancelledRef.current = false;
    addLog(t('processLogStart'));

    const pagesToProcess: { file: File; pages: Set<number> }[] = files
      .map(file => ({ file, pages: selectedPages.get(file.name) || new Set() }))
      .filter(item => item.pages.size > 0);

    if (pagesToProcess.length === 0) {
      addLog(t('processLogNoPages'));
      setProcessingState('idle');
      return;
    }

    addLog(t('processLogRendering'));
    let allImages: ImageInfo[] = [];
    try {
      for (const item of pagesToProcess) {
        if (isCancelledRef.current) break;
        addLog(t('processLogRenderingFile', { file: item.file.name }));
        const images = await renderPdfPages(item.file, item.pages);
        allImages.push(...images);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(t('processLogErrorRendering', { error: errorMessage }));
      setError(t('processLogErrorRendering', { error: errorMessage }));
      setProcessingState('error');
      return;
    }
    
    if (isCancelledRef.current) {
        addLog(t('processLogCancelled'));
        setProcessingState('idle');
        return;
    }
    
    addLog(t('processLogExtractionStart', { count: allImages.length }));
    setProgress({ processed: 0, total: allImages.length });

    for (let i = 0; i < allImages.length; i++) {
        if (isCancelledRef.current) break;
        const image = allImages[i];
        addLog(t('processLogExtractingPage', { page: image.page, file: image.filename.replace(/-page-\d+\.jpg$/, '') }));
        try {
            const products = await extractProductInfo(image, language, apiKeyConfig, addLog);
            if (products.length > 0) {
              setExtractedData(prev => [...prev, ...products]);
              addLog(t('processLogFoundProducts', { count: products.length, page: image.page }));
            } else {
              addLog(t('processLogNoProducts', { page: image.page }));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            addLog(t('processLogErrorExtracting', { page: image.page, error: errorMessage }));
        }
        setProgress(prev => ({ ...prev, processed: i + 1 }));
    }

    if (isCancelledRef.current) {
        addLog(t('processLogCancelled'));
        setProcessingState('idle');
    } else {
        addLog(t('processLogDone'));
        setProcessingState('done');
    }
  };
  
  const handleCancelProcessing = () => {
    addLog(t('processLogCancelling'));
    isCancelledRef.current = true;
    setProcessingState('cancelling');
  };

  const canStart = files.length > 0 && Array.from(selectedPages.values()).some(s => s.size > 0) && (processingState === 'idle' || processingState === 'done' || processingState === 'error') && isApiKeyValid;
  const showApiKeyWarning = apiKeyConfig.mode === 'custom' && !apiKeyConfig.customKey;


  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <div className="container mx-auto p-4 lg:p-8">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              PDF <span className="text-sky-400">Catalog</span> Extractor
            </h1>
            <p className="text-gray-400">{t('appSubtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <button onClick={() => setIsApiModalVisible(true)} className="text-gray-400 hover:text-white relative" aria-label={t('apiKeySettings')}>
                <SettingsIcon />
                {showApiKeyWarning && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900 animate-pulse"></span>}
            </button>
            <a href="https://github.com/google/generative-ai-docs/tree/main/demos/pdf_catalog_extractor" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white" aria-label="GitHub">
              <GithubIcon />
            </a>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <FileUpload onFilesSelected={handleFilesSelected} disabled={processingState === 'processing' || processingState === 'cancelling'} />
            <PageSelection 
                files={files} 
                selectedPages={selectedPages} 
                onPageSelectionChange={handlePageSelectionChange}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                disabled={processingState === 'processing' || processingState === 'cancelling'} 
            />
            <div className="flex justify-between items-center bg-gray-800/50 rounded-lg p-4">
              <button
                onClick={() => setIsHelpVisible(true)}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                {t('showHelp')}
              </button>
              {processingState === 'processing' ? (
                <button
                  onClick={handleCancelProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                  {t('cancelButton')}
                </button>
              ) : (
                <button
                  onClick={handleStartProcessing}
                  disabled={!canStart}
                  className="bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                  {t('startButton')}
                </button>
              )}
            </div>
            {extractedData.length > 0 && (
                <div className="animate-fade-in">
                    <ExportControls data={extractedData} />
                </div>
            )}
          </div>
          <div>
            <ProcessingView 
                logs={logs} 
                extractedData={extractedData} 
                processingState={processingState}
                error={error}
                progress={progress}
            />
          </div>
        </main>
      </div>

      <HelpModal isVisible={isHelpVisible} onClose={() => setIsHelpVisible(false)} />
      <ApiKeyModal 
        isVisible={isApiModalVisible} 
        onClose={() => setIsApiModalVisible(false)}
        onSave={handleApiKeyConfigChange}
        currentConfig={apiKeyConfig}
      />
    </div>
  );
}

export default App;
