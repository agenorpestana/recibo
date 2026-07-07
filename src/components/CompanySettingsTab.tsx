import React, { useState, useEffect } from 'react';
import { CompanySettings, IntegrationSettings } from '../types';
import { 
  Settings, FileImage, ClipboardSignature, Check, Sparkles, Building2, 
  HelpCircle, Plus, Trash2, Building, Database, Share2, MessageSquare, 
  Search, FileText, Send, Key, RefreshCw, AlertCircle, ExternalLink, 
  Lock, Settings2, BookOpen, CheckCircle, Smartphone 
} from 'lucide-react';

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

  // --- ESTADOS E MÉTODOS PARA INTEGRAÇÃO BOM CONTROLE & WHATICKET ---
  const [activeSubTab, setActiveSubTab] = useState<'cadastro' | 'boleto_api'>('cadastro');

  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({
    bom_controle_api_key: '',
    whaticket_api_token: '',
    whaticket_api_url: 'https://apichat.unityautomacoes.com.br',
    whaticket_default_message: 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}'
  });
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationSuccess, setIntegrationSuccess] = useState<string | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);

  const [testFaturaId, setTestFaturaId] = useState('');
  const [faturaLoading, setFaturaLoading] = useState(false);
  const [fetchedFatura, setFetchedFatura] = useState<any | null>(null);
  const [faturaError, setFaturaError] = useState<string | null>(null);

  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchIntegrationSettings = async () => {
    try {
      setIntegrationLoading(true);
      setIntegrationError(null);
      const res = await fetch('/api/integration/settings');
      if (!res.ok) throw new Error('Falha ao carregar configurações de integração.');
      const data = await res.json();
      setIntegrationSettings(data);
    } catch (err: any) {
      setIntegrationError(err.message || 'Erro ao carregar configurações de integração.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  const saveIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIntegrationLoading(true);
      setIntegrationSuccess(null);
      setIntegrationError(null);
      const res = await fetch('/api/integration/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrationSettings)
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações de integração.');
      const data = await res.json();
      setIntegrationSettings(data);
      setIntegrationSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setIntegrationSuccess(null), 3000);
    } catch (err: any) {
      setIntegrationError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  const handleSearchFatura = async () => {
    if (!testFaturaId) {
      setFaturaError('Por favor, informe o ID da fatura.');
      return;
    }
    try {
      setFaturaLoading(true);
      setFaturaError(null);
      setFetchedFatura(null);
      const res = await fetch(`/api/integration/bom-controle/fatura/${testFaturaId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Fatura não encontrada ou erro ${res.status}`);
      }
      const data = await res.json();
      setFetchedFatura(data);

      const valor = data.Valor !== undefined ? `R$ ${Number(data.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
      
      let vencimento = 'N/A';
      if (data.Vencimento) {
        try {
          const date = new Date(data.Vencimento);
          vencimento = date.toLocaleDateString('pt-BR');
        } catch (e) {}
      }

      const link = data.LinkBoleto || '';

      let msg = integrationSettings.whaticket_default_message || 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
      msg = msg.replace('{valor}', valor)
               .replace('{vencimento}', vencimento)
               .replace('{link_boleto}', link);

      setWhatsAppMessage(msg);

      if (data.Cliente?.Celular) {
        let phone = data.Cliente.Celular;
        phone = phone.replace(/\D/g, '');
        if (phone.length > 0 && !phone.startsWith('55')) {
          phone = '55' + phone;
        }
        setWhatsAppNumber(phone);
      } else {
        setWhatsAppNumber('55');
      }

    } catch (err: any) {
      setFaturaError(err.message || 'Erro ao buscar fatura.');
    } finally {
      setFaturaLoading(false);
    }
  };

  const handleSendWhatsApp = async (sendAsMedia: boolean) => {
    if (!whatsAppNumber || whatsAppNumber === '55') {
      setSendError('Por favor, digite um número de telefone válido.');
      return;
    }
    try {
      setSendLoading(true);
      setSendError(null);
      setSendSuccess(null);

      const payload = {
        number: whatsAppNumber,
        body: whatsAppMessage,
        pdfUrl: sendAsMedia ? fetchedFatura?.LinkBoleto : undefined
      };

      const res = await fetch('/api/integration/whaticket/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar mensagem.');
      }

      setSendSuccess('Mensagem enviada com sucesso para o Whaticket!');
      setTimeout(() => setSendSuccess(null), 3000);
    } catch (err: any) {
      setSendError(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setSendLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'boleto_api') {
      fetchIntegrationSettings();
    }
  }, [activeSubTab]);

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
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-850">Configurações Gerais</h2>
          <p className="text-xs text-gray-500 font-sans">
            Gerencie perfis corporativos e integre com APIs de boleto e mensagens para WhatsApp
          </p>
        </div>
      </div>

      {/* Sub-abas de Navegação */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('cadastro')}
          className={`px-4 py-2.5 font-sans font-medium text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'cadastro'
              ? 'border-indigo-650 text-indigo-650 font-bold border-b-2'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Building className="h-4 w-4" />
          Cadastro e Perfis de Empresa
        </button>
        <button
          onClick={() => setActiveSubTab('boleto_api')}
          className={`px-4 py-2.5 font-sans font-medium text-xs transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'boleto_api'
              ? 'border-indigo-650 text-indigo-650 font-bold border-b-2'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Key className="h-4 w-4" />
          Conf. Boleto API
        </button>
      </div>

      {activeSubTab === 'cadastro' ? (
        <>
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
        </>
      ) : (
        <div className="space-y-6">
          {integrationSuccess && (
            <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
              <Check className="h-5 w-5 animate-bounce" />
              {integrationSuccess}
            </div>
          )}

          {integrationError && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
              {integrationError}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Coluna 1: Formulário de Configuração de APIs */}
            <form onSubmit={saveIntegrationSettings} className="xl:col-span-5 space-y-4 bg-white p-5 rounded-xl border border-gray-150 shadow-sm">
              <div className="border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-indigo-600" />
                  Credenciais de Integração
                </h3>
                <p className="text-[11px] text-gray-400">
                  Configure as chaves e rotas para conectar os sistemas Bom Controle e Whaticket
                </p>
              </div>

              {/* Bom Controle API Key */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-orange-500" />
                  Bom Controle ApiKey
                </label>
                <input
                  type="password"
                  value={integrationSettings.bom_controle_api_key}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, bom_controle_api_key: e.target.value })}
                  placeholder="ApiKey Z0EjZPzTOb-NVurl..."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="block text-[10px] text-gray-400">Insira a chave do Bom Controle para consulta de faturas.</span>
              </div>

              {/* Whaticket API Token */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  Whaticket API Token
                </label>
                <input
                  type="password"
                  value={integrationSettings.whaticket_api_token}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, whaticket_api_token: e.target.value })}
                  placeholder="Seu token de portador (Bearer)"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="block text-[10px] text-gray-400">Token de acesso Bearer para autenticação no painel Whaticket.</span>
              </div>

              {/* Whaticket API URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5 text-indigo-500" />
                  URL da API Whaticket
                </label>
                <input
                  type="text"
                  value={integrationSettings.whaticket_api_url}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, whaticket_api_url: e.target.value })}
                  placeholder="https://apichat.unityautomacoes.com.br"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="block text-[10px] text-gray-400">Endpoint base do seu Whaticket.</span>
              </div>

              {/* Template de Mensagem do WhatsApp */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  Modelo de Mensagem de Cobrança
                </label>
                <textarea
                  rows={4}
                  value={integrationSettings.whaticket_default_message}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, whaticket_default_message: e.target.value })}
                  placeholder="Escreva a mensagem padrão..."
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-150 space-y-1">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Placeholders Suportados:</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono text-indigo-650">
                    <div>{'{valor}'}</div>
                    <div>{'{vencimento}'}</div>
                    <div>{'{link_boleto}'}</div>
                  </div>
                  <span className="block text-[9px] text-gray-400 pt-1">Eles serão substituídos automaticamente pelos dados reais da fatura.</span>
                </div>
              </div>

              {/* Botão de Gravação de Integrações */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={integrationLoading}
                  className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:bg-indigo-400 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${integrationLoading ? 'animate-spin' : ''}`} />
                  {integrationLoading ? 'Salvando...' : 'Salvar Configurações de API'}
                </button>
              </div>
            </form>

            {/* Coluna 2: Sandbox de Consulta e Envio */}
            <div className="xl:col-span-7 space-y-6">
              {/* Box 1: Consulta de Fatura do Bom Controle */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
                      <Search className="h-4 w-4 text-orange-500" />
                      Consulta Integrada Bom Controle
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Consulte faturas em tempo real e gere disparos para WhatsApp
                    </p>
                  </div>
                  <a 
                    href="https://documenter.getpostman.com/view/1797561/SWT7BKWo?version=latest#b6655e34-c67b-4408-bcc6-88f9e371236e"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-medium text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="h-3 w-3" />
                    Doc BomControle
                  </a>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={testFaturaId}
                      onChange={(e) => setTestFaturaId(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSearchFatura(); }}
                      placeholder="Ex: 1"
                      className="block w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 text-xs">
                      ID
                    </div>
                  </div>
                  <button
                    onClick={handleSearchFatura}
                    disabled={faturaLoading}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:bg-orange-350 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${faturaLoading ? 'animate-spin' : ''}`} />
                    {faturaLoading ? 'Buscando...' : 'Buscar Fatura'}
                  </button>
                </div>

                {faturaError && (
                  <div className="rounded-lg bg-orange-50 p-3 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
                    <span>{faturaError}</span>
                  </div>
                )}

                {/* Exibição Elegante da Fatura em Formato de Bento/Cartão */}
                {fetchedFatura && (
                  <div className="bg-gradient-to-br from-gray-50 to-indigo-50/20 border border-gray-150 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-start flex-wrap gap-2 border-b border-gray-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cliente / Sacado</span>
                        <h4 className="text-sm font-bold text-gray-800">{fetchedFatura.Cliente?.Nome || 'Cliente Não Informado'}</h4>
                        <span className="text-[10px] text-gray-400 font-mono">CNPJ/CPF: {fetchedFatura.Cliente?.CnpjCpf || 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ID Fatura</span>
                        <span className="inline-block bg-indigo-100 text-indigo-800 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                          #{fetchedFatura.Id}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Valor Total</span>
                        <span className="text-sm font-bold text-indigo-650">
                          {fetchedFatura.Valor !== undefined ? `R$ ${Number(fetchedFatura.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Vencimento</span>
                        <span className="text-xs font-bold text-gray-800">
                          {fetchedFatura.Vencimento ? new Date(fetchedFatura.Vencimento).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Status</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                          fetchedFatura.Quitada 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          <CheckCircle className="h-3 w-3 shrink-0" />
                          {fetchedFatura.Quitada ? 'Quitada' : 'Pendente'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Forma Pagamento</span>
                        <span className="text-[10px] font-bold text-gray-700">
                          {fetchedFatura.FormaPagamento || 'Boleto'}
                        </span>
                      </div>
                    </div>

                    {fetchedFatura.LinkBoleto && (
                      <div className="flex items-center justify-between gap-4 bg-white p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-red-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block">PDF do Boleto Bancário</span>
                            <span className="text-[10px] text-gray-600 truncate block font-mono">{fetchedFatura.LinkBoleto}</span>
                          </div>
                        </div>
                        <a
                          href={fetchedFatura.LinkBoleto}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-[10px] font-bold text-indigo-650 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg flex items-center gap-1 transition-colors shrink-0"
                        >
                          Visualizar
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Box 3: Disparo via API Whaticket */}
              {fetchedFatura && (
                <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-indigo-600 animate-pulse" />
                        Disparar Cobrança para WhatsApp
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Envie os detalhes da fatura e o arquivo PDF do boleto diretamente via Whaticket
                      </p>
                    </div>
                  </div>

                  {sendSuccess && (
                    <div className="rounded-lg bg-green-50 p-3 border border-green-200 text-green-800 text-xs font-medium flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      {sendSuccess}
                    </div>
                  )}

                  {sendError && (
                    <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{sendError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Número do Celular */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Número de WhatsApp (com DDI + DDD)</label>
                      <input
                        type="text"
                        value={whatsAppNumber}
                        onChange={(e) => setWhatsAppNumber(e.target.value)}
                        placeholder="Ex: 5585999999999"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="block text-[10px] text-gray-400">Certifique-se de usar o prefixo do país (55 para Brasil).</span>
                    </div>

                    {/* Mensagem Modificada */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Mensagem Personalizada</label>
                      <textarea
                        rows={4}
                        value={whatsAppMessage}
                        onChange={(e) => setWhatsAppMessage(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Ações de Envio */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => handleSendWhatsApp(false)}
                        disabled={sendLoading}
                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-850 border border-gray-200 hover:border-gray-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5 text-gray-600" />
                        Enviar Apenas Texto
                      </button>

                      {fetchedFatura.LinkBoleto && (
                        <button
                          onClick={() => handleSendWhatsApp(true)}
                          disabled={sendLoading}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-100" />
                          Enviar PDF + Legenda
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
