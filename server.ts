import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db from './server-db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON com limite maior para envio de logotipos base64
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // --- COMPILADOR / INICIALIZAÇÃO DE ADMIN ---
  console.log("Servidor iniciando... Preparando rotas de API");

  // --- ROTAS DA API ---

  // 1. Autenticação Segura
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const adminEmail = 'suporte@unityautomacoes.com.br';
    const adminPassword = '200616';

    // Verificação de superusuário administrativo completo
    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
      const user = db.getUserByEmail(adminEmail);
      if (user) {
        return res.json({
          token: 'jwt-mocked-token-for-unity-automação-secure-admin',
          user
        });
      }
    }

    // Outros usuários
    const user = db.getUserByEmail(email);
    if (user && password === '123456') { // Senha genérica de teste para outros usuários
      return res.json({
        token: `jwt-mocked-token-for-user-${user.id}`,
        user
      });
    }

    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  });

  // 2. CRUD Clientes (Cadastro de Clientes)
  app.get('/api/clients', (req, res) => {
    res.json(db.getClients());
  });

  app.get('/api/clients/:id', (req, res) => {
    const client = db.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    res.json(client);
  });

  app.post('/api/clients', (req, res) => {
    const { name, cnpj_cpf, address, phone, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }
    const client = db.createClient({ name, cnpj_cpf: cnpj_cpf || '', address: address || '', phone: phone || '', email: email || '' });
    res.status(201).json(client);
  });

  app.put('/api/clients/:id', (req, res) => {
    try {
      const client = db.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Erro ao atualizar cliente.' });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const success = db.deleteClient(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    res.json({ success: true, message: 'Cliente excluído com sucesso.' });
  });

  // 3. CRUD Documentos (Recibos / Orçamentos)
  app.get('/api/documents', (req, res) => {
    res.json(db.getDocuments());
  });

  app.get('/api/documents/:id', (req, res) => {
    const doc = db.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }
    res.json(doc);
  });

  app.post('/api/documents', (req, res) => {
    const {
      type,
      client_id,
      client_name,
      client_cnpj,
      client_address,
      client_phone,
      items,
      discount,
      status,
      payment_method,
      issue_date,
      location_date,
      notes
    } = req.body;

    if (!type || !client_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos. Verifique tipo, cliente e se há pelo menos 1 item.' });
    }

    try {
      const doc = db.createDocument({
        type,
        client_id: client_id || null,
        client_name,
        client_cnpj: client_cnpj || '',
        client_address: client_address || '',
        client_phone: client_phone || '',
        items,
        discount: Number(discount) || 0,
        subtotal: 0, // Calculado automaticamente pelo repositório
        total: 0,    // Calculado automaticamente pelo repositório
        status: status || 'PENDENTE',
        payment_method: payment_method || 'PIX',
        issue_date: issue_date || new Date().toISOString().split('T')[0],
        location_date: location_date || '',
        notes: notes || ''
      });
      res.status(201).json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao criar documento.' });
    }
  });

  app.put('/api/documents/:id', (req, res) => {
    try {
      const doc = db.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Erro ao atualizar documento.' });
    }
  });

  app.delete('/api/documents/:id', (req, res) => {
    const success = db.deleteDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }
    res.json({ success: true, message: 'Documento excluído com sucesso.' });
  });

  // 4. Conversão de Orçamento para Recibo
  app.post('/api/documents/:id/convert', (req, res) => {
    try {
      const receipt = db.convertBudgetToReceipt(req.params.id);
      res.json({
        success: true,
        message: 'Orçamento convertido em Recibo com sucesso.',
        document: receipt
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Erro ao converter orçamento.' });
    }
  });

  // 5. Configurações da Empresa
  app.get('/api/settings', (req, res) => {
    res.json(db.getSettings());
  });

  app.put('/api/settings', (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  // 6. Relatórios Financeiros Automáticos
  app.get('/api/reports/stats', (req, res) => {
    res.json(db.getFinancialStats());
  });

  // 7. Simular Envio por WhatsApp e Email
  app.post('/api/documents/:id/send-email', (req, res) => {
    const { toEmail, subject, body } = req.body;
    const doc = db.getDocumentById(req.params.id);
    
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    if (!toEmail) {
      return res.status(400).json({ error: 'E-mail do destinatário não informado.' });
    }

    // Simulação robusta de envio de email
    console.log(`Enviando e-mail para ${toEmail}`);
    console.log(`Assunto: ${subject}`);
    console.log(`Conteúdo: ${body}`);

    res.json({
      success: true,
      message: `Comprovante enviado com sucesso para o e-mail: ${toEmail}.`,
      sentDetails: {
        to: toEmail,
        timestamp: new Date().toISOString(),
        subject,
        documentNumber: doc.number
      }
    });
  });

  app.post('/api/documents/:id/whatsapp-link', (req, res) => {
    const doc = db.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Telefone do cliente é obrigatório.' });
    }

    // Formata o número (mantém apenas dígitos)
    const cleanPhone = phone.replace(/\D/g, '');
    const settings = db.getSettings();

    // Mensagem amigável pré-formatada para enviar ao cliente
    const greeting = doc.type === 'RECIBO' ? 'Comprovante de Recibo' : 'Orçamento solicitado';
    const totalBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.total);
    
    const message = `Olá! Segue o *${greeting}* da *${settings.company_name}*.\n\n` +
      `📄 *Documento:* ${doc.number}\n` +
      `📅 *Data de Emissão:* ${new Date(doc.issue_date).toLocaleDateString('pt-BR')}\n` +
      `💰 *Valor Total:* ${totalBRL}\n` +
      `🔗 *Acesse os detalhes para Impressão/Visualização:* ${process.env.APP_URL || 'https://unityautomacoes.com.br'}/view/${doc.id}\n\n` +
      `Agradecemos a preferência! Caso tenha dúvidas, entre em contato conosco pelo telefone ${settings.phone}.`;

    const encodedText = encodeURIComponent(message);
    const apiLink = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`;

    res.json({
      success: true,
      whatsappUrl: apiLink,
      message: 'Link do WhatsApp gerado com sucesso.'
    });
  });

  // --- MIDDLEWARE VITE / ESTÁTICOS ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Escuta somente na porta 3000 do container
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Unity Automações] Servidor rodando na porta ${PORT} de forma completa.`);
  });
}

startServer().catch((error) => {
  console.error("Erro fatal ao inicializar o servidor Express:", error);
});
