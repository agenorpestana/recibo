import React, { useState, useEffect } from 'react';
import { FinancialStats, DocumentStatus, Document, CompanySettings } from '../types';
import { 
  TrendingUp, Award, Calendar, BarChart3, AlertCircle, FileText, 
  CheckCircle2, DollarSign, Wallet, Package, ArrowLeftRight, Search, 
  Info, AlertTriangle, TrendingDown, Eye, Printer, X, SlidersHorizontal
} from 'lucide-react';

interface ProductMovement {
  document_id: string | number;
  document_number: string;
  client_name: string;
  issue_date: string;
  status: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ProductSummary {
  id: string | number;
  name: string;
  current_stock: number;
  sale_price: number;
  total_qty_sold: number;
  total_revenue: number;
}

export const ReportsTab: React.FC = () => {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [subTab, setSubTab] = useState<'financial' | 'products'>('financial');
  
  // Estados para movimentação de produtos
  const [productMovements, setProductMovements] = useState<ProductMovement[]>([]);
  const [productsSummary, setProductsSummary] = useState<ProductSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Relatório Financeiro Avançado (Filtros, Impressão, Configurações)
  const [documents, setDocuments] = useState<Document[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportClient, setReportClient] = useState('');
  const [reportStatus, setReportStatus] = useState<'todos' | 'PAGO' | 'PENDENTE' | 'CANCELADO'>('todos');
  const [reportType, setReportType] = useState<'todos' | 'RECIBO' | 'ORCAMENTO'>('todos');
  const [reportFormat, setReportFormat] = useState<'sintetico' | 'analitico'>('sintetico');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/stats');
      if (!response.ok) throw new Error('Falha ao consolidar relatórios.');
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductMovements = async () => {
    try {
      const response = await fetch('/api/reports/product-movements');
      if (response.ok) {
        const data = await response.json();
        setProductMovements(data.movements || []);
        setProductsSummary(data.productsSummary || []);
      }
    } catch (e) {
      console.error('Erro ao ler relatório de produtos:', e);
    }
  };

  const fetchDocumentsAndSettings = async () => {
    try {
      const docRes = await fetch('/api/documents');
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData);
      }
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        setCompanySettings(setData);
      }
    } catch (e) {
      console.error('Erro ao buscar documentos ou configurações em ReportsTab:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProductMovements();
    fetchDocumentsAndSettings();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center py-16 gap-2 text-gray-500 text-sm">
        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Consolidando relatórios gerenciais...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-800 text-sm font-medium flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Renderiza o logotipo padrão do modelo caso o usuário não tenha anexado um personalizado
  const renderReportLogo = () => {
    if (companySettings?.logo_base64) {
      return (
        <img 
          src={companySettings.logo_base64} 
          alt="Logotipo" 
          className="max-h-12 max-w-[140px] object-contain inline-block"
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <div className="flex items-center gap-1">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
          <rect x="15" y="30" width="8" height="40" rx="3" fill="#EAB308" opacity="0.7" />
          <rect x="27" y="25" width="8" height="50" rx="3" fill="#EAB308" />
          <rect x="65" y="25" width="8" height="50" rx="3" fill="#EAB308" />
          <rect x="77" y="30" width="8" height="40" rx="3" fill="#EAB308" opacity="0.7" />
          <path d="M40 30V55C40 60.5228 44.4772 65 50 65C55.5228 65 60 60.5228 60 55V30H68V55C68 64.9411 59.9411 73 50 73C40.0589 73 32 64.9411 32 55V30H40Z" fill="#2563EB" />
          <rect x="35" y="15" width="30" height="5" rx="1" fill="#2563EB" opacity="0.2" />
        </svg>
        <div className="flex items-center gap-1 ml-1">
          <span className="font-sans font-bold leading-none text-blue-800 text-[14px] tracking-widest">UNITY</span>
          <span className="font-mono text-[8px] text-yellow-600 font-semibold tracking-wider">AUTOMAÇÕES</span>
        </div>
      </div>
    );
  };

  // Filtra os documentos com base nas seleções de Relatório Financeiro do usuário
  const filteredDocuments = documents.filter((doc) => {
    // 1. Filtro por Data de Início
    if (reportStartDate) {
      if (doc.issue_date < reportStartDate) return false;
    }

    // 2. Filtro por Data de Fim
    if (reportEndDate) {
      if (doc.issue_date > reportEndDate) return false;
    }

    // 3. Filtro por Cliente
    if (reportClient) {
      const name = doc.client_name || '';
      if (!name.toLowerCase().includes(reportClient.toLowerCase())) return false;
    }

    // 4. Filtro por Status
    if (reportStatus !== 'todos') {
      if (doc.status !== reportStatus) return false;
    }

    // 5. Filtro por Tipo (Recibo / Orçamento)
    if (reportType !== 'todos') {
      if (doc.type !== reportType) return false;
    }

    return true;
  });

  // Totais do Relatório Filtrado
  const totalFilteredCount = filteredDocuments.length;
  const totalFilteredPaid = filteredDocuments
    .filter(d => d.status === 'PAGO')
    .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  const totalFilteredPending = filteredDocuments
    .filter(d => d.status === 'PENDENTE')
    .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  const totalFilteredCancelled = filteredDocuments
    .filter(d => d.status === 'CANCELADO')
    .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
  const totalFilteredAmount = filteredDocuments
    .filter(d => d.status !== 'CANCELADO') // Soma líquida: desconsidera cancelados
    .reduce((sum, d) => sum + (Number(d.total) || 0), 0);

  // Prepara cálculos para o gráfico de barras das finanças
  const monthlyReceipts = stats?.monthlyReceipts || [];
  const monthlyBudgets = stats?.monthlyBudgets || [];
  const maxVal = Math.max(
    ...monthlyReceipts.map(r => r.amount),
    ...monthlyBudgets.map(b => b.amount),
    5000
  );

  // Cálculos de estoque/infraestrutura de produtos
  const totalOutboundUnits = productMovements
    .filter(m => m.status !== 'CANCELADO')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalWarehouseValue = productsSummary.reduce((sum, p) => sum + (p.current_stock * p.sale_price), 0);
  const lowStockCount = productsSummary.filter(p => p.current_stock <= 5).length;
  const outOfStockCount = productsSummary.filter(p => p.current_stock <= 0).length;

  // Filtragem da lista para o relatório de movimentações
  const filteredSummary = productsSummary.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = productMovements.filter(m => 
    m.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(m.document_number).includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-850">Relatórios Gerenciais Inteligentes</h2>
          <p className="text-xs text-gray-500">
            Acompanhe em tempo real o fluxo de faturamento financeiro e o balanço do estoque de produtos
          </p>
        </div>

        {/* Alternador de Relatório */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setSubTab('financial')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              subTab === 'financial'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Visão Financeira
          </button>
          <button
            onClick={() => setSubTab('products')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              subTab === 'products'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Movimentação de Produtos
          </button>
        </div>
      </div>

      {subTab === 'financial' ? (
        <>
          {/* Bento Grid de Indicadores Principais Financeiros */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Total Faturado</span>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{formatBRL(stats.paidReceiptsAmount)}</p>
                  <span className="text-[10px] text-green-600 font-semibold block">Recibos Pagos ({stats.receiptCount})</span>
                </div>
                <div className="rounded-lg bg-green-50 p-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">A Receber</span>
                  <p className="text-2xl font-black text-gray-950 tracking-tight">{formatBRL(stats.pendingReceiptsAmount)}</p>
                  <span className="text-[10px] text-yellow-600 font-semibold block">Faturamento em aberto</span>
                </div>
                <div className="rounded-lg bg-yellow-50 p-2 text-yellow-600">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 font-sans">Total em Orçamentos</span>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{formatBRL(stats.totalBudgetsAmount)}</p>
                  <span className="text-[10px] text-teal-600 font-semibold block">{stats.budgetCount} Orçamentos ativos</span>
                </div>
                <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
                  <FileText className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Soma de Conversões</span>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">{formatBRL(stats.totalReceiptsAmount)}</p>
                  <span className="text-[10px] text-blue-600 font-semibold block">Total em Recibos Emitidos</span>
                </div>
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {/* Seção Gráfica e Distribuição */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
              {/* Grafico SVG */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Comparação Mensal de Faturamento (R$)
                  </h4>
                  <div className="flex gap-4 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 text-green-700">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span> Faturamento Pago
                    </span>
                    <span className="flex items-center gap-1.5 text-teal-700">
                      <span className="h-2 w-2 rounded-full bg-teal-400"></span> Orçamentos Negociados
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full flex items-end justify-between pt-8 px-2">
                  {monthlyReceipts.map((r, i) => {
                    const b = monthlyBudgets[i] || { amount: 0 };
                    const rHeight = `${(r.amount / maxVal) * 100}%`;
                    const bHeight = `${(b.amount / maxVal) * 100}%`;

                    return (
                      <div key={i} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-gray-900 text-white p-2 rounded text-[10px] shadow-md z-10 hidden group-hover:block w-32 text-center pointer-events-none">
                          <p className="font-bold border-b border-gray-700 pb-0.5 mb-1">{r.month}</p>
                          <p className="text-green-400">Recibo: {formatBRL(r.amount)}</p>
                          <p className="text-teal-300">Orçam.: {formatBRL(b.amount)}</p>
                        </div>

                        {/* Barras */}
                        <div className="w-full flex justify-center items-end gap-1 px-1 h-44">
                          <div 
                            style={{ height: rHeight === '0%' && r.amount > 0 ? '4px' : rHeight }}
                            className="w-3 sm:w-4 bg-green-500 hover:bg-green-600 rounded-t transition-all cursor-pointer"
                          ></div>
                          <div 
                            style={{ height: bHeight === '0%' && b.amount > 0 ? '4px' : bHeight }}
                            className="w-3 sm:w-4 bg-teal-400 hover:bg-teal-500 rounded-t transition-all cursor-pointer"
                          ></div>
                        </div>

                        <span className="text-[10px] font-bold text-gray-400 mt-2">{r.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distribuição por Status */}
              <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
                    Distribuição por Status (Recibos)
                  </h4>

                  <div className="space-y-4">
                    {stats.statusDistribution.map((dist, i) => {
                      const pct = stats.receiptCount > 0 ? Math.round((dist.count / stats.receiptCount) * 100) : 0;
                      
                      const colorClass = dist.status === 'PAGO' ? 'bg-green-500' :
                                         dist.status === 'PENDENTE' ? 'bg-yellow-500' : 'bg-red-500';

                      const textClass = dist.status === 'PAGO' ? 'text-green-700' :
                                        dist.status === 'PENDENTE' ? 'text-yellow-700' : 'text-red-700';

                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-bold uppercase text-[10px] ${textClass}`}>{dist.status} ({dist.count} un)</span>
                            <span className="font-semibold text-gray-800">{formatBRL(dist.total)} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full ${colorClass}`} 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 bg-blue-50/50 p-3 rounded-lg border border-blue-150 text-[10px] text-gray-600 leading-normal">
                  Análise baseada em dados reais e atualizações instantâneas de caixa. Altere ou liquide recibos em aberto para balancear receitas.
                </div>
              </div>
            </div>
          )}

          {/* Relatório Financeiro Avançado (Filtros, Pesquisa e Impressão) */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
              <div>
                <h4 className="text-base font-bold text-gray-850 flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                  Gerador de Relatórios & Filtro de Lançamentos
                </h4>
                <p className="text-xs text-gray-500">
                  Busque lançamentos por data, cliente ou status para imprimir ou exportar em formato A4
                </p>
              </div>

              {/* Botão de Impressão Geral */}
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm transition-all self-start sm:self-auto cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Exportar PDF (A4)
              </button>
            </div>

            {/* Painel de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-150">
              {/* Data Inicial */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data Inicial</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none font-medium"
                />
              </div>

              {/* Data Final */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data Final</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none font-medium"
                />
              </div>

              {/* Filtro Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none font-semibold"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="PAGO">Pago</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>

              {/* Filtro Tipo */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none font-semibold"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="RECIBO">Recibos</option>
                  <option value="ORCAMENTO">Orçamentos</option>
                </select>
              </div>

              {/* Formato do Relatório */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Formato</label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value as any)}
                  className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-none font-semibold"
                >
                  <option value="sintetico">Sintético</option>
                  <option value="analitico">Analítico</option>
                </select>
              </div>

              {/* Limpar Filtros */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setReportStartDate('');
                    setReportEndDate('');
                    setReportClient('');
                    setReportStatus('todos');
                    setReportType('todos');
                    setReportFormat('sintetico');
                  }}
                  className="w-full px-4 py-2 border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            {/* Busca por Cliente */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Busque pelo nome do cliente..."
                value={reportClient}
                onChange={(e) => setReportClient(e.target.value)}
                className="block w-full rounded-lg border border-gray-150 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none font-medium"
              />
            </div>

            {/* Listagem de Resultados Filtrados */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="min-w-full text-left text-xs text-gray-500">
                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Nº do Documento</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Cliente Destinatário</th>
                    <th className="px-5 py-3 text-center">Data de Emissão</th>
                    <th className="px-5 py-3">Forma Pagamento</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Valor Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-400 font-bold bg-gray-50/10">
                        Nenhum lançamento corresponde aos filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <React.Fragment key={doc.id}>
                        <tr className="hover:bg-gray-50/30 font-medium">
                          <td className="px-5 py-3 font-mono font-bold text-gray-900">
                            #{doc.number}
                          </td>
                          <td className="px-5 py-3 text-[10px] font-extrabold uppercase">
                            <span className={`px-1.5 py-0.5 rounded ${
                              doc.type === 'RECIBO' ? 'bg-blue-50 text-blue-800' : 'bg-teal-50 text-teal-850'
                            }`}>
                              {doc.type}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-850 truncate max-w-[200px]" title={doc.client_name}>
                            {doc.client_name}
                          </td>
                          <td className="px-5 py-3 text-center text-gray-450">
                            {new Date(doc.issue_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-3 font-mono text-[10px]">{doc.payment_method || 'PIX'}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                              doc.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                              doc.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-black text-blue-950">
                            {formatBRL(doc.total)}
                          </td>
                        </tr>
                        {reportFormat === 'analitico' && doc.items && doc.items.length > 0 && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={7} className="px-5 py-2 pb-3">
                              <div className="border border-gray-150 rounded-lg overflow-hidden bg-white max-w-4xl ml-6 mr-6">
                                <table className="min-w-full divide-y divide-gray-100 text-[11px]">
                                  <thead className="bg-gray-50 text-gray-400 font-extrabold uppercase text-[9px] tracking-wider">
                                    <tr>
                                      <th className="px-4 py-1.5 text-left">Item / Descrição</th>
                                      <th className="px-4 py-1.5 text-center w-24">Qtd</th>
                                      <th className="px-4 py-1.5 text-right w-32">Valor Unitário</th>
                                      <th className="px-4 py-1.5 text-right w-32">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-gray-650">
                                    {doc.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50/30">
                                        <td className="px-4 py-1.5 font-medium">{item.description}</td>
                                        <td className="px-4 py-1.5 text-center font-mono font-bold text-gray-700">{item.quantity}</td>
                                        <td className="px-4 py-1.5 text-right font-mono">{formatBRL(item.unit_price)}</td>
                                        <td className="px-4 py-1.5 text-right font-mono font-bold text-gray-900">{formatBRL(item.total_price)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Banner de Resumo Financeiro */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-150 text-center font-bold">
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Qtd de Lançamentos</span>
                <span className="text-lg font-black text-slate-800">{totalFilteredCount} un</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-green-500 uppercase tracking-wider">Total Pago</span>
                <span className="text-lg font-black text-green-700">{formatBRL(totalFilteredPaid)}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-yellow-500 uppercase tracking-wider">Total Pendente</span>
                <span className="text-lg font-black text-yellow-700">{formatBRL(totalFilteredPending)}</span>
              </div>
              <div className="space-y-1 bg-blue-50/30 rounded-lg p-2 border border-blue-100/50">
                <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-wider">Faturamento Geral (Líquido)</span>
                <span className="text-lg font-black text-blue-900">{formatBRL(totalFilteredAmount)}</span>
              </div>
            </div>
          </div>

          {/* Modal de Impressão A4 */}
          {showPrintModal && (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 overflow-y-auto flex flex-col justify-start no-print animate-in fade-in duration-200">
              {/* Barra de Ferramentas */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 shadow-md select-none z-50">
                <div className="flex items-center gap-2.5">
                  <div className="bg-blue-600 rounded-lg p-1.5 text-white">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-white">Visualização de Relatório Financeiro A4</h3>
                    <p className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider mt-0.5">Clique em "Imprimir" e configure o destino como "Salvar como PDF"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="px-3 py-1.5 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    Fechar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs hover:shadow shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir / Exportar PDF (A4)
                  </button>
                </div>
              </div>

              {/* Área do Relatório A4 */}
              <div className="flex-1 py-10 px-4 bg-slate-100 flex justify-center selection:bg-blue-100">
                <div className="print-area bg-white text-gray-950 p-12 border border-gray-200 w-full max-w-[850px] min-h-[1100px] shadow-2xl flex flex-col font-sans select-text leading-relaxed">
                  
                  {/* Cabeçalho da Empresa */}
                  <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5 mb-6">
                    <div className="w-1/2">
                      {renderReportLogo()}
                      <p className="text-[9px] text-gray-500 font-mono mt-1 font-bold">GERADO EM {new Date().toLocaleDateString('pt-BR')} ÀS {new Date().toLocaleTimeString('pt-BR')}</p>
                    </div>
                    <div className="w-1/2 text-right">
                      <h2 className="text-xs font-black text-gray-900 uppercase tracking-wide">{companySettings?.company_name || 'Unity Automações LTDA'}</h2>
                      <div className="text-[9px] text-gray-500 font-medium space-y-0.5 mt-1 leading-normal">
                        <p><span className="font-bold text-gray-700">CNPJ:</span> {companySettings?.cnpj || 'N/A'} | <span className="font-bold text-gray-700">IE:</span> {companySettings?.ie || 'N/A'}</p>
                        <p><span className="font-bold text-gray-700">Endereço:</span> {companySettings?.address || 'N/A'}</p>
                        <p><span className="font-bold text-gray-700">Contato:</span> {companySettings?.phone || 'N/A'} | {companySettings?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Título Principal */}
                  <div className="text-center mb-6">
                    <h1 className="text-lg font-black text-gray-950 uppercase tracking-widest border-b-2 border-gray-800 inline-block px-6 pb-1.5">
                      Relatório de Movimentação Financeira
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold tracking-wider mt-2">
                      DEMONSTRATIVO DE CAIXA E FLUXO DE ENTRADAS
                    </p>
                  </div>

                  {/* Filtros Aplicados */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6 grid grid-cols-5 gap-4 text-[10px] text-gray-600 leading-normal">
                    <div>
                      <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Período</span>
                      <span className="font-bold text-gray-800">
                        {reportStartDate ? new Date(reportStartDate).toLocaleDateString('pt-BR') : 'Início'} a {reportEndDate ? new Date(reportEndDate).toLocaleDateString('pt-BR') : 'Fim'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Cliente</span>
                      <span className="font-bold text-gray-800 truncate block">
                        {reportClient || 'Todos os Clientes'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                      <span className={`font-bold uppercase ${
                        reportStatus === 'PAGO' ? 'text-green-700' :
                        reportStatus === 'PENDENTE' ? 'text-yellow-700' :
                        reportStatus === 'CANCELADO' ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {reportStatus === 'todos' ? 'Todos os Status' : reportStatus}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Tipo</span>
                      <span className="font-bold text-gray-800 uppercase">
                        {reportType === 'todos' ? 'Todos os Tipos' : reportType}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider">Formato</span>
                      <span className="font-bold text-gray-800 uppercase">
                        {reportFormat === 'analitico' ? 'Analítico' : 'Sintético'}
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Lançamentos */}
                  <div className="flex-1">
                    <table className="w-full text-left text-[10px] border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 text-gray-900 border-b border-gray-300 font-black uppercase text-[8px] tracking-wide">
                          <th className="p-2 border-r border-gray-300 w-28">Nº Documento</th>
                          <th className="p-2 border-r border-gray-300 w-20">Tipo</th>
                          <th className="p-2 border-r border-gray-300">Cliente</th>
                          <th className="p-2 border-r border-gray-300 w-20 text-center font-mono">Emissão</th>
                          <th className="p-2 border-r border-gray-300 w-24">Forma Pagto</th>
                          <th className="p-2 border-r border-gray-300 w-16 text-center">Status</th>
                          <th className="p-2 w-28 text-right">Valor Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-800 font-medium">
                        {filteredDocuments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400 font-bold bg-gray-50/50">
                              Nenhum lançamento corresponde aos filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          filteredDocuments.map((doc) => (
                            <React.Fragment key={doc.id}>
                              <tr className="hover:bg-gray-50/20 h-6.5">
                                <td className="p-2 border-r border-gray-300 font-mono font-bold text-gray-950">
                                  #{doc.number}
                                </td>
                                <td className="p-2 border-r border-gray-300 text-[9px] font-black uppercase">
                                  {doc.type}
                                </td>
                                <td className="p-2 border-r border-gray-300 truncate max-w-[200px]" title={doc.client_name}>
                                  {doc.client_name}
                                </td>
                                <td className="p-2 border-r border-gray-300 text-center text-gray-600 font-mono">
                                  {new Date(doc.issue_date).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-2 border-r border-gray-300 truncate text-[9px] font-mono">
                                  {doc.payment_method || 'PIX'}
                                </td>
                                <td className="p-2 border-r border-gray-300 text-center font-extrabold uppercase text-[9px]">
                                  {doc.status}
                                </td>
                                <td className="p-2 text-right font-black text-gray-950">
                                  {formatBRL(doc.total)}
                                </td>
                              </tr>
                              {reportFormat === 'analitico' && doc.items && doc.items.length > 0 && (
                                <tr className="bg-gray-50/50 no-break-inside">
                                  <td colSpan={7} className="p-2 pl-6 pb-2.5">
                                    <div className="border border-gray-300 rounded overflow-hidden bg-white">
                                      <table className="w-full divide-y divide-gray-200 text-[8.5px]">
                                        <thead className="bg-gray-100 text-gray-700 font-black uppercase text-[7.5px] tracking-wider">
                                          <tr>
                                            <th className="p-1 text-left pl-2">Descrição do Item / Produto</th>
                                            <th className="p-1 text-center w-16">Qtd</th>
                                            <th className="p-1 text-right w-24">Preço Unitário</th>
                                            <th className="p-1 text-right w-24 pr-2">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-150 text-gray-800 font-medium">
                                          {doc.items.map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="p-1 pl-2">{item.description}</td>
                                              <td className="p-1 text-center font-mono font-bold">{item.quantity}</td>
                                              <td className="p-1 text-right font-mono">{formatBRL(item.unit_price)}</td>
                                              <td className="p-1 text-right font-mono font-black text-gray-950 pr-2">{formatBRL(item.total_price)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo de Totais */}
                  <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden text-[10px]">
                    <div className="grid grid-cols-5 divide-x divide-gray-300 bg-gray-50 font-bold text-gray-800 text-center">
                      <div className="p-2">
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Registros</span>
                        <span className="text-xs font-black text-slate-800">{totalFilteredCount} un</span>
                      </div>
                      <div className="p-2">
                        <span className="block text-[8px] font-bold text-green-500 uppercase tracking-wider mb-0.5">Total Pago</span>
                        <span className="text-xs font-black text-green-700">{formatBRL(totalFilteredPaid)}</span>
                      </div>
                      <div className="p-2">
                        <span className="block text-[8px] font-bold text-yellow-500 uppercase tracking-wider mb-0.5">Total Pendente</span>
                        <span className="text-xs font-black text-yellow-700">{formatBRL(totalFilteredPending)}</span>
                      </div>
                      <div className="p-2">
                        <span className="block text-[8px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Total Cancelado</span>
                        <span className="text-xs font-black text-red-700">{formatBRL(totalFilteredCancelled)}</span>
                      </div>
                      <div className="p-2 bg-blue-50/40 font-black">
                        <span className="block text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Faturamento Geral</span>
                        <span className="text-xs font-extrabold text-blue-900">{formatBRL(totalFilteredAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do PDF */}
                  <div className="mt-10 border-t border-gray-200 pt-5 flex items-center justify-between text-[8px] text-gray-400">
                    <div>
                      <p className="font-mono">Código do Relatório: <span className="font-bold text-gray-600">FR-{Date.now().toString(16).toUpperCase()}</span></p>
                      <p className="mt-0.5 font-medium">Balanço corporativo gerado pelo sistema integrado. Emitido eletronicamente.</p>
                    </div>
                    <div className="text-center w-40 border-t border-gray-300 pt-3">
                      <div className="font-bold text-gray-600 text-[9px]">Assinatura Responsável</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Bento Grid do Estoque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total de Saídas de Estoque</span>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{totalOutboundUnits} un</p>
                <span className="text-[10px] text-blue-600 font-semibold block">Registrados em recibos válidos</span>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Patrimônio em Estoque</span>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{formatBRL(totalWarehouseValue)}</p>
                <span className="text-[10px] text-green-600 font-semibold block">Valor total dos itens na base</span>
              </div>
              <div className="rounded-lg bg-green-50 p-2 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Alerta de Estoque Baixo</span>
                <p className="text-2xl font-black text-amber-600 tracking-tight">{lowStockCount} itens</p>
                <span className="text-[10px] text-gray-500 font-semibold block">Quantidade igual ou menor que 5</span>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Sem Estoque (Zeradizados)</span>
                <p className="text-2xl font-black text-red-600 tracking-tight">{outOfStockCount} itens</p>
                <span className="text-[10px] text-red-500 font-semibold block">Produtos com estoque nulo</span>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Barra de pesquisa de produtos */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquise por produto ou por destinatário do recibo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border border-gray-150 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Tabela de Resumo dos Produtos (Esquerda - 2 Colunas) */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
                <Package className="h-4.5 w-4.5 text-blue-600" />
                Desempenho de Vendas e Níveis de Estoque por Produto
              </h4>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-500">
                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black">
                    <tr>
                      <th className="px-4 py-3">Produto / Serviço</th>
                      <th className="px-4 py-3">Estoque Atual</th>
                      <th className="px-4 py-3">Preço</th>
                      <th className="px-4 py-3 text-center">Unidades Saídas</th>
                      <th className="px-4 py-3 text-right">Faturamento Bruto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 text-xs">
                    {filteredSummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 font-medium">
                          Nenhum produto cadastrado corresponde aos critérios.
                        </td>
                      </tr>
                    ) : (
                      filteredSummary.map((prod) => (
                        <tr key={prod.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3.5 font-bold text-gray-900">{prod.name}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              prod.current_stock <= 0 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : prod.current_stock <= 5 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {prod.current_stock} un
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-650">{formatBRL(prod.sale_price)}</td>
                          <td className="px-4 py-3.5 text-center font-bold text-blue-600">
                            {prod.total_qty_sold > 0 ? `${prod.total_qty_sold} un` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-gray-900">
                            {prod.total_revenue > 0 ? formatBRL(prod.total_revenue) : formatBRL(0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Caixa Informativa lateral */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
                  <Info className="h-4 w-4 text-amber-550" />
                  Política Geral de Baixas e Ajustes
                </h4>
                <div className="space-y-4 text-xs text-gray-650 leading-relaxed">
                  <div className="flex gap-2 items-start">
                    <div className="rounded-full bg-blue-50 p-1 text-blue-600 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Emissão de Recibos</p>
                      <p className="text-[11px] text-gray-500">Ao faturar um recibo ativo, os itens correspondentes dão baixa imediata no estoque disponível.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="rounded-full bg-teal-50 p-1 text-teal-600 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 font-sans">Orçamentos Não Abatem</p>
                      <p className="text-[11px] text-gray-500 font-sans">Estimativas de preços (orçamentos) servem apenas para simulação e não impactam seus níveis físicos de estoque.</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <div className="rounded-full bg-amber-50 p-1 text-amber-600 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Cancelamento & Exclusão</p>
                      <p className="text-[11px] text-gray-500">Se você cancelar ou excluir de forma definitiva um recibo, o sistema estorna a quantidade dos itens de volta para o estoque disponível.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-amber-50/50 p-3 rounded-lg border border-amber-150 text-[10px] text-amber-900 leading-normal font-medium">
                Sempre atualize as quantidades no painel "Cadastro de Produtos" quando repor mercadorias fisicamente.
              </div>
            </div>
          </div>

          {/* Histórico Detalhado em Listagem profissional de Movimentações */}
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm animate-in fade-in duration-200">
            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center justify-between">
              <span>Registro Detalhado de Baixas (Histórico de Movimentação)</span>
              <span className="text-[10px] text-gray-400 font-normal">Apenas histórico de recibos emitidos</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-500">
                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black">
                  <tr>
                    <th className="px-5 py-3">Recibo</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Item Baixado</th>
                    <th className="px-5 py-3 text-center">Quantidade</th>
                    <th className="px-5 py-3">Data da Baixa</th>
                    <th className="px-5 py-3">Status do Recibo</th>
                    <th className="px-5 py-3 text-right">Valor total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-400 font-medium">
                        Nenhuma movimentação de produto registrada até o momento.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <tr key={i} className={`hover:bg-gray-50/30 ${log.status === 'CANCELADO' ? 'opacity-45 bg-gray-50/10' : ''}`}>
                        <td className="px-5 py-3 font-mono font-bold text-gray-900">
                          #{log.document_number}
                        </td>
                        <td className="px-5 py-3 text-gray-800">{log.client_name}</td>
                        <td className="px-5 py-3 text-gray-900 font-bold">{log.product_name}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`${log.status === 'CANCELADO' ? 'text-gray-400 font-normal' : 'text-red-650 font-bold'}`}>
                            {log.status === 'CANCELADO' ? '+' : '-'}{log.quantity} un
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-450">{new Date(log.issue_date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            log.status === 'PAGO' ? 'bg-green-100 text-green-800 font-bold' :
                            log.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800 font-bold' : 'bg-red-50 text-red-500 border border-red-200'
                          }`}>
                            {log.status} {log.status === 'CANCELADO' && '(Estorno)'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-black text-gray-900">
                          {formatBRL(log.total_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
