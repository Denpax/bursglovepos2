import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { Calendar, Search, FileText, ChevronRight, ChevronDown, Printer, X, RotateCcw, AlertTriangle, ChevronLeft, Download } from 'lucide-react';
import TicketReceipt from '../pos/TicketReceipt';

export default function ReceiptsHistory({ storeMode = 'retail' }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [refundItem, setRefundItem] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundQuantity, setRefundQuantity] = useState(1);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, [storeMode]); // Re-fetch when storeMode changes

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
  }

  async function downloadReceiptsExcel() {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const { data: allReceipts, error } = await supabase
        .from('sales')
        .select('*, customers(full_name)')
        .gte('created_at', oneYearAgo.toISOString())
        .eq('store_type', storeMode) // Filter by storeMode
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (!allReceipts || !allReceipts.length) {
        alert('No hay recibos para descargar');
        return;
      }
      
      // Prepare data for Excel
      const data = allReceipts.map(r => ({
        'ID Recibo': r.id,
        'Fecha': new Date(r.created_at).toLocaleString(),
        'Cliente': r.customers?.full_name || 'Cliente General',
        'Total': r.total_amount,
        'Método Pago': r.payment_method === 'cash' ? 'Efectivo' : 
                       r.payment_method === 'card' ? 'Tarjeta' : 
                       r.payment_method === 'transfer' ? 'Transferencia' : r.payment_method,
        'Estado': r.status === 'completed' ? 'Completado' : 
                  r.status === 'refund' ? 'Reembolso' : r.status,
        'Descuento': r.discount_amount || 0,
        'Impuestos': r.tax_amount || 0
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Recibos Anuales");
      
      // Generate Excel file
      XLSX.writeFile(wb, `recibos_anuales_${new Date().toISOString().slice(0,10)}.xlsx`);
      
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo Excel');
    }
  }

  async function fetchSales() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (full_name)
        `)
        .eq('store_type', storeMode) // Filter by storeMode
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
      
      // Initialize all dates as expanded
      const dates = {};
      data.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString();
        dates[date] = true;
      });
      setExpandedDates(dates);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectSale(sale) {
    try {
      setDetailsLoading(true);
      setSelectedSale(sale);
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (name)
        `)
        .eq('sale_id', sale.id);

      if (error) throw error;

      // Format items for TicketReceipt
      const formattedItems = data.map(item => ({
        id: item.id, // Use sale_item id for refunds
        product_id: item.product_id,
        name: item.products?.name || 'Producto desconocido',
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: item.subtotal,
        refunded_quantity: item.refunded_quantity || 0,
        discount: (item.unit_price * item.quantity - item.subtotal) / (item.unit_price * item.quantity) * 100
      }));

      setSaleItems(formattedItems);
    } catch (error) {
      console.error('Error fetching sale details:', error);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function processRefund() {
    if (!refundItem || refundQuantity <= 0) return;
    
    try {
      setIsProcessingRefund(true);
      
      // Calculate refund amount
      const refundAmount = refundItem.price * refundQuantity;
      
      // Update sale_item
      const { error: itemError } = await supabase
        .from('sale_items')
        .update({
          refunded_quantity: (refundItem.refunded_quantity || 0) + refundQuantity,
          refund_amount: (refundItem.refund_amount || 0) + refundAmount,
          refund_reason: refundReason
        })
        .eq('id', refundItem.id);

      if (itemError) throw itemError;

      // Update sale total refunded
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          refunded_amount: (selectedSale.refunded_amount || 0) + refundAmount,
          refund_status: 'partial'
        })
        .eq('id', selectedSale.id);

      if (saleError) throw saleError;

      // Create new refund receipt (negative sale)
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: refundSale, error: refundSaleError } = await supabase
        .from('sales')
        .insert([{
          user_id: user?.id,
          customer_id: selectedSale.customer_id,
          total_amount: -refundAmount,
          payment_method: selectedSale.payment_method,
          status: 'refund',
          refund_related_sale_id: selectedSale.id,
          discount_amount: 0,
          store_type: storeMode // Save storeMode
        }])
        .select()
        .single();

      if (refundSaleError) throw refundSaleError;

      // Refresh data
      await fetchSales();
      
      // Select the new refund receipt
      if (refundSale) {
        await handleSelectSale(refundSale);
        alert('Reembolso procesado. Se ha generado un nuevo recibo.');
      }
      
      setRefundItem(null);
      setRefundReason('');
      setRefundQuantity(1);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Error al procesar el reembolso');
    } finally {
      setIsProcessingRefund(false);
    }
  }

  const toggleDate = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Group sales by date
  const groupedSales = sales.reduce((groups, sale) => {
    const date = new Date(sale.created_at).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(sale);
    return groups;
  }, {});

  useEffect(() => {
    if (searchTerm) {
      const dates = {};
      // Auto-expand all dates that match the search
      Object.keys(groupedSales).forEach(date => {
        const matchesDate = date.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingSales = groupedSales[date].some(sale => 
          sale.id.includes(searchTerm) || 
          (sale.ticket_number && sale.ticket_number.includes(searchTerm)) ||
          sale.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchesDate || hasMatchingSales) {
          dates[date] = true;
        }
      });
      setExpandedDates(prev => ({ ...prev, ...dates }));
    }
  }, [searchTerm, sales]); // Re-run when search or sales change

  const filteredDates = Object.keys(groupedSales).filter(date => {
    if (!searchTerm) return true;
    return date.toLowerCase().includes(searchTerm.toLowerCase()) || 
           groupedSales[date].some(sale => 
             sale.id.includes(searchTerm) || 
             (sale.ticket_number && sale.ticket_number.includes(searchTerm)) ||
             sale.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando historial...</div>;
  }

  return (
    <div className="flex h-full bg-gray-100">
      {/* List Panel */}
      <div className={`${selectedSale ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-1/3 bg-white border-r`}>
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Historial de Recibos</h2>
          <div className="flex gap-2 mb-4">
            <button 
              onClick={downloadReceiptsExcel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download size={18} />
              Descargar Reporte Anual (Excel)
            </button>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por fecha, ID o cliente..."
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredDates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No se encontraron recibos
            </div>
          ) : (
            filteredDates.map(date => (
              <div key={date} className="border-b last:border-b-0">
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 font-semibold text-gray-700 capitalize">
                    <Calendar size={18} />
                    {date}
                  </div>
                  {expandedDates[date] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {expandedDates[date] && (
                  <div className="divide-y">
                    {groupedSales[date]
                      .filter(sale => !searchTerm || 
                        sale.id.includes(searchTerm) || 
                        (sale.ticket_number && sale.ticket_number.includes(searchTerm)) ||
                        sale.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(sale => (
                      <button
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className={`w-full p-4 text-left hover:bg-blue-50 transition-colors ${
                          selectedSale?.id === sale.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-900">
                            #{sale.ticket_number || sale.id.slice(0, 8)}
                          </span>
                          <span className="font-bold text-green-600">
                            ${sale.total_amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <FileText size={14} />
                            <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span>{sale.customers?.full_name || 'Cliente General'}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400 uppercase">
                          {sale.payment_method === 'cash' ? 'Efectivo' : 
                           sale.payment_method === 'card' ? 'Tarjeta' : 
                           sale.payment_method === 'transfer' ? 'Transferencia' : sale.payment_method}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={`${selectedSale ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-gray-100 overflow-auto`}>

        {selectedSale ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b flex flex-wrap justify-between items-center shadow-sm gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedSale(null)}
                  className="md:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center gap-1 pr-3"
                >
                  <ChevronLeft size={20} />
                  <span className="text-sm font-medium">Volver</span>
                </button>
                <div>
                  <h3 className="font-bold text-lg">Detalle del Recibo</h3>
                  <p className="text-sm text-gray-500">#{selectedSale.ticket_number || selectedSale.id}</p>
                </div>
              </div>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-x-auto overflow-y-auto p-4 md:p-8">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="bg-white shadow-lg rounded-xl overflow-hidden mb-6">
                <div className="p-6 border-b">
                  <h3 className="font-bold text-lg mb-2">Detalles de la Venta</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-medium">{new Date(selectedSale.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cliente</p>
                      <p className="font-medium">{selectedSale.customers?.full_name || 'Cliente General'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Método de Pago</p>
                      <p className="font-medium capitalize">
                        {selectedSale.payment_method === 'cash' ? 'Efectivo' : 
                         selectedSale.payment_method === 'card' ? 'Tarjeta' : 
                         selectedSale.payment_method === 'transfer' ? 'Transferencia' : selectedSale.payment_method}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Estado</p>
                      <p className="font-medium capitalize">
                        {selectedSale.refund_status !== 'none' ? 'Reembolsado Parcialmente' : 'Completado'}
                      </p>
                    </div>
                  </div>
                </div>
                
           <table className="min-w-[600px] w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-sm">
                    <tr>
                      <th className="p-4">Producto</th>
                      <th className="p-4 text-center">Cant.</th>
                      <th className="p-4 text-right">Precio</th>
                      <th className="p-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {saleItems.map(item => (
                      <tr key={item.id}>
                        
                         <td className="p-4 flex items-center justify-between">
  <div>
    <p className="font-medium">{item.name}</p>
    {item.refunded_quantity > 0 && (
      <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
        Reembolsado: {item.refunded_quantity}
      </span>
    )}
  </div>

  {item.quantity > (item.refunded_quantity || 0) && (
    <button
      onClick={() => {
        setRefundItem(item);
        setRefundQuantity(1);
      }}
      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
      title="Reembolsar producto"
    >
      <RotateCcw size={16} />
    </button>
  )}
</td>
                        <td className="p-4 text-center">{item.quantity}</td>
                        <td className="p-4 text-right">${item.price.toFixed(2)}</td>
                        <td className="p-4 text-right">${item.subtotal.toFixed(2)}</td>
              
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan="3" className="p-4 text-right">Total</td>
                      <td className="p-4 text-right">${selectedSale.total_amount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    {selectedSale.refunded_amount > 0 && (
                      <tr className="text-red-600">
                        <td colSpan="3" className="p-4 text-right">Reembolsado</td>
                        <td className="p-4 text-right">-${selectedSale.refunded_amount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Hidden TicketReceipt for printing */}
              <div className="hidden print:block">
                <TicketReceipt
                  cart={saleItems}
                  total={selectedSale.total_amount}
                  subtotal={selectedSale.total_amount - (selectedSale.tax_amount || 0)}
                  tax={selectedSale.tax_amount || 0}
                  customer={selectedSale.customers}
                  settings={settings || {}}
                  ticketId={selectedSale.id}
                  ticketNumber={selectedSale.ticket_number}
                  date={selectedSale.created_at}
                  paymentMethod={selectedSale.payment_method}
                  discount={selectedSale.discount_amount}
                  cashierName="Administrador"
                />
              </div>
              </>
              )}
            </div>

            {/* Refund Modal */}
            {refundItem && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <AlertTriangle className="text-red-500" />
                      Reembolsar Producto
                    </h3>
                    <button onClick={() => setRefundItem(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="font-medium mb-1">{refundItem.name}</p>
                    <p className="text-sm text-gray-500">
                      Cantidad disponible para reembolso: {refundItem.quantity - (refundItem.refunded_quantity || 0)}
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a reembolsar</label>
                    <input
                      type="number"
                      min="1"
                      max={refundItem.quantity - (refundItem.refunded_quantity || 0)}
                      value={refundQuantity}
                      onChange={(e) => setRefundQuantity(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      rows="3"
                      placeholder="Razón del reembolso..."
                    ></textarea>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setRefundItem(null)}
                      className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={processRefund}
                      disabled={isProcessingRefund || refundQuantity <= 0 || refundQuantity > (refundItem.quantity - (refundItem.refunded_quantity || 0))}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isProcessingRefund ? 'Procesando...' : 'Confirmar Reembolso'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <FileText size={48} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium">Selecciona un recibo para ver los detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}