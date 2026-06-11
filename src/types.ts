/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentType = 'RECIBO' | 'ORCAMENTO';
export type DocumentStatus = 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface User {
  id: string | number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  permissions?: string[]; // Ex: ['documents', 'clients', 'reports', 'settings', 'users']
}

export interface Client {
  id: string | number;
  name: string;
  cnpj_cpf: string;
  address: string;
  phone: string;
  email: string;
  created_at?: string;
}

export interface DocumentItem {
  id?: string | number;
  quantity: number;
  description: string;
  unit_price: number;
  total_price: number;
}

export interface Document {
  id: string | number;
  number: string;
  type: DocumentType;
  client_id?: string | number | null;
  client_name: string;
  client_cnpj: string;
  client_address: string;
  client_phone: string;
  items: DocumentItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: DocumentStatus;
  payment_method: string;
  issue_date: string;
  location_date: string;
  notes: string;
  company_info?: CompanySettings | null;
  convert_from_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CompanySettings {
  company_name: string;
  cnpj: string;
  ie: string;
  address: string;
  phone: string;
  email: string;
  logo_base64?: string | null;
  notes_recibo_default: string;
  notes_orcamento_default: string;
}

export interface FinancialStats {
  totalReceiptsAmount: number;
  totalBudgetsAmount: number;
  paidReceiptsAmount: number;
  pendingReceiptsAmount: number;
  receiptCount: number;
  budgetCount: number;
  monthlyReceipts: { month: string; amount: number }[];
  monthlyBudgets: { month: string; amount: number }[];
  statusDistribution: { status: DocumentStatus; count: number; total: number }[];
  recentActivity: { id: string | number; type: DocumentType; client_name: string; total: number; issue_date: string; status: DocumentStatus }[];
}

export interface Product {
  id: string | number;
  name: string;
  sale_price: number;
  stock_qty: number;
  created_at?: string;
  updated_at?: string;
}

