import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, ShoppingBag, User, FileText, ChevronDown, ChevronUp, Tag } from 'lucide-react';

export default function OrdersManager({ storeMode = 'retail' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to new orders
    const subscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sales',
        filter: `status=eq.order` // Note: RLS or client-side filtering needed for store_type if subscription doesn't support it well
      }, (payload) => {
        // We'll just refetch to be safe and simple
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [storeMode]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (name)
          )
        `)
        .eq('status', 'order')
        .eq('store_type', storeMode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refresh orders
      fetchOrders();
      if (newStatus === 'held') {
        alert('Pedido aceptado. Ahora está disponible en "Tickets Guardados" en el Punto de Venta.');
      } else if (newStatus === 'cancelled') {
        alert('Pedido rechazado');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar el pedido');
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (loading && orders.length === 0) {
    return <div className="flex items-center justify-center h-full">Cargando pedidos...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="p-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <ShoppingBag className="text-blue-600 dark:text-blue-400" />
          Pedidos Entrantes
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Gestiona los pedidos recibidos de la Tienda Compartida</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
            <ShoppingBag size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No hay pedidos pendientes</p>
            <p className="text-sm">Los pedidos nuevos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white">{order.customer_info || 'Cliente Anónimo'}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock size={14} />
                        <span>{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 dark:text-white">${order.total_amount.toFixed(2)}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full inline-block">
                        Pendiente
                      </p>
                    </div>
                    {expandedOrderId === order.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {expandedOrderId === order.id && (
                  <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 animate-in slide-in-from-top-2 duration-200">
                    {order.notes && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg flex gap-2 items-start">
                        <FileText size={16} className="text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-yellow-800 dark:text-yellow-400 text-sm block">Notas del cliente:</span>
                          <p className="text-yellow-700 dark:text-yellow-300 text-sm">{order.notes}</p>
                        </div>
                      </div>
                    )}

                    {order.coupon_code && (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg flex gap-2 items-start">
                        <Tag size={16} className="text-green-600 dark:text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-green-800 dark:text-green-400 text-sm block">Cupón Aplicado: {order.coupon_code}</span>
                          <p className="text-green-700 dark:text-green-300 text-sm">Descuento: ${order.discount_amount?.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Producto</th>
                            <th className="px-4 py-2 text-center font-medium">Cant.</th>
                            <th className="px-4 py-2 text-right font-medium">Precio</th>
                            <th className="px-4 py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {order.sale_items?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{item.product_name || item.products?.name || 'Producto'}</td>
                              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                              <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">${item.unit_price.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">${item.subtotal.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, 'cancelled'); }}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center gap-2 transition-colors"
                      >
                        <X size={18} />
                        Rechazar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, 'held'); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm transition-colors"
                      >
                        <Check size={18} />
                        Aceptar Pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
