import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { useTranslation } from '../hooks/useTranslation';

// Fix: Set worker source for pdf.js to match the CDN from the importmap.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface PageSelectionProps {
  files: File[];
  selectedPages: Map<string, Set<number>>;
  onPageSelectionChange: (fileName: string, pageNumber: number, isSelected: boolean) => void;
  onSelectAll: (fileName:string, pageCount: number) => void;
  onDeselectAll: (fileName: string) => void;
  disabled: boolean;
}

const PageThumbnail: React.FC<{
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  isSelected: boolean;
  onSelect: (pageNumber: number, isSelected: boolean) => void;
  disabled: boolean;
}> = ({ pdf, pageNumber, isSelected, onSelect, disabled }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderThumbnail = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.3 }); // Small scale for thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        if (isMounted) {
          setThumbnailUrl(canvas.toDataURL());
        }
      } catch (error) {
        console.error(`Failed to render page ${pageNumber}:`, error);
      }
    };
    renderThumbnail();
    return () => { isMounted = false; };
  }, [pdf, pageNumber]);

  return (
    <div
      onClick={() => !disabled && onSelect(pageNumber, !isSelected)}
      className={`relative rounded-md overflow-hidden border-2 transition-all
        ${isSelected ? 'border-sky-500' : 'border-transparent hover:border-sky-600'}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
      `}
    >
      <div className="aspect-[2/3] bg-gray-700 flex items-center justify-center">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={`Page ${pageNumber}`} className="object-contain w-full h-full" />
        ) : (
          <div className="animate-pulse w-full h-full bg-gray-600"></div>
        )}
      </div>
      <div className="absolute bottom-1 right-1 bg-gray-900/70 text-white text-xs px-1.5 py-0.5 rounded">
        {pageNumber}
      </div>
      {isSelected && (
        <div className="absolute inset-0 bg-sky-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      )}
    </div>
  );
};


const FilePages: React.FC<{
    file: File;
    selected: Set<number>;
    onPageSelectionChange: (fileName: string, pageNumber: number, isSelected: boolean) => void;
    onSelectAll: (fileName:string, pageCount: number) => void;
    onDeselectAll: (fileName: string) => void;
    disabled: boolean;
}> = ({ file, selected, onPageSelectionChange, onSelectAll, onDeselectAll, disabled }) => {
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    
    useEffect(() => {
        const loadPdf = async () => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
                setPdf(pdfDoc);
            } catch (err) {
                console.error('Failed to load PDF', err);
                setError(t('pageSelectionError'));
            }
        };
        loadPdf();
    }, [file, t]);

    if(error) return <div className="text-red-400 text-sm p-4 bg-red-900/30 rounded-md">{error}</div>
    if(!pdf) return <div className="text-center text-gray-400 p-4">{t('pageSelectionLoadingPDF')}</div>

    const numPages = pdf.numPages;
    const pages = Array.from({ length: numPages }, (_, i) => i + 1);

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-300 truncate" title={file.name}>{file.name}</h4>
                {!disabled && (
                    <div className="flex space-x-2 text-xs">
                        <button onClick={() => onSelectAll(file.name, numPages)} className="hover:text-sky-400">{t('pageSelectionSelectAll')}</button>
                        <button onClick={() => onDeselectAll(file.name)} className="hover:text-sky-400">{t('pageSelectionDeselectAll')}</button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {pages.map(pageNumber => (
                    <PageThumbnail
                        key={pageNumber}
                        pdf={pdf}
                        pageNumber={pageNumber}
                        isSelected={selected.has(pageNumber)}
                        onSelect={(p, isSelected) => onPageSelectionChange(file.name, p, isSelected)}
                        disabled={disabled}
                    />
                ))}
            </div>
        </div>
    )
}

const PageSelection: React.FC<PageSelectionProps> = ({ files, selectedPages, onPageSelectionChange, onSelectAll, onDeselectAll, disabled }) => {
  const { t } = useTranslation();
  if (files.length === 0) return null;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mt-4">
      <h3 className="text-md font-semibold mb-3">{t('pageSelectionTitle')}</h3>
      <div className="space-y-6">
        {files.map(file => (
          <FilePages 
            key={file.name}
            file={file}
            selected={selectedPages.get(file.name) || new Set()}
            onPageSelectionChange={onPageSelectionChange}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default PageSelection;