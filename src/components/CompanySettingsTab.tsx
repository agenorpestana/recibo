import React, { useState, useEffect } from 'react';
import { CompanySettings, IntegrationSettings } from '../types';
import { 
  Settings, FileImage, ClipboardSignature, Check, Sparkles, Building2, 
  HelpCircle, Plus, Trash2, Building, Database, Share2, MessageSquare, 
  Search, FileText, Send, Key, Mail, RefreshCw, AlertCircle, ExternalLink, 
  Lock, Settings2, BookOpen, CheckCircle, Smartphone, CreditCard, Info, XCircle
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

  // Estados para geração de Boletos Bradesco
  const [bradescoBoletoResult, setBradescoBoletoResult] = useState<any | null>(null);
  const [bradescoGenerating, setBradescoGenerating] = useState(false);
  const [bradescoError, setBradescoError] = useState<string | null>(null);
  const [bradescoEnvSelection, setBradescoEnvSelection] = useState<'sandbox' | 'production'>('sandbox');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [cancellingBoletoId, setCancellingBoletoId] = useState<string | null>(null);
  const [statusCheckResults, setStatusCheckResults] = useState<Record<string, { quitado: boolean; status: string; dataMovimentacao?: string; message?: string }>>({});

  // Estados para edição manual dos dados do Sacado (Payer)
  const [sacadoNome, setSacadoNome] = useState('');
  const [sacadoCnpjCpf, setSacadoCnpjCpf] = useState('');
  const [sacadoCep, setSacadoCep] = useState('');
  const [sacadoEndereco, setSacadoEndereco] = useState('');
  const [sacadoCidade, setSacadoCidade] = useState('');
  const [sacadoUf, setSacadoUf] = useState('');

  // Estados adicionais para busca por período de faturas
  const [faturaSearchMode, setFaturaSearchMode] = useState<'id' | 'periodo'>('id');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [startId, setStartId] = useState('4900');
  const [tipoData, setTipoData] = useState('DataPadrao');
  const [textoPesquisa, setTextoPesquisa] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [faturasList, setFaturasList] = useState<any[] | null>(null);
  const [faturasListLoading, setFaturasListLoading] = useState(false);
  const [faturasListError, setFaturasListError] = useState<string | null>(null);

  // Estados para busca direta de Clientes e Empresas no Bom Controle
  const [bomSearchQuery, setBomSearchQuery] = useState('');
  const [bomSearchType, setBomSearchType] = useState<'cliente' | 'empresa' | 'financeiro'>('cliente');
  const [bomSearchLoading, setBomSearchLoading] = useState(false);
  const [bomSearchResults, setBomSearchResults] = useState<any[] | null>(null);
  const [bomSearchError, setBomSearchError] = useState<string | null>(null);
  const [bomSelectedDetail, setBomSelectedDetail] = useState<any | null>(null);
  const [financeiroDataInicio, setFinanceiroDataInicio] = useState('2020-01-01');
  const [financeiroDataTermino, setFinanceiroDataTermino] = useState('2030-12-31');
  const [financeiroTipoData, setFinanceiroTipoData] = useState('Criacao');

  // --- ESTADOS E REFS PARA SELEÇÃO E ENVIO EM MASSA ---
  const [selectedFaturas, setSelectedFaturas] = useState<Record<string, boolean>>({});
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkDelay, setBulkDelay] = useState(10);
  const [bulkLogs, setBulkLogs] = useState<{ id: string; name: string; status: 'pending' | 'loading' | 'sending' | 'success' | 'error'; error?: string }[]>([]);
  const [bulkSendAsMedia, setBulkSendAsMedia] = useState(true);
  const [bulkActionType, setBulkActionType] = useState<'whatsapp' | 'email' | 'gerar_boleto'>('whatsapp');
  const bulkCancelledRef = React.useRef(false);

  // Dynamic companies list
  const [empresasLoaded, setEmpresasLoaded] = useState<{ id: string; nome: string }[]>([
    { id: '1', nome: 'Grupo de Serviços 1' },
    { id: '2', nome: 'Grupo de Serviços 2' }
  ]);

  const handleBomSearch = async () => {
    if (!bomSearchQuery) {
      setBomSearchError('Por favor, digite um termo ou ID para pesquisa.');
      return;
    }
    try {
      setBomSearchLoading(true);
      setBomSearchError(null);
      setBomSearchResults(null);
      setBomSelectedDetail(null);

      // Se for número puro, podemos tentar buscar cliente diretamente por ID caso seja tipo cliente
      if (/^\d+$/.test(bomSearchQuery) && bomSearchType === 'cliente') {
        const res = await fetch(`/api/integration/bom-controle/cliente/${bomSearchQuery}`);
        if (res.ok) {
          const clientData = await res.json();
          setBomSearchResults([clientData]);
          return;
        }
      }

      let endpoint = '';
      if (bomSearchType === 'cliente') {
        endpoint = `/api/integration/bom-controle/clientes/pesquisar?pesquisa=${encodeURIComponent(bomSearchQuery)}`;
      } else if (bomSearchType === 'empresa') {
        endpoint = `/api/integration/bom-controle/empresas/pesquisar?pesquisa=${encodeURIComponent(bomSearchQuery)}`;
      } else if (bomSearchType === 'financeiro') {
        endpoint = `/api/integration/bom-controle/financeiro/pesquisar?pesquisa=${encodeURIComponent(bomSearchQuery)}&dataInicio=${financeiroDataInicio}&dataTermino=${financeiroDataTermino}&tipoData=${financeiroTipoData}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro na busca (${res.status})`);
      }
      
      const data = await res.json();
      if (bomSearchType === 'financeiro') {
        setBomSearchResults(Array.isArray(data.Itens) ? data.Itens : []);
      } else {
        setBomSearchResults(Array.isArray(data) ? data : (data ? [data] : []));
      }
    } catch (err: any) {
      setBomSearchError(err.message || 'Erro ao realizar a busca.');
    } finally {
      setBomSearchLoading(false);
    }
  };

  const handleFetchClientDetail = async (id: number | string) => {
    try {
      setBomSearchLoading(true);
      setBomSearchError(null);
      
      const res = await fetch(`/api/integration/bom-controle/cliente/${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ao carregar detalhes (${res.status})`);
      }
      const data = await res.json();
      setBomSelectedDetail(data);
    } catch (err: any) {
      setBomSearchError(err.message || 'Erro ao obter detalhes do cliente.');
    } finally {
      setBomSearchLoading(false);
    }
  };

  const handleSearchFaturasByPeriod = async () => {
    if (!startDate || !endDate) {
      setFaturasListError('Por favor, informe as datas de início e fim.');
      return;
    }
    try {
      setFaturasListLoading(true);
      setFaturasListError(null);
      setFaturasList(null);
      
      const endpoint = `/api/integration/bom-controle/faturas?dataInicio=${startDate}&dataFim=${endDate}&tipoData=${tipoData}&textoPesquisa=${encodeURIComponent(textoPesquisa)}${empresaId ? `&idsEmpresa=${empresaId}` : ''}`;
      const res = await fetch(endpoint);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ao buscar faturas (${res.status})`);
      }
      
      const data = await res.json();
      setFaturasList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFaturasListError(err.message || 'Erro ao carregar lista de faturas.');
    } finally {
      setFaturasListLoading(false);
    }
  };

  const handleSelectFaturaById = async (id: string | number) => {
    try {
      setFaturaLoading(true);
      setFaturaError(null);
      setFetchedFatura(null);
      setBradescoBoletoResult(null);
      setBradescoError(null);
      
      const res = await fetch(`/api/integration/bom-controle/fatura/${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Fatura não encontrada ou erro ${res.status}`);
      }
      let data = await res.json();
      
      // Normalização robusta de propriedades da Fatura
      if (!data.Vencimento && data.DataVencimento) {
        data.Vencimento = data.DataVencimento;
      }
      if (!data.Cliente) {
        data.Cliente = {};
      }
      if (!data.Cliente.Nome) {
        data.Cliente.Nome = data.NomeCliente || data.NomeClienteFornecedor || data.Nome;
      }
      if (!data.Cliente.CnpjCpf) {
        data.Cliente.CnpjCpf = data.DocumentoClienteFornecedor || 'N/A';
      }

      // Busca item local correspondente na busca por período
      const localItem = faturasList?.find((item: any) => String(item.Id) === String(id));
      if (localItem) {
        if (!data.Cliente.Nome && (localItem.NomeCliente || localItem.Cliente?.Nome)) {
          data.Cliente.Nome = localItem.NomeCliente || localItem.Cliente?.Nome;
        }
        if (!data.Cliente.CnpjCpf && localItem.Cliente?.CnpjCpf) {
          data.Cliente.CnpjCpf = localItem.Cliente?.CnpjCpf;
        }
        if (!data.Vencimento && localItem.Vencimento) {
          data.Vencimento = localItem.Vencimento;
        }
        if (!data.Valor && localItem.Valor) {
          data.Valor = localItem.Valor;
        }
        if (!data.FormaPagamento && localItem.FormaPagamento) {
          data.FormaPagamento = localItem.FormaPagamento;
        }
        if (!data.LinkBoleto && localItem.LinkBoleto) {
          data.LinkBoleto = localItem.LinkBoleto;
        }
      }

      if (!data.Cliente.Nome) {
        data.Cliente.Nome = 'Cliente Não Informado';
      }

      // Descobre e busca dados completos do cliente do Bom Controle
      let clientId = data.Cliente?.Id || data.IdCliente || data.ClienteId || data.IdSacado;
      if (!clientId && localItem) {
        clientId = localItem.Cliente?.Id || localItem.IdCliente;
      }

      if (clientId) {
        try {
          const clientRes = await fetch(`/api/integration/bom-controle/cliente/${clientId}`);
          if (clientRes.ok) {
            const clientData = await clientRes.json();
            
            let clientName = '';
            let clientDoc = '';
            let clientCel = '';
            let clientCep = '';
            let clientCidade = '';
            let clientUf = '';
            let clientEmail = '';

            if (clientData.TipoPessoa === 'Juridica' && clientData.PessoaJuridica) {
              clientName = clientData.PessoaJuridica.NomeFantasia || clientData.PessoaJuridica.RazaoSocial || '';
              clientDoc = clientData.PessoaJuridica.Documento || '';
            } else if (clientData.TipoPessoa === 'Fisica' && clientData.PessoaFisica) {
              clientName = clientData.PessoaFisica.Nome || '';
              clientDoc = clientData.PessoaFisica.Documento || '';
            }

            if (!clientName) {
              clientName = clientData.Nome || clientData.NomeRazaoSocial || clientData.RazaoSocial || clientData.NomeFantasia || '';
            }
            if (!clientDoc) {
              clientDoc = clientData.CnpjCpf || clientData.CpfCnpj || clientData.Cnpj || clientData.Cpf || '';
            }

            if (clientData.Endereco && typeof clientData.Endereco === 'object') {
              clientCep = clientData.Endereco.Cep || clientData.Endereco.cep || '';
              clientCidade = clientData.Endereco.Cidade || clientData.Endereco.cidade || '';
              clientUf = clientData.Endereco.Uf || clientData.Endereco.uf || '';
            }

            if (!clientCep) {
              clientCep = clientData.Cep || clientData.cep || '';
            }
            if (!clientCidade) {
              clientCidade = clientData.Cidade || clientData.cidade || '';
            }
            if (!clientUf) {
              clientUf = clientData.Estado || clientData.Uf || clientData.uf || '';
            }

            if (Array.isArray(clientData.Contatos) && clientData.Contatos.length > 0) {
              const primary = clientData.Contatos.find((c: any) => c.Padrao) ||
                              clientData.Contatos.find((c: any) => c.Cobranca) ||
                              clientData.Contatos[0];
              if (primary) {
                clientCel = primary.Telefone || '';
                clientEmail = primary.Email || '';
              }
            }

            if (!clientCel) {
              clientCel = clientData.Celular || clientData.Telefone || clientData.CelularWhatsApp || '';
            }
            if (!clientEmail) {
              clientEmail = clientData.Email || '';
            }

            data.Cliente = {
              ...data.Cliente,
              ...clientData,
              Id: clientId,
              Nome: clientName || data.Cliente?.Nome || localItem?.Cliente?.Nome || 'Cliente Não Informado',
              CnpjCpf: clientDoc || data.Cliente?.CnpjCpf || localItem?.Cliente?.CnpjCpf || 'N/A',
              Celular: clientCel || data.Cliente?.Celular || '',
              Cep: clientCep || data.Cliente?.Cep || '',
              Cidade: clientCidade || data.Cliente?.Cidade || '',
              Uf: clientUf || data.Cliente?.Uf || '',
              Email: clientEmail || data.Cliente?.Email || ''
            };
          }
        } catch (e) {
          console.error('Erro ao carregar dados detalhados do cliente:', e);
        }
      }

      setFetchedFatura(data);

      // Preencher campos de edição do sacado
      setSacadoNome(data.Cliente?.Nome || data.NomeCliente || data.NomeClienteFornecedor || '');
      const docVal = data.Cliente?.CnpjCpf || data.DocumentoClienteFornecedor || '';
      setSacadoCnpjCpf(docVal === 'N/A' ? '' : docVal);
      setSacadoCep(data.Cliente?.Cep || data.Cliente?.cep || '');
      setSacadoCidade(data.Cliente?.Cidade || data.Cliente?.cidade || 'Itamaraju');
      setSacadoUf(data.Cliente?.Estado || data.Cliente?.Uf || data.Cliente?.uf || 'BA');
      
      let formattedAddr = '';
      if (data.Cliente?.Endereco) {
        if (typeof data.Cliente.Endereco === 'object') {
          const e = data.Cliente.Endereco;
          const logradouro = e.Logradouro || e.Rua || e.Street || e.street || '';
          const numero = e.Numero || e.Number || e.number || '';
          const bairro = e.Bairro || e.Neighborhood || e.neighborhood || '';
          const cidade = e.Cidade || e.City || e.city || '';
          const uf = e.Estado || e.State || e.state || e.Uf || e.uf || '';
          const parts = [
            logradouro ? (numero ? `${logradouro}, ${numero}` : logradouro) : '',
            bairro,
            cidade ? (uf ? `${cidade}-${uf}` : cidade) : ''
          ].filter(Boolean);
          formattedAddr = parts.join(' - ');
        } else {
          formattedAddr = String(data.Cliente.Endereco);
        }
      }
      if (!formattedAddr) {
        formattedAddr = data.Cliente?.address || '';
      }
      setSacadoEndereco(formattedAddr);

      const valor = data.Valor !== undefined ? `R$ ${Number(data.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
      
      const rawVencimento = data.Vencimento || data.DataVencimento;
      let vencimento = 'N/A';
      if (rawVencimento) {
        try {
          let normalized = String(rawVencimento).trim();
          if (normalized.includes(' ') && !normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T');
          }
          const date = new Date(normalized);
          if (!isNaN(date.getTime())) {
            vencimento = date.toLocaleDateString('pt-BR');
          } else {
            const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              vencimento = `${match[3]}/${match[2]}/${match[1]}`;
            }
          }
        } catch (e) {
          console.error('Erro ao formatar vencimento:', e);
        }
      }

      const link = data.LinkBoleto || '';

      let msg = integrationSettings.whaticket_default_message || 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
      msg = msg.replace('{valor}', valor)
               .replace('{vencimento}', vencimento)
               .replace('{link_boleto}', link);

      setWhatsAppMessage(msg);

      // Preenche o telefone preferencial para envio
      let rootPhone = data.Cliente?.Celular || data.Cliente?.Telefone || data.Cliente?.CelularWhatsApp;
      if (!rootPhone && Array.isArray(data.Cliente?.Contatos)) {
        const contact = data.Cliente.Contatos.find((c: any) => c.Telefone || c.Celular);
        if (contact) {
          rootPhone = contact.Telefone || contact.Celular;
        }
      }

      if (rootPhone) {
        let phone = rootPhone;
        phone = phone.replace(/\D/g, '');
        if (phone.length > 0 && !phone.startsWith('55')) {
          phone = '55' + phone;
        }
        setWhatsAppNumber(phone);
      } else {
        setWhatsAppNumber('55');
      }
    } catch (err: any) {
      setFaturaError(err.message || 'Erro ao carregar detalhes da fatura selecionada.');
    } finally {
      setFaturaLoading(false);
    }
  };

  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadEmpresas = async () => {
    try {
      const res = await fetch('/api/integration/bom-controle/empresas/pesquisar?pesquisa=');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((emp: any) => ({
            id: String(emp.Id || emp.id),
            nome: emp.Nome || emp.RazaoSocial || emp.NomeFantasia || `Empresa ${emp.Id || emp.id}`
          }));
          setEmpresasLoaded(mapped);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar nomes das empresas:', err);
    }
  };

  const fetchIntegrationSettings = async () => {
    try {
      setIntegrationLoading(true);
      setIntegrationError(null);
      const res = await fetch('/api/integration/settings');
      if (!res.ok) throw new Error('Falha ao carregar configurações de integração.');
      const data = await res.json();
      setIntegrationSettings(data);
      if (data.bradesco_env) {
        setBradescoEnvSelection(data.bradesco_env);
      }
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
      loadEmpresas();
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
      setBradescoBoletoResult(null);
      setBradescoError(null);
      const res = await fetch(`/api/integration/bom-controle/fatura/${testFaturaId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Fatura não encontrada ou erro ${res.status}`);
      }
      const data = await res.json();
      setFetchedFatura(data);

      const valor = data.Valor !== undefined ? `R$ ${Number(data.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
      
      const rawVencimento = data.Vencimento || data.DataVencimento;
      let vencimento = 'N/A';
      if (rawVencimento) {
        try {
          const date = new Date(rawVencimento);
          vencimento = date.toLocaleDateString('pt-BR');
        } catch (e) {}
      }

      const link = data.LinkBoleto || '';

      let msg = integrationSettings.whaticket_default_message || 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
      msg = msg.replace('{valor}', valor)
               .replace('{vencimento}', vencimento)
               .replace('{link_boleto}', link);

      setWhatsAppMessage(msg);

      const rootPhone = data.Cliente?.Celular || data.Cliente?.Telefone || data.Cliente?.CelularWhatsApp;
      if (rootPhone) {
        let phone = rootPhone;
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

  const handleGerarBoletoBradesco = async () => {
    if (!fetchedFatura) return;
    try {
      setBradescoGenerating(true);
      setBradescoError(null);
      setBradescoBoletoResult(null);

      const customFatura = {
        ...fetchedFatura,
        Cliente: {
          ...fetchedFatura.Cliente,
          Nome: sacadoNome,
          CnpjCpf: sacadoCnpjCpf,
          Cep: sacadoCep,
          Endereco: sacadoEndereco,
          Cidade: sacadoCidade,
          Estado: sacadoUf,
          Uf: sacadoUf
        }
      };

      const res = await fetch('/api/integration/bradesco/gerar-boleto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fatura: customFatura,
          envSelection: bradescoEnvSelection
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status} ao gerar boleto.`);
      }

      const data = await res.json();
      if (data.success) {
        setBradescoBoletoResult(data.boleto);
        const boleto = data.boleto;
        const bradescoLink = `${window.location.origin}/api/integration/bradesco/visualizar-boleto?` + 
          `valor=${boleto.valor}` +
          `&vencimento=${boleto.vencimento}` +
          `&emissao=${boleto.emissao}` +
          `&nome=${encodeURIComponent(boleto.pagador.nome)}` +
          `&documento=${encodeURIComponent(boleto.pagador.documento)}` +
          `&endereco=${encodeURIComponent(boleto.pagador.endereco)}` +
          `&cep=${encodeURIComponent(boleto.pagador.cep)}` +
          `&nosso_numero=${boleto.nossoNumero}` +
          `&agencia=${boleto.agencia}` +
          `&conta=${encodeURIComponent(boleto.conta)}` +
          `&carteira=${boleto.carteira}` +
          `&beneficiario=${encodeURIComponent(boleto.beneficiario)}` +
          `&cnpj_beneficiario=${encodeURIComponent(boleto.cnpjBeneficiario)}` +
          `&qr_code=${encodeURIComponent(boleto.qrCode || '')}` +
          `&linha_digitavel=${encodeURIComponent(boleto.linhaDigitavel || '')}` +
          `&barcode=${encodeURIComponent(boleto.barcodeValue || '')}` +
          `&instrucoes=${encodeURIComponent(integrationSettings.bradesco_instrucoes || '')}`;

        let msg = integrationSettings.whaticket_default_message || 'Olá! Segue o seu boleto do Bradesco no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
        const valorStr = `R$ ${Number(boleto.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        const vencParts = boleto.vencimento.split('-');
        const vencStr = vencParts.length === 3 ? `${vencParts[2]}/${vencParts[1]}/${vencParts[0]}` : boleto.vencimento;

        msg = msg.replace('{valor}', valorStr)
                 .replace('{vencimento}', vencStr)
                 .replace('{link_boleto}', bradescoLink);

        setWhatsAppMessage(msg);
      } else {
        throw new Error(data.error || 'Erro desconhecido ao registrar boleto.');
      }
    } catch (err: any) {
      setBradescoError(err.message || 'Erro ao gerar boleto Bradesco.');
    } finally {
      setBradescoGenerating(false);
    }
  };

  const handleConsultarStatusBradesco = async (fatura: any) => {
    if (!fatura) return;
    const faturaId = String(fatura.Id || fatura.id);
    try {
      setCheckingStatusId(faturaId);
      const res = await fetch('/api/integration/bradesco/consultar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fatura,
          envSelection: bradescoEnvSelection
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status} ao consultar status.`);
      }

      const data = await res.json();
      if (data.success) {
        // Armazena o resultado no estado correspondente à fatura
        setStatusCheckResults(prev => ({
          ...prev,
          [faturaId]: {
            quitado: data.quitado,
            status: data.status,
            dataMovimentacao: data.dataMovimentacao,
            message: data.message || 'Consulta realizada com sucesso.'
          }
        }));

        // Se a fatura consultada for a fatura selecionada ativamente, atualiza as flags de quitado se mudou
        if (fetchedFatura && String(fetchedFatura.Id) === faturaId) {
          setFetchedFatura((prev: any) => {
            if (!prev) return null;
            const updated = { ...prev, Quitada: data.quitado };
            if (data.linkBoleto) {
              updated.LinkBoleto = data.linkBoleto;
              updated.IsBradescoBoleto = true;
            }
            return updated;
          });
        }

        // Atualiza na lista de faturasList se aplicável para refletir visualmente o status atualizado
        setFaturasList((prevList) => {
          if (!prevList) return null;
          return prevList.map((f: any) => {
            if (String(f.Id) === faturaId) {
              const updated = { ...f, Quitada: data.quitado };
              if (data.linkBoleto) {
                updated.LinkBoleto = data.linkBoleto;
                updated.IsBradescoBoleto = true;
              }
              return updated;
            }
            return f;
          });
        });
      } else {
        throw new Error(data.error || 'Erro ao processar consulta de status.');
      }
    } catch (err: any) {
      alert(`Falha na consulta Bradesco: ${err.message}`);
    } finally {
      setCheckingStatusId(null);
    }
  };

  const handleBaixarBoletoBradesco = async (fatura: any) => {
    if (!fatura) return;
    const faturaId = String(fatura.Id || fatura.id);
    const nossoNumero = fatura.NossoNumeroBradesco || `09${String(faturaId).padStart(9, '0')}`;
    
    if (!window.confirm(`Deseja realmente baixar/cancelar este boleto no Bradesco? Esta ação registrará o boleto como baixado/cancelado.`)) {
      return;
    }

    try {
      setCancellingBoletoId(faturaId);
      const res = await fetch('/api/integration/bradesco/baixar-boleto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faturaId,
          nossoNumero
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status} ao baixar boleto.`);
      }

      const data = await res.json();
      if (data.success) {
        alert('Boleto baixado/cancelado com sucesso!');
        
        // Atualiza status local
        setStatusCheckResults(prev => ({
          ...prev,
          [faturaId]: {
            quitado: true,
            status: 'BAIXADO',
            message: 'Boleto baixado/cancelado com sucesso.'
          }
        }));

        // Se a fatura ativa for essa, atualiza
        if (fetchedFatura && String(fetchedFatura.Id) === faturaId) {
          setFetchedFatura((prev: any) => {
            if (!prev) return null;
            return { ...prev, Quitada: true, ApiQuitado: true, ApiStatus: 'BAIXADO' };
          });
        }

        // Atualiza na lista geral de faturas
        setFaturasList((prevList) => {
          if (!prevList) return null;
          return prevList.map((f: any) => {
            if (String(f.Id) === faturaId) {
              return { ...f, Quitada: true, ApiQuitado: true, ApiStatus: 'BAIXADO' };
            }
            return f;
          });
        });

      } else {
        throw new Error(data.error || 'Erro ao processar baixa do boleto.');
      }
    } catch (err: any) {
      alert(`Falha ao baixar boleto Bradesco: ${err.message}`);
    } finally {
      setCancellingBoletoId(null);
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
      loadEmpresas();
    }
  }, [activeSubTab]);

  const handleToggleSelectFatura = (id: string | number) => {
    setSelectedFaturas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleSelectAllFaturas = () => {
    if (!faturasList) return;
    const allSelected = faturasList.every(f => selectedFaturas[f.Id]);
    const updated: Record<string, boolean> = {};
    if (!allSelected) {
      faturasList.forEach(f => {
        updated[f.Id] = true;
      });
    }
    setSelectedFaturas(updated);
  };

  const handleStartBulkSend = async (sendAsMedia: boolean) => {
    if (!faturasList) return;
    const itemsToSend = faturasList.filter(f => selectedFaturas[f.Id]);
    if (itemsToSend.length === 0) {
      alert('Por favor, selecione pelo menos uma fatura para envio em massa.');
      return;
    }

    setBulkSending(true);
    bulkCancelledRef.current = false;
    setBulkProgress(0);
    setBulkTotal(itemsToSend.length);
    setBulkSendAsMedia(sendAsMedia);

    // Inicializa logs de envio
    const initialLogs = itemsToSend.map(f => ({
      id: String(f.Id),
      name: f.Cliente?.Nome || f.NomeCliente || 'Cliente Não Informado',
      status: 'pending' as const
    }));
    setBulkLogs(initialLogs);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < itemsToSend.length; i++) {
      // Verifica cancelamento
      if (bulkCancelledRef.current) {
        setBulkLogs(prev => prev.map(log => 
          log.status === 'pending' || log.status === 'loading' || log.status === 'sending'
            ? { ...log, status: 'error' as const, error: 'Cancelado pelo usuário.' }
            : log
        ));
        break;
      }

      const item = itemsToSend[i];
      const itemId = String(item.Id);

      // Marca como 'loading' no log
      setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'loading' as const } : log));

      try {
        // Busca os detalhes da fatura
        const res = await fetch(`/api/integration/bom-controle/fatura/${item.Id}`);
        if (!res.ok) {
          throw new Error(`Erro ao buscar fatura detalhada (${res.status})`);
        }
        let data = await res.json();

        // Fallbacks da lista
        if (!data.Cliente) data.Cliente = {};
        if (!data.Cliente.Nome) data.Cliente.Nome = item.NomeCliente || item.Cliente?.Nome || 'Cliente Não Informado';
        if (!data.Cliente.CnpjCpf) data.Cliente.CnpjCpf = item.Cliente?.CnpjCpf || 'N/A';
        if (!data.Vencimento) data.Vencimento = item.Vencimento;
        if (!data.Valor) data.Valor = item.Valor;
        if (!data.FormaPagamento) data.FormaPagamento = item.FormaPagamento;
        if (!data.LinkBoleto) data.LinkBoleto = item.LinkBoleto;

        let clientId = data.Cliente?.Id || data.IdCliente || data.ClienteId || data.IdSacado;
        if (!clientId) {
          clientId = item.Cliente?.Id || item.IdCliente;
        }

        if (clientId) {
          try {
            const clientRes = await fetch(`/api/integration/bom-controle/cliente/${clientId}`);
            if (clientRes.ok) {
              const clientData = await clientRes.json();
              
              let clientName = '';
              let clientDoc = '';
              let clientCel = '';
              let clientCep = '';
              let clientCidade = '';
              let clientUf = '';
              let clientEmail = '';

              if (clientData.TipoPessoa === 'Juridica' && clientData.PessoaJuridica) {
                clientName = clientData.PessoaJuridica.NomeFantasia || clientData.PessoaJuridica.RazaoSocial || '';
                clientDoc = clientData.PessoaJuridica.Documento || '';
              } else if (clientData.TipoPessoa === 'Fisica' && clientData.PessoaFisica) {
                clientName = clientData.PessoaFisica.Nome || '';
                clientDoc = clientData.PessoaFisica.Documento || '';
              }

              if (!clientName) {
                clientName = clientData.Nome || clientData.NomeRazaoSocial || clientData.RazaoSocial || clientData.NomeFantasia || '';
              }
              if (!clientDoc) {
                clientDoc = clientData.CnpjCpf || clientData.CpfCnpj || clientData.Cnpj || clientData.Cpf || '';
              }

              if (clientData.Endereco && typeof clientData.Endereco === 'object') {
                clientCep = clientData.Endereco.Cep || clientData.Endereco.cep || '';
                clientCidade = clientData.Endereco.Cidade || clientData.Endereco.cidade || '';
                clientUf = clientData.Endereco.Uf || clientData.Endereco.uf || '';
              }

              if (!clientCep) {
                clientCep = clientData.Cep || clientData.cep || '';
              }
              if (!clientCidade) {
                clientCidade = clientData.Cidade || clientData.cidade || '';
              }
              if (!clientUf) {
                clientUf = clientData.Estado || clientData.Uf || clientData.uf || '';
              }

              if (Array.isArray(clientData.Contatos) && clientData.Contatos.length > 0) {
                const primary = clientData.Contatos.find((c: any) => c.Padrao) ||
                                clientData.Contatos.find((c: any) => c.Cobranca) ||
                                clientData.Contatos[0];
                if (primary) {
                  clientCel = primary.Telefone || '';
                  clientEmail = primary.Email || '';
                }
              }

              if (!clientCel) {
                clientCel = clientData.Celular || clientData.Telefone || clientData.CelularWhatsApp || '';
              }
              if (!clientEmail) {
                clientEmail = clientData.Email || '';
              }

              data.Cliente = {
                ...data.Cliente,
                ...clientData,
                Id: clientId,
                Nome: clientName || data.Cliente?.Nome || 'Cliente Não Informado',
                CnpjCpf: clientDoc || data.Cliente?.CnpjCpf || 'N/A',
                Celular: clientCel || data.Cliente?.Celular || '',
                Cep: clientCep || data.Cliente?.Cep || '',
                Cidade: clientCidade || data.Cliente?.Cidade || '',
                Uf: clientUf || data.Cliente?.Uf || '',
                Email: clientEmail || data.Cliente?.Email || ''
              };
            }
          } catch (e) {
            console.error('Erro bulk client fetch:', e);
          }
        }

        // Formata os placeholders comuns
        const valorStr = data.Valor !== undefined ? `R$ ${Number(data.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
        const rawVencimento = data.Vencimento || data.DataVencimento;
        let vencStr = 'N/A';
        if (rawVencimento) {
          try {
            const date = new Date(rawVencimento);
            vencStr = date.toLocaleDateString('pt-BR');
          } catch (e) {}
        }

        // Descobre ou constrói o link do boleto
        let linkBoleto = data.LinkBoleto || '';
        if (!linkBoleto) {
          const queryParams = new URLSearchParams({
            valor: String(data.Valor || 0),
            vencimento: String(data.Vencimento || '').split('T')[0],
            emissao: String(data.DataEmissao || data.Emissao || '').split('T')[0],
            nome: data.Cliente?.Nome || '',
            documento: data.Cliente?.CnpjCpf || '',
            endereco: data.Cliente?.Endereco ? (typeof data.Cliente.Endereco === 'object' ? JSON.stringify(data.Cliente.Endereco) : String(data.Cliente.Endereco)) : '',
            cep: data.Cliente?.Cep || '',
            nosso_numero: `09${String(data.Id).padStart(9, '0')}`,
            agencia: integrationSettings.bradesco_agency || '0123',
            conta: `${integrationSettings.bradesco_account || '0123456'}-${integrationSettings.bradesco_account_digit || '7'}`,
            carteira: integrationSettings.bradesco_wallet || '09',
            beneficiario: integrationSettings.bradesco_beneficiario_nome || 'UNITY AUTOMACOES LTDA.',
            cnpj_beneficiario: integrationSettings.bradesco_cnpj || '44.285.891/0001-45',
            instrucoes: integrationSettings.bradesco_instrucoes || ''
          });
          linkBoleto = `${window.location.origin}/api/integration/bradesco/visualizar-boleto?${queryParams.toString()}`;
        }

        if (bulkActionType === 'whatsapp') {
          // Descobre o telefone para envio
          let targetPhone = data.Cliente?.Celular || data.Cliente?.Telefone || data.Cliente?.CelularWhatsApp;
          if (!targetPhone && Array.isArray(data.Cliente?.Contatos)) {
            const mainContact = data.Cliente.Contatos.find((c: any) => c.Padrao || c.Cobranca) || data.Cliente.Contatos[0];
            if (mainContact) {
              targetPhone = mainContact.Telefone || mainContact.Celular;
            }
          }

          if (!targetPhone) {
            throw new Error('Telefone de contato não cadastrado.');
          }

          let cleanPhone = targetPhone.replace(/\D/g, '');
          if (cleanPhone.length > 0 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone;
          }

          let msg = integrationSettings.whaticket_default_message || 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
          msg = msg.replace('{valor}', valorStr)
                   .replace('{vencimento}', vencStr)
                   .replace('{link_boleto}', linkBoleto);

          setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'sending' as const } : log));

          const payload = {
            number: cleanPhone,
            body: msg,
            pdfUrl: sendAsMedia ? linkBoleto : undefined
          };

          const sendRes = await fetch('/api/integration/whaticket/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!sendRes.ok) {
            const errData = await sendRes.json().catch(() => ({}));
            throw new Error(errData.error || `Erro HTTP ${sendRes.status} no Whaticket`);
          }

        } else if (bulkActionType === 'email') {
          // Descobre o e-mail para envio
          let targetEmail = data.Cliente?.Email;
          if (!targetEmail && Array.isArray(data.Cliente?.Contatos)) {
            const mainContact = data.Cliente.Contatos.find((c: any) => c.Padrao || c.Cobranca) || data.Cliente.Contatos[0];
            if (mainContact) {
              targetEmail = mainContact.Email;
            }
          }

          if (!targetEmail) {
            throw new Error('E-mail do cliente não cadastrado.');
          }

          let subject = integrationSettings.email_default_subject || 'Seu Boleto Unity Automações - Vencimento {vencimento}';
          subject = subject.replace('{valor}', valorStr)
                           .replace('{vencimento}', vencStr)
                           .replace('{link_boleto}', linkBoleto);

          let body = integrationSettings.email_default_body || 'Prezado(a) Cliente,\n\nSegue em anexo o seu boleto de cobrança no valor de {valor}, com vencimento em {vencimento}.\n\nVocê também pode visualizar seu boleto pelo link: {link_boleto}\n\nAtenciosamente,\nUnity Automações';
          body = body.replace('{valor}', valorStr)
                     .replace('{vencimento}', vencStr)
                     .replace('{link_boleto}', linkBoleto);

          setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'sending' as const } : log));

          const emailPayload = {
            to: targetEmail,
            subject,
            body,
            pdfUrl: data.LinkBoleto || undefined, // Envia o PDF real se houver LinkBoleto direto do Bom Controle
            filename: `boleto_fatura_${itemId}.pdf`
          };

          const sendRes = await fetch('/api/integration/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });

          if (!sendRes.ok) {
            const errData = await sendRes.json().catch(() => ({}));
            throw new Error(errData.error || `Erro SMTP HTTP ${sendRes.status}`);
          }

        } else if (bulkActionType === 'gerar_boleto') {
          setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'sending' as const } : log));

          const registerPayload = {
            fatura: data,
            envSelection: bradescoEnvSelection
          };

          const regRes = await fetch('/api/integration/bradesco/gerar-boleto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerPayload)
          });

          if (!regRes.ok) {
            const errData = await regRes.json().catch(() => ({}));
            throw new Error(errData.error || `Erro Bradesco HTTP ${regRes.status}`);
          }

          const regData = await regRes.json();
          if (regData.success) {
            // Constrói link do boleto gerado para visualização
            const queryParams = new URLSearchParams({
              valor: String(data.Valor || 0),
              vencimento: String(data.Vencimento || '').split('T')[0],
              emissao: String(data.DataEmissao || data.Emissao || '').split('T')[0],
              nome: data.Cliente?.Nome || '',
              documento: data.Cliente?.CnpjCpf || '',
              endereco: data.Cliente?.Endereco ? (typeof data.Cliente.Endereco === 'object' ? JSON.stringify(data.Cliente.Endereco) : String(data.Cliente.Endereco)) : '',
              cep: data.Cliente?.Cep || '',
              nosso_numero: regData.boleto?.nossoNumero || `09${String(data.Id).padStart(9, '0')}`,
              agencia: integrationSettings.bradesco_agency || '0123',
              conta: `${integrationSettings.bradesco_account || '0123456'}-${integrationSettings.bradesco_account_digit || '7'}`,
              carteira: integrationSettings.bradesco_wallet || '09',
              beneficiario: integrationSettings.bradesco_beneficiario_nome || 'UNITY AUTOMACOES LTDA.',
              cnpj_beneficiario: integrationSettings.bradesco_cnpj || '44.285.891/0001-45',
              instrucoes: integrationSettings.bradesco_instrucoes || ''
            });
            const generatedLink = `${window.location.origin}/api/integration/bradesco/visualizar-boleto?${queryParams.toString()}`;
            
            // Atualiza faturasList local
            setFaturasList(prev => {
              if (!prev) return null;
              return prev.map(f => f.Id === item.Id ? { ...f, LinkBoleto: generatedLink } : f);
            });
          } else {
            throw new Error(regData.error || 'Erro desconhecido ao registrar boleto Bradesco.');
          }
        }

        // Sucesso
        setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'success' as const } : log));
      } catch (err: any) {
        setBulkLogs(prev => prev.map(log => log.id === itemId ? { ...log, status: 'error' as const, error: err.message || 'Falha desconhecida' } : log));
      }

      // Atualiza progresso
      setBulkProgress(i + 1);

      // Espera o delay/intervalo antes da próxima mensagem se não for o último
      if (i < itemsToSend.length - 1) {
        const totalDelayMs = bulkDelay * 1000;
        const checkIntervalMs = 250;
        let elapsed = 0;
        while (elapsed < totalDelayMs) {
          if (bulkCancelledRef.current) {
            break;
          }
          await sleep(checkIntervalMs);
          elapsed += checkIntervalMs;
        }
      }
    }

    setBulkSending(false);
  };

  const handleCancelBulkSend = () => {
    bulkCancelledRef.current = true;
  };

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

              {/* Seção: Configuração API Boletos Bradesco (mTLS) */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-red-500 animate-pulse" />
                  API Boletos Bradesco mTLS
                </h4>

                {/* Escolha Ambiente */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Ambiente Bradesco</label>
                    <select
                      value={integrationSettings.bradesco_env || 'sandbox'}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_env: e.target.value as any })}
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    >
                      <option value="sandbox">Sandbox (Testes)</option>
                      <option value="production">Produção (Real)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Carteira Cobrança</label>
                    <input
                      type="text"
                      value={integrationSettings.bradesco_wallet || '09'}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_wallet: e.target.value })}
                      placeholder="09"
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>
                </div>

                {/* Client ID & Secret */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Client ID</label>
                    <input
                      type="password"
                      value={integrationSettings.bradesco_client_id || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_client_id: e.target.value })}
                      placeholder="Client ID da API Bradesco"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Client Secret</label>
                    <input
                      type="password"
                      value={integrationSettings.bradesco_client_secret || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_client_secret: e.target.value })}
                      placeholder="Client Secret da API Bradesco"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Agencia, Conta, Dígito, CNPJ */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Agência</label>
                    <input
                      type="text"
                      value={integrationSettings.bradesco_agency || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_agency: e.target.value })}
                      placeholder="Ex: 1234"
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Conta</label>
                    <input
                      type="text"
                      value={integrationSettings.bradesco_account || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_account: e.target.value })}
                      placeholder="Ex: 56789"
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Dígito</label>
                    <input
                      type="text"
                      value={integrationSettings.bradesco_account_digit || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_account_digit: e.target.value })}
                      placeholder="0"
                      className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome do Beneficiário (Razão Social)</label>
                  <input
                    type="text"
                    value={integrationSettings.bradesco_beneficiario_nome || ''}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_beneficiario_nome: e.target.value })}
                    placeholder="Nome da empresa do Beneficiário"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">CNPJ do Beneficiário</label>
                  <input
                    type="text"
                    value={integrationSettings.bradesco_cnpj || ''}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_cnpj: e.target.value })}
                    placeholder="CNPJ Bradesco Beneficiário"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Regras de Multa, Juros e Desconto de acordo com o manual Bradesco */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-indigo-500" />
                    Regras de Multa, Juros e Desconto
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-3.5 rounded-lg border border-gray-200/80">
                    {/* Linha 1: Multa e Juros */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Multa</label>
                      <div className="flex gap-2">
                        <select
                          value={integrationSettings.bradesco_multa_tipo || 'isento'}
                          onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_multa_tipo: e.target.value as any })}
                          className="block w-1/2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="isento">Isento</option>
                          <option value="percentual">Percentual</option>
                          <option value="valor">Valor</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[10px] font-bold text-gray-400 font-mono select-none">
                            {integrationSettings.bradesco_multa_tipo === 'valor' ? 'R$' : '%'}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={integrationSettings.bradesco_multa_tipo === 'isento'}
                            value={integrationSettings.bradesco_multa_valor !== undefined ? integrationSettings.bradesco_multa_valor : 0}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_multa_valor: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="block w-full rounded-lg border border-gray-300 pl-8 pr-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Percentual juros</label>
                      <div className="flex gap-2">
                        <select
                          value={integrationSettings.bradesco_juros_tipo || 'isento'}
                          onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_juros_tipo: e.target.value as any })}
                          className="block w-1/2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="isento">Isento</option>
                          <option value="diario">Diário</option>
                          <option value="mensal">Mensal</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[10px] font-bold text-gray-400 font-mono select-none">
                            %
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={integrationSettings.bradesco_juros_tipo === 'isento'}
                            value={integrationSettings.bradesco_juros_valor !== undefined ? integrationSettings.bradesco_juros_valor : 0}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_juros_valor: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="block w-full rounded-lg border border-gray-300 pl-8 pr-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Desconto e Dias de Antecedência */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Desconto até o vencimento</label>
                      <div className="flex gap-2">
                        <select
                          value={integrationSettings.bradesco_desconto_tipo || 'isento'}
                          onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_desconto_tipo: e.target.value as any })}
                          className="block w-1/2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="isento">Isento</option>
                          <option value="percentual">Percentual</option>
                          <option value="valor">Valor</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[10px] font-bold text-gray-400 font-mono select-none">
                            {integrationSettings.bradesco_desconto_tipo === 'valor' ? 'R$' : '%'}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={integrationSettings.bradesco_desconto_tipo === 'isento'}
                            value={integrationSettings.bradesco_desconto_valor !== undefined ? integrationSettings.bradesco_desconto_valor : 0}
                            onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_desconto_valor: parseFloat(e.target.value) || 0 })}
                            placeholder="0,00"
                            className="block w-full rounded-lg border border-gray-300 pl-8 pr-2 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        Dias antecedência para desconto
                        <Info className="h-3 w-3 text-gray-400" title="Quantidade de dias antes do vencimento para aplicar o desconto" />
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={integrationSettings.bradesco_desconto_tipo === 'isento'}
                        value={integrationSettings.bradesco_desconto_dias !== undefined ? integrationSettings.bradesco_desconto_dias : 0}
                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_desconto_dias: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>

                    {/* Instruções do Boleto */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        Instruções do Boleto
                        <Info className="h-3 w-3 text-gray-400" title="Instruções impressas no boleto. Escreva uma por linha." />
                      </label>
                      <textarea
                        rows={3}
                        value={integrationSettings.bradesco_instrucoes !== undefined ? integrationSettings.bradesco_instrucoes : ''}
                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_instrucoes: e.target.value })}
                        placeholder="• NÃO RECEBER APÓS O VENCIMENTO.&#10;• PROTESTO AUTOMÁTICO APÓS 10 DIAS DO VENCIMENTO."
                        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* mTLS Certificates content */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Certificado Público (.pem)</label>
                    <textarea
                      rows={2}
                      value={integrationSettings.bradesco_cert || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_cert: e.target.value })}
                      placeholder="-----BEGIN CERTIFICATE-----\n..."
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-[9px] font-mono text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Chave Privada (.key)</label>
                    <textarea
                      rows={2}
                      value={integrationSettings.bradesco_key || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_key: e.target.value })}
                      placeholder="-----BEGIN PRIVATE KEY-----\n..."
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-[9px] font-mono text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Senha da Chave Privada (Passphrase)</label>
                    <input
                      type="password"
                      value={integrationSettings.bradesco_passphrase || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, bradesco_passphrase: e.target.value })}
                      placeholder="Senha de decodificação da chave privada (se aplicável)"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Configuração de Envio Automático */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                  Agendamento / Envio Automático
                </h4>

                {/* Checkbox Ativar Envio */}
                <div className="flex items-center gap-2 bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50">
                  <input
                    type="checkbox"
                    id="auto_send_enabled"
                    checked={!!integrationSettings.auto_send_enabled}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, auto_send_enabled: e.target.checked })}
                    className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="auto_send_enabled" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                    Ativar Envio Automático Mensal
                  </label>
                </div>

                {integrationSettings.auto_send_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-150 animate-fadeIn">
                    {/* Dia do Mês */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">Dia do Mês para Disparo</label>
                      <select
                        value={integrationSettings.auto_send_day || 10}
                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, auto_send_day: Number(e.target.value) })}
                        className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none font-bold"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            Dia {day}
                          </option>
                        ))}
                      </select>
                      <span className="block text-[9px] text-gray-400">O sistema disparará automaticamente as faturas geradas neste dia.</span>
                    </div>

                    {/* Qual Empresa */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase">Buscar Boletos da Empresa</label>
                      <select
                        value={integrationSettings.auto_send_company_id || ''}
                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, auto_send_company_id: e.target.value })}
                        className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none font-bold"
                      >
                        <option value="all">Todas as Empresas</option>
                        {empresasLoaded.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.nome}
                          </option>
                        ))}
                      </select>
                      <span className="block text-[9px] text-gray-400">Filtra as faturas pertencentes à empresa escolhida.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção: Configuração de E-mail (SMTP) */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-indigo-500" />
                  Configuração de E-mail (Envio de Boletos via SMTP)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Servidor SMTP</label>
                    <input
                      type="text"
                      value={integrationSettings.email_smtp_host || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_smtp_host: e.target.value })}
                      placeholder="Ex: smtp.hostinger.com ou smtp.gmail.com"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Porta SMTP</label>
                    <input
                      type="text"
                      value={integrationSettings.email_smtp_port || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_smtp_port: e.target.value })}
                      placeholder="Ex: 465 ou 587"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Usuário / E-mail de Envio</label>
                    <input
                      type="text"
                      value={integrationSettings.email_smtp_user || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_smtp_user: e.target.value })}
                      placeholder="seu-email@dominio.com"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Senha SMTP</label>
                    <input
                      type="password"
                      value={integrationSettings.email_smtp_pass || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_smtp_pass: e.target.value })}
                      placeholder="Sua senha do SMTP"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome de Exibição do Remetente</label>
                    <input
                      type="text"
                      value={integrationSettings.email_from_name || ''}
                      onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_from_name: e.target.value })}
                      placeholder="Ex: Unity Automações"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Conexão Segura (SSL)</label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="email_smtp_secure"
                        checked={!!integrationSettings.email_smtp_secure}
                        onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_smtp_secure: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-650 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                      <label htmlFor="email_smtp_secure" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                        Usar SSL/TLS (Recomendado para porta 465)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Assunto Padrão do E-mail</label>
                  <input
                    type="text"
                    value={integrationSettings.email_default_subject || ''}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_default_subject: e.target.value })}
                    placeholder="Ex: Seu Boleto Unity Automações - Vencimento {vencimento}"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Mensagem Padrão do E-mail</label>
                  <textarea
                    rows={4}
                    value={integrationSettings.email_default_body || ''}
                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, email_default_body: e.target.value })}
                    placeholder="Escreva o texto padrão do corpo do e-mail..."
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-150 space-y-1">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Placeholders Suportados:</span>
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono text-indigo-650">
                      <div>{'{valor}'}</div>
                      <div>{'{vencimento}'}</div>
                      <div>{'{link_boleto}'}</div>
                    </div>
                    <span className="block text-[9px] text-gray-400 pt-1">Eles serão substituídos automaticamente pelos dados reais da fatura. O arquivo PDF do boleto será anexado se disponível.</span>
                  </div>
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

                {/* Abas de Modo de Busca */}
                <div className="flex border-b border-gray-100 pb-1.5 mb-3 gap-4">
                  <button
                    onClick={() => setFaturaSearchMode('id')}
                    className={`pb-1 text-xs font-bold transition-colors border-b-2 -mb-2 ${
                      faturaSearchMode === 'id'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Buscar por ID
                  </button>
                  <button
                    onClick={() => setFaturaSearchMode('periodo')}
                    className={`pb-1 text-xs font-bold transition-colors border-b-2 -mb-2 ${
                      faturaSearchMode === 'periodo'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Buscar por Período de Data
                  </button>
                </div>

                {faturaSearchMode === 'id' ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={testFaturaId}
                        onChange={(e) => setTestFaturaId(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchFatura(); }}
                        placeholder="Ex: 100"
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
                ) : (
                  <div className="space-y-3 bg-gray-50/50 p-3 rounded-lg border border-gray-150">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Início</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo de Data</label>
                        <select
                          value={tipoData}
                          onChange={(e) => setTipoData(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none font-bold"
                        >
                          <option value="DataPadrao">Vencimento (Padrão)</option>
                          <option value="Criacao">Criação / Cadastro</option>
                          <option value="DataPagamento">Quitação / Pagamento</option>
                          <option value="DataCompetencia">Competência</option>
                          <option value="DataConciliacao">Conciliação</option>
                          <option value="DataPrevista">Previsão</option>
                          <option value="UltimaAlteracao">Última Alteração</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Empresa</label>
                        <select
                          value={empresaId}
                          onChange={(e) => setEmpresaId(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none font-bold"
                        >
                          <option value="">Todas as Empresas</option>
                          {empresasLoaded.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Termo de Busca (Opcional)</label>
                      <input
                        type="text"
                        value={textoPesquisa}
                        onChange={(e) => setTextoPesquisa(e.target.value)}
                        placeholder="Pesquise por nome do cliente, descrição ou parcela..."
                        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleSearchFaturasByPeriod}
                      disabled={faturasListLoading}
                      className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:bg-orange-350 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${faturasListLoading ? 'animate-spin' : ''}`} />
                      {faturasListLoading ? 'Buscando faturas...' : 'Buscar Faturas por Período'}
                    </button>
                  </div>
                )}

                {faturaError && (
                  <div className="rounded-lg bg-orange-50 p-3 border border-orange-200 text-orange-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
                    <span>{faturaError}</span>
                  </div>
                )}

                {/* Lista de Faturas Encontradas por Período */}
                {faturaSearchMode === 'periodo' && faturasListError && (
                  <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{faturasListError}</span>
                  </div>
                )}

                {faturaSearchMode === 'periodo' && faturasList && (
                  <div className="border border-gray-150 rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-150 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {faturasList.length > 0 && (
                          <input
                            type="checkbox"
                            checked={faturasList.length > 0 && faturasList.every(f => selectedFaturas[f.Id])}
                            onChange={handleToggleSelectAllFaturas}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                            title="Selecionar todas para Envio em Massa"
                          />
                        )}
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Faturas Encontradas ({faturasList.length})
                        </span>
                      </div>
                      {faturasList.length > 0 && (
                        <span className="text-[9px] text-gray-400">Marque para Envio em Massa ou clique em "Selecionar"</span>
                      )}
                    </div>
                    
                    {faturasList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Nenhuma fatura encontrada para o período selecionado.
                      </div>
                    ) : (
                      <div className="max-h-[250px] overflow-y-auto divide-y divide-gray-100">
                        {faturasList.map((f: any) => {
                          const isSelected = fetchedFatura && fetchedFatura.Id === f.Id;
                          const isChecked = !!selectedFaturas[f.Id];
                          return (
                            <div 
                              key={f.Id} 
                              className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                                isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectFatura(f.Id)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-indigo-850">#{f.Id}</span>
                                    <span className="font-bold text-gray-800 truncate max-w-[150px] md:max-w-[200px]">
                                      {f.Cliente?.Nome || f.NomeCliente || 'Cliente Não Informado'}
                                    </span>
                                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                                      f.Quitada 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {f.Quitada ? 'Quitada' : 'Pendente'}
                                    </span>
                                  </div>
                                  <div className="flex gap-4 items-center text-[10px] text-gray-400 font-mono">
                                    <span>Venc: {f.Vencimento ? new Date(f.Vencimento).toLocaleDateString('pt-BR') : 'N/A'}</span>
                                    <span className="font-bold text-indigo-600">
                                      {f.Valor !== undefined ? `R$ ${Number(f.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                    </span>
                                    {f.LinkBoleto && (
                                      <a
                                        href={f.LinkBoleto}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-red-500 hover:text-red-700 font-bold flex items-center gap-0.5 hover:underline"
                                        title="Visualizar Boleto"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        PDF
                                      </a>
                                    )}
                                    {f.LinkBoleto ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleConsultarStatusBradesco(f)}
                                          disabled={checkingStatusId === String(f.Id)}
                                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 hover:underline ml-1 cursor-pointer"
                                          title="Consultar status de pagamento no Bradesco"
                                        >
                                          <RefreshCw className={`h-3 w-3 ${checkingStatusId === String(f.Id) ? 'animate-spin' : ''}`} />
                                          {checkingStatusId === String(f.Id) ? 'Consultando...' : 'Consultar API'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleBaixarBoletoBradesco(f)}
                                          disabled={cancellingBoletoId === String(f.Id)}
                                          className="text-red-600 hover:text-red-800 font-bold flex items-center gap-0.5 hover:underline ml-1 cursor-pointer"
                                          title="Baixar/Cancelar o boleto no Bradesco se pago por transferência ou outro meio"
                                        >
                                          <XCircle className={`h-3 w-3 ${cancellingBoletoId === String(f.Id) ? 'animate-pulse' : ''}`} />
                                          {cancellingBoletoId === String(f.Id) ? 'Baixando...' : 'Baixar/Cancelar'}
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleConsultarStatusBradesco(f)}
                                        disabled={checkingStatusId === String(f.Id)}
                                        className="text-amber-600 hover:text-amber-800 font-bold flex items-center gap-0.5 hover:underline ml-1 cursor-pointer"
                                        title="Buscar e carregar o boleto já registrado no Bradesco"
                                      >
                                        <Search className={`h-3 w-3 ${checkingStatusId === String(f.Id) ? 'animate-spin' : ''}`} />
                                        {checkingStatusId === String(f.Id) ? 'Buscando...' : 'Buscar Boleto'}
                                      </button>
                                    )}
                                    {(() => {
                                      const hasLiveResult = !!statusCheckResults[String(f.Id)];
                                      const hasSavedResult = !!f.ApiStatus;
                                      if (!hasLiveResult && !hasSavedResult) return null;

                                      const isQuitada = hasLiveResult 
                                        ? statusCheckResults[String(f.Id)].quitado 
                                        : (f.ApiQuitado === true);
                                      
                                      const statusText = hasLiveResult 
                                        ? statusCheckResults[String(f.Id)].status 
                                        : f.ApiStatus;

                                      const titleText = hasLiveResult
                                        ? statusCheckResults[String(f.Id)].message
                                        : `Status Bradesco salvo no banco de dados local. Movimentação: ${f.ApiDataMovimentacao || 'Não informada'}`;

                                      return (
                                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                          isQuitada 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-indigo-100 text-indigo-800'
                                        }`} title={titleText}>
                                          API: {statusText}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSelectFaturaById(f.Id)}
                                disabled={faturaLoading}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition-colors shrink-0 ${
                                  isSelected
                                    ? 'bg-indigo-650 text-white border-indigo-650'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {faturaLoading && fetchedFatura?.Id === f.Id ? 'Carregando...' : 'Selecionar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Painel de Envio em Massa (Bulk Actions) */}
                {(() => {
                  const numSelected = Object.values(selectedFaturas).filter(Boolean).length;
                  if (numSelected === 0) return null;

                  return (
                    <div className="bg-indigo-50/30 border border-indigo-200 rounded-xl p-4 space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center border-b border-indigo-150 pb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-indigo-600" />
                          <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                            Painel de Disparo em Massa
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 text-[10px] font-extrabold rounded-full">
                          {numSelected} faturas selecionadas
                        </span>
                      </div>

                      {/* Seleção do Canal de Envio em Massa */}
                      {!bulkSending && (
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setBulkActionType('whatsapp')}
                            className={`py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                              bulkActionType === 'whatsapp'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkActionType('email')}
                            className={`py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                              bulkActionType === 'email'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            E-mail (SMTP)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkActionType('gerar_boleto')}
                            className={`py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                              bulkActionType === 'gerar_boleto'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            Gerar Boletos Bradesco
                          </button>
                        </div>
                      )}

                      {/* Configurações específicas baseadas no canal */}
                      {bulkActionType === 'whatsapp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">
                              Intervalo entre disparos (segundos)
                            </label>
                            <input
                              type="number"
                              min={2}
                              disabled={bulkSending}
                              value={bulkDelay}
                              onChange={(e) => setBulkDelay(Math.max(2, Number(e.target.value) || 2))}
                              className="block w-full rounded-lg border border-gray-350 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none bg-white font-bold"
                            />
                            <p className="text-[9px] text-gray-400">
                              Recomendado: 10-15s para respeitar as políticas de antispam do WhatsApp.
                            </p>
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 text-[10px] text-gray-500 space-y-1">
                            <span className="font-bold text-indigo-850 uppercase block text-[8px] tracking-wide">
                              Mensagem que será enviada (Template):
                            </span>
                            <p className="font-sans line-clamp-3 italic text-gray-650 bg-gray-50 p-1.5 rounded border border-gray-100 font-mono text-[9px]">
                              {integrationSettings.whaticket_default_message || 'Nenhum template salvo.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {bulkActionType === 'email' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">
                              Intervalo entre disparos (segundos)
                            </label>
                            <input
                              type="number"
                              min={2}
                              disabled={bulkSending}
                              value={bulkDelay}
                              onChange={(e) => setBulkDelay(Math.max(2, Number(e.target.value) || 2))}
                              className="block w-full rounded-lg border border-gray-350 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none bg-white font-bold"
                            />
                            <p className="text-[9px] text-gray-400">
                              Recomendado: 2-5s para envios via servidor de e-mail dedicado.
                            </p>
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100 text-[10px] text-gray-500 space-y-1">
                            <span className="font-bold text-indigo-850 uppercase block text-[8px] tracking-wide">
                              Assunto do E-mail (Template):
                            </span>
                            <p className="font-sans italic text-gray-650 bg-gray-50 p-1.5 rounded border border-gray-100 font-mono text-[9px] truncate">
                              {integrationSettings.email_default_subject || 'Sem assunto definido.'}
                            </p>
                            <span className="font-bold text-indigo-850 uppercase block text-[8px] tracking-wide pt-1">
                              Mensagem do E-mail (Template):
                            </span>
                            <p className="font-sans line-clamp-2 italic text-gray-650 bg-gray-50 p-1.5 rounded border border-gray-100 font-mono text-[9px]">
                              {integrationSettings.email_default_body || 'Sem mensagem definida.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {bulkActionType === 'gerar_boleto' && (
                        <div className="bg-white/80 p-3 rounded-lg border border-orange-100/60 text-xs text-gray-600 space-y-2">
                          <span className="font-bold text-orange-800 uppercase block text-[9px] tracking-wide">
                            Geração de Boletos Bradesco API (mTLS):
                          </span>
                          <p className="text-[10px] text-gray-500">
                            O sistema irá percorrer cada fatura selecionada, buscar os dados cadastrais do cliente no Bom Controle e enviar o registro oficial da cobrança na API do Bradesco.
                          </p>
                          <div className="flex items-center gap-3 bg-orange-50/50 p-2 rounded-md border border-orange-100">
                            <span className="text-[10px] font-bold text-gray-500 uppercase shrink-0">Ambiente Bradesco:</span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="bulk_bradesco_env"
                                  checked={bradescoEnvSelection === 'sandbox'}
                                  onChange={() => setBradescoEnvSelection('sandbox')}
                                  disabled={bulkSending}
                                  className="text-orange-500 focus:ring-orange-400"
                                />
                                <span className="text-[10px] font-bold text-gray-700">Homologação (Sandbox)</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="bulk_bradesco_env"
                                  checked={bradescoEnvSelection === 'production'}
                                  onChange={() => setBradescoEnvSelection('production')}
                                  disabled={bulkSending}
                                  className="text-orange-500 focus:ring-orange-400"
                                />
                                <span className="text-[10px] font-bold text-gray-700">Produção</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Progresso e Controles durante Envio */}
                      {bulkSending && (
                        <div className="space-y-3.5 bg-white p-3 rounded-xl border border-indigo-150 shadow-xs">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-indigo-900">
                              Processando: {bulkProgress} de {bulkTotal} faturas ({Math.round((bulkProgress / bulkTotal) * 100)}%)
                            </span>
                            <button
                              type="button"
                              onClick={handleCancelBulkSend}
                              className="px-2.5 py-1 text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-650 hover:text-white rounded-md transition-colors"
                            >
                              Interromper Operação
                            </button>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(bulkProgress / bulkTotal) * 100}%` }}
                            />
                          </div>

                          {/* Console de logs / Termômetro de disparos */}
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold uppercase text-gray-400">Status do Processamento em Tempo Real:</span>
                            <div className="bg-gray-900 text-gray-200 font-mono text-[9px] p-2.5 rounded-lg max-h-[140px] overflow-y-auto space-y-1.5 border border-gray-800">
                              {bulkLogs.map((log) => {
                                const statusColors = {
                                  pending: 'text-gray-400',
                                  loading: 'text-yellow-400 animate-pulse',
                                  sending: 'text-orange-400 animate-pulse',
                                  success: 'text-green-400 font-bold',
                                  error: 'text-red-400 font-bold'
                                };
                                return (
                                  <div key={log.id} className="flex justify-between gap-4 items-start border-b border-gray-850 pb-1 last:border-0 last:pb-0">
                                    <span className="truncate">
                                      #{log.id} - {log.name}
                                    </span>
                                    <span className={`shrink-0 uppercase ${statusColors[log.status]}`}>
                                      {log.status === 'pending' && 'Aguardando'}
                                      {log.status === 'loading' && 'Consultando Cliente'}
                                      {log.status === 'sending' && (bulkActionType === 'gerar_boleto' ? 'Registrando...' : 'Enviando...')}
                                      {log.status === 'success' && (bulkActionType === 'gerar_boleto' ? '✓ Registrado' : '✓ Enviado')}
                                      {log.status === 'error' && `✗ Erro: ${log.error || 'Falha'}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botões de Ação para Envio */}
                      {!bulkSending && (
                        <div className="pt-1">
                          {bulkActionType === 'whatsapp' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartBulkSend(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-850 border border-gray-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Send className="h-3.5 w-3.5 text-indigo-600" />
                                Disparar Apenas Texto via WhatsApp
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartBulkSend(true)}
                                className="flex-1 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-100" />
                                Disparar PDF + Mensagem via WhatsApp
                              </button>
                            </div>
                          )}

                          {bulkActionType === 'email' && (
                            <button
                              type="button"
                              onClick={() => handleStartBulkSend(false)}
                              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Mail className="h-3.5 w-3.5 text-indigo-100" />
                              Enviar E-mails em Massa via SMTP
                            </button>
                          )}

                          {bulkActionType === 'gerar_boleto' && (
                            <button
                              type="button"
                              onClick={() => handleStartBulkSend(false)}
                              className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="h-3.5 w-3.5 text-orange-100" />
                              Registrar {numSelected} Boletos no Bradesco via API
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Exibição Elegante da Fatura em Formato de Bento/Cartão */}
                {fetchedFatura && (
                  <div className="bg-gradient-to-br from-gray-50 to-indigo-50/20 border border-gray-150 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-start flex-wrap gap-2 border-b border-gray-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Cliente / Sacado</span>
                        <h4 className="text-sm font-bold text-gray-800">
                          {fetchedFatura.Cliente?.Nome || fetchedFatura.NomeCliente || fetchedFatura.NomeClienteFornecedor || 'Cliente Não Informado'}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono">
                          CNPJ/CPF: {fetchedFatura.Cliente?.CnpjCpf || fetchedFatura.DocumentoClienteFornecedor || 'N/A'}
                        </span>
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
                          {(() => {
                            const raw = fetchedFatura.Vencimento || fetchedFatura.DataVencimento;
                            if (!raw) return 'N/A';
                            try {
                              let normalized = String(raw).trim();
                              if (normalized.includes(' ') && !normalized.includes('T')) {
                                normalized = normalized.replace(' ', 'T');
                              }
                              const d = new Date(normalized);
                              if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
                              const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
                              if (match) return `${match[3]}/${match[2]}/${match[1]}`;
                            } catch (e) {}
                            return String(raw);
                          })()}
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

                    {/* Painel Integrado para Geração e Consulta de Boleto Bradesco */}
                    <div className="bg-red-50/40 rounded-lg p-3 border border-red-100 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-red-600" />
                          <span className="text-xs font-bold text-gray-800">Boleto Bradesco API</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleConsultarStatusBradesco(fetchedFatura)}
                            disabled={checkingStatusId === String(fetchedFatura.Id)}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shrink-0"
                            title="Consultar status ou buscar boleto registrado na API Bradesco"
                          >
                            {fetchedFatura.LinkBoleto ? (
                              <>
                                <RefreshCw className={`h-3 w-3 ${checkingStatusId === String(fetchedFatura.Id) ? 'animate-spin' : ''}`} />
                                {checkingStatusId === String(fetchedFatura.Id) ? 'Verificando...' : 'Consultar Status'}
                              </>
                            ) : (
                              <>
                                <Search className={`h-3 w-3 ${checkingStatusId === String(fetchedFatura.Id) ? 'animate-spin' : ''}`} />
                                {checkingStatusId === String(fetchedFatura.Id) ? 'Buscando...' : 'Buscar Boleto Gerado'}
                              </>
                            )}
                          </button>

                          {fetchedFatura.LinkBoleto && (
                            <button
                              type="button"
                              onClick={() => handleBaixarBoletoBradesco(fetchedFatura)}
                              disabled={cancellingBoletoId === String(fetchedFatura.Id)}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shrink-0"
                              title="Baixar/Cancelar o boleto no Bradesco"
                            >
                              <XCircle className={`h-3 w-3 ${cancellingBoletoId === String(fetchedFatura.Id) ? 'animate-pulse' : ''}`} />
                              {cancellingBoletoId === String(fetchedFatura.Id) ? 'Baixando...' : 'Baixar/Cancelar'}
                            </button>
                          )}
                          
                          <select
                            value={bradescoEnvSelection}
                            onChange={(e) => setBradescoEnvSelection(e.target.value as any)}
                            className="bg-white border border-gray-200 rounded text-[10px] font-bold px-1.5 py-0.5 text-gray-700 focus:outline-none h-6"
                          >
                            <option value="sandbox">Sandbox</option>
                            <option value="production">Produção</option>
                          </select>
                        </div>
                      </div>

                      {/* Resultado de status consultado individualmente */}
                      {(() => {
                        const hasLiveResult = !!statusCheckResults[String(fetchedFatura.Id)];
                        const hasSavedResult = !!fetchedFatura.ApiStatus;
                        if (!hasLiveResult && !hasSavedResult) return null;

                        const isQuitada = hasLiveResult 
                          ? statusCheckResults[String(fetchedFatura.Id)].quitado 
                          : (fetchedFatura.ApiQuitado === true);
                        
                        const statusText = hasLiveResult 
                          ? statusCheckResults[String(fetchedFatura.Id)].status 
                          : fetchedFatura.ApiStatus;

                        const dataMov = hasLiveResult
                          ? statusCheckResults[String(fetchedFatura.Id)].dataMovimentacao
                          : fetchedFatura.ApiDataMovimentacao;

                        const messageText = hasLiveResult
                          ? statusCheckResults[String(fetchedFatura.Id)].message
                          : (fetchedFatura.ApiQuitado 
                              ? 'Boleto liquidado e persistido localmente.' 
                              : 'Boleto registrado e persistido localmente.');

                        return (
                          <div className="bg-white p-2.5 rounded border border-indigo-150 text-[11px] space-y-1.5 animate-fade-in shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-500 uppercase text-[9px]">Status Bradesco:</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                isQuitada
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {statusText}
                              </span>
                            </div>
                            {dataMov && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 font-medium">Data Movimentação:</span>
                                <span className="font-mono font-semibold">{dataMov}</span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                              {messageText}
                            </p>
                          </div>
                        );
                      })()}

                      {bradescoError && (
                        <div className="text-[10px] text-red-700 bg-red-100/60 p-2 rounded border border-red-200">
                          {bradescoError}
                        </div>
                      )}

                      {!bradescoBoletoResult && (
                        <div className="bg-white p-3 rounded-lg border border-red-100 space-y-2.5 text-xs">
                          <span className="block text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Dados de Registro do Sacado (Editável)</span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">Nome / Razão Social</label>
                              <input
                                type="text"
                                value={sacadoNome}
                                onChange={(e) => setSacadoNome(e.target.value)}
                                placeholder="Nome do pagador"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-red-500 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">CPF ou CNPJ</label>
                              <input
                                type="text"
                                value={sacadoCnpjCpf}
                                onChange={(e) => setSacadoCnpjCpf(e.target.value)}
                                placeholder="CPF ou CNPJ do pagador"
                                className={`w-full rounded border px-2 py-1 text-xs font-mono text-gray-800 focus:border-red-500 focus:outline-none ${!sacadoCnpjCpf ? 'border-amber-400 bg-amber-50/20' : 'border-gray-200'}`}
                              />
                              {!sacadoCnpjCpf && (
                                <span className="text-[9px] text-amber-600 font-bold block">⚠️ CPF/CNPJ é obrigatório para registrar!</span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">CEP</label>
                              <input
                                type="text"
                                value={sacadoCep}
                                onChange={(e) => setSacadoCep(e.target.value)}
                                placeholder="00000-000"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-red-500 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">Endereço (Rua, Número, Bairro)</label>
                              <input
                                type="text"
                                value={sacadoEndereco}
                                onChange={(e) => setSacadoEndereco(e.target.value)}
                                placeholder="Rua, Número - Bairro"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-red-500 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">Cidade</label>
                              <input
                                type="text"
                                value={sacadoCidade}
                                onChange={(e) => setSacadoCidade(e.target.value)}
                                placeholder="Cidade"
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-red-500 focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold text-gray-500 uppercase">Estado (UF)</label>
                              <input
                                type="text"
                                value={sacadoUf}
                                onChange={(e) => setSacadoUf(e.target.value)}
                                placeholder="UF"
                                maxLength={2}
                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-red-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {!bradescoBoletoResult ? (
                        <button
                          type="button"
                          disabled={bradescoGenerating}
                          onClick={handleGerarBoletoBradesco}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${bradescoGenerating ? 'animate-spin' : ''}`} />
                          {bradescoGenerating ? 'Registrando Boleto na API Bradesco...' : 'Gerar e Registrar Boleto Bradesco'}
                        </button>
                      ) : (
                        <div className="space-y-2 animate-fadeIn bg-white p-2.5 rounded border border-red-150">
                          <div className="flex items-center gap-1.5 text-green-700 text-xs font-bold">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            <span>Boleto Bradesco Gerado com Sucesso!</span>
                          </div>
                          
                          <div className="text-[10px] space-y-1 font-mono text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="flex justify-between">
                              <span>Nosso Número:</span>
                              <span className="font-bold text-black">{bradescoBoletoResult.nossoNumero}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span>Linha Digitável:</span>
                              <span className="block font-bold text-black text-[9px] break-all">{bradescoBoletoResult.linhaDigitavel}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const b = bradescoBoletoResult;
                                const url = `/api/integration/bradesco/visualizar-boleto?` + 
                                  `valor=${b.valor}` +
                                  `&vencimento=${b.vencimento}` +
                                  `&emissao=${b.emissao}` +
                                  `&nome=${encodeURIComponent(b.pagador.nome)}` +
                                  `&documento=${encodeURIComponent(b.pagador.documento)}` +
                                  `&endereco=${encodeURIComponent(b.pagador.endereco)}` +
                                  `&cep=${encodeURIComponent(b.pagador.cep)}` +
                                  `&nosso_numero=${b.nossoNumero}` +
                                  `&agencia=${b.agencia}` +
                                  `&conta=${encodeURIComponent(b.conta)}` +
                                  `&carteira=${b.carteira}` +
                                  `&beneficiario=${encodeURIComponent(b.beneficiario)}` +
                                  `&cnpj_beneficiario=${encodeURIComponent(b.cnpjBeneficiario)}` +
                                  `&qr_code=${encodeURIComponent(b.qrCode || '')}` +
                                  `&linha_digitavel=${encodeURIComponent(b.linhaDigitavel || '')}` +
                                  `&barcode=${encodeURIComponent(b.barcodeValue || '')}` +
                                  `&instrucoes=${encodeURIComponent(integrationSettings.bradesco_instrucoes || '')}`;
                                window.open(url, '_blank');
                              }}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Visualizar e Imprimir Boleto
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBradescoBoletoResult(null);
                                setBradescoError(null);
                              }}
                              className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold"
                              title="Gerar Novamente"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: Consulta de Clientes / Empresas do Bom Controle */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-850 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                      Consulta de Clientes / Empresas (Bom Controle)
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Pesquise dados cadastrais de clientes ou empresas registradas na sua conta Bom Controle
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={bomSearchType}
                    onChange={(e: any) => {
                      setBomSearchType(e.target.value);
                      setBomSearchResults(null);
                      setBomSelectedDetail(null);
                    }}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-indigo-500 focus:outline-none font-bold"
                  >
                    <option value="cliente">Clientes</option>
                    <option value="empresa">Empresas</option>
                    <option value="financeiro">Financeiro (Movimentações)</option>
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={bomSearchQuery}
                      onChange={(e) => setBomSearchQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleBomSearch(); }}
                      placeholder={
                        bomSearchType === 'cliente'
                          ? "Nome, CNPJ, CPF ou ID do Cliente"
                          : bomSearchType === 'empresa'
                          ? "Nome ou ID da Empresa"
                          : "Nome ou Descrição da Parcela (Financeiro)"
                      }
                      className="block w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleBomSearch}
                    disabled={bomSearchLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:bg-indigo-350 flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${bomSearchLoading ? 'animate-spin' : ''}`} />
                    {bomSearchLoading ? 'Pesquisando...' : 'Pesquisar'}
                  </button>
                </div>

                {bomSearchType === 'financeiro' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data Início</label>
                      <input
                        type="date"
                        value={financeiroDataInicio}
                        onChange={(e) => setFinanceiroDataInicio(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 bg-white focus:border-indigo-500 focus:outline-none text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data Término</label>
                      <input
                        type="date"
                        value={financeiroDataTermino}
                        onChange={(e) => setFinanceiroDataTermino(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 bg-white focus:border-indigo-500 focus:outline-none text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Data</label>
                      <select
                        value={financeiroTipoData}
                        onChange={(e) => setFinanceiroTipoData(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 bg-white focus:border-indigo-500 focus:outline-none text-xs font-bold"
                      >
                        <option value="Criacao">Criação</option>
                        <option value="DataVencimento">Vencimento</option>
                        <option value="DataPagamento">Pagamento</option>
                        <option value="DataCompetencia">Competência</option>
                        <option value="DataConciliacao">Conciliação</option>
                        <option value="UltimaAlteracao">Última Alteração</option>
                        <option value="DataPadrao">Padrão</option>
                      </select>
                    </div>
                  </div>
                )}

                {bomSearchError && (
                  <div className="rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{bomSearchError}</span>
                  </div>
                )}

                {/* Lista de Resultados de Clientes/Empresas */}
                {bomSearchResults && (
                  <div className="border border-gray-150 rounded-lg overflow-hidden bg-white shadow-xs animate-fade-in">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-150">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Resultados Encontrados ({bomSearchResults.length})
                      </span>
                    </div>

                    {bomSearchResults.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Nenhum registro encontrado.
                      </div>
                    ) : (
                      <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-100">
                        {bomSearchResults.map((item: any, idx: number) => {
                          let id = '';
                          let name = '';
                          let doc = '';
                          let subText = '';

                          if (bomSearchType === 'financeiro') {
                            id = item.IdMovimentacaoFinanceiraParcela || String(idx);
                            name = item.NomeClienteFornecedor || item.Nome || 'N/A';
                            doc = item.DocumentoClienteFornecedor || 'N/A';
                            const valorStr = item.Valor ? `R$ ${Number(item.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
                            const vencStr = item.DataVencimento ? new Date(item.DataVencimento).toLocaleDateString('pt-BR') : '';
                            subText = `Parcela: ${item.Nome || 'N/A'} • Valor: ${valorStr} • Vencimento: ${vencStr}`;
                          } else {
                            id = item.Id || item.id || String(idx);
                            if (item.TipoPessoa === 'Juridica' && item.PessoaJuridica) {
                              name = item.PessoaJuridica.NomeFantasia || item.PessoaJuridica.RazaoSocial || 'N/A';
                            } else if (item.TipoPessoa === 'Fisica' && item.PessoaFisica) {
                              name = item.PessoaFisica.Nome || 'N/A';
                            } else {
                              name = item.Nome || item.RazaoSocial || item.NomeRazaoSocial || item.NomeFantasia || 'N/A';
                            }

                            if (item.TipoPessoa === 'Juridica' && item.PessoaJuridica) {
                              doc = item.PessoaJuridica.Documento || 'N/A';
                            } else if (item.TipoPessoa === 'Fisica' && item.PessoaFisica) {
                              doc = item.PessoaFisica.Documento || 'N/A';
                            } else {
                              doc = item.CnpjCpf || item.CpfCnpj || item.Cnpj || item.Cpf || 'N/A';
                            }
                            subText = `ID: #${id}`;
                          }

                          return (
                            <div key={id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-indigo-850">
                                    {bomSearchType === 'financeiro' ? 'Título' : `#${id}`}
                                  </span>
                                  <span className="font-bold text-gray-800 truncate">{name}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5 space-y-0.5">
                                  <div className="font-sans text-gray-500">{subText}</div>
                                  {doc && doc !== 'N/A' && (
                                    <div className="font-mono text-indigo-600 font-bold">CNPJ/CPF do Cliente: {doc}</div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (bomSearchType === 'financeiro') {
                                    setBomSelectedDetail(item);
                                  } else {
                                    handleFetchClientDetail(id);
                                  }
                                }}
                                disabled={bomSearchLoading}
                                className="px-2.5 py-1 text-[10px] font-bold rounded bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 shrink-0"
                              >
                                Ver Detalhes
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Detalhes expandidos do Cliente */}
                {bomSelectedDetail && (() => {
                  if (bomSelectedDetail.IdMovimentacaoFinanceiraParcela) {
                    const mov = bomSelectedDetail;
                    const id = mov.IdMovimentacaoFinanceiraParcela;
                    const name = mov.NomeClienteFornecedor || mov.NomeFantasiaClienteFornecedor || mov.Nome || 'N/A';
                    const doc = mov.DocumentoClienteFornecedor || 'N/A';
                    const valorStr = mov.Valor ? `R$ ${Number(mov.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
                    const vencStr = mov.DataVencimento ? new Date(mov.DataVencimento).toLocaleDateString('pt-BR') : 'N/A';
                    const quitStr = mov.DataQuitacao ? new Date(mov.DataQuitacao).toLocaleDateString('pt-BR') : 'Pendente';
                    const formaPgto = mov.NomeFormaPagamento || 'N/A';
                    const tipoMov = mov.NomeTipoMovimentacao || 'N/A';
                    const obs = mov.Observacao || '';

                    return (
                      <div className="bg-gradient-to-br from-emerald-50/10 to-gray-50/60 border border-emerald-150 rounded-xl p-4 space-y-3 animate-fade-in text-xs">
                        <div className="border-b border-emerald-100 pb-2 flex justify-between items-center">
                          <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            Detalhes da Movimentação Financeira (Bom Controle)
                          </h4>
                          <button 
                            onClick={() => setBomSelectedDetail(null)}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Fechar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Nome do Cliente</span>
                            <span className="font-bold text-gray-800">{name}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">ID da Parcela</span>
                            <span className="font-mono text-gray-800 truncate block">#{id}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">CPF/CNPJ do Cliente</span>
                            <span className="font-mono text-indigo-700 font-bold">{doc}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Valor da Parcela</span>
                            <span className="font-mono text-emerald-700 font-bold text-sm">{valorStr}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Data de Vencimento</span>
                            <span className="font-mono text-gray-850 font-bold">{vencStr}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Data de Quitação</span>
                            <span className="font-mono text-gray-800">{quitStr}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Forma de Pagamento</span>
                            <span className="text-gray-800 font-bold">{formaPgto}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Tipo da Movimentação</span>
                            <span className="text-gray-800">{tipoMov}</span>
                          </div>
                          {mov.Nome && (
                            <div className="md:col-span-2">
                              <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Nome da Parcela / Descrição</span>
                              <span className="text-gray-800 font-sans font-medium">{mov.Nome}</span>
                            </div>
                          )}
                          {obs && (
                            <div className="md:col-span-2">
                              <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Observação</span>
                              <span className="text-gray-800 font-sans whitespace-pre-wrap">{obs}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const id = bomSelectedDetail.Id || bomSelectedDetail.id;
                  
                  let name = 'N/A';
                  if (bomSelectedDetail.TipoPessoa === 'Juridica' && bomSelectedDetail.PessoaJuridica) {
                    name = bomSelectedDetail.PessoaJuridica.NomeFantasia || bomSelectedDetail.PessoaJuridica.RazaoSocial || 'N/A';
                  } else if (bomSelectedDetail.TipoPessoa === 'Fisica' && bomSelectedDetail.PessoaFisica) {
                    name = bomSelectedDetail.PessoaFisica.Nome || 'N/A';
                  } else {
                    name = bomSelectedDetail.Nome || bomSelectedDetail.NomeRazaoSocial || 'N/A';
                  }

                  let doc = 'N/A';
                  if (bomSelectedDetail.TipoPessoa === 'Juridica' && bomSelectedDetail.PessoaJuridica) {
                    doc = bomSelectedDetail.PessoaJuridica.Documento || 'N/A';
                  } else if (bomSelectedDetail.TipoPessoa === 'Fisica' && bomSelectedDetail.PessoaFisica) {
                    doc = bomSelectedDetail.PessoaFisica.Documento || 'N/A';
                  } else {
                    doc = bomSelectedDetail.CnpjCpf || bomSelectedDetail.CpfCnpj || bomSelectedDetail.Cnpj || 'N/A';
                  }

                  let phone = 'N/A';
                  if (bomSelectedDetail.Celular || bomSelectedDetail.Telefone || bomSelectedDetail.CelularWhatsApp) {
                    phone = bomSelectedDetail.Celular || bomSelectedDetail.Telefone || bomSelectedDetail.CelularWhatsApp;
                  } else if (Array.isArray(bomSelectedDetail.Contatos) && bomSelectedDetail.Contatos.length > 0) {
                    const primary = bomSelectedDetail.Contatos.find((c: any) => c.Padrao) ||
                                    bomSelectedDetail.Contatos.find((c: any) => c.Cobranca) ||
                                    bomSelectedDetail.Contatos.find((c: any) => c.Telefone) ||
                                    bomSelectedDetail.Contatos[0];
                    if (primary) {
                      phone = primary.Telefone || 'N/A';
                    }
                  }

                  let email = bomSelectedDetail.Email || '';
                  if (!email && Array.isArray(bomSelectedDetail.Contatos) && bomSelectedDetail.Contatos.length > 0) {
                    const primary = bomSelectedDetail.Contatos.find((c: any) => c.Padrao) ||
                                    bomSelectedDetail.Contatos.find((c: any) => c.Cobranca) ||
                                    bomSelectedDetail.Contatos.find((c: any) => c.Email) ||
                                    bomSelectedDetail.Contatos[0];
                    if (primary) {
                      email = primary.Email || '';
                    }
                  }

                  let addressStr = '';
                  if (bomSelectedDetail.Endereco && typeof bomSelectedDetail.Endereco === 'object') {
                    const end = bomSelectedDetail.Endereco;
                    const logradouro = `${end.TipoLogradouro || ''} ${end.Logradouro || ''}`.trim();
                    addressStr = logradouro;
                  } else {
                    addressStr = bomSelectedDetail.Logradouro || bomSelectedDetail.Endereco || '';
                  }

                  const numero = bomSelectedDetail.Endereco?.Numero || bomSelectedDetail.Numero || '';
                  const bairro = bomSelectedDetail.Endereco?.Bairro || bomSelectedDetail.Bairro || '';
                  const cidade = bomSelectedDetail.Endereco?.Cidade || bomSelectedDetail.Cidade || '';
                  const uf = bomSelectedDetail.Endereco?.Uf || bomSelectedDetail.Uf || '';
                  const cep = bomSelectedDetail.Endereco?.Cep || bomSelectedDetail.Cep || '';

                  return (
                    <div className="bg-gradient-to-br from-indigo-50/10 to-gray-50/60 border border-indigo-150 rounded-xl p-4 space-y-3 animate-fade-in text-xs">
                      <div className="border-b border-indigo-100 pb-2 flex justify-between items-center">
                        <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          Detalhes do Cadastro do Cliente
                        </h4>
                        <button 
                          onClick={() => setBomSelectedDetail(null)}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Fechar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                        <div>
                          <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Nome / Razão Social</span>
                          <span className="font-bold text-gray-800">{name}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">ID do Sistema</span>
                          <span className="font-mono text-gray-800">#{id}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">CPF/CNPJ</span>
                          <span className="font-mono text-gray-800">{doc}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Celular / Telefone</span>
                          <span className="font-mono text-gray-800 font-bold text-indigo-650">{phone}</span>
                        </div>
                        {email && (
                          <div className="md:col-span-2">
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">E-mail</span>
                            <span className="text-gray-800 font-sans">{email}</span>
                          </div>
                        )}
                        {addressStr && (
                          <div className="md:col-span-2">
                            <span className="block text-[9px] uppercase text-gray-400 font-bold font-sans">Endereço Registrado</span>
                            <span className="text-gray-700 font-sans">
                              {addressStr}
                              {numero && `, ${numero}`}
                              {bairro && ` - ${bairro}`}
                              {cidade && ` - ${cidade}`}
                              {uf && `/${uf}`}
                              {cep && ` - CEP: ${cep}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
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
                      
                      {/* Seleção rápida de contatos cadastrados no Bom Controle */}
                      {(() => {
                        const phones: { label: string; number: string; type: string }[] = [];
                        const c = fetchedFatura.Cliente || {};
                        const clientName = c.Nome || fetchedFatura.NomeCliente || fetchedFatura.NomeClienteFornecedor || 'Cadastro Principal';
                        
                        const candidates = [
                          { num: c.Celular, label: 'Celular', type: 'Principal' },
                          { num: c.Telefone, label: 'Telefone', type: 'Principal' },
                          { num: c.CelularWhatsApp, label: 'WhatsApp', type: 'WhatsApp' },
                          { num: c.TelefoneComercial, label: 'Comercial', type: 'Comercial' },
                          { num: c.TelefoneResidencial, label: 'Residencial', type: 'Residencial' },
                          { num: c.Fone, label: 'Fone', type: 'Principal' },
                          { num: c.whatsapp, label: 'WhatsApp', type: 'WhatsApp' },
                          { num: c.phone, label: 'Phone', type: 'Principal' },
                          { num: c.mobile, label: 'Mobile', type: 'Mobile' },
                          { num: fetchedFatura.Telefone, label: 'Telefone Fatura', type: 'Fatura' },
                          { num: fetchedFatura.Celular, label: 'Celular Fatura', type: 'Fatura' },
                          { num: fetchedFatura.CelularWhatsApp, label: 'WhatsApp Fatura', type: 'Fatura' },
                        ];

                        candidates.forEach(cand => {
                          if (cand.num) {
                            const clean = String(cand.num).replace(/\D/g, '');
                            if (clean.length >= 8) {
                              const isDup = phones.some(p => p.number.replace(/\D/g, '') === clean);
                              if (!isDup) {
                                phones.push({
                                  label: clientName,
                                  number: String(cand.num),
                                  type: cand.type
                                });
                              }
                            }
                          }
                        });

                        // Check Contatos
                        const rawContatos = c.Contatos || c.contatos || c.ContatosAdicionais;
                        if (Array.isArray(rawContatos)) {
                          rawContatos.forEach((contato: any) => {
                            const cPhone = contato.Telefone || contato.Celular || contato.CelularWhatsApp || contato.Fone || contato.phone;
                            if (cPhone) {
                              const clean = String(cPhone).replace(/\D/g, '');
                              if (clean.length >= 8) {
                                const isDup = phones.some(p => p.number.replace(/\D/g, '') === clean);
                                if (!isDup) {
                                  let typeLabel = 'Contato';
                                  if (contato.Padrao && contato.Cobranca) typeLabel = 'Padrão e Cobrança';
                                  else if (contato.Padrao) typeLabel = 'Padrão';
                                  else if (contato.Cobranca) typeLabel = 'Cobrança';
                                  
                                  phones.push({
                                    label: contato.Nome || 'Sem Nome',
                                    number: String(cPhone),
                                    type: typeLabel
                                  });
                                }
                              }
                            }
                          });
                        }

                        if (phones.length === 0) {
                          return (
                            <div className="bg-orange-50/50 p-2.5 rounded-lg border border-orange-200 text-orange-800 text-xs mt-2">
                              <p className="font-bold flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 text-orange-650 shrink-0" />
                                Nenhum telefone cadastrado no Bom Controle para este cliente.
                              </p>
                              <p className="text-[10px] mt-0.5 text-gray-500">
                                Digite o número desejado no campo acima para realizar o disparo.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-indigo-50/20 p-2 rounded-lg border border-indigo-100 space-y-1.5 mt-2">
                            <span className="block text-[9px] font-bold text-indigo-800 uppercase tracking-wider">
                              Contatos do Cliente (Bom Controle) - Toque para usar:
                            </span>
                            <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                              {phones.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 p-1.5 bg-white border border-gray-100 rounded-md text-xs">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-gray-700 truncate">{p.label}</span>
                                      <span className="text-[8px] font-bold bg-indigo-50 text-indigo-750 px-1 py-0.2 rounded">
                                        {p.type}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[9px] text-gray-500">{p.number}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      let cleanPhone = p.number.replace(/\D/g, '');
                                      if (cleanPhone.length > 0 && !cleanPhone.startsWith('55')) {
                                        cleanPhone = '55' + cleanPhone;
                                      }
                                      setWhatsAppNumber(cleanPhone);
                                    }}
                                    className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-150 transition-colors shrink-0"
                                  >
                                    Usar Número
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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
