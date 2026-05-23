import fs from 'fs';
import path from 'path';
import { Client, Document, CompanySettings, User, DocumentType, DocumentStatus, FinancialStats } from './src/types';

// O banco de dados local será salvo neste arquivo JSON caso o MySQL não esteja ativo.
// Isso garante persistência imediata no Cloud Run e facilita a exportação para o MySql.
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Certifica-se de que o diretório existirá
const ensureDirExists = () => {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

interface DatabaseSchema {
  users: User[];
  clients: Client[];
  documents: Document[];
  settings: CompanySettings;
}

// Configurações padrão conforme modelo da imagem
const defaultSettings: CompanySettings = {
  company_name: 'UNITY AUTOMACOES LTDA.',
  cnpj: '44.285.891/0001-45',
  ie: '187.652.146 ME',
  address: 'AVENIDA ACM, 548-B, CENTRO, ITAMARAJU-BA',
  phone: '(73)3191-1230',
  email: 'contato@unityautomacoes.com.br',
  logo_base64: null,
  notes_recibo_default: '- Garantia do Serviço 30 dias\n- Garantia de Peças 06 Meses\n- Garantia de Máquina Fechada e 01 Ano\n- Equipamento com mais de 60 dias sem o cliente vir buscar caracteriza abandono, sendo assim será vendido para ressarcir os danos com peças e mão de obra.',
  notes_orcamento_default: 'Este orçamento tem validade de 10 dias corridos a partir da data de emissão. Valores sujeitos a reajuste conforme estoque de insumos e peças de mercado.'
};

const defaultUsers: User[] = [
  {
    id: 1,
    email: 'suporte@unityautomacoes.com.br',
    name: 'Super Usuário Unity',
    role: 'admin'
  }
];

class Database {
  private schema: DatabaseSchema = {
    users: [...defaultUsers],
    clients: [],
    documents: [],
    settings: { ...defaultSettings }
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      ensureDirExists();
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.schema = {
          users: parsed.users || [...defaultUsers],
          clients: parsed.clients || [],
          documents: parsed.documents || [],
          settings: parsed.settings || { ...defaultSettings }
        };
        // Garante que o super usuário administrador padrão sempre exista e esteja correto
        const hasAdmin = this.schema.users.some(u => u.email === 'suporte@unityautomacoes.com.br');
        if (!hasAdmin) {
          this.schema.users.push(defaultUsers[0]);
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Erro ao carregar banco de dados JSON, usando dados em memória:", e);
    }
  }

  private save() {
    try {
      ensureDirExists();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error("Erro ao salvar banco de dados JSON:", e);
    }
  }

  // --- CRUD USUÁRIOS & CONFIGURAÇÕES ---
  
  getSettings(): CompanySettings {
    return this.schema.settings;
  }

  updateSettings(settings: CompanySettings): CompanySettings {
    this.schema.settings = { ...settings };
    this.save();
    return this.schema.settings;
  }

  getUsers(): User[] {
    return this.schema.users;
  }

  getUserByEmail(email: string): User | undefined {
    return this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: Omit<User, 'id'>): User {
    const id = Date.now() + Math.floor(Math.random() * 100);
    const newUser = { ...user, id };
    this.schema.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- CRUD CLIENTES ---

  getClients(): Client[] {
    return this.schema.clients;
  }

  getClientById(id: string | number): Client | undefined {
    return this.schema.clients.find(c => String(c.id) === String(id));
  }

  createClient(client: Omit<Client, 'id'>): Client {
    const id = Date.now() + Math.floor(Math.random() * 100);
    const newClient: Client = { ...client, id };
    this.schema.clients.push(newClient);
    this.save();
    return newClient;
  }

  updateClient(id: string | number, updated: Partial<Client>): Client {
    const index = this.schema.clients.findIndex(c => String(c.id) === String(id));
    if (index === -1) throw new Error("Cliente não encontrado.");
    
    this.schema.clients[index] = {
      ...this.schema.clients[index],
      ...updated,
      id: this.schema.clients[index].id // Garante ID inalterado
    };
    this.save();
    return this.schema.clients[index];
  }

  deleteClient(id: string | number): boolean {
    const originalLength = this.schema.clients.length;
    this.schema.clients = this.schema.clients.filter(c => String(c.id) !== String(id));
    const deleted = this.schema.clients.length < originalLength;
    if (deleted) this.save();
    return deleted;
  }

  // --- CRUD DOCUMENTOS (RECIBOS / ORÇAMENTOS) ---

  getDocuments(): Document[] {
    return this.schema.documents;
  }

  getDocumentById(id: string | number): Document | undefined {
    return this.schema.documents.find(d => String(d.id) === String(id));
  }

  createDocument(doc: Omit<Document, 'id' | 'number'>): Document {
    const id = Date.now() + Math.floor(Math.random() * 100);
    const year = new Date(doc.issue_date || new Date()).getFullYear();
    const prefix = doc.type === 'RECIBO' ? 'REC' : 'ORC';
    
    // Calcula próximo sequencial pelo tipo e ano
    const sameTypeDocs = this.schema.documents.filter(d => d.type === doc.type && d.issue_date.startsWith(String(year)));
    const sequence = sameTypeDocs.length + 1;
    const paddedSeq = String(sequence).padStart(4, '0');
    const number = `${prefix}-${year}-${paddedSeq}`;

    // Calcula preços finais dos itens para garantir que o total de cada item está correto
    const processedItems = doc.items.map((item, index) => {
      const q = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return {
        id: index + 1,
        quantity: q,
        description: item.description || '',
        unit_price: price,
        total_price: q * price
      };
    });

    const subtotal = processedItems.reduce((acc, item) => acc + item.total_price, 0);
    const discount = Number(doc.discount) || 0;
    const total = Math.max(0, subtotal - discount);

    const newDoc: Document = {
      ...doc,
      id,
      number,
      items: processedItems,
      subtotal,
      discount,
      total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.documents.push(newDoc);
    this.save();
    return newDoc;
  }

  updateDocument(id: string | number, updated: Partial<Document>): Document {
    const index = this.schema.documents.findIndex(d => String(d.id) === String(id));
    if (index === -1) throw new Error("Documento não encontrado.");

    const existing = this.schema.documents[index];

    // Se houve mudança de itens ou descontos, recalcula subtotal e total
    let items = updated.items !== undefined ? updated.items : existing.items;
    let discount = updated.discount !== undefined ? Number(updated.discount) : existing.discount;

    // Processa valores dos itens
    const processedItems = items.map((item, idx) => {
      const q = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return {
        id: item.id || (idx + 1),
        quantity: q,
        description: item.description || '',
        unit_price: price,
        total_price: q * price
      };
    });

    const subtotal = processedItems.reduce((acc, item) => acc + item.total_price, 0);
    const total = Math.max(0, subtotal - discount);

    const updatedDoc: Document = {
      ...existing,
      ...updated,
      id: existing.id, // ID imutável
      number: existing.number, // Número imutável
      items: processedItems,
      subtotal,
      discount,
      total,
      updated_at: new Date().toISOString()
    };

    this.schema.documents[index] = updatedDoc;
    this.save();
    return updatedDoc;
  }

  convertBudgetToReceipt(id: string | number): Document {
    const index = this.schema.documents.findIndex(d => String(d.id) === String(id));
    if (index === -1) throw new Error("Orçamento não encontrado.");

    const budget = this.schema.documents[index];
    if (budget.type !== 'ORCAMENTO') {
      throw new Error("Este documento já é um Recibo.");
    }

    // Cria novo recibo copiando os dados do orçamento
    const receiptData: Omit<Document, 'id' | 'number'> = {
      type: 'RECIBO',
      client_id: budget.client_id,
      client_name: budget.client_name,
      client_cnpj: budget.client_cnpj,
      client_address: budget.client_address,
      client_phone: budget.client_phone,
      items: budget.items.map(item => ({
        quantity: item.quantity,
        description: item.description,
        unit_price: item.unit_price,
        total_price: item.total_price
      })),
      subtotal: budget.subtotal,
      discount: budget.discount,
      total: budget.total,
      status: 'PAGO', // Recibos de conversão costumam ser marcados como pagos
      payment_method: budget.payment_method || 'PIX',
      issue_date: new Date().toISOString().split('T')[0],
      location_date: `${this.schema.settings.address.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      notes: this.schema.settings.notes_recibo_default,
      convert_from_id: budget.id
    };

    // Altera o orçamento original para status "CANCELADO" ou o mantém (estaremos mantendo o orçamento e gerando um Recibo associado)
    const newReceipt = this.createDocument(receiptData);
    
    // Atualiza status do orçamento para mostrar que foi convertido
    this.updateDocument(budget.id, { status: 'PAGO', notes: `${budget.notes}\n\n* Convertido em Recibo #${newReceipt.number}` });

    return newReceipt;
  }

  deleteDocument(id: string | number): boolean {
    const originalLength = this.schema.documents.length;
    this.schema.documents = this.schema.documents.filter(d => String(d.id) !== String(id));
    const deleted = this.schema.documents.length < originalLength;
    if (deleted) this.save();
    return deleted;
  }

  // --- CÁLCULO DE RELATÓRIO FINANCEIRO ---

  getFinancialStats(): FinancialStats {
    const activeReceipts = this.schema.documents.filter(d => d.type === 'RECIBO');
    const activeBudgets = this.schema.documents.filter(d => d.type === 'ORCAMENTO');

    const totalReceiptsAmount = activeReceipts.reduce((sum, d) => sum + d.total, 0);
    const totalBudgetsAmount = activeBudgets.reduce((sum, d) => sum + d.total, 0);

    const paidReceiptsAmount = activeReceipts.filter(d => d.status === 'PAGO').reduce((sum, d) => sum + d.total, 0);
    const pendingReceiptsAmount = activeReceipts.filter(d => d.status === 'PENDENTE').reduce((sum, d) => sum + d.total, 0);

    // Agrupamento por mês
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const monthlyReceipts = months.map((m, index) => {
      const amount = activeReceipts
        .filter(d => {
          const date = new Date(d.issue_date);
          return date.getMonth() === index && d.status === 'PAGO';
        })
        .reduce((sum, d) => sum + d.total, 0);
      return { month: m, amount };
    });

    const monthlyBudgets = months.map((m, index) => {
      const amount = activeBudgets
        .filter(d => {
          const date = new Date(d.issue_date);
          return date.getMonth() === index && d.status !== 'CANCELADO';
        })
        .reduce((sum, d) => sum + d.total, 0);
      return { month: m, amount };
    });

    // Distribuição por Status de Recibos
    const statusKeys: DocumentStatus[] = ['PENDENTE', 'PAGO', 'CANCELADO'];
    const statusDistribution = statusKeys.map(status => {
      const docs = activeReceipts.filter(d => d.status === status);
      const total = docs.reduce((sum, d) => sum + d.total, 0);
      return {
        status,
        count: docs.length,
        total
      };
    });

    // Atividade Recente (últimos 10 documentos)
    const recentActivity = [...this.schema.documents]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 10)
      .map(d => ({
        id: d.id,
        type: d.type,
        client_name: d.client_name,
        total: d.total,
        issue_date: d.issue_date,
        status: d.status
      }));

    return {
      totalReceiptsAmount,
      totalBudgetsAmount,
      paidReceiptsAmount,
      pendingReceiptsAmount,
      receiptCount: activeReceipts.length,
      budgetCount: activeBudgets.length,
      monthlyReceipts,
      monthlyBudgets,
      statusDistribution,
      recentActivity
    };
  }
}

export const db = new Database();
export default db;
