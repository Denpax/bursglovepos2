import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, User, Calendar, DollarSign, Star, History, X, Filter, ArrowUpDown, Trash2, Edit, Save, MessageCircle } from 'lucide-react';

export default function CustomerList({ storeMode = 'retail' }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, [storeMode]);

  async function fetchCustomerHistory(customerId) {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (name)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCustomerHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerHistory(customer.id);
  };

  async function fetchCustomers() {
    try {
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_type', storeMode)
        .order('full_name')
        .range(0, 9999);
      
      if (error) throw error;

      const { data: salesData } = await supabase
        .from('sales')
        .select('customer_id, total_amount, created_at, points_redeemed')
        .eq('store_type', storeMode)
        .range(0, 9999);

      const safeSalesData = salesData || [];
      const safeCustomersData = customersData || [];

      const customersWithStats = safeCustomersData.map(customer => {
        const customerSales = safeSalesData.filter(s => s.customer_id === customer.id);
        
        const totalSpent = customerSales.reduce((sum, s) => sum + s.total_amount, 0);
        const pointsUsed = customerSales.reduce((sum, s) => sum + (s.points_redeemed || 0), 0);
        
        customerSales.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const firstVisit = customerSales.length > 0 ? customerSales[0].created_at : null;
        const lastVisit = customerSales.length > 0 ? customerSales[customerSales.length - 1].created_at : null;

        return {
          ...customer,
          totalSpent,
          pointsUsed,
          firstVisit,
          lastVisit,
          visitCount: customerSales.length
        };
      });

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCustomer(e, customerId) {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== customerId));
      if (selectedCustomer?.id === customerId) setSelectedCustomer(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error al eliminar cliente. Puede que tenga ventas asociadas.');
    }
  }

  const handleEditCustomer = (e, customer) => {
    e.stopPropagation();
    setEditingCustomer({ ...customer });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      // Only send fields that exist in the database table
      const updates = {
        full_name: editingCustomer.full_name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        birth_date: editingCustomer.birth_date
      };

      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setCustomers(customers.map(c => 
        c.id === editingCustomer.id ? { ...c, ...updates } : c
      ));
      setShowEditModal(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error al actualizar cliente');
    }
  };

  const processedCustomers = customers
    .filter(c => {
      const matchesSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm));
      
      if (filterType === 'with_points') return matchesSearch && c.points_balance > 0;
      if (filterType === 'frequent') return matchesSearch && c.visitCount > 2;
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'full_name') {
        comparison = a.full_name.localeCompare(b.full_name);
      } else if (sortConfig.key === 'points_balance') {
        comparison = a.points_balance - b.points_balance;
      } else if (sortConfig.key === 'totalSpent') {
        comparison = a.totalSpent - b.totalSpent;
      } else if (sortConfig.key === 'visitCount') {
        comparison = a.visitCount - b.visitCount;
      } else if (sortConfig.key === 'birth_date') {
        const dateA = a.birth_date ? new Date(a.birth_date).getTime() : 0;
        const dateB = b.birth_date ? new Date(b.birth_date).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

  if (loading) return <div className="p-8 text-center">Cargando clientes...</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Filter size={18} className="text-gray-500" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent border-none outline-none text-sm"
            >
              <option value="all">Todos</option>
              <option value="with_points">Con Puntos</option>
              <option value="frequent">Frecuentes</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <ArrowUpDown size={18} className="text-gray-500" />
            <select 
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-');
                setSortConfig({ key, direction });
              }}
              className="bg-transparent border-none outline-none text-sm"
            >
              <option value="full_name-asc">Nombre (A-Z)</option>
              <option value="full_name-desc">Nombre (Z-A)</option>
              <option value="points_balance-desc">Puntos (Mayor)</option>
              <option value="points_balance-asc">Puntos (Menor)</option>
              <option value="totalSpent-desc">Gasto (Mayor)</option>
              <option value="visitCount-desc">Visitas (Mayor)</option>
              <option value="birth_date-desc">Fecha de Nacimiento (Más reciente)</option>
              <option value="birth_date-asc">Fecha de Nacimiento (Más antigua)</option>
            </select>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden flex-1 overflow-y-auto">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-500">Cliente</th>
              <th className="p-4 font-medium text-gray-500">Visitas</th>
              <th className="p-4 font-medium text-gray-500">Gasto Total</th>
              <th className="p-4 font-medium text-gray-500">Puntos (Bal/Usados)</th>
              <th className="p-4 font-medium text-gray-500">Última Visita</th>
              <th className="p-4 font-medium text-gray-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {processedCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectCustomer(customer)}>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold hover:bg-blue-200 transition-colors">
                      {customer.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{customer.full_name}</div>
                      <div className="text-xs text-gray-500">{customer.email || customer.phone}</div>
                      {customer.birth_date && (
                        <div className="text-xs text-gray-400">Nacimiento: {new Date(customer.birth_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-600">
                  {customer.visitCount}
                  {customer.firstVisit && (
                    <div className="text-xs text-gray-400">Desde {new Date(customer.firstVisit).toLocaleDateString()}</div>
                  )}
                </td>
                <td className="p-4 font-medium text-gray-900">
                  ${customer.totalSpent.toFixed(2)}
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-green-600 font-medium">{customer.points_balance} pts</span>
                    <span className="text-xs text-gray-400">Usados: {customer.pointsUsed}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600">
                  {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Nunca'}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {customer.phone && (
                      <a
                        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Enviar WhatsApp"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                    <button
                      onClick={(e) => handleEditCustomer(e, customer)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCustomer(e, customer.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedCustomer.full_name}</h3>
                <p className="text-sm text-gray-500">Historial de Compras</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="text-center py-8">Cargando historial...</div>
              ) : customerHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No hay compras registradas</div>
              ) : (
                <div className="space-y-4">
                  {customerHistory.map(sale => (
                    <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-gray-800">Ticket #{sale.id.slice(0, 8)}</div>
                          <div className="text-sm text-gray-500">{new Date(sale.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">${sale.total_amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500 capitalize">{sale.payment_method}</div>
                        </div>
                      </div>
                      
                      {/* Items List */}
                      <div className="mt-2 mb-2 bg-gray-50 p-2 rounded text-sm">
                        {sale.sale_items && sale.sale_items.map(item => (
                          <div key={item.id} className="flex justify-between text-gray-600">
                            <span>{item.quantity}x {item.products?.name || 'Producto'}</span>
                            <span>${item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                        <span className="text-gray-600">Puntos ganados: {sale.points_earned || 0}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${sale.refund_status !== 'none' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {sale.refund_status !== 'none' ? 'Reembolsado' : 'Completado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Editar Cliente</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg"
                  value={editingCustomer.full_name}
                  onChange={e => setEditingCustomer({...editingCustomer, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded-lg"
                  value={editingCustomer.email || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  className="w-full p-2 border rounded-lg"
                  value={editingCustomer.phone || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg"
                  value={editingCustomer.birth_date || ''}
                  onChange={e => setEditingCustomer({...editingCustomer, birth_date: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}