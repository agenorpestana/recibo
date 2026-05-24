import React, { useState, useEffect } from 'react';
import { CompanySettings } from '../types';
import { Settings, FileImage, ClipboardSignature, Check, Sparkles, Building2, HelpCircle, Plus, Trash2, Building } from 'lucide-react';

interface CompanySettingsTabProps {
  settings: CompanySettings;
  onSettingsUpdated: (updated: CompanySettings) => void;
}

export const CompanySettingsTab: React.FC<CompanySettingsTabProps> = ({ settings, onSettingsUpdated }) => {
  const [companies, setCompanies] = useState<(CompanySettings & { id: number })[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<CompanySettings>({
    company_name: '',
    cnpj: '',
    ie: '',
    address: '',
    phone: '',
    email: '',
    logo_base64: null,
    notes_recibo_default: '',
    notes_orcamento_default: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carrega lista de empresas do servidor
  const fetchCompanies = async (selectId?: number) => {
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        
        if (data.length > 0) {
          // Se pediu para selecionar uma ID específica, ou seleciona a que já estava, ou a primeira da lista
          const targetId = selectId !== undefined ? selectId : (selectedCompanyId || data[0].id);
          const matched = data.find((c: any) => c.id === targetId) || data[0];
          setSelectedCompanyId(matched.id);
          setFormData({
            company_name: matched.company_name,
            cnpj: matched.cnpj,
            ie: matched.ie,
            address: matched.address,
            phone: matched.phone,
            email: matched.email,
            logo_base64: matched.logo_base64,
            notes_recibo_default: matched.notes_recibo_default,
            notes_orcamento_default: matched.notes_orcamento_default
          });
        }
      }
    } catch (err: any) {
      console.error('Erro ao ler lista de empresas:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Seleciona uma empresa da lista
  const handleSelectCompany = (company: CompanySettings & { id: number }) => {
    setError(null);
    setSuccess(null);
    setSelectedCompanyId(company.id);
    setFormData({
      company_name: company.company_name,
      cnpj: company.cnpj,
      ie: company.ie,
      address: company.address,
      phone: company.phone,
      email: company.email,
      logo_base64: company.logo_base64,
      notes_recibo_default: company.notes_recibo_default,
      notes_orcamento_default: company.notes_orcamento_default
    });
  };

  // Prepara formulário para cadastrar nova empresa
  const handleInitNewCompany = () => {
    setError(null);
    setSuccess(null);
    setSelectedCompanyId(null); // null indica nova empresa
    setFormData({
      company_name: '',
      cnpj: '',
      ie: '',
      address: '',
      phone: '',
      email: '',
      logo_base64: null,
      notes_recibo_default: '- Garantia do Serviço 30 dias\n- Garantia de Peças 06 Meses\n- Garantia de Máquina Fechada e 01 Ano\n- Equipamento com mais de 60 dias sem o cliente vir buscar caracteriza abandono, sendo assim será vendido para ressarcir os danos com peças e mão de obra.',
      notes_orcamento_default: 'Este orçamento tem validade de 10 dias corridos a partir da data de emissão. Valores sujeitos a reajuste conforme estoque de insumos e peças de mercado.'
    });
  };

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
      setSuccess("Logotipo anexado com sucesso! Salve a empresa para concluir as atualizações.");
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

  // Salva ou adiciona perfil de empresa
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isNew = selectedCompanyId === null;
      const url = isNew ? '/api/companies' : `/api/companies/${selectedCompanyId}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Falha ao salvar perfil de empresa.');
      }
      
      const savedCompany = await response.json();
      
      setSuccess(isNew ? 'Nova empresa cadastrada com sucesso!' : 'Perfil de empresa atualizado de forma segura!');
      
      // Se for a empresa padrão com ID 1, notifica o app principal para atualizar o cabeçalho imediatamente
      if (selectedCompanyId === 1 || (isNew && companies.length === 0)) {
        onSettingsUpdated(savedCompany);
      }

      await fetchCompanies(savedCompany.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar empresa.');
    } finally {
      setLoading(false);
    }
  };

  // Remove perfil de empresa secundário
  const handleDeleteCompany = async (companyId: number, name: string) => {
    if (companyId === 1) {
      setError("A empresa principal do sistema não pode ser removida.");
      return;
    }

    if (!window.confirm(`Deseja remover o perfil da empresa "${name}" permanentemente?`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao deletar empresa.');
      }

      setSuccess('Perfil de empresa removido com sucesso!');
      setSelectedCompanyId(1); // Seleciona a principal de volta
      await fetchCompanies(1);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Falha ao apagar empresa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-850">Cadastro e Perfis de Empresas</h2>
        <p className="text-xs text-gray-500 font-sans">
          Cadastre e gerencie múltiplas empresas para emitir seus Orçamentos e Recibos com logotipos e condições de pagamento exclusivos
        </p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
          <Check className="h-5 w-5 animate-bounce" />
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Menu de Empresas */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-4 w-4 text-blue-600" />
              Shed de Empresas
            </h3>
            <button
              onClick={handleInitNewCompany}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Cadastrar
            </button>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {companies.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCompany(c)}
                className={`flex justify-between items-center p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedCompanyId === c.id
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/30'
                }`}
              >
                <div className="space-y-1 overflow-hidden pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-800 truncate block max-w-[170px]">{c.company_name}</span>
                    {c.id === 1 && (
                      <span className="px-1 text-[8px] font-extrabold bg-blue-100 text-blue-800 rounded font-mono">Principal</span>
                    )}
                  </div>
                  <span className="block text-[10.5px] text-gray-400 font-mono">{c.cnpj || 'Sem CNPJ'}</span>
                </div>

                {c.id !== 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCompany(c.id, c.company_name);
                    }}
                    title="Excluir Perfil"
                    className="p-1 hover:text-red-650 hover:bg-red-50 rounded text-gray-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Painel Direito: Detalhes e Formulário */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Logotipo da Empresa selecionada */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-blue-600" />
                  Logotipo Comercial
                </h4>
                <p className="text-[11px] text-gray-400">
                  Insira o logotipo para os relatórios e recibos gerados exclusivamente por este perfil comercial.
                </p>
              </div>

              <div className="flex justify-center border-2 border-dashed border-gray-250 rounded-lg p-3 bg-gray-50/55 min-h-[96px] items-center">
                {formData.logo_base64 ? (
                  <div className="text-center space-y-2">
                    <img 
                      src={formData.logo_base64} 
                      alt="Previa Logo" 
                      className="max-h-20 max-w-[175px] mx-auto object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-red-650 font-bold hover:underline block mx-auto"
                    >
                      Remover Logotipo
                    </button>
                  </div>
                ) : (
                  <div className="text-center font-bold text-[10px] text-gray-450">
                    Logotipo Geométrico Unity Padrão
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block w-full text-center bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-bold py-2 px-3 rounded-lg cursor-pointer text-xs">
                  Procurar Logotipo...
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <span className="block text-[9px] text-gray-400 text-center">Tamanho limite de 2MB</span>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                {selectedCompanyId === null ? 'Cadastrar Novo Perfil Emitente' : `Editar Detalhes de: ${formData.company_name || 'Empresa'}`}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Razão Social / Nome da Empresa</label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="Ex: MINHA OUTRA EMPRESA LTDA."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail Comercial</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="email@dominio.com"
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
                    placeholder="00.000.000/0001-00"
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
                    placeholder="ie ou Isento"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contato Telefônico</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Endereço Comercial Oficial</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>
            </div>

            {/* Cláusulas e Observações Padrão */}
            <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
                <ClipboardSignature className="h-4 w-4 text-blue-600" />
                Termos e Vigências Padrão Customizados
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-750 uppercase">Cláusulas do Recibo (Garantias)</label>
                  <span className="block text-[10px] text-gray-400 pb-1">Texto carregado por padrão em novos recibos desta empresa.</span>
                  <textarea
                    rows={5}
                    value={formData.notes_recibo_default}
                    onChange={(e) => setFormData({ ...formData, notes_recibo_default: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-750 uppercase">Validade do Orçamento (Condições)</label>
                  <span className="block text-[10px] text-gray-400 pb-1">Carregado por padrão nos orçamentos criados por esta empresa.</span>
                  <textarea
                    rows={5}
                    value={formData.notes_orcamento_default}
                    onChange={(e) => setFormData({ ...formData, notes_orcamento_default: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botão de Gravação */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-650 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors shadow disabled:bg-blue-400 flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? 'Processando...' : selectedCompanyId === null ? 'Gravar Nova Empresa' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
