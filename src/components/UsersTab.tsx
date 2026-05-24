import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  ShieldCheck, UserPlus, Trash2, Edit2, ShieldAlert, Key, Mail, User as UserIcon, Lock, 
  Check, Square, CheckSquare, Sparkles, Loader2, AlertCircle
} from 'lucide-react';

interface UsersTabProps {
  currentUser: User;
}

export const UsersTab: React.FC<UsersTabProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do Modal
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);

  // Campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [permissions, setPermissions] = useState<string[]>(['documents', 'clients']);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Falha ao carregar a lista de usuários.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openNewUserModal = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setPermissions(['documents', 'clients']); // Default permissions
    setError(null);
    setIsOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Mantenha vazio para edição de senha opcional
    setRole(user.role);
    setPermissions(user.permissions || []);
    setError(null);
    setIsOpen(isOpen => true);
  };

  const togglePermission = (tabKey: string) => {
    if (permissions.includes(tabKey)) {
      setPermissions(permissions.filter(p => p !== tabKey));
    } else {
      setPermissions([...permissions, tabKey]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Por favor, preencha o Nome e o E-mail.');
      return;
    }

    if (!isEditMode && !password) {
      setError('A senha é obrigatória para novos usuários.');
      return;
    }

    setSubmitLoading(true);
    setError(null);

    const payload = {
      name,
      email,
      role,
      permissions: role === 'admin' ? [] : permissions,
      ...(password ? { password } : {})
    };

    try {
      const url = isEditMode ? `/api/users/${selectedUserId}` : '/api/users';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar requisição.');
      }

      setIsOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o usuário.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string | number, userEmail: string) => {
    if (userEmail.toLowerCase() === 'suporte@unityautomacoes.com.br') {
      alert('Operação Negada: O super usuário administrador nativo do sistema não pode ser excluído.');
      return;
    }

    if (!confirm(`Tem certeza que gostaria de excluir o usuário ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao tentar deletar o usuário.');
      }

      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao processar exclusão.');
    }
  };

  const availableAbas = [
    { key: 'documents', label: 'Recibos & Orçamentos', desc: 'Permite criar, visualizar e imprimir documentos' },
    { key: 'clients', label: 'Cadastro de Clientes', desc: 'Acesso para cadastrar e gerenciar clientes da base' },
    { key: 'reports', label: 'Relatório Financeiro', desc: 'Permite analisar estatísticas e desempenho geral' },
    { key: 'settings', label: 'Configurações Gerais', desc: 'Permite alterar logotipo e dados comerciais da empresa' },
    { key: 'users', label: 'Gerenciador de Usuários', desc: 'Controle de acessos de outros operadores' }
  ];

  const isSuperUser = (email: string) => {
    return email.toLowerCase() === 'suporte@unityautomacoes.com.br';
  };

  return (
    <div id="users-tab-container" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Controle de Usuários e Permissões
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Cadastre operadores administrativos ou usuários com restrições de acesso por abas específicas.
          </p>
        </div>

        <button
          onClick={openNewUserModal}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {error && !isOpen && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 font-medium">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="text-xs text-gray-500 font-semibold">Carregando usuários do sistema...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Função / Perfil</th>
                  <th className="px-6 py-4">Status / Abas Permitidas</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs text-gray-600">
                {users.map((u) => {
                  const isSuper = isSuperUser(u.email);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isSuper ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500'}`}>
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              {u.name}
                              {isSuper && (
                                <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1 py-0.2 rounded flex items-center gap-1">
                                  <Sparkles className="h-2 w-2" />
                                  SUPORTE FIXED
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 font-medium text-[11px] font-mono mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-150">
                            Administrador (Total)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            Operador Limitado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.role === 'admin' ? (
                          <span className="text-gray-400 font-medium text-[11px] italic">Acesso completo a todas as abas do painel</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(!u.permissions || u.permissions.length === 0) ? (
                              <span className="text-red-500 font-bold text-[10px]">Acesso Bloqueado (Nenhuma Aba)</span>
                            ) : (
                              u.permissions.map(p => {
                                const matched = availableAbas.find(aba => aba.key === p);
                                return (
                                  <span key={p} className="bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    {matched ? matched.label : p}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 justify-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 bg-gray-50 border border-gray-200 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Editar Dados e Acessos"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            disabled={isSuper}
                            className={`p-1.5 rounded transition-all ${
                              isSuper 
                                ? 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed' 
                                : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={isSuper ? 'O Super Usuário administrativo não pode ser excluído' : 'Excluir Usuário'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="py-12 text-center text-gray-400 font-medium">
              Nenhum usuário cadastrado.
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden transform transition-all">
            
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                {isEditMode ? 'Editar Usuário Operador' : 'Cadastrar Novo Operador'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full text-xs font-semibold rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-gray-900 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                      placeholder="Nome do Operador"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider mb-1.5">
                    Endereço de E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      disabled={isEditMode && isSuperUser(email)}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full text-xs font-semibold rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-gray-900 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
                      placeholder="operador@unity.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider mb-1.5">
                  Senha {isEditMode && <span className="text-gray-400 text-[10px] normal-case font-medium">(deixe em branco para não alterar)</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required={!isEditMode}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full text-xs font-semibold rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-gray-900 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    placeholder={isEditMode ? 'Manter senha atual' : 'Defina a senha de acesso'}
                  />
                </div>
              </div>

              {/* Perfil de Acesso */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider">
                  Nível de Perfil
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100/50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      disabled={isEditMode && isSuperUser(email)}
                      checked={role === 'admin'}
                      onChange={() => setRole('admin')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-gray-900">Administrador</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Acesso completo a todas as funções</div>
                    </div>
                  </label>

                  <label className="flex-1 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100/50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      disabled={isEditMode && isSuperUser(email)}
                      checked={role === 'user'}
                      onChange={() => setRole('user')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-gray-900">Operador</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Acessos restritos por abas selecionadas</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Box de seleção de permissão se for usuário comum */}
              {role === 'user' && (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Configurar Permissão de Abas
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {availableAbas.map((aba) => {
                      const isAllowed = permissions.includes(aba.key);
                      return (
                        <div
                          key={aba.key}
                          onClick={() => togglePermission(aba.key)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                            isAllowed 
                              ? 'bg-blue-50/60 border-blue-200 text-blue-900' 
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isAllowed ? (
                              <CheckSquare className="h-4.5 w-4.5 text-blue-600" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight">{aba.label}</div>
                            <div className={`text-[9px] mt-0.5 leading-relaxed ${isAllowed ? 'text-blue-600/85' : 'text-gray-400'}`}>
                              {aba.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botões do Formulário */}
              <div className="pt-4 border-t border-gray-150 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
