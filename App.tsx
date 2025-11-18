// Fix: Implement the main App component, which was missing. This component orchestrates the entire application flow, from file upload to data extraction and display.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import PageSelection from './components/PageSelection';
import ExtractionOptions, { getDefaultPrompt } from './components/ExtractionOptions';
import ResultsView from './components/ResultsView';
import ProcessingView from './components/ProcessingView';
import HelpModal from './components/HelpModal';
import ApiKeyModal from './components/ApiKeyModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { GithubIcon, SettingsIcon } from './components/icons';
import { ApiKeyConfig, ProductData, ProcessingStatus, ProcessingProgress } from './types';
import { useTranslation } from './hooks/useTranslation';
import { loadPdfDocument, renderSinglePage } from './utils/pageParser';
import { extractProductDataFromPage } from './services/geminiService';

const App: React.FC = () => {
  const { t, language } = useTranslation();
  
  // UI State
  const [isHelpVisible, setHelpVisible] = useState(false);
  const [isApiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  
  // App Data State
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPages, setSelectedPages] = useState<Map<string, Set<number>>>(new Map<string, Set<number>>());
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<ProductData[]>([]);

  // API Key State
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>({ mode: 'default', customKey: '' });

  // Processing State
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load API key config and prompt from localStorage on initial render
  useEffect(() => {
    const savedKeyConfig = localStorage.getItem('apiKeyConfig');
    if (savedKeyConfig) {
      setApiKeyConfig(JSON.parse(savedKeyConfig));
    }
    const savedPrompt = localStorage.getItem('prompt');
    // Set default prompt based on language if nothing is saved
    setPrompt(savedPrompt || getDefaultPrompt(language));
  }, [language]);

  // Update prompt when language changes if it's still the default
  useEffect(() => {
      const defaultEn = getDefaultPrompt('en');
      const defaultPt = getDefaultPrompt('pt');
      if (prompt === defaultEn || prompt === defaultPt) {
          setPrompt(getDefaultPrompt(language));
      }
  }, [language, prompt]);

  const handleSaveApiKey = (config: ApiKeyConfig) => {
    setApiKeyConfig(config);
    localStorage.setItem('apiKeyConfig', JSON.stringify(config));
    setApiKeyModalVisible(false);
  };
  
  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    localStorage.setItem('prompt', newPrompt);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    // Reset selections if files change
    setSelectedPages(new Map<string, Set<number>>());
    setResults([]);
  };

  const handlePageSelectionChange = useCallback((fileName: string, pageNumber: number, isSelected: boolean) => {
    setSelectedPages((prev: Map<string, Set<number>>) => {
      const newMap = new Map<string, Set<number>>(prev);
      const pages = new Set<number>(newMap.get(fileName) || []);
      if (isSelected) {
        pages.add(pageNumber);
      } else {
        pages.delete(pageNumber);
      }
      newMap.set(fileName, pages);
      return newMap;
    });
  }, []);

  const handleSelectAll = useCallback((fileName: string, pageCount: number) => {
    setSelectedPages((prev: Map<string, Set<number>>) => {
        const newMap = new Map<string, Set<number>>(prev);
        const pages = new Set<number>(Array.from({length: pageCount}, (_, i) => i + 1));
        newMap.set(fileName, pages);
        return newMap;
    });
  }, []);

  const handleDeselectAll = useCallback((fileName: string) => {
    setSelectedPages((prev: Map<string, Set<number>>) => {
        const newMap = new Map<string, Set<number>>(prev);
        newMap.set(fileName, new Set<number>());
        return newMap;
    });
  }, []);

  const handleReset = () => {
    setFiles([]);
    setSelectedPages(new Map<string, Set<number>>());
    setResults([]);
    setStatus('idle');
    setProgress(null);
    setError(null);
  };

  const handleClearResults = () => {
      setResults([]);
      setStatus('idle');
  }

  const handleStartProcessing = async () => {
    setError(null);
    setResults([]);
    
    // Filter files that actually have pages selected
    const filesToProcess = files.filter(file => {
        const pages = selectedPages.get(file.name);
        return pages && pages.size > 0;
    });

    if (filesToProcess.length === 0) {
        setError(t('pageSelectionError') || "No pages selected."); 
        return;
    }

    const apiKey = apiKeyConfig.mode === 'custom' ? apiKeyConfig.customKey : process.env.API_KEY || '';
    if (!apiKey) {
      setError(t('apiKeyMissingError'));
      setApiKeyModalVisible(true);
      return;
    }

    setStatus('processing'); 
    
    // Calculate total pages for progress bar
    let totalPagesToProcess = 0;
    filesToProcess.forEach(file => {
        totalPagesToProcess += Number(selectedPages.get(file.name)?.size || 0);
    });

    let processedCount = 0;

    try {
        for (const file of filesToProcess) {
            const pages = selectedPages.get(file.name);
            if (!pages) continue;

            // 1. Load PDF Document once per file
            setProgress({ 
                current: processedCount, 
                total: totalPagesToProcess, 
                filename: `${t('processingPreparing')} ${file.name}` 
            });

            const pdfDoc = await loadPdfDocument(file);
            const sortedPages = (Array.from(pages) as number[]).sort((a, b) => a - b);

            // 2. Process page by page (Render -> Extract -> Release Memory)
            for (const pageNum of sortedPages) {
                processedCount++;
                setProgress({ 
                    current: processedCount, 
                    total: totalPagesToProcess, 
                    filename: `${file.name} (p. ${pageNum})` 
                });

                try {
                    // Render single page
                    const imageInfo = await renderSinglePage(pdfDoc, pageNum, file.name);
                    
                    // Extract data
                    const products = await extractProductDataFromPage(imageInfo, prompt, apiKey);
                    
                    // Update results immediately
                    setResults(prev => [...prev, ...products]);
                    
                    // Explicitly clear imageInfo to help GC
                    imageInfo.base64 = ''; 
                } catch (pageError: any) {
                    console.error(`Failed to process page ${pageNum} of ${file.name}:`, pageError);
                    
                    // CRITICAL: Circuit Breaker for Auth Errors
                    // If the API key is wrong, there is no point in trying the next 50 pages.
                    if (pageError.message && pageError.message.includes('AUTH_ERROR')) {
                        throw new Error(t('apiKeyMissingError')); // Reuse key error message or specific one
                    }
                    
                    // For other errors (like a blurry page), we just log and continue
                }
            }
            
            // Cleanup PDF Document
            pdfDoc.destroy(); 
        }

        setStatus('success');
    } catch (err: any) {
        console.error("Batch processing fatal error:", err);
        setError(err.message || 'An unknown error occurred.');
        setStatus('error');
    }
  };

  const totalSelectedPages = useMemo(() => {
    return Array.from(selectedPages.values()).reduce((sum: number, pages: Set<number>) => sum + pages.size, 0);
  }, [selectedPages]);

  const isProcessing = status === 'rendering' || status === 'processing';
  const isStartDisabled = files.length === 0 || totalSelectedPages === 0 || isProcessing;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-sky-400">{t('appTitle')}</h1>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <button onClick={() => setHelpVisible(true)} className="text-gray-400 hover:text-white transition-colors">{t('helpButton')}</button>
            <button onClick={() => setApiKeyModalVisible(true)} className="text-gray-400 hover:text-white transition-colors"><SettingsIcon /></button>
            <a href="https://github.com/google/aistudio-apps/tree/main/demos/catalog-gleaner" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors"><GithubIcon /></a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-4">
          <FileUpload onFilesSelected={handleFilesSelected} disabled={isProcessing} />
          <PageSelection
            files={files}
            selectedPages={selectedPages}
            onPageSelectionChange={handlePageSelectionChange}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            disabled={isProcessing}
          />
          <ExtractionOptions prompt={prompt} onPromptChange={handlePromptChange} disabled={isProcessing} />
          <div className="bg-gray-800/50 rounded-lg p-4">
            <button
                onClick={handleStartProcessing}
                disabled={isStartDisabled}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
                {isProcessing ? t('startButtonProcessing') : t('startButton', { count: totalSelectedPages })}
            </button>
          </div>
        </div>
        <div>
          <ResultsView data={results} status={status} onClear={handleClearResults} />
        </div>
      </main>

      <ProcessingView status={status} progress={progress} error={error} onReset={handleReset} />
      <HelpModal isVisible={isHelpVisible} onClose={() => setHelpVisible(false)} />
      <ApiKeyModal isVisible={isApiKeyModalVisible} onClose={() => setApiKeyModalVisible(false)} onSave={handleSaveApiKey} currentConfig={apiKeyConfig} />
    </div>
  );
};

export default App;