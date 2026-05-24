/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User, Client, CompanySettings } from './types';
import { Login } from './components/Login';
import { ReceiptsTab } from './components/ReceiptsTab';
import { ClientsTab } from './components/ClientsTab';
import { ReportsTab } from './components/ReportsTab';
import { CompanySettingsTab } from './components/CompanySettingsTab';
import { UsersTab } from './components/UsersTab';
import { 
  Receipt, Users, BarChart3, Settings, LogOut, CheckSquare, ShieldAlert, Sparkles, ServerCrash, ShieldCheck
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'clients' | 'reports' | 'settings' | 'users'>('documents');
  
  // Estados compartilhados e atualizados dinamicamente pelo painel central
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsTrigger, setStatsTrigger] = useState(0);

  // Carrega credenciais salvas em localStorage para manter a sessão ativa durante testes e recargas
  useEffect(() => {
    const savedUser = localStorage.getItem('unity_user');
    const savedToken = localStorage.getItem('unity_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('unity_user', JSON.stringify(loggedInUser));
    localStorage.setItem('unity_token', sessionToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('unity_user');
    localStorage.removeItem('unity_token');
  };

  // Sincroniza catálogo de clientes pré-carregados para preenchimento inteligente em sub-abas
  const refreshSharedClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Erro ao pré-carregar catálogo de clientes:", e);
    }
  };

  // Carrega configurações gerais e logotipo base64 da empresa
  const refreshCompanySettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Erro ao pré-carregar configurações corporativas:", e);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshSharedClients(), refreshCompanySettings()])
        .finally(() => setLoading(false));
    }
  }, [user]);

  // Controla se a aba é visível para o perfil atual
  const isTabAuthorized = (tab: 'documents' | 'clients' | 'reports' | 'settings' | 'users') => {
    if (user?.role === 'admin') return true;
    return user?.permissions?.includes(tab) || false;
  };

  // Redireciona o operador para a primeira aba disponível caso tente acessar uma sem permissão
  useEffect(() => {
    if (user) {
      if (!isTabAuthorized(activeTab)) {
        const orderOfTabs: ('documents' | 'clients' | 'reports' | 'settings' | 'users')[] = [
          'documents', 'clients', 'reports', 'settings', 'users'
        ];
        const firstAllowed = orderOfTabs.find(t => isTabAuthorized(t));
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [user, activeTab]);

  // Se o usuário não estiver autenticado, exibe a tela de login seguro
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none">
      {/* Cabeçalho do Painel Administrativo de Controle */}
      <header className="no-print bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo da Unity e Tópico */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 rounded-lg p-2 text-white">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[15px] tracking-tight text-gray-900 leading-none">Comprovantes Online</span>
                <span className="text-[10px] text-gray-400 font-bold font-mono mt-1">UNITY AUTOMAÇÕES</span>
              </div>
            </div>

            {/* Abas Principais de Navegação Horizontal */}
            <nav className="hidden md:flex space-x-1 items-end mt-2">
              {isTabAuthorized('documents') && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-2 border-b-2 text-xs font-bold leading-5 transition-colors flex items-center gap-2 ${
                    activeTab === 'documents'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  Recibos & Orçamentos
                </button>
              )}

              {isTabAuthorized('clients') && (
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`px-4 py-2 border-b-2 text-xs font-bold leading-5 transition-colors flex items-center gap-2 ${
                    activeTab === 'clients'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Cadastro de Clientes
                </button>
              )}

              {isTabAuthorized('reports') && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-4 py-2 border-b-2 text-xs font-bold leading-5 transition-colors flex items-center gap-2 ${
                    activeTab === 'reports'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Relatório Financeiro
                </button>
              )}

              {isTabAuthorized('settings') && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 border-b-2 text-xs font-bold leading-5 transition-colors flex items-center gap-2 ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Configurações Gerais
                </button>
              )}

              {isTabAuthorized('users') && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 border-b-2 text-xs font-bold leading-5 transition-colors flex items-center gap-2 ${
                    activeTab === 'users'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Controle de Acessos
                </button>
              )}
            </nav>

            {/* Informações do Superusuário Logado e Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-bold text-xs text-gray-900">{user.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[9px] text-blue-800 font-extrabold flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {user.role === 'admin' ? 'Admin' : 'Operador'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{user.email}</span>
              </div>

              <div className="border-l border-gray-200 h-8"></div>

              <button
                onClick={handleLogout}
                title="Desconectar do painel administrativo"
                className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Sanduíche Simplificado / Alternador de Abas para Celular */}
      <div className="no-print bg-white border-b border-gray-200 md:hidden flex justify-around p-2 sticky top-[64px] z-30 shadow-sm">
        {isTabAuthorized('documents') && (
          <button
            onClick={() => setActiveTab('documents')}
            title="Comprovantes"
            className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold ${
              activeTab === 'documents' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
            }`}
          >
            <Receipt className="h-5 w-5" />
            Recibos & Orçamentos
          </button>
        )}

        {isTabAuthorized('clients') && (
          <button
            onClick={() => setActiveTab('clients')}
            title="Clientes"
            className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold ${
              activeTab === 'clients' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
            }`}
          >
            <Users className="h-5 w-5" />
            Clientes
          </button>
        )}

        {isTabAuthorized('reports') && (
          <button
            onClick={() => setActiveTab('reports')}
            title="Relatório"
            className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold ${
              activeTab === 'reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            Relatório
          </button>
        )}

        {isTabAuthorized('settings') && (
          <button
            onClick={() => setActiveTab('settings')}
            title="Empresa"
            className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold ${
              activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
            }`}
          >
            <Settings className="h-5 w-5" />
            Empresa
          </button>
        )}

        {isTabAuthorized('users') && (
          <button
            onClick={() => setActiveTab('users')}
            title="Usuários"
            className={`p-2 rounded-lg flex flex-col items-center gap-1 text-[9px] font-bold ${
              activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            Usuários
          </button>
        )}
      </div>

      {/* Corpo Inicial de Conteúdo Ativo */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans select-none">
        {loading && !settings ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-sm text-gray-500 font-sans">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Sincronizando ambiente seguro...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'documents' && isTabAuthorized('documents') && settings && (
              <ReceiptsTab 
                settings={settings} 
                clients={clients} 
                onRefreshStats={() => setStatsTrigger(prev => prev + 1)}
                currentUser={user}
              />
            )}

            {activeTab === 'clients' && isTabAuthorized('clients') && (
              <ClientsTab onRefreshClientsList={refreshSharedClients} />
            )}

            {activeTab === 'reports' && isTabAuthorized('reports') && (
              <ReportsTab key={statsTrigger} />
            )}

            {activeTab === 'settings' && isTabAuthorized('settings') && settings && (
              <CompanySettingsTab 
                settings={settings} 
                onSettingsUpdated={(updated) => setSettings(updated)}
              />
            )}

            {activeTab === 'users' && isTabAuthorized('users') && (
              <UsersTab currentUser={user} />
            )}
          </div>
        )}
      </main>

      {/* Rodapé Administrativo */}
      <footer className="no-print bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
          <span>&copy; {new Date().getFullYear()} Unity Automações LTDA. Todos os direitos reservados.</span>
          <div className="flex gap-4 font-mono font-bold">
            <span className="text-blue-600 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              SISTEMA INTEGRADO MYSQL READY
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
