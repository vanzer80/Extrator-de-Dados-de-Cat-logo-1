import React from 'react';
import { XIcon } from './icons';
import { useTranslation } from '../hooks/useTranslation';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isVisible, onClose }) => {
  const { t } = useTranslation();
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-fast"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XIcon />
        </button>

        <h2 className="text-2xl font-bold text-sky-400 mb-4">{t('helpModalTitle')}</h2>
        
        <div className="space-y-4 text-gray-300">
          <p>{t('helpModalIntro')}</p>
          
          <div>
            <h3 className="font-semibold text-lg text-gray-200 mb-2">{t('helpModalUsageFlowTitle')}</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>{t('helpModalUsageStep1')}</li>
              <li>{t('helpModalUsageStep2')}</li>
              <li>{t('helpModalUsageStep3')}</li>
              <li>{t('helpModalUsageStep4')}</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-gray-200 mb-2">{t('helpModalSchemaTitle')}</h3>
            <p className="text-sm mb-2">{t('helpModalSchemaDesc')}</p>
            <pre className="bg-gray-900/80 p-3 rounded-md text-xs overflow-x-auto">
              <code>
{`[
  {
    "produto_nome": "string | null",
    "modelo": "string | null",
    "codigo": "string | null",
    "categoria": "string | null",
    "descricao": "string | null",
    "especificacoes": [
      { 
        "key": "Chave Original do PDF",
        "value": "Valor Original do PDF"
      },
      // ... more specifications
    ],
    "imagens": [
      {
        "filename": "string",
        "page": number,
        "hash": "string",
        "base64": "string" // base64 of the rendered page image
      }
    ],
    "origem": {
      "source_pdf": "nome_do_arquivo.pdf",
      "page": number
    },
    "avisos": ["string", "..."]
  }
]`}
              </code>
            </pre>
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-700 pt-3">
            <strong>{t('helpModalFidelityNoteTitle')}</strong> {t('helpModalFidelityNoteBody')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;