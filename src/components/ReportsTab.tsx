import React, { useState, useEffect } from 'react';
import { FinancialStats, DocumentStatus } from '../types';
import { 
  TrendingUp, Award, Calendar, BarChart3, AlertCircle, FileText, 
  CheckCircle2, DollarSign, Wallet, Package, ArrowLeftRight, Search, 
  Info, AlertTriangle, TrendingDown, Eye 
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

  useEffect(() => {
    fetchStats();
    fetchProductMovements();
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

          {/* Logs Operacionais */}
          {stats && (
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm animate-in fade-in duration-200">
              <h4 className="text-sm font-bold text-gray-800 mb-4">Registro Operacional Recente (Auditoria de Fluxo)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-gray-500">
                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-black">
                    <tr>
                      <th className="px-5 py-3">Ação / Documento</th>
                      <th className="px-5 py-3">Cliente Destinatário</th>
                      <th className="px-5 py-3">Data de Alteração</th>
                      <th className="px-5 py-3">Status Atual</th>
                      <th className="px-5 py-3 text-right">Valor Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {stats.recentActivity.map((act, i) => (
                      <tr key={i} className="hover:bg-gray-50/30">
                        <td className="px-5 py-3 font-mono font-bold text-gray-900">
                          <span className={`inline-block mr-2 px-1 rounded text-[9px] font-black ${
                            act.type === 'RECIBO' ? 'bg-blue-50 text-blue-800' : 'bg-teal-50 text-teal-800'
                          }`}>
                            {act.type}
                          </span>
                          #{act.id}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800">{act.client_name}</td>
                        <td className="px-5 py-3 text-gray-450">{new Date(act.issue_date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            act.status === 'PAGO' ? 'bg-green-100 text-green-800' :
                            act.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-black text-blue-950">{formatBRL(act.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
