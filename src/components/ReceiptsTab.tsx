import React, { useState, useEffect } from 'react';
import { Document, Client, DocumentItem, DocumentType, DocumentStatus, CompanySettings, User, Product } from '../types';
import { ReceiptPrintView } from './ReceiptPrintView';
import { 
  Plus, Search, Filter, Trash2, Printer, Send, Mail, AlertTriangle, Check, X, ArrowLeftRight, CheckSquare, RefreshCw, Building, Pencil, Ban 
} from 'lucide-react';

interface ReceiptsTabProps {
  settings: CompanySettings;
  clients: Client[];
  onRefreshStats: () => void;
  currentUser: User;
}

export const ReceiptsTab: React.FC<ReceiptsTabProps> = ({ settings, clients, onRefreshStats, currentUser }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<(CompanySettings & { id: number })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Controle de Visualização
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Documento selecionado para Preview/Editor/Compartilhamento
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [shareType, setShareType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [shareData, setShareData] = useState({
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  // Estado do Formulário de Criação/Edição
  const [editId, setEditId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    type: 'RECIBO' as DocumentType,
    client_id: '' as string | number,
    client_name: '',
    client_cnpj: '',
    client_address: '',
    client_phone: '',
    company_info: null as (CompanySettings & { id: number }) | null,
    issue_date: new Date().toISOString().split('T')[0],
    location_date: '',
    items: [{ quantity: 1, description: '', unit_price: 0 }] as { quantity: number; description: string; unit_price: number }[],
    discount: 0,
    status: 'PENDENTE' as DocumentStatus,
    payment_method: 'PIX',
    notes: ''
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Falha ao buscar recibos/orçamentos.');
      const data = await response.json();
      setDocuments(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar documentos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error('Erro ao ler empresas no ReceiptsTab:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Erro ao ler produtos no ReceiptsTab:', e);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCompanies();
    fetchProducts();
  }, [showFormModal]);

  const hasCompanySelected = !!formData.company_info;
  const companiesLength = companies.length;

  useEffect(() => {
    if (showFormModal && !hasCompanySelected && companiesLength > 0) {
      const defaultCompany = companies[0];
      const activeAddress = defaultCompany.address;
      setFormData(prev => ({
        ...prev,
        company_info: defaultCompany,
        location_date: `${activeAddress.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        notes: prev.type === 'RECIBO' ? defaultCompany.notes_recibo_default : defaultCompany.notes_orcamento_default
      }));
    }
  }, [companiesLength, showFormModal, hasCompanySelected]);

  // Monitora alterações de seleção de cliente para preenchimento automático inteligente
  const handleClientSelect = (clientIdVal: string | number) => {
    if (!clientIdVal) {
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_cnpj: '',
        client_address: '',
        client_phone: ''
      }));
      return;
    }

    const selectedClient = clients.find(c => String(c.id) === String(clientIdVal));
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        client_cnpj: selectedClient.cnpj_cpf,
        client_address: selectedClient.address,
        client_phone: selectedClient.phone
      }));
    }
  };

  // Abre formulário para novo documento
  const handleOpenCreateModal = (type: DocumentType) => {
    setEditId(null);
    const defaultCompany = companies.length > 0 ? companies[0] : null;
    const activeAddress = defaultCompany ? defaultCompany.address : settings.address;
    const notesRecDefault = defaultCompany ? defaultCompany.notes_recibo_default : settings.notes_recibo_default;
    const notesOrcDefault = defaultCompany ? defaultCompany.notes_orcamento_default : settings.notes_orcamento_default;

    setFormData({
      type,
      client_id: '',
      client_name: '',
      client_cnpj: '',
      client_address: '',
      client_phone: '',
      company_info: defaultCompany,
      issue_date: new Date().toISOString().split('T')[0],
      location_date: `${activeAddress.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      items: [{ quantity: 1, description: '', unit_price: 0 }],
      discount: 0,
      status: type === 'RECIBO' ? 'PAGO' : 'PENDENTE',
      payment_method: 'PIX',
      notes: type === 'RECIBO' ? notesRecDefault : notesOrcDefault
    });
    setError(null);
    setShowFormModal(true);
  };

  // Gerencia itens do formulário
  const handleAddItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { quantity: 1, description: '', unit_price: 0 }]
    }));
  };

  const handleRemoveItemRow = (idx: number) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: value
    };
    if (field === 'description') {
      const matched = products.find(p => p.name.trim().toLowerCase() === String(value).trim().toLowerCase());
      if (matched) {
        updatedItems[idx].unit_price = matched.sale_price;
      }
    }
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }

    const validItems = formData.items.filter(item => item.description.trim() !== '');
    if (validItems.length === 0) {
      setError('Adicione pelo menos 1 item válido com descrição.');
      return;
    }

    setLoading(true);
    setError(null);

    const dataToSave = {
      ...formData,
      items: validItems.map(item => ({
        quantity: Number(item.quantity) || 1,
        description: item.description,
        unit_price: Number(item.unit_price) || 0,
        total_price: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0)
      }))
    };

    try {
      const isEdit = editId !== null;
      const url = isEdit ? `/api/documents/${editId}` : '/api/documents';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      const savedDoc = await response.json();

      if (!response.ok) {
        throw new Error(savedDoc.error || 'Erro ao gravar documento.');
      }

      setSuccess(isEdit ? 'Atualizações salvas com sucesso!' : 'Documento emitido com sucesso!');
      await fetchDocuments();
      onRefreshStats();
      setShowFormModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Houve um imprevisto na gravação.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (currentUser.role === 'user' && doc.type === 'RECIBO') {
      alert('Operação Negada: Usuário operador não tem permissão para excluir recibos, apenas orçamentos.');
      return;
    }

    if (!window.confirm('Excluir este documento de forma permanente? Esta operação é irreversível.')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível remover.');
      
      setSuccess('Documento removido definitivamente.');
      fetchDocuments();
      onRefreshStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar.');
    }
  };

  // Converte Orçamento -> Recibo instantaneamente
  const handleConvertToReceipt = async (id: string | number) => {
    if (!window.confirm('Deseja converter este Orçamento em um Recibo oficial de pagamento de forma garantida?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${id}/convert`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao converter.');
      }

      setSuccess(`Orçamento convertido em Recibo ${data.document.number} com sucesso!`);
      await fetchDocuments();
      onRefreshStats();
      
      // Abre o recibo convertido para visualização
      setSelectedDoc(data.document);
      setShowPreviewModal(true);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro na conversão.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Abre o formulário em modo de edição
  const handleOpenEditModal = (doc: Document) => {
    setEditId(doc.id);
    
    // Associa a empresa correta baseado nas empresas pré-cadastradas
    const matchedCompany = doc.company_info 
      ? (companies.find(c => String(c.id) === String((doc.company_info as any)?.id)) || doc.company_info)
      : (companies.length > 0 ? companies[0] : null);

    setFormData({
      type: doc.type,
      client_id: doc.client_id || '',
      client_name: doc.client_name,
      client_cnpj: doc.client_cnpj || '',
      client_address: doc.client_address || '',
      client_phone: doc.client_phone || '',
      company_info: matchedCompany as any,
      issue_date: doc.issue_date,
      location_date: doc.location_date || '',
      items: doc.items.map(it => ({
        quantity: Number(it.quantity) || 1,
        description: it.description,
        unit_price: Number(it.unit_price) || 0
      })),
      discount: Number(doc.discount) || 0,
      status: doc.status,
      payment_method: doc.payment_method || 'PIX',
      notes: doc.notes || ''
    });
    setError(null);
    setShowFormModal(true);
  };

  // Cancela o documento com estorno financeiro automático
  const handleCancelDocument = async (doc: Document) => {
    if (!window.confirm(`Deseja realmente CANCELAR o documento ${doc.number}? Isto fará o estorno financeiro automático nos relatórios.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO' })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao cancelar o documento.');
      }

      setSuccess(`Documento ${doc.number} foi cancelado e estornado com sucesso!`);
      await fetchDocuments();
      onRefreshStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar documento.');
    } finally {
      setLoading(false);
    }
  };

  // Envia por WhatsApp ou E-mail
  const handleOpenShare = (doc: Document, type: 'whatsapp' | 'email') => {
    setSelectedDoc(doc);
    setShareType(type);
    setShareData({
      email: (clients.find(c => String(c.id) === String(doc.client_id))?.email || ''),
      phone: doc.client_phone || '',
      subject: `Unity Automações - ${doc.type === 'RECIBO' ? 'Recibo' : 'Orçamento'} Nº ${doc.number}`,
      message: `Olá! Preparamos o ${doc.type === 'RECIBO' ? 'comprovante de recebimento correspondente ao pagamento' : 'detalhamento do orçamento solicitado'} no total de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.total)}. Caso prefira, pode fazer download no link.`
    });
    setShowShareModal(true);
  };

  const handleSendShare = async () => {
    if (!selectedDoc) return;

    setLoading(true);
    setError(null);

    try {
      if (shareType === 'whatsapp') {
        if (!shareData.phone) throw new Error('O telefone é obrigatório para envio por WhatsApp');
        const response = await fetch(`/api/documents/${selectedDoc.id}/whatsapp-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: shareData.phone })
        });
        const urlData = await response.json();
        if (!response.ok) throw new Error(urlData.error);

        // Abre no WhatsApp Web
        window.open(urlData.whatsappUrl, '_blank');
        setSuccess('Link de compartilhamento via WhatsApp gerado!');
        setShowShareModal(false);
      } else {
        if (!shareData.email) throw new Error('O e-mail é obrigatório para o envio digital');
        const response = await fetch(`/api/documents/${selectedDoc.id}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: shareData.email,
            subject: shareData.subject,
            body: shareData.message
          })
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error);

        setSuccess(resData.message);
        setShowShareModal(false);
      }
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro durante envio de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Aciona impressão física direta ocultando dinamicamente o painel
  const triggerPrintFlow = (doc: Document) => {
    setSelectedDoc(doc);
    // Dá tempo do componente renderizar na tela antes da impressão
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Cálculo de Subtotal e total em tempo real no formulário
  const currentSubtotal = formData.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
  const currentTotal = Math.max(0, currentSubtotal - (Number(formData.discount) || 0));

  // Filtros aplicados em tempo real
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.client_name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          doc.number.toLowerCase().includes(filterSearch.toLowerCase());
    const matchesType = filterType === 'todos' || doc.type === filterType;
    const matchesStatus = filterStatus === 'todos' || doc.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Imagens e Visualização Invisível para acionar modal de impressão padrão */}
      <div className="hidden print:block">
        {selectedDoc && <ReceiptPrintView document={selectedDoc} settings={settings} />}
      </div>

      <div className="no-print space-y-6">
        {/* Cabeçalho da Aba */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-850">Documentos e Comprovantes</h2>
            <p className="text-xs text-gray-500">Crie novos recibos ou orçamentos, converta orçamentos em recibos de pagamento, de forma simples</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleOpenCreateModal('ORCAMENTO')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-250 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-850 hover:bg-teal-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Orçamento
            </button>
            <button
              onClick={() => handleOpenCreateModal('RECIBO')}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Emitir Recibo
            </button>
          </div>
        </div>

        {success && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
            <Check className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Barra de Filtros Tradicional */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-150">
          <div className="relative md:col-span-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Digite o nome do cliente ou número do documento..."
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 focus:outline-none bg-white font-medium"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="RECIBO">Apenas Recibos</option>
              <option value="ORCAMENTO">Apenas Orçamentos</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 focus:outline-none bg-white font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="PAGO">Pagos / Concluídos</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>

        {/* Tabela de Emissões */}
        <div className="overflow-x-auto rounded-lg border border-gray-150 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-gray-150">
              <tr>
                <th className="px-6 py-4">Código / Tipo</th>
                <th className="px-6 py-4">Cliente / Contato</th>
                <th className="px-6 py-4">Emissão</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Pagamento / Status</th>
                <th className="px-6 py-4 text-center">Ações rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-gray-700">
              {loading && documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="animate-spin h-5 w-5 text-blue-500" />
                      Sincronizando banco de dados...
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhum comprovante correspondente aos filtros foi localizado no sistema.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 font-mono text-xs">{doc.number}</span>
                        <span className={`text-[10px] w-fit px-1.5 py-0.5 rounded font-extrabold font-sans mt-1 ${
                          doc.type === 'RECIBO' ? 'bg-blue-50 text-blue-800' : 'bg-teal-50 text-teal-800'
                        }`}>
                          {doc.type === 'RECIBO' ? 'RECIBO' : 'ORÇAMENTO'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{doc.client_name}</span>
                        <span className="text-xs text-gray-400 font-mono mt-0.5">{doc.client_cnpj || 'Sem CPF/CNPJ'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(doc.issue_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-blue-950">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.total)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] uppercase font-black w-fit px-2 py-0.5 rounded-full ${
                          doc.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                          doc.status === 'PENDENTE' ? 'bg-yellow-105 text-yellow-800 bg-yellow-100' : 'bg-red-100 text-red-800'
                        }`}>
                          {doc.status}
                        </span>
                        {doc.type === 'RECIBO' && doc.payment_method && (
                          <span className="text-[9px] text-gray-400 font-medium">Metodo: {doc.payment_method}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Editar */}
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          title="Editar Cadastro/Configurar"
                          className="rounded p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil className="h-4.5 w-4.5" />
                        </button>

                        {/* Cancelar / Estorno Financeiro */}
                        {doc.status !== 'CANCELADO' && (
                          <button
                            onClick={() => handleCancelDocument(doc)}
                            title="Cancelar Documento (Estornar)"
                            className="rounded p-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <Ban className="h-4.5 w-4.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowPreviewModal(true);
                          }}
                          title="Visualizar Recibo como na Imagem"
                          className="rounded p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Printer className="h-4.5 w-4.5" />
                        </button>
                        
                        {doc.type === 'ORCAMENTO' && doc.status !== 'CANCELADO' && (
                          <button
                            onClick={() => handleConvertToReceipt(doc.id)}
                            title="Converter Orçamento em Recibo Emitido"
                            className="rounded p-1 text-teal-600 hover:text-white hover:bg-teal-600 transition-colors"
                          >
                            <ArrowLeftRight className="h-4.5 w-4.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenShare(doc, 'whatsapp')}
                          title="Compartilhar via WhatsApp"
                          className="rounded p-1 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                        >
                          <Send className="h-4.5 w-4.5" />
                        </button>

                        <button
                          onClick={() => handleOpenShare(doc, 'email')}
                          title="Enviar Documento por E-mail"
                          className="rounded p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                        >
                          <Mail className="h-4.5 w-4.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={currentUser.role === 'user' && doc.type === 'RECIBO'}
                          className={`rounded p-1 transition-colors ${
                            currentUser.role === 'user' && doc.type === 'RECIBO'
                              ? 'text-gray-300 cursor-not-allowed opacity-40 bg-transparent'
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={currentUser.role === 'user' && doc.type === 'RECIBO' ? 'Usuário operador não tem permissão para excluir recibos, apenas orçamentos.' : 'Apagar no sistema'}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: FORMULÁRIO DE GERAÇÃO (EMISSÃO) */}
      {showFormModal && (
        <div className="no-print fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  {editId ? 'Configurar Comprovante Solicitado' : `Emitir Novo(a) ${formData.type === 'RECIBO' ? 'Recibo' : 'Orçamento'}`}
                </h3>
                <p className="text-[11px] text-gray-450 mt-0.5">Preencha de forma consolidada os itens e informações abaixo</p>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="rounded p-1 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="overflow-y-auto p-6 space-y-5 flex-1 select-none">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Informações Primárias e Cliente */}
              <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-150 space-y-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Passo 1: Dados do Cliente e Registro</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Empresa Emitente */}
                  <div className="md:col-span-2 bg-blue-50/20 border border-blue-100 p-3 rounded-lg space-y-2">
                    <label className="block text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-blue-650" />
                      Empresa Emitente deste Documento *
                    </label>
                    <select
                      value={formData.company_info?.id || ''}
                      onChange={(e) => {
                        const matched = companies.find(c => String(c.id) === String(e.target.value));
                        if (matched) {
                          setFormData(prev => ({
                            ...prev,
                            company_info: matched,
                            location_date: `${matched.address.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                            notes: prev.type === 'RECIBO' ? matched.notes_recibo_default : matched.notes_orcamento_default
                          }));
                        }
                      }}
                      className="block w-full rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs text-gray-900 font-bold focus:border-blue-500 focus:outline-none"
                    >
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company_name} - CNPJ: {c.cnpj}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-450 leading-relaxed">
                      O comprovante ou orçamento impresso usará os dados cadastrados, logotipo e cláusulas contratuais desta empresa.
                    </p>
                  </div>

                  {/* Autocadastro Rápido */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Selecionar Cadastro Prévio (Opcional)
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="">-- Preencher Manualmente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Nome / Razão Social do Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Identificação do cliente"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      CNPJ ou CPF
                    </label>
                    <input
                      type="text"
                      value={formData.client_cnpj}
                      onChange={(e) => setFormData({ ...formData, client_cnpj: e.target.value })}
                      placeholder="000.000.000-00"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Telefone Celular
                    </label>
                    <input
                      type="text"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="(73) 99999-9999"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={formData.client_address}
                    onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                    placeholder="Rua, Número, Bairro, Itamaraju-BA"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tabela Interativa de Lançamento de Itens */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Passo 2: Itens do Comprovante</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded-lg border border-blue-200"
                  >
                    + Adicionar Linha
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="w-16">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Quant.</label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900 text-center"
                        />
                      </div>

                      <div className="flex-1 relative">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Descrição do Serviço ou Produto</label>
                        <input
                          type="text"
                          required
                          list={`product-suggestions-${index}`}
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Ex: Formatação de Computador / Peça do Motor..."
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900"
                        />
                        <datalist id={`product-suggestions-${index}`}>
                          {products.map(p => (
                            <option key={p.id} value={p.name}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.sale_price)} | Estoque: {p.stock_qty} un
                            </option>
                          ))}
                        </datalist>
                      </div>

                      <div className="w-28">
                        <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Vl. Unitário (R$)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          placeholder="0.00"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-900 text-right"
                        />
                      </div>

                      <div className="w-28 text-right bg-gray-50 p-1.5 rounded border border-gray-200 text-xs font-mono font-bold text-gray-700 min-h-[32px] flex items-center justify-end">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantity || 0) * (item.unit_price || 0))}
                      </div>

                      <button
                        type="button"
                        disabled={formData.items.length === 1}
                        onClick={() => handleRemoveItemRow(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded border border-transparent hover:border-red-250 disabled:opacity-40"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações Finais e Rodapé do Recibo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-200">
                <div className="space-y-4">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Passo 3: Termos, Observações e Pagamento</span>
                  
                  {formData.type === 'RECIBO' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Método de Pagamento
                        </label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none bg-white font-medium"
                        >
                          <option value="PIX">PIX (Mais Recomendado)</option>
                          <option value="Dinheiro">Dinheiro vivo</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Transferência">TED / DOC / Depósito</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Status do Recibo
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as DocumentStatus })}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none bg-white font-medium"
                        >
                          <option value="PAGO">PAGO / CONCLUÍDO</option>
                          <option value="PENDENTE">EM ABERTO (A RECEBER)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Cidade de Assinatura e Data Extensa
                    </label>
                    <input
                      type="text"
                      value={formData.location_date}
                      onChange={(e) => setFormData({ ...formData, location_date: e.target.value })}
                      placeholder="Ex: Itamaraju-BA, 23 de Maio de 2026"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Termos de Garantia e Observações Customizadas (Sobrescreve o Padrão)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Termos específicos aplicados a este serviço/recibo"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Resumo Consolidado do Painel Financeiro */}
                <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-blue-900 uppercase tracking-widest pl-1 border-l-2 border-blue-600 mb-3">Resumo Financeiro</h5>
                    
                    <div className="space-y-2 mt-4 text-xs">
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Soma de Itens:</span>
                        <span className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSubtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="flex items-center gap-1.5">Desconto Aplicado:</span>
                        <input
                          type="number"
                          id="discount-input"
                          min="0"
                          step="0.01"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) || 0 })}
                          className="w-24 text-right rounded border border-gray-300 px-1.5 py-0.5 text-xs font-mono font-bold text-red-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-4 mt-4 flex justify-between items-end">
                    <span className="text-sm font-bold text-blue-950">Valor Final Liquido:</span>
                    <span className="text-2xl font-black text-blue-900 tracking-tight font-sans">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="pt-4 border-t border-gray-150 flex justify-end gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-150 transition-colors"
                >
                  Fechar janela
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors disabled:bg-blue-400"
                >
                  {loading ? 'Processando...' : 'Gravar e Emitir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW COMPARTILHADO COMO NA IMAGEM */}
      {showPreviewModal && selectedDoc && (
        <div className="no-print fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-150 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-150 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Visualização Prévia do Recibo
                </h3>
                <p className="text-[11px] text-gray-500">Este layout simula e imprime o modelo idêntico ao exigido</p>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="rounded p-1 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 bg-gray-100 flex-1">
              <ReceiptPrintView document={selectedDoc} settings={settings} />
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Pressione <strong className="text-gray-800">Imprimir</strong> para ativar a janela nativa de geração de PDF ecológico.
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar Visualização
                </button>
                <button
                  onClick={() => handleOpenShare(selectedDoc, 'whatsapp')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-1"
                >
                  <Send className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => triggerPrintFlow(selectedDoc)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Comprovante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPARTILHAMENTO INTELIGENTE (WHATSAPP OU EMAIL) */}
      {showShareModal && selectedDoc && (
        <div className="no-print fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 max-w-md w-full overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                {shareType === 'whatsapp' ? 'Compartilhar por WhatsApp' : 'Enviar Comprovante por E-mail'}
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="rounded p-1 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {shareType === 'whatsapp' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Número do WhatsApp do Cliente (com DDD) *
                  </label>
                  <input
                    type="text"
                    required
                    value={shareData.phone}
                    onChange={(e) => setShareData({ ...shareData, phone: e.target.value })}
                    placeholder="Ex: 73999999999"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Insira apenas dígitos sem parênteses ou traços. Exemplo: 73931911230</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Destinatário (E-mail do Cliente) *
                    </label>
                    <input
                      type="email"
                      required
                      value={shareData.email}
                      onChange={(e) => setShareData({ ...shareData, email: e.target.value })}
                      placeholder="cliente@provedor.com"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Assunto
                    </label>
                    <input
                      type="text"
                      value={shareData.subject}
                      onChange={(e) => setShareData({ ...shareData, subject: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Mensagem Customizada de Acompanhamento
                </label>
                <textarea
                  rows={4}
                  value={shareData.message}
                  onChange={(e) => setShareData({ ...shareData, message: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-150 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendShare}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                >
                  {loading ? 'Disparando...' : shareType === 'whatsapp' ? 'Solicitar Redirecionamento' : 'Enviar Documento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
