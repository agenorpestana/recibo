import React, { useState, useEffect } from 'react';
import { CompanySettings } from '../types';
import { Settings, FileImage, ClipboardSignature, Check, Sparkles, Building2, HelpCircle } from 'lucide-react';

interface CompanySettingsTabProps {
  settings: CompanySettings;
  onSettingsUpdated: (updated: CompanySettings) => void;
}

export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({ settings, onSettingsUpdated }) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // Realiza conversão de arquivo de imagem (PNG/JPG) em base64 com compressão
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // Limita logotipo a 2MB
      setError("O arquivo do logotipo não pode passar de 2MB de tamanho.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData(prev => ({ ...prev, logo_base64: result }));
      setSuccess("Logotipo anexado com sucesso! Salve para concluir as atualizações.");
      setError(null);
    };
    reader.onerror = () => {
      setError("Erro ao ler arquivo da imagem.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_base64: null }));
    setSuccess("Logotipo customizado desanexado. O sistema usará o layout vetorizado padrão.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Falha ao gravar configurações.');
      const data = await response.json();

      onSettingsUpdated(data);
      setSuccess('Configurações e credenciais da empresa atualizadas e salvas!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao sincronizar dados corporativos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-850">Dados Corporativos e Configurações</h2>
        <p className="text-xs text-gray-500 font-sans">Personalize o logotipo de visualização, os comprovantes fiscais impressos, CNPJ/IE e os termos de garantia padrão</p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Layout do Logotipo */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FileImage className="h-4 w-4 text-blue-600" />
              Logotipo Personalizado
            </h4>
            <p className="text-[11px] text-gray-400">Anexe um logotipo customizado para substituir o logotipo geométrico padrão nos recibos impressos ou gerados.</p>
          </div>

          <div className="flex justify-center border-2 border-dashed border-gray-200 rounded-lg p-3 bg-gray-50/55 min-h-[96px] items-center">
            {formData.logo_base64 ? (
              <div className="text-center space-y-2">
                <img 
                  src={formData.logo_base64} 
                  alt="Previa Logo" 
                  className="max-h-20 max-w-[170px] mx-auto object-contain rounded"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-[10px] text-red-600 font-bold hover:underline block mx-auto"
                >
                  Remover Logotipo
                </button>
              </div>
            ) : (
              <div className="text-center font-semibold text-[10px] text-gray-400">
                Logotipo Geométrico Padrão em Uso
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block w-full text-center bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-750 font-bold py-2.5 px-4 rounded-lg cursor-pointer text-xs">
              Selecionar Novo Logotipo...
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <span className="block text-[9px] text-gray-400 text-center">Formatos aceitos: PNG, JPEG ou GIF (Máx 2MB)</span>
          </div>
        </div>

        {/* Fórmulas de Dados da Empresa */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Dados da Empresa e Contrato de Emissão
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo da Empresa</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail corporativo</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CNPJ</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Inscrição Estadual (IE)</label>
              <input
                type="text"
                required
                value={formData.ie}
                onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Telefone da Empresa</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Endereço de Emissão Completo</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cláusulas e Observações Padrão */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
            <ClipboardSignature className="h-4 w-4 text-blue-600" />
            Termos e Cláusulas Padrão Automáticas
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-750 uppercase">Termos do Recibo (Padrão de Garantia)</label>
              <span className="block text-[10px] text-gray-400 pb-1">Este texto será carregado automaticamente em novos recibos de serviços prestados.</span>
              <textarea
                rows={6}
                value={formData.notes_recibo_default}
                onChange={(e) => setFormData({ ...formData, notes_recibo_default: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-750 uppercase">Termos de Orçamentos (Padrão de Validade)</label>
              <span className="block text-[10px] text-gray-400 pb-1">Condições de validade ou entrega adicionadas aos orçamentos antes da conversão.</span>
              <textarea
                rows={6}
                value={formData.notes_orcamento_default}
                onChange={(e) => setFormData({ ...formData, notes_orcamento_default: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none font-sans"
              />
            </div>
          </div>
        </div>

        {/* Botão de Gravação */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow disabled:bg-blue-400 flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Sincronizando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
};
