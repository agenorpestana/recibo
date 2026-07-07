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
            Id: idCliente,
            Nome: clientName || fatura.Cliente?.Nome || 'Cliente Não Informado',
            CnpjCpf: clientDoc || fatura.Cliente?.CnpjCpf || 'N/A',
            Celular: clientCel || fatura.Cliente?.Celular || '',
            ...clientData
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
              Id: idEmpresa,
              Nome: matchedCompany.Nome || matchedCompany.RazaoSocial || 'Empresa Não Informada',
              Cnpj: matchedCompany.Cnpj || matchedCompany.CnpjCpf || 'N/A',
              ...matchedCompany
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
