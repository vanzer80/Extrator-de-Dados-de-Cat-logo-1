import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloudIcon, FileIcon, XIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, disabled }) => {
  const [files, setFiles] = useState<File[]>([]);
  const { t } = useTranslation();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);
    onFilesSelected(newFiles);
  }, [files, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    disabled
  });

  const removeFile = (fileName: string) => {
    const newFiles = files.filter(file => file.name !== fileName);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };
  
  const clearFiles = () => {
    setFiles([]);
    onFilesSelected([]);
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-md font-semibold mb-3">{t('fileUploadTitle')}</h3>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-sky-500 bg-sky-900/30' : 'border-gray-600 hover:border-sky-600'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <UploadCloudIcon />
          {isDragActive ? (
            <p className="mt-2 text-sky-400">{t('fileUploadDrop')}</p>
          ) : (
            <p className="mt-2 text-gray-400">{t('fileUploadDrag')}</p>
          )}
          <p className="text-xs text-gray-500">{t('fileUploadHint')}</p>
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold">{t('fileUploadSelectedFiles', { count: files.length })}</h4>
            {!disabled && (
                 <button onClick={clearFiles} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                    {t('fileUploadClearAll')}
                 </button>
            )}
          </div>
          <ul className="space-y-2 max-h-32 overflow-y-auto">
            {files.map(file => (
              <li key={file.name} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md text-sm animate-fade-in-fast">
                <div className="flex items-center min-w-0">
                  <FileIcon />
                  <span className="ml-2 truncate" title={file.name}>{file.name}</span>
                </div>
                {!disabled && (
                    <button onClick={() => removeFile(file.name)} className="text-gray-400 hover:text-white p-1 rounded-full">
                        <XIcon />
                    </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
