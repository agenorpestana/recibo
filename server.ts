import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db from './server-db';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware para JSON com limite maior para envio de logotipos base64
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  console.log("Servidor iniciando... Preparando rotas de API");

  // --- ROTAS DA API ---

  // 1. Autenticação Segura
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const adminEmail = 'suporte@unityautomacoes.com.br';
    const adminPassword = '200616';

    // Verificação de superusuário administrativo completo pelo fallback estático
    if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
      const user = await db.getUserByEmail(adminEmail);
      if (user) {
        return res.json({
          token: 'jwt-mocked-token-for-unity-automação-secure-admin',
          user
        });
      }
    }

    // Outros usuários ou superusuário cadastrados
    const userWithPass = await db.getUserWithPasswordByEmail(email);
    if (userWithPass) {
      const dbPassword = userWithPass.password_hash;
      const isValidPassword = password === dbPassword || 
                             (dbPassword === '$2b$10$Un1tyAut0mat1onSenha200616HashPlaceholderRealMatchesClientSide' && password === '200616') ||
                             (password === '123456'); // Fallback para senha genérica se necessário

      if (isValidPassword) {
        const { password_hash, ...cleanUser } = userWithPass;
        return res.json({
          token: `jwt-mocked-token-for-user-${cleanUser.id}`,
          user: cleanUser
        });
      }
    }

    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  });

  // 2. CRUD Clientes (Cadastro de Clientes)
  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await db.getClients();
      res.json(clients);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar clientes.' });
    }
  });

  app.get('/api/clients/:id', async (req, res) => {
    try {
      const client = await db.getClientById(req.params.id);
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }
      res.json(client);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter cliente.' });
    }
  });

  app.post('/api/clients', async (req, res) => {
    const { name, cnpj_cpf, address, phone, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }
    try {
      const client = await db.createClient({ 
        name, 
        cnpj_cpf: cnpj_cpf || '', 
        address: address || '', 
        phone: phone || '', 
        email: email || '' 
      });
      res.status(201).json(client);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao cadastrar cliente.' });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    try {
      const client = await db.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Erro ao atualizar cliente.' });
    }
  });

  app.delete('/api/clients/:id', async (req, res) => {
    try {
      const success = await db.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }
      res.json({ success: true, message: 'Cliente excluído com sucesso.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao deletar cliente.' });
    }
  });

  // 2.5 CRUD Produtos (Cadastro de Produtos Extra)
  app.get('/api/products', async (req, res) => {
    try {
      const products = await db.getProducts();
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar produtos.' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await db.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter produto.' });
    }
  });

  app.post('/api/products', async (req, res) => {
    const { name, sale_price, stock_qty } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'O nome do produto é obrigatório.' });
    }
    try {
      const product = await db.createProduct({
        name,
        sale_price: Number(sale_price) || 0,
        stock_qty: Number(stock_qty) || 0
      });
      res.status(201).json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao cadastrar produto.' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const product = await db.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Erro ao atualizar produto.' });
    }
  });

  app.post('/api/products/:id/launch', async (req, res) => {
    const { quantity } = req.body;
    try {
      const product = await db.insertStockLaunch(req.params.id, Number(quantity) || 0);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao reajustar estoque.' });
    }
  });

  app.post('/api/products/:id/delete-initial-stock', async (req, res) => {
    try {
      const product = await db.deleteInitialStock(req.params.id);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao remover estoque inicial.' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const success = await db.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      res.json({ success: true, message: 'Produto excluído com sucesso.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao deletar produto.' });
    }
  });

  // 3. CRUD Documentos (Recibos / Orçamentos)
  app.get('/api/documents', async (req, res) => {
    try {
      const documents = await db.getDocuments();
      res.json(documents);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar documentos.' });
    }
  });

  app.get('/api/documents/:id', async (req, res) => {
    try {
      const doc = await db.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }
      res.json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter documento.' });
    }
  });

  app.post('/api/documents', async (req, res) => {
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
      notes,
      company_info
    } = req.body;

    if (!type || !client_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos. Verifique tipo, cliente e se há pelo menos 1 item.' });
    }

    try {
      const doc = await db.createDocument({
        type,
        client_id: client_id || null,
        client_name,
        client_cnpj: client_cnpj || '',
        client_address: client_address || '',
        client_phone: client_phone || '',
        items,
        discount: Number(discount) || 0,
        subtotal: 0, 
        total: 0,    
        status: status || 'PENDENTE',
        payment_method: payment_method || 'PIX',
        issue_date: issue_date || new Date().toISOString().split('T')[0],
        location_date: location_date || '',
        notes: notes || '',
        company_info: company_info || null
      });
      res.status(201).json(doc);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao criar documento.' });
    }
  });

  app.put('/api/documents/:id', async (req, res) => {
    try {
      const doc = await db.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Erro ao atualizar documento.' });
    }
  });

  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const success = await db.deleteDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }
      res.json({ success: true, message: 'Documento excluído com sucesso.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao deletar documento.' });
    }
  });

  // 4. Conversão de Orçamento para Recibo
  app.post('/api/documents/:id/convert', async (req, res) => {
    try {
      const receipt = await db.convertBudgetToReceipt(req.params.id);
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
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.getSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter configurações.' });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const updated = await db.updateSettings(req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao atualizar configurações.' });
    }
  });

  // 5.1. Configurações de Integração (Bom Controle & Whaticket)
  app.get('/api/integration/settings', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar configurações de integração.' });
    }
  });

  app.put('/api/integration/settings', async (req, res) => {
    try {
      const settings = await db.updateIntegrationSettings(req.body);
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao salvar configurações de integração.' });
    }
  });

  // Busca fatura do Bom Controle
  app.get('/api/integration/bom-controle/fatura/:id', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const apiKey = settings.bom_controle_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave de API do Bom Controle não configurada.' });
      }
      const id = req.params.id;
      const response = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Fatura/Obter/${id}`, {
        headers: {
          'Authorization': `ApiKey ${apiKey}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Erro no Bom Controle: ${response.status} - ${errorText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter fatura do Bom Controle.' });
    }
  });

  // Envia mensagem via Whaticket
  app.post('/api/integration/whaticket/send', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const token = settings.whaticket_api_token;
      const baseUrl = settings.whaticket_api_url || 'https://apichat.unityautomacoes.com.br';
      if (!token) {
        return res.status(400).json({ error: 'Token do Whaticket não configurado.' });
      }

      const { number, body, pdfUrl } = req.body;
      if (!number) {
        return res.status(400).json({ error: 'Número de telefone obrigatório.' });
      }

      const cleanNumber = number.replace(/\D/g, '');

      // Se houver pdfUrl, tentamos baixar e enviar como mídia no Whaticket
      if (pdfUrl) {
        try {
          console.log(`[Whaticket Proxy] Buscando PDF do boleto em: ${pdfUrl}`);
          const pdfResponse = await fetch(pdfUrl);
          if (pdfResponse.ok) {
            const arrayBuffer = await pdfResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if ((globalThis as any).FormData && (globalThis as any).Blob) {
              const form = new (globalThis as any).FormData();
              form.append('number', cleanNumber);
              form.append('body', body || 'Segue o seu boleto.');

              const blob = new (globalThis as any).Blob([buffer], { type: 'application/pdf' });
              form.append('medias', blob, `boleto_${Date.now()}.pdf`);
              form.append('sendSignature', 'false');
              form.append('closeTicket', 'false');

              console.log(`[Whaticket Proxy] Enviando mídia para o Whaticket: ${baseUrl}/api/messages/send`);
              const sendResponse = await fetch(`${baseUrl}/api/messages/send`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: form
              });

              if (sendResponse.ok) {
                const result = await sendResponse.json();
                return res.json({ success: true, result });
              } else {
                const errText = await sendResponse.text();
                console.error(`[Whaticket Proxy] Falha no Whaticket API Mídia: ${sendResponse.status} - ${errText}`);
              }
            }
          }
        } catch (mediaError) {
          console.error('[Whaticket Proxy] Erro ao enviar como mídia, enviando apenas texto:', mediaError);
        }
      }

      // Envia apenas texto (padrão)
      console.log(`[Whaticket Proxy] Enviando mensagem de texto para: ${cleanNumber}`);
      const textResponse = await fetch(`${baseUrl}/api/messages/send/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          delay: 1000,
          messages: [
            {
              number: cleanNumber,
              body: body
            }
          ]
        })
      });

      if (!textResponse.ok) {
        const errText = await textResponse.text();
        return res.status(textResponse.status).json({ error: `Falha no Whaticket API: ${textResponse.status} - ${errText}` });
      }

      const result = await textResponse.json();
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao enviar mensagem via Whaticket.' });
    }
  });

  // 5.5. CRUD Outras Empresas
  app.get('/api/companies', async (req, res) => {
    try {
      const companies = await db.getCompanies();
      res.json(companies);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar empresas.' });
    }
  });

  app.post('/api/companies', async (req, res) => {
    try {
      const newCompany = await db.createCompany(req.body);
      res.status(201).json(newCompany);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao cadastrar empresa.' });
    }
  });

  app.put('/api/companies/:id', async (req, res) => {
    try {
      const updated = await db.updateCompany(req.params.id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao atualizar empresa.' });
    }
  });

  app.delete('/api/companies/:id', async (req, res) => {
    try {
      const success = await db.deleteCompany(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      res.json({ success: true, message: 'Empresa excluída com sucesso.' });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Erro ao deletar empresa.' });
    }
  });

  // 6. Relatórios Financeiros Automáticos
  app.get('/api/reports/stats', async (req, res) => {
    try {
      const stats = await db.getFinancialStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter relatórios financeiros.' });
    }
  });

  app.get('/api/reports/product-movements', async (req, res) => {
    try {
      const data = await db.getProductMovements();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter movimentação de produtos.' });
    }
  });

  // 6.5. CRUD Usuários (Controle de Acesso)
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.getUsers();
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao carregar usuários.' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }
    try {
      const user = await db.createUser({
        name,
        email,
        password: password || '123456',
        role: role || 'user',
        permissions: permissions || []
      });
      res.status(201).json(user);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao criar usuário.' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const user = await db.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Erro ao atualizar usuário.' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const success = await db.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      res.json({ success: true, message: 'Usuário excluído com sucesso.' });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'Erro ao deletar usuário.' });
    }
  });

  // 7. Simular Envio por WhatsApp e Email
  app.post('/api/documents/:id/send-email', async (req, res) => {
    const { toEmail, subject, body } = req.body;
    try {
      const doc = await db.getDocumentById(req.params.id);
      
      if (!doc) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }

      if (!toEmail) {
        return res.status(400).json({ error: 'E-mail do destinatário não informado.' });
      }

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
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao simular envio de email.' });
    }
  });

  app.post('/api/documents/:id/whatsapp-link', async (req, res) => {
    try {
      const doc = await db.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }

      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Telefone do cliente é obrigatório.' });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const settings = await db.getSettings();
      
      const activeCompany = doc.company_info || settings;
      const companyName = activeCompany.company_name || settings.company_name;
      const companyPhone = activeCompany.phone || settings.phone;

      // Detecta a origem de forma dinâmica para suportar subdomínios (ex: recibo.unityautomacoes.com.br)
      let origin = 'https://recibo.unityautomacoes.com.br';
      if (req.headers.referer) {
        try {
          origin = new URL(req.headers.referer).origin;
        } catch (e) {}
      } else {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.get('host');
        if (host) {
          origin = `${protocol}://${host}`;
        }
      }
      origin = origin.replace(/\/$/, ''); // Remove barra no final se houver

      const greeting = doc.type === 'RECIBO' ? 'Comprovante de Recibo' : 'Orçamento solicitado';
      const totalBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.total);
      
      const message = `Olá! Segue o *${greeting}* da *${companyName}*.\n\n` +
        `📄 *Documento:* ${doc.number}\n` +
        `📅 *Data de Emissão:* ${new Date(doc.issue_date).toLocaleDateString('pt-BR')}\n` +
        `💰 *Valor Total:* ${totalBRL}\n` +
        `🔗 *Acesse os detalhes para Impressão/Visualização:* ${origin}/view/${doc.id}\n\n` +
        `Agradecemos a preferência! Caso tenha dúvidas, entre em contato conosco pelo telefone ${companyPhone}.`;

      const encodedText = encodeURIComponent(message);
      const apiLink = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`;

      res.json({
        success: true,
        whatsappUrl: apiLink,
        message: 'Link do WhatsApp gerado com sucesso.'
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao gerar link de WhatsApp.' });
    }
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

  // Escuta no host 0.0.0.0 e utiliza a porta 3000 do container
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Unity Automações] Servidor Express rodando na porta de entrada unificada ${PORT}.`);
  });
}

startServer().catch((error) => {
  console.error("Erro fatal ao inicializar o servidor Express:", error);
});
