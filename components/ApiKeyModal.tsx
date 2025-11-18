import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';
import { ApiKeyConfig } from '../types';

interface ApiKeyModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (config: ApiKeyConfig) => void;
  currentConfig: ApiKeyConfig;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isVisible, onClose, onSave, currentConfig }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState(currentConfig.mode);
  const [customKey, setCustomKey] = useState(currentConfig.customKey);

  useEffect(() => {
    setMode(currentConfig.mode);
    setCustomKey(currentConfig.customKey);
  }, [currentConfig]);

  if (!isVisible) return null;

  const handleSave = () => {
    onSave({ mode, customKey });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-fast"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-lg relative border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XIcon />
        </button>

        <h2 className="text-xl font-bold text-sky-400 mb-4">{t('apiKeyModalTitle')}</h2>
        
        <div className="space-y-4 text-gray-300">
          <p className="text-sm">{t('apiKeyModalDescription')}</p>
          
          <div className="space-y-2">
            <label className="flex items-center p-3 bg-gray-900/50 rounded-md border border-gray-700 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-900/20 transition-colors">
              <input 
                type="radio" 
                name="apiKeyMode" 
                value="default"
                checked={mode === 'default'}
                onChange={() => setMode('default')}
                className="h-4 w-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500"
              />
              <span className="ml-3 text-sm font-medium">{t('apiKeyModalModeDefault')}</span>
            </label>
            <label className="flex items-center p-3 bg-gray-900/50 rounded-md border border-gray-700 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-900/20 transition-colors">
              <input 
                type="radio" 
                name="apiKeyMode" 
                value="custom"
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
                className="h-4 w-4 text-sky-600 bg-gray-700 border-gray-600 focus:ring-sky-500"
              />
              <span className="ml-3 text-sm font-medium">{t('apiKeyModalModeCustom')}</span>
            </label>
          </div>

          {mode === 'custom' && (
            <div className="animate-fade-in-fast">
              <label htmlFor="custom-key-input" className="block text-sm font-medium text-gray-400 mb-1">
                {t('apiKeyModalCustomKeyLabel')}
              </label>
              <input
                id="custom-key-input"
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder={t('apiKeyModalCustomKeyPlaceholder')}
                className="w-full bg-gray-900 p-2 rounded-md text-sm border border-gray-600 focus:ring-sky-500 focus:border-sky-500 transition-colors"
              />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t('apiKeyModalSaveButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;