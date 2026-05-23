import React, { useState, useEffect } from 'react';
import { FinancialStats, DocumentStatus } from '../types';
import { TrendingUp, Award, Calendar, BarChart3, AlertCircle, FileText, CheckCircle2, DollarSign, Wallet } from 'lucide-react';

export const ReportsTab: React.FC = () => {
  const [stats, setStats] = useState<FinancialStats | null>(null);
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

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center py-16 gap-2 text-gray-500 text-sm">
        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Consolidando base financeira...
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

  // Prepara cálculos de proporção máxima para gráfico de barras SVG customizado de alta qualidade
  const monthlyReceipts = stats?.monthlyReceipts || [];
  const monthlyBudgets = stats?.monthlyBudgets || [];
  const maxVal = Math.max(
    ...monthlyReceipts.map(r => r.amount),
    ...monthlyBudgets.map(b => b.amount),
    5000 // Valor mínimo de teto para escala
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-850">Relatórios Financeiros Automáticos</h2>
        <p className="text-xs text-gray-500">Métricas analíticas consolidadas em tempo real sobre faturamento, ordens abertas e orçamentos emitidos</p>
      </div>

      {stats && (
        <>
          {/* Bento Grid de Indicadores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <span className="text-[10px] uppercase font-bold text-gray-400 font-sans">A Receber</span>
                <p className="text-2xl font-black text-gray-950 tracking-tight">{formatBRL(stats.pendingReceiptsAmount)}</p>
                <span className="text-[10px] text-yellow-600 font-semibold block">Faturamento em aberto</span>
              </div>
              <div className="rounded-lg bg-yellow-50 p-2 text-yellow-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total em Orçamentos</span>
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

          {/* Seção Gráfica */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráficos de Vendas Mensais Customizados em SVG */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Comparação Mensal de Faturamento (R$)
                </h4>
                {/* Legendas */}
                <div className="flex gap-4 text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-green-700">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span> Faturamento Pago
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-700">
                    <span className="h-2 w-2 rounded-full bg-teal-400"></span> Orçamentos Negociados
                  </span>
                </div>
              </div>

              {/* Corpo do Gráfico SVG Altamente Responsivo e Sem Dependências pesadas */}
              <div className="h-72 w-full flex items-end justify-between pt-8 px-2">
                {monthlyReceipts.map((r, i) => {
                  const b = monthlyBudgets[i] || { amount: 0 };
                  const rHeight = `${(r.amount / maxVal) * 100}%`;
                  const bHeight = `${(b.amount / maxVal) * 100}%`;

                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group relative">
                      {/* Tooltip Hover */}
                      <div className="absolute bottom-full mb-2 bg-gray-900 text-white p-2 rounded text-[10px] shadow-md z-10 hidden group-hover:block w-32 text-center">
                        <p className="font-bold border-b border-gray-700 pb-0.5 mb-1">{r.month}</p>
                        <p className="text-green-400">Recibo: {formatBRL(r.amount)}</p>
                        <p className="text-teal-300">Orçam.: {formatBRL(b.amount)}</p>
                      </div>

                      {/* Barras de Medição */}
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

            {/* Painel lateral: Divisão de Faturamento por Status */}
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
                        {/* Barra de Progresso */}
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

              {/* Rodapé explicativo */}
              <div className="mt-6 bg-blue-50/50 p-3 rounded-lg border border-blue-150 text-[10px] text-gray-600 leading-normal">
                Análise baseada em dados reais e atualizações instantâneas de caixa. Converta orçamentos periodicamente para acelerar receitas!
              </div>
            </div>
          </div>

          {/* Últimas Atividades e Logs Recentes */}
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 mb-4">Registro Operacional Recente (Auditoria de Usuários)</h4>
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
                        {act.id}
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
        </>
      )}
    </div>
  );
};
