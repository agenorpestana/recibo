import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Client, Document, CompanySettings, User, DocumentType, DocumentStatus, FinancialStats } from './src/types';

// O banco de dados local será salvo neste arquivo JSON caso o MySQL não esteja ativo.
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Certifica-se de que o diretório do banco de dados local existirá
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

// Configurações padrão corporativas
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

// Inicialização do pool MySQL se configurado no ambiente
let pool: mysql.Pool | null = null;
const isMySQLActive = !!process.env.DB_HOST;

if (isMySQLActive) {
  console.log(`[Database] Ativando modo de produção MySQL ativo para o host: ${process.env.DB_HOST}`);
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
} else {
  console.log(`[Database] Modo de produção MySQL ausente. Usando JSON Local persistente: ${DB_FILE_PATH}`);
}

class Database {
  private schema: DatabaseSchema = {
    users: [...defaultUsers],
    clients: [],
    documents: [],
    settings: { ...defaultSettings }
  };

  constructor() {
    this.loadJSON();
  }

  private loadJSON() {
    if (isMySQLActive) return;
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
        // Garante que o administrador padrão exista
        const hasAdmin = this.schema.users.some(u => u.email === 'suporte@unityautomacoes.com.br');
        if (!hasAdmin) {
          this.schema.users.push(defaultUsers[0]);
        }
      } else {
        this.saveJSON();
      }
    } catch (e) {
      console.error("Erro ao carregar banco de dados JSON, usando dados em memória:", e);
    }
  }

  private saveJSON() {
    if (isMySQLActive) return;
    try {
      ensureDirExists();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.schema, null, 2), 'utf-8');
    } catch (e) {
      console.error("Erro ao salvar banco de dados JSON:", e);
    }
  }

  // --- CRUD CONFIGURAÇÕES ---
  
  async getSettings(): Promise<CompanySettings> {
    if (!pool) {
      return this.schema.settings;
    }
    try {
      const [rows]: any = await pool.query('SELECT * FROM company_settings LIMIT 1');
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO company_settings (company_name, cnpj, ie, address, phone, email, notes_recibo_default, notes_orcamento_default, logo_base64) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)',
          [
            defaultSettings.company_name,
            defaultSettings.cnpj,
            defaultSettings.ie,
            defaultSettings.address,
            defaultSettings.phone,
            defaultSettings.email,
            defaultSettings.notes_recibo_default,
            defaultSettings.notes_orcamento_default
          ]
        );
        return { ...defaultSettings };
      }
      return {
        company_name: rows[0].company_name,
        cnpj: rows[0].cnpj,
        ie: rows[0].ie,
        address: rows[0].address,
        phone: rows[0].phone,
        email: rows[0].email,
        logo_base64: rows[0].logo_base64,
        notes_recibo_default: rows[0].notes_recibo_default,
        notes_orcamento_default: rows[0].notes_orcamento_default
      };
    } catch (error) {
      console.error('Erro ao ler company_settings no MySQL:', error);
      return { ...defaultSettings };
    }
  }

  async updateSettings(settings: CompanySettings): Promise<CompanySettings> {
    if (!pool) {
      this.schema.settings = { ...settings };
      this.saveJSON();
      return this.schema.settings;
    }
    try {
      const [rows]: any = await pool.query('SELECT id FROM company_settings LIMIT 1');
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO company_settings (company_name, cnpj, ie, address, phone, email, logo_base64, notes_recibo_default, notes_orcamento_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            settings.company_name,
            settings.cnpj,
            settings.ie,
            settings.address,
            settings.phone,
            settings.email,
            settings.logo_base64,
            settings.notes_recibo_default,
            settings.notes_orcamento_default
          ]
        );
      } else {
        await pool.query(
          'UPDATE company_settings SET company_name=?, cnpj=?, ie=?, address=?, phone=?, email=?, logo_base64=?, notes_recibo_default=?, notes_orcamento_default=? WHERE id=?',
          [
            settings.company_name,
            settings.cnpj,
            settings.ie,
            settings.address,
            settings.phone,
            settings.email,
            settings.logo_base64,
            settings.notes_recibo_default,
            settings.notes_orcamento_default,
            rows[0].id
          ]
        );
      }
      return settings;
    } catch (error) {
      console.error('Erro ao salvar company_settings no MySQL:', error);
      throw error;
    }
  }

  // --- CRUD USUÁRIOS ---

  async getUsers(): Promise<User[]> {
    if (!pool) {
      return this.schema.users;
    }
    const [rows]: any = await pool.query('SELECT * FROM users');
    return rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role
    }));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!pool) {
      return this.schema.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }
    const [rows]: any = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (rows.length === 0) {
      // Criação automática do administrador se for o suporte padrão
      if (email.toLowerCase() === 'suporte@unityautomacoes.com.br') {
        await pool.query(
          'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
          ['suporte@unityautomacoes.com.br', '$2b$10$Un1tyAut0mat1onSenha200616HashPlaceholderRealMatchesClientSide', 'Super Usuário Unity', 'admin']
        );
        const [newRows]: any = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', ['suporte@unityautomacoes.com.br']);
        return {
          id: newRows[0].id,
          email: newRows[0].email,
          name: newRows[0].name,
          role: newRows[0].role
        };
      }
      return undefined;
    }
    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role
    };
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    if (!pool) {
      const id = Date.now() + Math.floor(Math.random() * 100);
      const newUser = { ...user, id };
      this.schema.users.push(newUser);
      this.saveJSON();
      return newUser;
    }
    const [result]: any = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [user.email, '$2b$10$Un1tyAut0mat1onSenha200616HashPlaceholderRealMatchesClientSide', user.name, user.role || 'user']
    );
    return { id: result.insertId, ...user };
  }

  // --- CRUD CLIENTES ---

  async getClients(): Promise<Client[]> {
    if (!pool) {
      return this.schema.clients;
    }
    const [rows]: any = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    return rows;
  }

  async getClientById(id: string | number): Promise<Client | undefined> {
    if (!pool) {
      return this.schema.clients.find(c => String(c.id) === String(id));
    }
    const [rows]: any = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
    return rows[0];
  }

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    if (!pool) {
      const id = Date.now() + Math.floor(Math.random() * 100);
      const newClient: Client = { ...client, id };
      this.schema.clients.push(newClient);
      this.saveJSON();
      return newClient;
    }
    const [result]: any = await pool.query(
      'INSERT INTO clients (name, cnpj_cpf, address, phone, email) VALUES (?, ?, ?, ?, ?)',
      [client.name, client.cnpj_cpf, client.address, client.phone, client.email]
    );
    return { id: result.insertId, ...client };
  }

  async updateClient(id: string | number, updated: Partial<Client>): Promise<Client> {
    if (!pool) {
      const index = this.schema.clients.findIndex(c => String(c.id) === String(id));
      if (index === -1) throw new Error("Cliente não encontrado.");
      this.schema.clients[index] = {
        ...this.schema.clients[index],
        ...updated,
        id: this.schema.clients[index].id
      };
      this.saveJSON();
      return this.schema.clients[index];
    }
    const [rows]: any = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error("Cliente não encontrado.");
    const cur = rows[0];
    const merged = {
      name: updated.name !== undefined ? updated.name : cur.name,
      cnpj_cpf: updated.cnpj_cpf !== undefined ? updated.cnpj_cpf : cur.cnpj_cpf,
      address: updated.address !== undefined ? updated.address : cur.address,
      phone: updated.phone !== undefined ? updated.phone : cur.phone,
      email: updated.email !== undefined ? updated.email : cur.email,
    };
    await pool.query(
      'UPDATE clients SET name=?, cnpj_cpf=?, address=?, phone=?, email=? WHERE id=?',
      [merged.name, merged.cnpj_cpf, merged.address, merged.phone, merged.email, id]
    );
    return { id, ...merged };
  }

  async deleteClient(id: string | number): Promise<boolean> {
    if (!pool) {
      const originalLength = this.schema.clients.length;
      this.schema.clients = this.schema.clients.filter(c => String(c.id) !== String(id));
      const deleted = this.schema.clients.length < originalLength;
      if (deleted) this.saveJSON();
      return deleted;
    }
    const [result]: any = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- CRUD DOCUMENTOS ---

  async getDocuments(): Promise<Document[]> {
    if (!pool) {
      return this.schema.documents;
    }
    const [docs]: any = await pool.query('SELECT * FROM documents ORDER BY id DESC');
    if (docs.length === 0) return [];
    
    const [items]: any = await pool.query('SELECT * FROM document_items');
    return docs.map((d: any) => {
      const issue_date = d.issue_date instanceof Date ? d.issue_date.toISOString().split('T')[0] : d.issue_date;
      return {
        id: d.id,
        number: d.number,
        type: d.type as DocumentType,
        client_id: d.client_id,
        client_name: d.client_name,
        client_cnpj: d.client_cnpj,
        client_address: d.client_address,
        client_phone: d.client_phone,
        subtotal: Number(d.subtotal),
        discount: Number(d.discount),
        total: Number(d.total),
        status: d.status as DocumentStatus,
        payment_method: d.payment_method,
        issue_date,
        location_date: d.location_date || '',
        notes: d.notes || '',
        convert_from_id: d.convert_from_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        items: items
          .filter((item: any) => item.document_id === d.id)
          .map((item: any) => ({
            id: item.id,
            quantity: Number(item.quantity),
            description: item.description,
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price)
          }))
      };
    });
  }

  async getDocumentById(id: string | number): Promise<Document | undefined> {
    if (!pool) {
      return this.schema.documents.find(d => String(d.id) === String(id));
    }
    const [docs]: any = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) return undefined;
    const d = docs[0];
    const [items]: any = await pool.query('SELECT * FROM document_items WHERE document_id = ?', [id]);
    const issue_date = d.issue_date instanceof Date ? d.issue_date.toISOString().split('T')[0] : d.issue_date;
    return {
      id: d.id,
      number: d.number,
      type: d.type as DocumentType,
      client_id: d.client_id,
      client_name: d.client_name,
      client_cnpj: d.client_cnpj,
      client_address: d.client_address,
      client_phone: d.client_phone,
      subtotal: Number(d.subtotal),
      discount: Number(d.discount),
      total: Number(d.total),
      status: d.status as DocumentStatus,
      payment_method: d.payment_method,
      issue_date,
      location_date: d.location_date || '',
      notes: d.notes || '',
      convert_from_id: d.convert_from_id,
      created_at: d.created_at,
      updated_at: d.updated_at,
      items: items.map((item: any) => ({
        id: item.id,
        quantity: Number(item.quantity),
        description: item.description,
        unit_price: Number(item.unit_price),
        total_price: Number(item.total_price)
      }))
    };
  }

  async createDocument(doc: Omit<Document, 'id' | 'number'>): Promise<Document> {
    if (!pool) {
      const id = Date.now() + Math.floor(Math.random() * 100);
      const year = new Date(doc.issue_date || new Date()).getFullYear();
      const prefix = doc.type === 'RECIBO' ? 'REC' : 'ORC';
      
      const sameTypeDocs = this.schema.documents.filter(d => d.type === doc.type && d.issue_date.startsWith(String(year)));
      const sequence = sameTypeDocs.length + 1;
      const paddedSeq = String(sequence).padStart(4, '0');
      const number = `${prefix}-${year}-${paddedSeq}`;

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
      this.saveJSON();
      return newDoc;
    }

    const year = new Date(doc.issue_date || new Date()).getFullYear();
    const prefix = doc.type === 'RECIBO' ? 'REC' : 'ORC';

    const [cntRows]: any = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE type = ? AND YEAR(issue_date) = ?',
      [doc.type, year]
    );
    const sequence = (cntRows[0]?.count || 0) + 1;
    const paddedSeq = String(sequence).padStart(4, '0');
    const number = `${prefix}-${year}-${paddedSeq}`;

    const processedItems = doc.items.map((item) => {
      const q = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return {
        quantity: q,
        description: item.description || '',
        unit_price: price,
        total_price: q * price
      };
    });

    const subtotal = processedItems.reduce((acc, item) => acc + item.total_price, 0);
    const discount = Number(doc.discount) || 0;
    const total = Math.max(0, subtotal - discount);

    const [resDoc]: any = await pool.query(
      'INSERT INTO documents (number, type, client_id, client_name, client_cnpj, client_address, client_phone, subtotal, discount, total, status, payment_method, issue_date, location_date, notes, convert_from_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        number,
        doc.type,
        doc.client_id || null,
        doc.client_name,
        doc.client_cnpj || '',
        doc.client_address || '',
        doc.client_phone || '',
        subtotal,
        discount,
        total,
        doc.status || 'PENDENTE',
        doc.payment_method || 'PIX',
        doc.issue_date || new Date().toISOString().split('T')[0],
        doc.location_date || '',
        doc.notes || '',
        doc.convert_from_id || null
      ]
    );

    const docId = resDoc.insertId;

    for (const item of processedItems) {
      await pool.query(
        'INSERT INTO document_items (document_id, quantity, description, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [docId, item.quantity, item.description, item.unit_price, item.total_price]
      );
    }

    return {
      id: docId,
      number,
      type: doc.type,
      client_id: doc.client_id || null,
      client_name: doc.client_name,
      client_cnpj: doc.client_cnpj || '',
      client_address: doc.client_address || '',
      client_phone: doc.client_phone || '',
      subtotal,
      discount,
      total,
      status: doc.status || 'PENDENTE',
      payment_method: doc.payment_method || 'PIX',
      issue_date: doc.issue_date || new Date().toISOString().split('T')[0],
      location_date: doc.location_date || '',
      notes: doc.notes || '',
      convert_from_id: doc.convert_from_id || null,
      items: processedItems.map((item, index) => ({ id: index + 1, ...item }))
    };
  }

  async updateDocument(id: string | number, updated: Partial<Document>): Promise<Document> {
    if (!pool) {
      const index = this.schema.documents.findIndex(d => String(d.id) === String(id));
      if (index === -1) throw new Error("Documento não encontrado.");

      const existing = this.schema.documents[index];
      let items = updated.items !== undefined ? updated.items : existing.items;
      let discount = updated.discount !== undefined ? Number(updated.discount) : existing.discount;

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
        id: existing.id,
        number: existing.number,
        items: processedItems,
        subtotal,
        discount,
        total,
        updated_at: new Date().toISOString()
      };

      this.schema.documents[index] = updatedDoc;
      this.saveJSON();
      return updatedDoc;
    }

    const [docs]: any = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (docs.length === 0) throw new Error("Documento não encontrado.");
    const existing = docs[0];

    const items = updated.items !== undefined ? updated.items : null;
    const discount = updated.discount !== undefined ? Number(updated.discount) : Number(existing.discount);

    let processedItems;
    let subtotal = Number(existing.subtotal);
    let total = Number(existing.total);

    if (items !== null) {
      processedItems = items.map((item) => {
        const q = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return {
          quantity: q,
          description: item.description || '',
          unit_price: price,
          total_price: q * price
        };
      });
      subtotal = processedItems.reduce((acc, item) => acc + item.total_price, 0);
      total = Math.max(0, subtotal - discount);
    } else {
      total = Math.max(0, subtotal - discount);
    }

    const merged = {
      client_id: updated.client_id !== undefined ? updated.client_id : existing.client_id,
      client_name: updated.client_name !== undefined ? updated.client_name : existing.client_name,
      client_cnpj: updated.client_cnpj !== undefined ? updated.client_cnpj : existing.client_cnpj,
      client_address: updated.client_address !== undefined ? updated.client_address : existing.client_address,
      client_phone: updated.client_phone !== undefined ? updated.client_phone : existing.client_phone,
      status: updated.status !== undefined ? updated.status : existing.status,
      payment_method: updated.payment_method !== undefined ? updated.payment_method : existing.payment_method,
      issue_date: updated.issue_date !== undefined ? updated.issue_date : existing.issue_date,
      location_date: updated.location_date !== undefined ? updated.location_date : existing.location_date,
      notes: updated.notes !== undefined ? updated.notes : existing.notes,
      subtotal,
      discount,
      total
    };

    const issue_date = merged.issue_date instanceof Date ? merged.issue_date.toISOString().split('T')[0] : merged.issue_date;

    await pool.query(
      'UPDATE documents SET client_id=?, client_name=?, client_cnpj=?, client_address=?, client_phone=?, status=?, payment_method=?, issue_date=?, location_date=?, notes=?, subtotal=?, discount=?, total=? WHERE id=?',
      [
        merged.client_id || null,
        merged.client_name,
        merged.client_cnpj,
        merged.client_address,
        merged.client_phone,
        merged.status,
        merged.payment_method,
        issue_date,
        merged.location_date,
        merged.notes,
        merged.subtotal,
        merged.discount,
        merged.total,
        id
      ]
    );

    if (items !== null && processedItems) {
      await pool.query('DELETE FROM document_items WHERE document_id = ?', [id]);
      for (const item of processedItems) {
        await pool.query(
          'INSERT INTO document_items (document_id, quantity, description, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
          [id, item.quantity, item.description, item.unit_price, item.total_price]
        );
      }
    } else {
      const [itRows]: any = await pool.query('SELECT * FROM document_items WHERE document_id = ?', [id]);
      processedItems = itRows.map((it: any) => ({
        id: it.id,
        quantity: Number(it.quantity),
        description: it.description,
        unit_price: Number(it.unit_price),
        total_price: Number(it.total_price)
      }));
    }

    return {
      id: existing.id,
      number: existing.number,
      type: existing.type as DocumentType,
      ...merged,
      issue_date,
      items: processedItems,
      subtotal,
      discount,
      total
    };
  }

  async convertBudgetToReceipt(id: string | number): Promise<Document> {
    if (!pool) {
      const index = this.schema.documents.findIndex(d => String(d.id) === String(id));
      if (index === -1) throw new Error("Orçamento não encontrado.");

      const budget = this.schema.documents[index];
      if (budget.type !== 'ORCAMENTO') {
        throw new Error("Este documento já é um Recibo.");
      }

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
        status: 'PAGO',
        payment_method: budget.payment_method || 'PIX',
        issue_date: new Date().toISOString().split('T')[0],
        location_date: `${this.schema.settings.address.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        notes: this.schema.settings.notes_recibo_default,
        convert_from_id: budget.id
      };

      const newReceipt = await this.createDocument(receiptData);
      this.schema.documents[index].status = 'PAGO';
      this.schema.documents[index].notes = `${budget.notes}\n\n* Convertido em Recibo #${newReceipt.number}`;
      this.saveJSON();

      return newReceipt;
    }

    const budget = await this.getDocumentById(id);
    if (!budget) throw new Error("Orçamento não encontrado.");
    if (budget.type !== 'ORCAMENTO') throw new Error("Este documento já é um Recibo.");

    const settings = await this.getSettings();

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
      status: 'PAGO',
      payment_method: budget.payment_method || 'PIX',
      issue_date: new Date().toISOString().split('T')[0],
      location_date: `${settings.address.split(',').pop()?.trim() || 'Itamaraju-BA'}, em ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      notes: settings.notes_recibo_default,
      convert_from_id: budget.id
    };

    const newReceipt = await this.createDocument(receiptData);
    await this.updateDocument(budget.id, {
      status: 'PAGO',
      notes: `${budget.notes}\n\n* Convertido em Recibo #${newReceipt.number}`
    });

    return newReceipt;
  }

  async deleteDocument(id: string | number): Promise<boolean> {
    if (!pool) {
      const originalLength = this.schema.documents.length;
      this.schema.documents = this.schema.documents.filter(d => String(d.id) !== String(id));
      const deleted = this.schema.documents.length < originalLength;
      if (deleted) this.saveJSON();
      return deleted;
    }
    const [result]: any = await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // --- FINANÇAS ---

  async getFinancialStats(): Promise<FinancialStats> {
    let docs: any[] = [];
    if (!pool) {
      docs = this.schema.documents;
    } else {
      const [rows]: any = await pool.query('SELECT * FROM documents');
      docs = rows;
    }

    const activeReceipts = docs.filter(d => d.type === 'RECIBO').map(d => ({ ...d, total: Number(d.total) }));
    const activeBudgets = docs.filter(d => d.type === 'ORCAMENTO').map(d => ({ ...d, total: Number(d.total) }));

    const totalReceiptsAmount = activeReceipts.reduce((sum, d) => sum + d.total, 0);
    const totalBudgetsAmount = activeBudgets.reduce((sum, d) => sum + d.total, 0);

    const paidReceiptsAmount = activeReceipts.filter(d => d.status === 'PAGO').reduce((sum, d) => sum + d.total, 0);
    const pendingReceiptsAmount = activeReceipts.filter(d => d.status === 'PENDENTE').reduce((sum, d) => sum + d.total, 0);

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

    const statusKeys: DocumentStatus[] = ['PENDENTE', 'PAGO', 'CANCELADO'];
    const statusDistribution = statusKeys.map(status => {
      const filtered = activeReceipts.filter(d => d.status === status);
      const total = filtered.reduce((sum, d) => sum + d.total, 0);
      return {
        status,
        count: filtered.length,
        total
      };
    });

    const recentActivity = [...docs]
      .sort((a, b) => new Date(b.created_at || a.issue_date).getTime() - new Date(a.created_at || b.issue_date).getTime())
      .slice(0, 10)
      .map(d => {
        const issue_date = d.issue_date instanceof Date ? d.issue_date.toISOString().split('T')[0] : d.issue_date;
        return {
          id: d.id,
          type: d.type as DocumentType,
          client_name: d.client_name,
          total: Number(d.total),
          issue_date,
          status: d.status as DocumentStatus
        };
      });

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
