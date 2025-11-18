import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { EditIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon, WarningIcon } from './icons';

interface ExtractionOptionsProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  disabled: boolean;
}

const DEFAULT_PROMPT_EN = `From the provided catalog page image, identify all products. Extract data specifically for the Nuvemshop e-commerce platform. For each product, extract:

- nome: Product name.
- modelo: Product Model, Application or Compatible Model (look for "Modelo", "Aplicação", "Compatível").
- descricao: Full product description.
- codigo: Generic Product Code, Reference (Ref.), or ID visible on the page.
- sku: STRICTLY extract explicit SKU found in the text. DO NOT use the Product Model name as SKU. If no explicit SKU code is present, return null.
- codigo_barras: EAN/GTIN Barcode.
- ncm: NCM Code (Nomenclatura Comum do Mercosul). Return null if not present.
- categoria: Product category tree (e.g. Clothes > Men > T-Shirts).
- peso_kg: Weight in KG (estimate if not explicit).
- altura_cm: Height in CM (package dimensions).
- largura_cm: Width in CM (package dimensions).
- comprimento_cm: Length in CM (package dimensions).
- mpn: Manufacturer Part Number (for Google Shopping).
- faixa_etaria: Age group (e.g., adult, child, toddler, infant).
- sexo: Gender (e.g., male, female, unisex).

CRITICAL RULE: Do not hallucinate data. If a field like SKU, Code or NCM is not explicitly in the image text, return null.`;

const DEFAULT_PROMPT_PT = `A partir da imagem da página do catálogo, identifique todos os produtos. Extraia os dados focados para cadastro na Nuvemshop. Para cada produto, extraia:

- nome: Nome completo do produto.
- modelo: Modelo do produto, Aplicação ou Modelo Compatível (procure por termos como "Modelo", "Aplicação", "Serve em", "Compatível").
- descricao: Descrição detalhada do produto.
- codigo: Código genérico, Referência (Ref.) ou ID visível na página junto ao produto.
- sku: Extraia ESTRITAMENTE códigos explícitos marcados como SKU. NÃO use o nome do modelo ou aplicação como SKU. Se não houver código SKU explícito, retorne null.
- codigo_barras: Código de barras EAN/GTIN.
- ncm: Código NCM (Nomenclatura Comum do Mercosul). Retorne null se não estiver presente.
- categoria: Árvore de categoria (ex: Roupas > Masculino > Camisetas).
- peso_kg: Peso em KG (numérico).
- altura_cm: Altura da embalagem em CM (numérico).
- largura_cm: Largura da embalagem em CM (numérico).
- comprimento_cm: Comprimento da embalagem em CM (numérico).
- mpn: MPN (Manufacturer Part Number) para Google Shopping.
- faixa_etaria: Faixa etária (ex: adulto, criança, bebê).
- sexo: Gênero (ex: masculino, feminino, unissex).

REGRA CRÍTICA: Não invente dados. Se um campo como SKU, Código ou NCM não estiver explicitamente no texto da imagem, retorne null.`;

export const getDefaultPrompt = (language: 'en' | 'pt') => {
    return language === 'pt' ? DEFAULT_PROMPT_PT : DEFAULT_PROMPT_EN;
}

const ExtractionOptions: React.FC<ExtractionOptionsProps> = ({ prompt, onPromptChange, disabled }) => {
  const { t, language } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const defaultPrompt = getDefaultPrompt(language);
  const isDefault = prompt === defaultPrompt;

  const handleReset = () => {
    onPromptChange(defaultPrompt);
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg transition-all duration-300 border border-gray-700/50 ${isExpanded ? 'p-4' : 'p-3'}`}>
      
      {/* Header / Compact View */}
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
            <h3 className="text-md font-semibold text-gray-200">{t('extractionOptionsTitleCompact')}</h3>
            
            {/* Status Badges */}
            {isDefault ? (
                <div className="flex items-center space-x-1 bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-900/50">
                    <CheckCircleIcon className="w-3 h-3" />
                    <span>{t('extractionOptionsDefaultActive')}</span>
                </div>
            ) : (
                <div className="flex items-center space-x-1 bg-amber-900/30 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-900/50">
                    <EditIcon className="w-3 h-3" />
                    <span>{t('extractionOptionsCustomActive')}</span>
                </div>
            )}
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
            {!disabled && (
                <button className="hover:text-white transition-colors p-1">
                    {isExpanded ? <ChevronUpIcon /> : <EditIcon />}
                </button>
            )}
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 animate-fade-in">
            <div className="flex justify-between items-end mb-2">
                 <p className="text-xs text-gray-400 max-w-[80%]">{t('extractionOptionsDescription')}</p>
                 {!isDefault && !disabled && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleReset(); }} 
                        className="text-xs text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-1"
                    >
                        <WarningIcon className="w-3 h-3" />
                        <span>{t('extractionOptionsReset')}</span>
                    </button>
                )}
            </div>
            
            <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                rows={12}
                className="w-full bg-gray-900/80 p-3 rounded-md text-xs border border-gray-600 focus:ring-sky-500 focus:border-sky-500 transition-colors font-mono text-gray-300 leading-relaxed"
                placeholder={t('extractionOptionsPlaceholder')}
                disabled={disabled}
            />
            
            <div className="mt-2 flex justify-end">
                <button 
                    onClick={() => setIsExpanded(false)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded transition-colors"
                >
                    {t('extractionOptionsClose')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionOptions;