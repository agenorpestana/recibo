import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { UserPlus, Search, Edit2, Trash2, X, Check, Eye } from 'lucide-react';

interface ClientsTabProps {
  onRefreshClientsList?: () => void;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({ onRefreshClientsList }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados do Formulário de Edição / Criação
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj_cpf: '',
    address: '',
    phone: '',
    email: ''
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Falha ao buscar clientes.');
      const data = await response.json();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenCreateModal = () => {
    setEditId(null);
    setFormData({ name: '', cnpj_cpf: '', address: '', phone: '', email: '' });
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditId(client.id);
    setFormData({
      name: client.name,
      cnpj_cpf: client.cnpj_cpf,
      address: client.address,
      phone: client.phone,
      email: client.email
    });
    setError(null);
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isEdit = editId !== null;
      const url = isEdit ? `/api/clients/${editId}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar cliente.');
      }

      setSuccess(isEdit ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      await fetchClients();
      if (onRefreshClientsList) onRefreshClientsList();
      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: string | number) => {
    if (!window.confirm('Tem certeza de que deseja remover este cliente? Todos os dados associados serão desvinculados.')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar cliente.');
      }

      setSuccess('Cliente removido de forma definitiva do sistema.');
      fetchClients();
      if (onRefreshClientsList) onRefreshClientsList();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj_cpf.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-850">Cadastro de Clientes</h2>
          <p className="text-xs text-gray-500">Registre e edite os dados cadastrais completos dos seus clientes para gerar notas automáticas</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Buscar Clientes */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cliente por nome, CNPJ/CPF ou telefone..."
          className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Tabela de Clientes */}
      <div className="overflow-x-auto rounded-lg border border-gray-150 bg-white">
        <table className="min-w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-gray-150">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">CPF / CNPJ</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Endereço</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 text-gray-700">
            {loading && clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  <div className="flex justify-center items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando tabela...
                  </div>
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                  {searchTerm ? 'Nenhum resultado corresponde à busca.' : 'Nenhum cliente cadastrado ainda.'}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{client.cnpj_cpf || '---'}</td>
                  <td className="px-6 py-4">{client.phone || '---'}</td>
                  <td className="px-6 py-4 text-xs">{client.email || '---'}</td>
                  <td className="px-6 py-4 text-xs max-w-xs truncate">{client.address || '---'}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditModal(client)}
                      title="Editar dados"
                      className="rounded p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      title="Excluir"
                      className="rounded p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro / Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 max-w-lg w-full overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">
                {editId ? 'Atualizar Ficha de Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded p-1 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nome do Cliente / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome Completo ou Razão Social"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj_cpf}
                    onChange={(e) => setFormData({ ...formData, cnpj_cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00)00000-0000"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  E-mail do Cliente
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@provedor.com"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Endereço Residencial ou Comercial
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, Número, Bairro, Cidade-UF"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-150 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center"
                >
                  {loading ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
