import React from 'react';
import { Document, CompanySettings } from '../types';

interface ReceiptPrintViewProps {
  document: Document;
  settings: CompanySettings;
}

export const ReceiptPrintView: React.FC<ReceiptPrintViewProps> = ({ document, settings }) => {
  const totalBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Garante pelo menos 10 linhas na tabela de itens para parecer com o formulário impresso físico original
  const itemsRequired = 10;
  const displayItems = [...document.items];
  while (displayItems.length < itemsRequired) {
    displayItems.push({
      quantity: 0,
      description: '',
      unit_price: 0,
      total_price: 0
    });
  }

  // Renderiza o logotipo padrão do modelo caso o usuário não tenha anexado um personalizado
  const renderLogo = () => {
    if (settings.logo_base64) {
      return (
        <img 
          src={settings.logo_base64} 
          alt="Logotipo" 
          className="max-h-16 max-w-[160px] object-contain"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Logo SVG vetorizado idêntico ao modelo da Unity Automações
    return (
      <div className="flex items-center gap-1">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
          {/* Barras decorativas laranjas nas laterais */}
          <rect x="15" y="30" width="8" height="40" rx="3" fill="#EAB308" opacity="0.7" />
          <rect x="27" y="25" width="8" height="50" rx="3" fill="#EAB308" />
          <rect x="65" y="25" width="8" height="50" rx="3" fill="#EAB308" />
          <rect x="77" y="30" width="8" height="40" rx="3" fill="#EAB308" opacity="0.7" />
          {/* Letra U central azul estilizada */}
          <path d="M40 30V55C40 60.5228 44.4772 65 50 65C55.5228 65 60 60.5228 60 55V30H68V55C68 64.9411 59.9411 73 50 73C40.0589 73 32 64.9411 32 55V30H40Z" fill="#2563EB" />
          {/* Linha horizontal para dar base */}
          <rect x="35" y="15" width="30" height="5" rx="1" fill="#2563EB" opacity="0.2" />
        </svg>
        <div className="flex flex-col select-none">
          <span className="font-sans font-bold leading-none text-blue-800 text-[18px] tracking-widest">UNITY</span>
          <span className="font-mono text-[9px] text-yellow-600 font-semibold tracking-wider">AUTOMAÇÕES</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      id="printable-receipt"
      className="print-area bg-white text-gray-900 p-8 font-sans border border-gray-200 max-w-[850px] mx-auto shadow-sm"
    >
      {/* Topo / Cabeçalho */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
        <div className="w-1/3">
          {renderLogo()}
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-3xl font-bold text-gray-800 tracking-wider">
            {document.type === 'RECIBO' ? 'RECIBO' : 'ORÇAMENTO'}
          </h1>
          <span className="text-xs text-gray-500 font-mono font-semibold">Nº {document.number}</span>
        </div>
        <div className="w-1/3 text-right">
          {document.type === 'RECIBO' && (
            <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${
              document.status === 'PAGO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {document.status === 'PAGO' ? 'PAGO' : 'PENDENTE'}
            </span>
          )}
          {document.type === 'ORCAMENTO' && (
            <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
              ORÇAMENTO
            </span>
          )}
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 uppercase">{settings.company_name}</h2>
        <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600 mt-1">
          <p><span className="font-medium text-gray-800">CNPJ:</span> {settings.cnpj} - <span className="font-medium text-gray-800">IE:</span> {settings.ie}</p>
          <p><span className="font-medium text-gray-800">Telefone:</span> {settings.phone}</p>
          <p className="col-span-2"><span className="font-medium text-gray-800">Endereço:</span> {settings.address}</p>
        </div>
      </div>

      {/* Tabela de Informações do Cliente */}
      <div className="border border-gray-300 rounded mb-6 text-xs overflow-hidden">
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-8 p-2 border-r border-gray-300 flex items-center bg-gray-50/50">
            <span className="font-bold text-gray-700 w-16">Cliente:</span>
            <span className="text-gray-900 font-medium">{document.client_name}</span>
          </div>
          <div className="col-span-4 p-2 flex items-center bg-gray-50/50">
            <span className="font-bold text-gray-700 w-20">CNPJ/CPF:</span>
            <span className="text-gray-900">{document.client_cnpj || '---'}</span>
          </div>
        </div>
        <div className="grid grid-cols-12">
          <div className="col-span-8 p-2 border-r border-gray-300 flex items-center">
            <span className="font-bold text-gray-700 w-16">Endereço:</span>
            <span className="text-gray-900">{document.client_address || '---'}</span>
          </div>
          <div className="col-span-4 p-2 flex items-center">
            <span className="font-bold text-gray-700 w-20">Telefone:</span>
            <span className="text-gray-900">{document.client_phone || '---'}</span>
          </div>
        </div>
      </div>

      {/* Título de Itens */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b-2 border-gray-800 inline-block px-4 pb-1">
          Itens
        </h3>
      </div>

      {/* Tabela de Itens */}
      <table className="w-full text-xs text-left border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-gray-100 uppercase text-gray-700 font-bold border-b border-gray-300">
            <th className="p-2 border-r border-gray-300 w-20 text-center">Quantidade</th>
            <th className="p-2 border-r border-gray-300 text-left">Descrição</th>
            <th className="p-2 border-r border-gray-300 w-32 text-right">Preço Unitário</th>
            <th className="p-2 w-32 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item, idx) => (
            <tr 
              key={idx} 
              className={`border-b border-gray-200 h-7 ${item.description ? 'font-medium' : 'bg-gray-50/20'}`}
            >
              <td className="p-2 border-r border-gray-300 text-center">
                {item.quantity > 0 ? Number(item.quantity) : ''}
              </td>
              <td className="p-2 border-r border-gray-300">
                {item.description || ''}
              </td>
              <td className="p-2 border-r border-gray-300 text-right">
                {item.unit_price > 0 ? totalBRL(item.unit_price) : ''}
              </td>
              <td className="p-2 text-right">
                {item.total_price > 0 ? totalBRL(item.total_price) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Subtotal, Desconto, Total */}
      <div className="flex justify-end mb-6">
        <div className="w-72 text-xs border border-gray-300 rounded overflow-hidden">
          <div className="flex justify-between p-2 border-b border-gray-200">
            <span className="font-semibold text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-medium">{totalBRL(document.subtotal)}</span>
          </div>
          <div className="flex justify-between p-2 border-b border-gray-200 bg-red-50/30">
            <span className="font-semibold text-red-600">Desconto</span>
            <span className="text-red-700 font-bold">-{totalBRL(document.discount)}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 font-bold text-sm">
            <span className="text-gray-800">Total</span>
            <span className="text-blue-900 font-extrabold">{totalBRL(document.total)}</span>
          </div>
        </div>
      </div>

      {/* Rodapé: Termos + Local e Data */}
      <div className="grid grid-cols-12 gap-4 border border-gray-300 rounded p-3 mb-8 text-[10px] text-gray-600 leading-relaxed bg-gray-50/50">
        <div className="col-span-7 pr-4 border-r border-gray-300">
          <p className="font-bold text-gray-700 uppercase mb-1">Observações / Termos de Garantia</p>
          <div className="whitespace-pre-line space-y-0.5">
            {document.notes || (document.type === 'RECIBO' ? settings.notes_recibo_default : settings.notes_orcamento_default)}
          </div>
        </div>
        <div className="col-span-5 pl-2 flex flex-col justify-between">
          <div>
            <p className="font-bold text-gray-700 uppercase mb-1">Local e Data:</p>
            <div className="border border-gray-300 rounded p-2 bg-white font-medium text-xs text-gray-800 min-h-[36px] flex items-center">
              {document.location_date || `${settings.address.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date(document.issue_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </div>
          </div>
          {document.payment_method && (
            <div className="mt-2">
              <span className="font-bold text-gray-700">Forma de Pagamento:</span> <span className="font-mono bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">{document.payment_method}</span>
            </div>
          )}
        </div>
      </div>

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-6">
        <div className="text-center">
          <div className="border-t border-gray-400 w-11/12 mx-auto pt-2 text-xs font-semibold text-gray-800">
            {settings.company_name.split(' ')[0]} Automações
          </div>
          <span className="text-[9px] text-gray-500 font-mono">Emitente Responsável</span>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 w-11/12 mx-auto pt-2 text-xs font-semibold text-gray-800">
            Assinatura Cliente
          </div>
          <span className="text-[9px] text-gray-500 font-mono">Consumidor / Recebedor</span>
        </div>
      </div>
    </div>
  );
};
