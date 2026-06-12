import React, { useState, useEffect } from 'react';
import { Product, User } from '../types';
import { PackagePlus, Search, Edit2, Trash2, X, Check, Package, Sparkles } from 'lucide-react';

interface ProductsTabProps {
  onRefreshProductsList?: () => void;
  currentUser?: User | null;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ onRefreshProductsList, currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados do Formulário de Edição / Criação
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [launchQty, setLaunchQty] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sale_price: '',
    stock_qty: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Falha ao buscar produtos.');
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreateModal = () => {
    setEditId(null);
    setSelectedProduct(null);
    setLaunchQty('');
    setFormData({ name: '', sale_price: '', stock_qty: '' });
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditId(product.id);
    setSelectedProduct(product);
    setLaunchQty('');
    setFormData({
      name: product.name,
      sale_price: String(product.sale_price),
      stock_qty: String(product.stock_qty)
    });
    setError(null);
    setShowModal(true);
  };

  const handleInsertStockLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    const qtyNum = parseFloat(launchQty);
    if (isNaN(qtyNum) || qtyNum === 0) {
      setError('Insira uma quantidade válida para lançar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${editId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qtyNum })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao lançar estoque.');
      }

      setSuccess(`Lançado com sucesso: +${qtyNum} un em estoque!`);
      setLaunchQty('');
      
      // Atualiza lista completa
      const updatedProductsResp = await fetch('/api/products');
      if (updatedProductsResp.ok) {
        const list = await updatedProductsResp.json();
        setProducts(list);
        const updated = list.find((p: Product) => String(p.id) === String(editId));
        if (updated) {
          setSelectedProduct(updated);
          setFormData((prev) => ({ ...prev, stock_qty: String(updated.stock_qty) }));
        }
      }

      if (onRefreshProductsList) onRefreshProductsList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao reajustar estoque.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInitialStock = async () => {
    if (!editId || !selectedProduct) return;
    const initial = selectedProduct.initial_stock || 0;
    
    if (!window.confirm(`Tem certeza que deseja excluir o estoque inicial de ${initial} un deste produto? O estoque geral será reduzido em ${initial} un.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${editId}/delete-initial-stock`, {
        method: 'POST'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover estoque inicial.');
      }

      setSuccess('Estoque inicial excluído com sucesso!');
      
      // Atualiza lista completa
      const updatedProductsResp = await fetch('/api/products');
      if (updatedProductsResp.ok) {
        const list = await updatedProductsResp.json();
        setProducts(list);
        const updated = list.find((p: Product) => String(p.id) === String(editId));
        if (updated) {
          setSelectedProduct(updated);
          setFormData((prev) => ({ ...prev, stock_qty: String(updated.stock_qty) }));
        }
      }

      if (onRefreshProductsList) onRefreshProductsList();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao remover estoque inicial.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('O nome do produto/serviço é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    const priceNum = parseFloat(formData.sale_price) || 0;
    const stockNum = parseFloat(formData.stock_qty) || 0;

    try {
      const isEdit = editId !== null;
      const url = isEdit ? `/api/products/${editId}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          sale_price: priceNum,
          stock_qty: stockNum
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar produto.');
      }

      setSuccess(isEdit ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
      await fetchProducts();
      if (onRefreshProductsList) onRefreshProductsList();
      setShowModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!window.confirm('Tem certeza de que deseja remover este produto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar produto.');
      }

      setSuccess('Produto removido de forma definitiva do sistema.');
      fetchProducts();
      if (onRefreshProductsList) onRefreshProductsList();
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-850">Cadastro de Produtos / Serviços</h2>
          <p className="text-xs text-gray-500">Registre os produtos e serviços de venda rápida para inseri-los instantaneamente nos recibos e orçamentos</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PackagePlus className="h-4 w-4" />
          Novo Produto / Serviço
        </button>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-2">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Buscar Produtos */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar produto ou serviço pelo nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-gray-150 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Tabela de Produtos */}
      <div className="overflow-x-auto rounded-lg border border-gray-150 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-gray-150">
            <tr>
              <th className="px-6 py-4">Item / Serviço</th>
              <th className="px-6 py-4">Preço de Venda</th>
              <th className="px-6 py-4">Estoque Disponível</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 text-gray-700">
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Sincronizando produtos em tempo real...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">
                  Nenhum produto ou serviço cadastrado com este filtro.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                        <Package className="h-4.5 w-4.5" />
                      </div>
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.sale_price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      product.stock_qty <= 0 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : product.stock_qty <= 5 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {product.stock_qty} un
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="rounded p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-all"
                        title="Editar Informações"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="rounded p-1.5 text-red-550 hover:bg-red-50 hover:text-red-700 transition-all"
                        title="Remover Registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Formulário */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-extrabold text-gray-900 border-b pb-2 mb-4">
              {editId ? 'Editar Detalhes do Produto / Serviço' : 'Cadastrar Novo Produto ou Serviço'}
            </h3>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-750 uppercase tracking-wide mb-1.5">
                  Nome do Produto / Descrição do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sensor Magnético Unity v2, Mão de Obra de Reparo, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-750 uppercase tracking-wide mb-1.5">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-750 uppercase tracking-wide mb-1.5">
                    Qtd. em Estoque {editId && '(Bloqueado)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    disabled={!!editId}
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                    className={`block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none ${
                      editId ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed font-medium' : 'bg-white text-gray-800'
                    }`}
                  />
                </div>
              </div>

              {editId && selectedProduct && (
                <div className="border border-gray-200 rounded-lg bg-gray-50 p-3 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-gray-500 block uppercase tracking-wide text-[10px]">Estoque Inicial</span>
                      <span className="text-sm font-extrabold text-gray-800 font-mono">
                        {selectedProduct.initial_stock !== undefined ? selectedProduct.initial_stock : selectedProduct.stock_qty} un
                      </span>
                    </div>

                    {currentUser?.role === 'admin' && Number(selectedProduct.initial_stock) > 0 ? (
                      <button
                        type="button"
                        onClick={handleDeleteInitialStock}
                        className="rounded px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                      >
                        Excluir Estoque Inicial
                      </button>
                    ) : (
                      Number(selectedProduct.initial_stock) > 0 && (
                        <span className="text-[10px] text-gray-400 italic">Exclusão restrita ao Admin</span>
                      )
                    )}
                  </div>

                  {/* Formulário de Lançamento */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-gray-600 uppercase tracking-wide">
                      Inserir Qtd Estoque
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Quantidade a adicionar. Ex: 12"
                        value={launchQty}
                        onChange={(e) => setLaunchQty(e.target.value)}
                        className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInsertStockLaunch}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Inserir
                      </button>
                    </div>
                  </div>

                  {/* Lista de lançamentos */}
                  {selectedProduct.stock_launches && selectedProduct.stock_launches.length > 0 && (
                    <div className="space-y-1 bg-white border border-gray-200 p-2 rounded-lg max-h-32 overflow-y-auto">
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Histórico de Lançamentos
                      </span>
                      <div className="divide-y divide-gray-100 text-[10px]">
                        {selectedProduct.stock_launches.map((launch, index) => (
                          <div key={launch.id || index} className="flex justify-between items-center py-1 text-gray-650">
                            <span className="font-medium text-emerald-700">
                              +{launch.quantity} un
                            </span>
                            <span className="text-gray-400 font-mono">
                              {new Date(launch.created_at).toLocaleDateString('pt-BR')} {new Date(launch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
