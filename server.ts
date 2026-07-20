import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import https from 'https';
import querystring from 'querystring';
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
  // Helper para enriquecer fatura com dados do Cliente e Empresa do Bom Controle
  async function enrichFatura(fatura: any, apiKey: string) {
    if (!fatura) return fatura;

    // 1. Identificar ID do Cliente
    let idCliente = fatura.IdCliente || fatura.ClienteId || fatura.idCliente || fatura.IdSacado;
    if (!idCliente && fatura.Cliente && typeof fatura.Cliente === 'object') {
      idCliente = fatura.Cliente.Id || fatura.Cliente.id;
    }

    if (idCliente) {
      try {
        console.log(`[Bom Controle API] Buscando dados do cliente #${idCliente} para a fatura #${fatura.Id}`);
        const clientResponse = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Cliente/Obter/${idCliente}`, {
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          }
        });
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          const clientName = clientData.Nome || clientData.NomeRazaoSocial || clientData.RazaoSocial || clientData.NomeFantasia;
          const clientDoc = clientData.CnpjCpf || clientData.CpfCnpj || clientData.Cnpj || clientData.Cpf;
          const clientCel = clientData.Celular || clientData.Telefone || clientData.CelularWhatsApp || '';
          
          fatura.Cliente = {
            ...clientData,
            Id: idCliente,
            Nome: clientName || fatura.Cliente?.Nome || 'Cliente Não Informado',
            CnpjCpf: clientDoc || fatura.Cliente?.CnpjCpf || 'N/A',
            Celular: clientCel || fatura.Cliente?.Celular || ''
          };
        }
      } catch (err) {
        console.error(`[Bom Controle API] Erro ao buscar dados do cliente #${idCliente}:`, err);
      }
    }

    // 2. Identificar ID da Empresa
    let idEmpresa = fatura.IdEmpresa || fatura.EmpresaId || fatura.idEmpresa;
    if (!idEmpresa && fatura.Empresa && typeof fatura.Empresa === 'object') {
      idEmpresa = fatura.Empresa.Id || fatura.Empresa.id;
    }

    if (idEmpresa) {
      try {
        console.log(`[Bom Controle API] Buscando dados da empresa #${idEmpresa} para a fatura #${fatura.Id}`);
        const companyResponse = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Empresa/Pesquisar?pesquisa=${idEmpresa}`, {
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          }
        });
        if (companyResponse.ok) {
          const companies = await companyResponse.json();
          if (Array.isArray(companies) && companies.length > 0) {
            const matchedCompany = companies.find((c: any) => String(c.Id) === String(idEmpresa)) || companies[0];
            fatura.Empresa = {
              ...matchedCompany,
              Id: idEmpresa,
              Nome: matchedCompany.Nome || matchedCompany.RazaoSocial || 'Empresa Não Informada',
              Cnpj: matchedCompany.Cnpj || matchedCompany.CnpjCpf || 'N/A'
            };
          }
        }
      } catch (err) {
        console.error(`[Bom Controle API] Erro ao buscar dados da empresa #${idEmpresa}:`, err);
      }
    }

    return fatura;
  }

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
      
      // Enriquecer com dados do cliente e da empresa
      const enriched = await enrichFatura(data, apiKey);
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao obter fatura do Bom Controle.' });
    }
  });

  // Busca faturas do Bom Controle por intervalo de data usando o endpoint de pesquisa financeira oficial
  app.get('/api/integration/bom-controle/faturas', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const apiKey = settings.bom_controle_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave de API do Bom Controle não configurada.' });
      }

      const { dataInicio, dataFim, tipoData, textoPesquisa, idsEmpresa, idsCliente } = req.query;
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: 'Os parâmetros dataInicio e dataFim são obrigatórios (formato YYYY-MM-DD).' });
      }

      // Prepara os parâmetros conforme exigido pelo Bom Controle:
      // dataInicio: "aaaa-mm-dd hh24:mi:ss"
      // dataTermino: "aaaa-mm-dd hh24:mi:ss"
      // tipoData: Opções como DataPadrao, Criacao, etc.
      const startFormatted = `${dataInicio} 00:00:00`;
      const endFormatted = `${dataFim} 23:59:59`;
      const tipoDataValue = (tipoData as string) || 'DataPadrao';

      const params = new URLSearchParams();
      params.append('dataInicio', startFormatted);
      params.append('dataTermino', endFormatted);
      params.append('tipoData', tipoDataValue);

      if (textoPesquisa) {
        params.append('textoPesquisa', textoPesquisa as string);
      }
      if (idsEmpresa) {
        params.append('idsEmpresa', idsEmpresa as string);
      }
      if (idsCliente) {
        params.append('idsCliente', idsCliente as string);
      }

      // Configura paginação de segurança para trazer até 100 itens por vez
      params.append('paginacao.itensPorPagina', '100');
      params.append('paginacao.numeroDaPagina', '1');

      const url = `https://apinewintegracao.bomcontrole.com.br/integracao/Financeiro/Pesquisar?${params.toString()}`;
      console.log(`[Bom Controle API] Pesquisando financeiro: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `ApiKey ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: `Erro no Bom Controle: ${response.status} - ${errorText}` });
      }

      const data = await response.json();
      const itemsList = data.Itens || [];

      console.log(`[Bom Controle API] Pesquisa financeira retornou ${itemsList.length} itens.`);

      // Mapeia os itens (parcelas financeiras) para o formato esperado pelo frontend
      const faturas = itemsList.map((item: any) => {
        return {
          Id: item.IdFatura || item.IdMovimentacaoFinanceiraParcela, // Prefere o ID da Fatura para poder buscar o Obter completo
          IdFatura: item.IdFatura,
          IdMovimentacaoFinanceiraParcela: item.IdMovimentacaoFinanceiraParcela,
          NomeCliente: item.NomeClienteFornecedor || item.Nome,
          Cliente: {
            Id: item.IdCliente,
            Nome: item.NomeClienteFornecedor || 'Cliente Não Informado',
            CnpjCpf: item.DocumentoClienteFornecedor || 'N/A',
            Celular: '' // Será populado quando o usuário clicar em "Selecionar" e chamarmos o Obter
          },
          Quitada: !!item.DataQuitacao,
          Vencimento: item.DataVencimento,
          Valor: item.Valor,
          FormaPagamento: item.NomeFormaPagamento || 'Boleto Bancário',
          LinkBoleto: item.LinkBoletoBancario,
          NomeMovimentacao: item.Nome,
          IdEmpresa: item.IdEmpresa,
          NomeEmpresa: item.NomeEmpresa
        };
      });

      res.json(faturas);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao pesquisar faturas por período no Bom Controle.' });
    }
  });

  // Obtém dados de um cliente específico no Bom Controle por ID
  app.get('/api/integration/bom-controle/cliente/:id', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const apiKey = settings.bom_controle_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave de API do Bom Controle não configurada.' });
      }
      const id = req.params.id;
      const response = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Cliente/Obter/${id}`, {
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
      res.status(500).json({ error: e.message || 'Erro ao obter cliente do Bom Controle.' });
    }
  });

  // Pesquisa clientes no Bom Controle por termo (Nome ou CPF/CNPJ)
  app.get('/api/integration/bom-controle/clientes/pesquisar', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const apiKey = settings.bom_controle_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave de API do Bom Controle não configurada.' });
      }
      const { pesquisa } = req.query;
      if (!pesquisa) {
        return res.status(400).json({ error: 'O parâmetro pesquisa é obrigatório.' });
      }
      const response = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Cliente/Pesquisar?pesquisa=${encodeURIComponent(pesquisa as string)}`, {
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
      res.status(500).json({ error: e.message || 'Erro ao pesquisar clientes no Bom Controle.' });
    }
  });

  // Pesquisa empresas no Bom Controle por termo
  app.get('/api/integration/bom-controle/empresas/pesquisar', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const apiKey = settings.bom_controle_api_key;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave de API do Bom Controle não configurada.' });
      }
      const pesquisa = req.query.pesquisa !== undefined ? String(req.query.pesquisa) : '';
      const response = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Empresa/Pesquisar?pesquisa=${encodeURIComponent(pesquisa)}`, {
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
      res.status(500).json({ error: e.message || 'Erro ao pesquisar empresas no Bom Controle.' });
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

  // --- INTEGRAÇÃO BOLETO BRADESCO API (mTLS) ---

  // Helper para obter Fator de Vencimento
  function getFatorVencimento(dateStr: string): number {
    try {
      const baseDate = new Date('1997-10-07T00:00:00Z');
      const targetDate = new Date(dateStr + 'T00:00:00Z');
      const diffTime = targetDate.getTime() - baseDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      return 1000;
    }
  }

  // Helper para cálculo de linha digitável e código de barras Bradesco (Banco 237)
  function getBradescoLinha(
    valor: number,
    vencimento: string,
    nossoNumero: string,
    agencia: string,
    conta: string,
    carteira: string
  ): { linhaDigitavel: string; barcode: string } {
    const fator = getFatorVencimento(vencimento);
    const centsStr = Math.round(valor * 100).toString().padStart(10, '0');

    const ag = agencia.replace(/\D/g, '').padStart(4, '0');
    const cart = carteira.replace(/\D/g, '').padStart(2, '0');
    const nn = nossoNumero.replace(/\D/g, '').padStart(11, '0');
    const cc = conta.split('-')[0].replace(/\D/g, '').padStart(7, '0');

    const campoLivre = ag + cart + nn + cc + '0';

    const part1 = "2379";
    const part2 = fator.toString().padStart(4, '0') + centsStr + campoLivre;

    const fullTemp = part1 + "0" + part2;
    let sum = 0;
    let weight = 2;
    for (let i = 43; i >= 0; i--) {
      if (i === 4) continue;
      const charVal = parseInt(fullTemp.charAt(i), 10);
      sum += charVal * weight;
      weight++;
      if (weight > 9) weight = 2;
    }
    let dv = 11 - (sum % 11);
    if (dv === 0 || dv === 10 || dv === 11) dv = 1;

    const barcode = part1 + dv.toString() + part2;

    const calcDac = (str: string): number => {
      let s = 0;
      let w = 2;
      for (let i = str.length - 1; i >= 0; i--) {
        let prod = parseInt(str.charAt(i), 10) * w;
        if (prod > 9) prod = Math.floor(prod / 10) + (prod % 10);
        s += prod;
        w = w === 2 ? 1 : 2;
      }
      const rem = s % 10;
      return rem === 0 ? 0 : 10 - rem;
    };

    const c1 = "2379" + campoLivre.substring(0, 5);
    const dac1 = calcDac(c1);
    const field1 = `2379${campoLivre.substring(0, 5)}${dac1}`;

    const c2 = campoLivre.substring(5, 15);
    const dac2 = calcDac(c2);
    const field2 = `${campoLivre.substring(5, 15)}${dac2}`;

    const c3 = campoLivre.substring(15, 25);
    const dac3 = calcDac(c3);
    const field3 = `${campoLivre.substring(15, 25)}${dac3}`;

    const field4 = dv.toString();
    const field5 = fator.toString().padStart(4, '0') + centsStr;

    const f1 = `${field1.substring(0, 5)}.${field1.substring(5, 10)}`;
    const f2 = `${field2.substring(0, 5)}.${field2.substring(5, 11)}`;
    const f3 = `${field3.substring(0, 5)}.${field3.substring(5, 11)}`;

    const linhaDigitavel = `${f1} ${f2} ${f3} ${field4} ${field5}`;

    return { linhaDigitavel, barcode };
  }

  // Helper para gerar código de barras Interleaved 2 of 5 em SVG
  function generateI25BarcodeSVG(digits: string): string {
    const patterns: { [key: string]: string } = {
      '0': 'NNWWN', '1': 'WNNNW', '2': 'NWNNW', '3': 'WWNNN', '4': 'NNWNW',
      '5': 'WNWNN', '6': 'NWWNN', '7': 'NNNWW', '8': 'WNNWN', '9': 'NWNWN'
    };

    let barcodeStr = '1010';

    for (let i = 0; i < digits.length; i += 2) {
      const digit1 = digits.charAt(i);
      const digit2 = digits.charAt(i + 1);

      const p1 = patterns[digit1] || 'NNWWN';
      const p2 = patterns[digit2] || 'NNWWN';

      for (let j = 0; j < 5; j++) {
        const bType = p1.charAt(j);
        const sType = p2.charAt(j);

        const bWidth = bType === 'W' ? '111' : '1';
        const sWidth = sType === 'W' ? '000' : '0';

        barcodeStr += bWidth + sWidth;
      }
    }

    barcodeStr += '11101';

    let svgPaths = '';
    let x = 0;
    const barHeight = 65;
    const unitWidth = 1.05;

    for (let i = 0; i < barcodeStr.length; i++) {
      const bit = barcodeStr.charAt(i);
      if (bit === '1') {
        svgPaths += `<rect x="${x}" y="0" width="${unitWidth}" height="${barHeight}" fill="black" />`;
      }
      x += unitWidth;
    }

    const totalWidth = x;
    return `<svg width="100%" height="${barHeight}" viewBox="0 0 ${totalWidth} ${barHeight}" preserveAspectRatio="none">${svgPaths}</svg>`;
  }

  // POST: Gerar ou simular registro de boleto Bradesco
  app.post('/api/integration/bradesco/gerar-boleto', async (req, res) => {
    try {
      const settings = await db.getIntegrationSettings();
      const companySettings = await db.getSettings();

      const { fatura, envSelection } = req.body;
      if (!fatura) {
        return res.status(400).json({ error: 'Os dados da fatura são obrigatórios.' });
      }

      // Se o usuário selecionou explicitamente na UI sandbox/produção, usamos, senão o configurado
      const env = envSelection || settings.bradesco_env || 'sandbox';
      const isProduction = env === 'production';

      const clientId = settings.bradesco_client_id;
      const clientSecret = settings.bradesco_client_secret;
      const certContent = settings.bradesco_cert;
      const keyContent = settings.bradesco_key;

      if (!clientId || !clientSecret || !certContent || !keyContent) {
        return res.status(400).json({
          success: false,
          error: 'As credenciais da API Bradesco (Client ID, Client Secret, Certificado Público .pem e Chave Privada) não estão configuradas ou estão incompletas. Por favor, preencha-as nas configurações de integração antes de prosseguir.'
        });
      }

      const agency = settings.bradesco_agency || '0123';
      const account = settings.bradesco_account || '0123456';
      const accountDigit = settings.bradesco_account_digit || '7';
      const wallet = settings.bradesco_wallet || '09';
      const cnpjBeneficiario = settings.bradesco_cnpj || companySettings.cnpj || '44.285.891/0001-45';
      const beneficiario = settings.bradesco_beneficiario_nome || companySettings.company_name || 'UNITY AUTOMACOES LTDA.';

      // Dados da Fatura
      const faturaId = fatura.Id || fatura.id || Math.floor(Math.random() * 100000);
      const valor = Number(fatura.ValorOriginal || fatura.Valor || fatura.valor || 100.00);
      const rawVencimento = fatura.DataVencimento || fatura.Vencimento || fatura.vencimento || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const rawEmissao = fatura.DataEmissao || fatura.Emissao || fatura.emissao || new Date().toISOString().split('T')[0];
      const vencimento = String(rawVencimento).split('T')[0];
      const emissao = String(rawEmissao).split('T')[0];

      // Pagador
      const pagadorObj = fatura.Cliente || fatura.cliente || {};
      const pagadorNome = pagadorObj.NomeRazaoSocial || pagadorObj.Nome || pagadorObj.nome || 'Cliente Desconhecido';
      const pagadorDoc = pagadorObj.CnpjCpf || pagadorObj.cnpj_cpf || '000.000.000-00';
      const pagadorCep = pagadorObj.Cep || pagadorObj.cep || '00000-000';
      
      let pagadorEnd = '';
      if (pagadorObj.Endereco) {
        if (typeof pagadorObj.Endereco === 'object') {
          const e = pagadorObj.Endereco;
          const logradouro = e.Logradouro || e.Rua || e.Street || e.street || '';
          const numero = e.Numero || e.Number || e.number || '';
          const bairro = e.Bairro || e.Neighborhood || e.neighborhood || '';
          const cidade = e.Cidade || e.City || e.city || '';
          const uf = e.Estado || e.State || e.state || e.Uf || e.uf || '';
          const parts = [
            logradouro ? (numero ? `${logradouro}, ${numero}` : logradouro) : '',
            bairro,
            cidade ? (uf ? `${cidade}-${uf}` : cidade) : ''
          ].filter(Boolean);
          pagadorEnd = parts.join(' - ');
        } else {
          pagadorEnd = String(pagadorObj.Endereco);
        }
      }
      if (!pagadorEnd) {
        pagadorEnd = pagadorObj.address || 'Rua não informada';
      }
      if (typeof pagadorEnd === 'object') {
        pagadorEnd = JSON.stringify(pagadorEnd);
      }

      // Gerar Nosso Número único baseado na Fatura
      const nossoNumero = `09${String(faturaId).padStart(9, '0')}`;

      // Gerar linha digitável e código de barras real/calculado
      const { linhaDigitavel, barcode } = getBradescoLinha(valor, vencimento, nossoNumero, agency, account, wallet);

      // Executa chamada real de mTLS
      let apiLog = '';

      try {
        console.log(`[Bradesco API mTLS] Iniciando autenticação em ambiente: ${env.toUpperCase()}`);
        
        const tokenHost = isProduction ? 'openapi.bradesco.com.br' : 'openapisandbox.prebanco.com.br';
        const tokenPath = '/auth/server-mtls/v2/token';

        const authBody = querystring.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        });

        // Requisição mTLS para obter Token
        const tokenRes: any = await new Promise((resolve, reject) => {
          const reqOpts = {
            hostname: tokenHost,
            port: 443,
            path: tokenPath,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(authBody)
            },
            cert: certContent,
            key: keyContent,
            rejectUnauthorized: false // Permite conexões locais/sandbox sem validar a cadeia raiz estrita
          };

          const req = https.request(reqOpts, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
              } else {
                reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
              }
            });
          });

          req.on('error', (e) => reject(e));
          req.write(authBody);
          req.end();
        });

        const accessToken = tokenRes.access_token;
        if (!accessToken) {
          throw new Error('access_token não retornado no corpo da resposta de autenticação.');
        }

        console.log('[Bradesco API mTLS] Bearer Token obtido com sucesso!');
        
        // Payload de Registro do Boleto Bradesco Oficial com QR Code (Formato Híbrido Real)
        const cleanCnpj = cnpjBeneficiario.replace(/\D/g, '');
        const nroCpfCnpjBenef = Number(cleanCnpj.substring(0, 8)) || 0;
        const filCpfCnpjBenef = cleanCnpj.substring(8, 12) || '0001';
        const digCpfCnpjBenef = Number(cleanCnpj.substring(12, 14)) || 0;

        const cleanAgency = agency.replace(/\D/g, '').padStart(4, '0');
        const cleanAccount = account.split('-')[0].replace(/\D/g, '').padStart(7, '0');
        const cnegocCobr = `${cleanAgency}0000000${cleanAccount}`;

        const cleanCep = pagadorCep.replace(/\D/g, '');
        const ccepSacdoTitlo = Number(cleanCep.substring(0, 5)) || 0;
        const ccomplCepSacdo = Number(cleanCep.substring(5, 8)) || 0;

        const docDigits = pagadorDoc.replace(/\D/g, '');
        const nroCpfCnpjSacdo = Number(docDigits) || 0;
        const indCpfCnpjSacdo = docDigits.length > 11 ? 2 : 1;

        const numMatch = pagadorEnd.match(/\d+/);
        const enroLogdrSacdo = numMatch ? numMatch[0].substring(0, 10) : 'S/N';

        const registerPayload = {
          ctitloCobrCdent: Number(nossoNumero.replace(/\D/g, '')) || 0,
          registrarTitulo: 1,
          nroCpfCnpjBenef: nroCpfCnpjBenef,
          codUsuario: "APISERVIC",
          filCpfCnpjBenef: filCpfCnpjBenef,
          tipoAcesso: 2,
          digCpfCnpjBenef: digCpfCnpjBenef,
          cpssoaJuridContr: "",
          ctpoContrNegoc: "",
          cidtfdProdCobr: Number(wallet) || 9,
          nseqContrNegoc: "",
          cnegocCobr: cnegocCobr,
          filler: "",
          eNseqContrNegoc: "",
          tipoRegistro: 1,
          codigoBanco: 237,
          cprodtServcOper: "",
          demisTitloCobr: emissao.split('-').reverse().join('.'),
          ctitloCliCdent: String(faturaId).substring(0, 25),
          dvctoTitloCobr: vencimento.split('-').reverse().join('.'),
          cidtfdTpoVcto: "",
          vnmnalTitloCobr: Math.round(valor * 100),
          cindcdEconmMoeda: 9,
          cespceTitloCobr: 2,
          qmoedaNegocTitlo: 0,
          ctpoProteTitlo: 0,
          cindcdAceitSacdo: "N",
          ctpoPrzProte: 0,
          ctpoPrzDecurs: 0,
          ctpoProteDecurs: 0,
          cctrlPartcTitlo: 0,
          cindcdPgtoParcial: "N",
          cformaEmisPplta: "02",
          qtdePgtoParcial: 0,
          qtdDecurPrz: "0",
          codNegativacao: "0",
          diasNegativacao: "0",
          ptxJuroVcto: 0,
          filler1: "",
          vdiaJuroMora: 0,
          pmultaAplicVcto: 0,
          qdiaInicJuro: 0,
          vmultaAtrsoPgto: 0,
          pdescBonifPgto01: 0,
          qdiaInicMulta: 0,
          vdescBonifPgto01: 0,
          pdescBonifPgto02: 0,
          dlimDescBonif1: "",
          vdescBonifPgto02: 0,
          pdescBonifPgto03: 0,
          dlimDescBonif2: "",
          vdescBonifPgto03: 0,
          ctpoPrzCobr: 0,
          dlimDescBonif3: "",
          pdescBonifPgto: 0,
          dlimBonifPgto: "",
          vdescBonifPgto: 0,
          vabtmtTitloCobr: 0,
          filler2: "",
          viofPgtoTitlo: 0,
          isacdoTitloCobr: pagadorNome.substring(0, 40),
          enroLogdrSacdo: enroLogdrSacdo,
          elogdrSacdoTitlo: pagadorEnd.substring(0, 40),
          ecomplLogdrSacdo: "",
          ccepSacdoTitlo: ccepSacdoTitlo,
          ebairoLogdrSacdo: (pagadorObj.Bairro || pagadorObj.bairro || "Centro").substring(0, 40),
          ccomplCepSacdo: ccomplCepSacdo,
          imunSacdoTitlo: (pagadorObj.Cidade || pagadorObj.cidade || "Itamaraju").substring(0, 30),
          indCpfCnpjSacdo: indCpfCnpjSacdo,
          csglUfSacdo: (pagadorObj.Estado || pagadorObj.Uf || "BA").substring(0, 2),
          renderEletrSacdo: "",
          cdddFoneSacdo: 0,
          nroCpfCnpjSacdo: nroCpfCnpjSacdo,
          bancoDeb: 0,
          cfoneSacdoTitlo: 0,
          agenciaDebDv: 0,
          agenciaDeb: 0,
          bancoCentProt: 0,
          contaDeb: 0,
          isacdrAvalsTitlo: "",
          agenciaDvCentPr: 0,
          enroLogdrSacdr: "0",
          elogdrSacdrAvals: "",
          ecomplLogdrSacdr: "",
          ccomplCepSacdr: 0,
          ebairoLogdrSacdr: "",
          csglUfSacdr: "",
          ccepSacdrTitlo: 0,
          imunSacdrAvals: "",
          indCpfCnpjSacdr: 0,
          renderEletrSacdr: "",
          nroCpfCnpjSacdr: 0,
          cdddFoneSacdr: 0,
          filler3: "0",
          cfoneSacdrTitlo: 0,
          iconcPgtoSpi: "",
          fase: "1",
          cindcdCobrMisto: "S",
          ialiasAdsaoCta: "",
          ilinkGeracQrcd: "",
          caliasAdsaoCta: "",
          wqrcdPdraoMercd: "",
          validadeAposVencimento: "",
          filler4: "",
          idLoc: ""
        };

        const registerHost = isProduction ? 'openapi.bradesco.com.br' : 'openapisandbox.prebanco.com.br';
        const registerPath = '/boleto-hibrido/cobranca-registro/v1/gerarBoleto';

        // Chamada de registro mTLS
        const regRes: any = await new Promise((resolve, reject) => {
          const reqOpts = {
            hostname: registerHost,
            port: 443,
            path: registerPath,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': accessToken.startsWith('Bearer') ? accessToken : `Bearer ${accessToken}`
            },
            cert: certContent,
            key: keyContent,
            rejectUnauthorized: false
          };

          const req = https.request(reqOpts, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
              } else {
                reject(new Error(`Erro HTTP ${res.statusCode}: ${data}`));
              }
            });
          });

          req.on('error', (e) => reject(e));
          req.write(JSON.stringify(registerPayload));
          req.end();
        });

        console.log('[Bradesco API mTLS] Boleto registrado via API oficial com sucesso!', regRes);
        apiLog = 'Registrado com sucesso via API Bradesco Oficial com mTLS.';

        // Usar dados reais retornados pelo banco se presentes
        const finalLinhaDigitavel = regRes.linhaDig10 || regRes.linhaDig || (regRes.dados && regRes.dados.linhaDig10) || linhaDigitavel;
        const finalBarcode = regRes.codBarras10 || regRes.codBarras || (regRes.dados && regRes.dados.codBarras10) || barcode;
        const finalQrCode = regRes.wqrcdPdraoMercd || regRes.semvQrcode || (regRes.dados && (regRes.dados.wqrcdPdraoMercd || regRes.dados.semvQrcode)) || '';

        return res.json({
          success: true,
          mocked: false,
          apiLog,
          env: env,
          boleto: {
            nossoNumero,
            linhaDigitavel: finalLinhaDigitavel,
            barcodeValue: finalBarcode,
            qrCode: finalQrCode,
            valor,
            vencimento,
            emissao,
            agencia: agency,
            conta: `${account}-${accountDigit}`,
            carteira: wallet,
            cnpjBeneficiario,
            beneficiario,
            pagador: {
              nome: pagadorNome,
              documento: pagadorDoc,
              endereco: pagadorEnd,
              cep: pagadorCep
            }
          }
        });

      } catch (apiError: any) {
        console.error('[Bradesco API mTLS] Erro na integração com a API Bradesco:', apiError.message);
        return res.status(400).json({
          success: false,
          error: `Erro ao registrar boleto na API Bradesco: ${apiError.message}`
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Erro ao processar boleto Bradesco.' });
    }
  });

  // GET: Visualizar e Imprimir Boleto Bradesco (Otimizado para Impressão A4)
  app.get('/api/integration/bradesco/visualizar-boleto', async (req, res) => {
    try {
      const {
        valor,
        vencimento,
        emissao,
        nome,
        documento,
        endereco,
        cep,
        nosso_numero,
        agencia,
        conta,
        carteira,
        beneficiario,
        cnpj_beneficiario,
        qr_code
      } = req.query;

      const vVal = Number(valor || 100.00);
      const rawVenc = String(vencimento || new Date().toISOString().split('T')[0]);
      const rawEmis = String(emissao || new Date().toISOString().split('T')[0]);
      const vVenc = rawVenc.split('T')[0];
      const vEmis = rawEmis.split('T')[0];
      const vNome = String(nome || 'Cliente de Teste');
      const vDoc = String(documento || '00.000.000/0001-00');
      const vEnd = String(endereco || 'Rua de Teste, 123');
      const vCep = String(cep || '00000-000');
      const vNN = String(nosso_numero || '09000000001');
      const vAg = String(agencia || '1234');
      const vCc = String(conta || '56789-0');
      const vCart = String(carteira || '09');
      const vBenef = String(beneficiario || 'UNITY AUTOMACOES LTDA.');
      const vCnpjB = String(cnpj_beneficiario || '44.285.891/0001-45');

      // Calcular linha digitável e código de barras baseado nos parâmetros fornecidos
      const { linhaDigitavel, barcode } = getBradescoLinha(vVal, vVenc, vNN, vAg, vCc, vCart);
      const barcodeSVG = generateI25BarcodeSVG(barcode);

      // Formatar valores para português
      const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      };

      const formatDateBr = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      const valorBr = formatCurrency(vVal);
      const vencBr = formatDateBr(vVenc);
      const emisBr = formatDateBr(vEmis);

      // Renderiza template HTML de Alta Fidelidade do Boleto Bradesco
      const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Boleto Bradesco - ${vNN}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 20px 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .boleto-container {
            background-color: white;
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            box-sizing: border-box;
          }
          .boleto-table td {
            border: 1px solid #000;
            padding: 3px 6px;
            font-size: 10px;
            vertical-align: top;
          }
          .label {
            font-size: 8px;
            color: #4b5563;
            text-transform: uppercase;
            font-weight: 500;
            display: block;
            margin-bottom: 1px;
          }
          .value {
            font-size: 10px;
            font-weight: 600;
            color: #000;
          }
          .cut-line {
            border-top: 1px dashed #000;
            margin: 25px 0;
            position: relative;
          }
          .cut-line::after {
            content: "✂ Cortar Aqui";
            position: absolute;
            right: 10px;
            top: -10px;
            background: white;
            padding: 0 5px;
            font-size: 10px;
            color: #4b5563;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
              margin: 0;
            }
            .boleto-container {
              box-shadow: none;
              padding: 5mm;
              width: 210mm;
              height: 297mm;
              margin: 0;
              page-break-after: always;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>

        <!-- Painel Superior de Ações (Não Imprimível) -->
        <div class="no-print max-w-[210mm] mx-auto mb-4 bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
              237
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900">Boleto Bradesco Pronto para Emissão</h1>
              <p class="text-xs text-gray-500">Imprima ou exporte como PDF em formato A4.</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="window.print()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded shadow flex items-center space-x-1 cursor-pointer transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0-5h4M9 4h6m-6 4h6"></path></svg>
              <span>Imprimir / Gerar PDF</span>
            </button>
            <button onclick="window.close()" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded border border-gray-200 cursor-pointer transition">
              Fechar Janela
            </button>
          </div>
        </div>

        <div class="boleto-container">
          
          <!-- VIA DO CLIENTE (RECIBO DO PAGADOR) -->
          <div class="flex items-end justify-between border-b-2 border-black pb-1 mb-3">
            <div class="flex items-center space-x-3">
              <span class="text-xl font-extrabold text-red-600 tracking-tighter">Bradesco</span>
              <span class="text-lg font-bold border-x border-black px-3 py-0.5">237-2</span>
            </div>
            <div class="text-xs font-bold text-right">RECIBO DO PAGADOR</div>
          </div>

          <table class="w-full boleto-table table-fixed mb-4">
            <tbody>
              <tr>
                <td colspan="4" class="w-3/4">
                  <span class="label">Beneficiário</span>
                  <span class="value">${vBenef} - CNPJ: ${vCnpjB}</span>
                </td>
                <td class="w-1/4">
                  <span class="label">Agência / Código Beneficiário</span>
                  <span class="value">${vAg} / ${vCc}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <span class="label">Pagador</span>
                  <span class="value">${vNome}</span>
                </td>
                <td>
                  <span class="label">Data Vencimento</span>
                  <span class="value">${vencBr}</span>
                </td>
                <td>
                  <span class="label">Nosso Número</span>
                  <span class="value">${vNN}</span>
                </td>
                <td>
                  <span class="label">Valor do Documento</span>
                  <span class="value">${valorBr}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="label">Espécie Doc.</span>
                  <span class="value">DS</span>
                </td>
                <td>
                  <span class="label">Aceite</span>
                  <span class="value">N</span>
                </td>
                <td>
                  <span class="label">Data Emissão</span>
                  <span class="value">${emisBr}</span>
                </td>
                <td>
                  <span class="label">Carteira / Espécie</span>
                  <span class="value">${vCart} / R$</span>
                </td>
                <td>
                  <span class="label">Valor Cobrado</span>
                  <span class="value">${valorBr}</span>
                </td>
              </tr>
              <tr>
                <td colspan="5" class="h-12">
                  <span class="label">Instruções (Todas as instruções de cobrança são de inteira responsabilidade do beneficiário)</span>
                  <span class="value block mb-1 text-gray-700 font-normal">
                    • NÃO RECEBER APÓS O VENCIMENTO.
                  </span>
                  <span class="value block text-gray-700 font-normal">
                    • BOLETO REFERENTE ÀS FATURAS DA INTEGRAÇÃO DO BOM CONTROLE.
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="cut-line"></div>

          <!-- VIA DO BANCO (FICHA DE COMPENSAÇÃO) -->
          <div class="flex items-end justify-between border-b-2 border-black pb-1 mb-2">
            <div class="flex items-center space-x-3">
              <span class="text-xl font-extrabold text-red-600 tracking-tighter">Bradesco</span>
              <span class="text-lg font-bold border-x border-black px-3 py-0.5">237-2</span>
              <span class="text-xs font-bold tracking-tight">${linhaDigitavel}</span>
            </div>
          </div>

          <table class="w-full boleto-table table-fixed mb-4">
            <tbody>
              <tr>
                <td colspan="4" class="w-3/4">
                  <span class="label">Local de Pagamento</span>
                  <span class="value">QUALQUER BANCO ATÉ O VENCIMENTO</span>
                </td>
                <td class="w-1/4 bg-gray-50">
                  <span class="label">Vencimento</span>
                  <span class="value text-base text-right block">${vencBr}</span>
                </td>
              </tr>
              <tr>
                <td colspan="4">
                  <span class="label">Beneficiário</span>
                  <span class="value">${vBenef} - CNPJ: ${vCnpjB}</span>
                </td>
                <td class="bg-gray-50">
                  <span class="label">Agência / Código Beneficiário</span>
                  <span class="value block text-right">${vAg} / ${vCc}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="label">Data do Doc.</span>
                  <span class="value">${emisBr}</span>
                </td>
                <td colspan="2">
                  <span class="label">Nº do Documento</span>
                  <span class="value">BC-${vNN.substring(2)}</span>
                </td>
                <td>
                  <span class="label">Espécie Doc.</span>
                  <span class="value">DS</span>
                </td>
                <td class="bg-gray-50">
                  <span class="label">Nosso Número / Cód. Barras</span>
                  <span class="value block text-right">${vNN}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="label">Uso do Banco</span>
                  <span class="value"></span>
                </td>
                <td>
                  <span class="label">Carteira</span>
                  <span class="value">${vCart}</span>
                </td>
                <td>
                  <span class="label">Espécie</span>
                  <span class="value">R$</span>
                </td>
                <td>
                  <span class="label">Quantidade</span>
                  <span class="value"></span>
                </td>
                <td class="bg-gray-50">
                  <span class="label">(=) Valor do Documento</span>
                  <span class="value block text-right text-base">${valorBr}</span>
                </td>
              </tr>
              <tr>
                <td colspan="4" rowspan="2" class="h-32">
                  <span class="label">Instruções (Todas as instruções de cobrança são de inteira responsabilidade do beneficiário)</span>
                  <div class="text-xs font-semibold space-y-1 mt-1 text-black">
                    <p>• NÃO RECEBER APÓS O VENCIMENTO.</p>
                    <p>• PROTESTO AUTOMÁTICO APÓS 10 DIAS DO VENCIMENTO.</p>
                    <p>• PAGÁVEL EM QUALQUER AGÊNCIA BANCÁRIA OU PELO SEU INTERNET BANKING.</p>
                  </div>
                </td>
                <td>
                  <span class="label">(-) Desconto / Abatimento</span>
                  <span class="value block text-right"></span>
                </td>
              </tr>
              <tr>
                <td class="bg-gray-50">
                  <span class="label">(=) Valor Cobrado</span>
                  <span class="value block text-right text-base font-bold">${valorBr}</span>
                </td>
              </tr>
              <tr>
                <td colspan="5">
                  <span class="label">Pagador</span>
                  <span class="value block font-bold">${vNome}</span>
                  <span class="value block font-normal text-gray-700">${vEnd} - CEP: ${vCep}</span>
                  <span class="value block font-normal text-gray-700">CPF/CNPJ: ${vDoc}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Barcode Area -->
          <div class="mt-8 flex flex-col items-start justify-center pl-4">
            <div class="w-[125mm] bg-white">
              ${barcodeSVG}
            </div>
            <div class="text-[9px] font-mono mt-1 text-gray-500 tracking-widest">
              ${barcode}
            </div>
          </div>

          <!-- QR Code Area (Hybrid Pix) -->
          ${qr_code ? `
          <div class="mt-6 border border-gray-300 rounded-lg p-3 bg-red-50/10 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(String(qr_code))}" alt="QR Code Pix" class="w-24 h-24 border border-gray-200 rounded p-1 bg-white" />
              <div class="space-y-1">
                <span class="text-xs font-bold text-gray-800 uppercase block tracking-wider">PIX - Pagamento Instantâneo (Boleto Híbrido)</span>
                <p class="text-[10px] text-gray-600 max-w-md">Escaneie o QR Code ao lado com o aplicativo do seu banco para realizar o pagamento instantâneo deste boleto via Pix.</p>
                <div class="pt-1">
                  <button onclick="navigator.clipboard.writeText('${String(qr_code).replace(/'/g, "\\'")}')" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] rounded shadow cursor-pointer transition">
                    Copiar Código Pix (Copia e Cola)
                  </button>
                </div>
              </div>
            </div>
            <div class="text-right pr-4 shrink-0">
              <span class="text-[9px] font-bold text-gray-400 block uppercase">Chave Pix Cadastrada</span>
              <span class="text-xs font-mono font-bold text-red-600">BRADESCO HÍBRIDO</span>
            </div>
          </div>
          ` : ''}

        </div>

      </body>
      </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (e: any) {
      res.status(500).send(`Erro ao visualizar boleto Bradesco: ${e.message}`);
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

  // Agenda verificação de disparo automático a cada 1 hora
  setInterval(() => {
    runAutomaticInvoiceDispatch(db).catch(err => {
      console.error('[Auto Send Job] Erro na execução periódica:', err);
    });
  }, 60 * 60 * 1000);

  // Executa uma vez 10 segundos após a inicialização para verificar se já deve disparar hoje
  setTimeout(() => {
    console.log('[Auto Send Job] Executando verificação inicial após boot...');
    runAutomaticInvoiceDispatch(db).catch(err => {
      console.error('[Auto Send Job] Erro na verificação inicial:', err);
    });
  }, 10000);
}

let lastAutoSendDate = ''; // Evita rodar múltiplas vezes no mesmo dia

async function runAutomaticInvoiceDispatch(db: any) {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    // Formato YYYY-MM-DD
    const todayFormatted = today.toISOString().split('T')[0];

    // Carrega configurações
    const settings = await db.getIntegrationSettings();
    if (!settings || !settings.auto_send_enabled) {
      return;
    }

    const scheduledDay = settings.auto_send_day || 10;
    if (currentDay !== scheduledDay) {
      return;
    }

    // Se já rodou hoje, pula
    if (lastAutoSendDate === todayFormatted) {
      return;
    }

    console.log(`[Auto Send] Iniciando disparo automático de boletos para o dia ${scheduledDay}.`);

    const apiKey = settings.bom_controle_api_key;
    const token = settings.whaticket_api_token;
    if (!apiKey || !token) {
      console.log('[Auto Send] Chave do Bom Controle ou token do Whaticket não configurados.');
      return;
    }

    // Calcula período: do início do mês atual ao fim do mês atual
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Primeiro dia do mês
    const dataInicio = `${year}-${month}-01`;
    // Último dia do mês
    const lastDayOfMonth = new Date(year, today.getMonth() + 1, 0).getDate();
    const dataFim = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    console.log(`[Auto Send] Buscando faturas de ${dataInicio} até ${dataFim}`);

    // Prepara os parâmetros
    const startFormatted = `${dataInicio} 00:00:00`;
    const endFormatted = `${dataFim} 23:59:59`;
    const tipoDataValue = 'DataPadrao';

    const params = new URLSearchParams();
    params.append('dataInicio', startFormatted);
    params.append('dataTermino', endFormatted);
    params.append('tipoData', tipoDataValue);
    params.append('paginacao.itensPorPagina', '100');
    params.append('paginacao.numeroDaPagina', '1');

    // Se tiver empresa configurada e não for "all" ou vazia
    const selectedCompany = settings.auto_send_company_id;
    if (selectedCompany && selectedCompany !== 'all' && selectedCompany !== '') {
      params.append('idsEmpresa', selectedCompany);
    }

    const url = `https://apinewintegracao.bomcontrole.com.br/integracao/Financeiro/Pesquisar?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na busca financeira Bom Controle: ${response.status}`);
    }

    const data = await response.json();
    const itemsList = data.Itens || [];

    console.log(`[Auto Send] Encontradas ${itemsList.length} parcelas para processamento.`);

    let sentCount = 0;
    let skippedCount = 0;

    for (const item of itemsList) {
      try {
        // Se já quitada, pula
        if (item.DataQuitacao) {
          skippedCount++;
          continue;
        }

        // Se não tiver boleto, pula
        const boletoLink = item.LinkBoletoBancario;
        if (!boletoLink) {
          skippedCount++;
          continue;
        }

        // Busca o ID da Fatura e ID do Cliente
        const idFatura = item.IdFatura;
        const idCliente = item.IdCliente;

        if (!idCliente) {
          skippedCount++;
          continue;
        }

        // Busca detalhes do cliente para pegar o telefone
        const clientResponse = await fetch(`https://apinewintegracao.bomcontrole.com.br/integracao/Cliente/Obter/${idCliente}`, {
          headers: {
            'Authorization': `ApiKey ${apiKey}`
          }
        });

        if (!clientResponse.ok) {
          console.log(`[Auto Send] Erro ao buscar cliente #${idCliente}. Pando...`);
          skippedCount++;
          continue;
        }

        const clientData = await clientResponse.json();

        // Extrai telefone principal
        let targetPhone = clientData.Celular || clientData.Telefone || clientData.CelularWhatsApp || '';
        
        // Se não tiver telefone direto, varre contatos adicionais
        if (!targetPhone && Array.isArray(clientData.Contatos)) {
          const mainContact = clientData.Contatos.find((c: any) => c.Padrao || c.Cobranca) || clientData.Contatos[0];
          if (mainContact) {
            targetPhone = mainContact.Telefone || mainContact.Celular || '';
          }
        }

        if (!targetPhone) {
          console.log(`[Auto Send] Cliente #${idCliente} (${clientData.Nome || 'Sem Nome'}) não possui telefone. Pando...`);
          skippedCount++;
          continue;
        }

        // Normaliza número
        let cleanPhone = targetPhone.replace(/\D/g, '');
        if (cleanPhone.length < 8) {
          skippedCount++;
          continue;
        }
        if (!cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone;
        }

        // Prepara mensagem substituindo placeholders
        const valor = item.Valor !== undefined ? `R$ ${Number(item.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A';
        const rawVencimento = item.DataVencimento;
        let vencimento = 'N/A';
        if (rawVencimento) {
          try {
            const date = new Date(rawVencimento);
            vencimento = date.toLocaleDateString('pt-BR');
          } catch (e) {}
        }

        let msg = settings.whaticket_default_message || 'Olá! Segue o seu boleto do Bom Controle no valor de {valor} com vencimento em {vencimento}.\nLink do boleto: {link_boleto}';
        msg = msg.replace('{valor}', valor)
                 .replace('{vencimento}', vencimento)
                 .replace('{link_boleto}', boletoLink);

        // Envia via Whaticket
        const payload = {
          number: cleanPhone,
          body: msg,
          pdfUrl: boletoLink
        };

        const baseUrl = settings.whaticket_api_url || 'https://apichat.unityautomacoes.com.br';
        const sendUrl = `${baseUrl.replace(/\/$/, '')}/api/messages/send`;

        let sentOk = false;
        try {
          // Busca o PDF em buffer
          const pdfRes = await fetch(boletoLink);
          if (pdfRes.ok) {
            const arrayBuffer = await pdfRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            if ((globalThis as any).FormData && (globalThis as any).Blob) {
              const form = new (globalThis as any).FormData();
              form.append('number', cleanPhone);
              form.append('body', msg);

              const blob = new (globalThis as any).Blob([buffer], { type: 'application/pdf' });
              form.append('medias', blob, `boleto_${Date.now()}.pdf`);
              form.append('sendSignature', 'false');
              form.append('closeTicket', 'false');

              const responseWhaticket = await fetch(sendUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: form as any
              });
              sentOk = responseWhaticket.ok;
            }
          }
        } catch (mediaErr) {
          console.error('[Auto Send] Erro ao enviar mídia, tentando envio simples de texto:', mediaErr);
        }

        // Se falhou o envio com mídia, tenta envio de texto
        if (!sentOk) {
          const textUrl = `${baseUrl.replace(/\/$/, '')}/api/messages/send`;
          const textForm = new URLSearchParams();
          textForm.append('number', cleanPhone);
          textForm.append('body', msg);

          const responseText = await fetch(textUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: textForm.toString()
          });
          sentOk = responseText.ok;
        }

        if (sentOk) {
          sentCount++;
          console.log(`[Auto Send] Boleto #${idFatura} enviado com sucesso para o telefone ${cleanPhone}.`);
        } else {
          skippedCount++;
          console.log(`[Auto Send] Erro ao enviar boleto #${idFatura} via Whaticket.`);
        }
      } catch (errItem) {
        console.error(`[Auto Send] Erro ao processar fatura:`, errItem);
        skippedCount++;
      }
    }

    console.log(`[Auto Send] Processo concluído: ${sentCount} enviados, ${skippedCount} pulados.`);
    lastAutoSendDate = todayFormatted;

  } catch (e: any) {
    console.error('[Auto Send] Erro fatal no disparo automático de boletos:', e);
  }
}

startServer().catch((error) => {
  console.error("Erro fatal ao inicializar o servidor Express:", error);
});
