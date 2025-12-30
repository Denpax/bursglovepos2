import { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, User, X, ShoppingCart, ChevronDown, ChevronUp, Check, Printer, RefreshCw, Save, Star, Archive, Clock, CreditCard, Banknote, ArrowRightLeft, Percent, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TicketReceipt from './TicketReceipt';
import PointsManagerModal from './PointsManagerModal';
import HeldTicketsModal from './HeldTicketsModal';
import QuoteModal from './QuoteModal';

export default function TicketPanel({ 
  cart, 
  onUpdateQuantity, 
  onUpdateItem,
  onRemoveItem, 
  onClearCart,
  onNewTicket,
  activeTicketId,
  customer,
  onSelectCustomer,
  isMinimized,
  onToggleMinimize,
  loadTicket,
  pos,
  globalDiscount = 0,
  couponCode,
  discountAmount = 0,
  onUpdateTicket,
  onCloseTicket,
  storeMode = 'retail'
}) {
  const [customers, setCustomers] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  const [settings, setSettings] = useState({ vat_rate: 16 });
  
  // New Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    store_type: storeMode // Default to current storeMode
  });
  
  // Payment & Checkout State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lastSale, setLastSale] = useState(null);

  const [discounts, setDiscounts] = useState([]);
  // const [globalDiscount, setGlobalDiscount] = useState(0); // Removed local state
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showHeldTicketsModal, setShowHeldTicketsModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchDiscounts();
  }, [storeMode]); // Re-fetch when storeMode changes

  useEffect(() => {
    setPointsToRedeem(0);
  }, [customer, cart]);

  // Debug log to track cart updates
  useEffect(() => {
    console.log('[TicketPanel] Cart updated:', cart.length, 'items');
  }, [cart]);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
  }

  async function fetchDiscounts() {
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('store_type', storeMode) // Filter by storeMode
      .order('created_at');
    if (data) setDiscounts(data);
  }

  // Calculations
  const calculateItemTotal = (item) => {
    const base = item.price * item.quantity;
    const discount = item.discount ? (base * (item.discount / 100)) : 0;
    return base - discount;
  };

  const subtotalBeforeGlobal = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const globalDiscountAmount = subtotalBeforeGlobal * (globalDiscount / 100);
  const couponDiscountAmount = discountAmount || 0;
  const totalBeforePoints = subtotalBeforeGlobal - globalDiscountAmount - couponDiscountAmount;
  
  const pointsValue = settings.points_value || 1;
  const maxRedeemablePoints = customer ? Math.min(customer.points_balance || 0, Math.floor(totalBeforePoints / pointsValue)) : 0;
  
  const actualPointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);
  const pointsDiscountAmount = actualPointsToRedeem * pointsValue;
  
  const total = Math.max(0, totalBeforePoints - pointsDiscountAmount);
  
  const vatRate = settings.vat_rate || 0;
  const subtotal = total / (1 + (vatRate / 100));
  const tax = total - subtotal;

  useEffect(() => {
    if (showCustomerSearch) {
      fetchCustomers();
    }
  }, [showCustomerSearch]);

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .ilike('full_name', `%${customerSearchTerm}%`)
      .eq('store_type', storeMode); // Filter by storeMode
    if (data) setCustomers(data);
  }

  const handleCustomerSearch = (e) => {
    setCustomerSearchTerm(e.target.value);
    fetchCustomers();
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...newCustomerData, store_type: storeMode }]) // Add storeMode
        .select()
        .single();
        
      if (error) throw error;
      
      onSelectCustomer(data);
      setShowNewCustomerModal(false);
      setShowCustomerSearch(false);
      setNewCustomerData({ full_name: '', email: '', phone: '', birth_date: '', store_type: storeMode });
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error al crear cliente');
    }
  };

  const handleHoldTicket = async () => {
    if (cart.length === 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: sale, error } = await supabase
        .from('sales')
        .insert([{
          user_id: user?.id,
          customer_id: customer?.id,
          total_amount: total,
          status: 'held',
          discount_amount: globalDiscountAmount
        }])
        .select()
        .single();

      if (error) throw error;

      const saleItemsData = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: calculateItemTotal(item),
        discount_amount: item.discount || 0
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsData);
      if (itemsError) throw itemsError;

      alert('Ticket guardado correctamente');
      onClearCart();
    } catch (error) {
      console.error('Error holding ticket:', error);
      alert('Error al guardar ticket');
    }
  };

  const handleInitiateCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const handleSelectPaymentMethod = async (method) => {
    setPaymentMethod(method);
    await handleCheckout(method);
  };

  const handleCheckout = async (selectedMethod) => {
    setIsProcessing(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.');
      }

      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!publicUser) {
        await supabase.from('users').insert([{
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cajero',
            role: 'cashier'
          }]);
      }
      
      const pointsPercentage = (settings.points_earning_percentage || 10) / 100;
      const pointsEarned = (customer && actualPointsToRedeem === 0) ? Math.floor(total * pointsPercentage) : 0;
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          user_id: user.id,
          customer_id: customer?.id,
          terminal_id: pos?.id,
          total_amount: total,
          payment_method: selectedMethod,
          status: 'completed',
          points_earned: pointsEarned,
          points_redeemed: actualPointsToRedeem,
          points_discount_amount: pointsDiscountAmount,
          discount_amount: cart.reduce((sum, item) => {
             const base = item.price * item.quantity;
             const discount = item.discount ? (base * (item.discount / 100)) : 0;
             return sum + discount;
          }, 0) + globalDiscountAmount + couponDiscountAmount,
          coupon_code: couponCode,
          store_type: storeMode // Save storeMode
        }])
        .select()
        .single();

      if (saleError) throw new Error(`Error al crear venta: ${saleError.message}`);

      if (!sale) throw new Error('No se pudo crear la venta (ID no retornado)');

      if (cart.length > 0) {
        const saleItemsData = cart.map(item => ({
          sale_id: sale.id,
          product_id: item.id,
          product_name: item.name,
          variant_id: item.variant_id || null,
          variant_name: item.variant_name || null,
          quantity: item.quantity,
          unit_price: item.price,
          variant_cost_amount: (item.cost || 0) * item.quantity,
          subtotal: calculateItemTotal(item) * (1 - globalDiscount / 100),
          discount_amount: (item.discount ? (item.price * item.quantity * (item.discount / 100)) : 0) + (calculateItemTotal(item) * (globalDiscount / 100))
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) throw new Error(`Error al guardar items: ${itemsError.message}`);
      }

      for (const item of cart) {
        if (item.stock !== undefined) {
           await supabase.rpc('decrement_stock', { 
             p_id: item.id, 
             p_quantity: item.quantity,
             v_id: item.variant_id || null
           });
        }
      }

      if (customer) {
        if (pointsEarned > 0) {
          await supabase.rpc('increment_points', {
            c_id: customer.id,
            p_amount: pointsEarned
          });
        }
        if (actualPointsToRedeem > 0) {
          await supabase.rpc('increment_points', {
            c_id: customer.id,
            p_amount: -actualPointsToRedeem
          });
        }
      }

      setLastSale(sale);
      setShowPaymentModal(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-close success screen
  useEffect(() => {
    let timeout;
    if (showSuccess) {
      timeout = setTimeout(() => {
        handleNewSale();
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [showSuccess]);

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    setShowSuccess(false);
    setLastSale(null);
    onClearCart();
    if (onCloseTicket) {
      onCloseTicket(activeTicketId);
    } else if (onNewTicket) {
      onNewTicket();
    }
  };

  if (isMinimized) {
    return (
      <div className="h-full bg-white border-l shadow-xl w-16 flex flex-col items-center py-4">
        <button 
          onClick={onToggleMinimize}
          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 mb-4"
          title="Expandir Ticket"
        >
          <ShoppingCart size={24} />
        </button>
        <div className="flex-1 w-full flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-gray-500 rotate-90 whitespace-nowrap mt-8">
            Ticket
          </span>
          <div className="mt-auto mb-4 text-xs font-bold text-green-600 rotate-90 whitespace-nowrap">
            ${total.toFixed(2)}
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="h-full bg-white border-l shadow-xl w-full md:w-96 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <Check size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Venta Exitosa!</h2>
        <p className="text-gray-500 mb-2">Ticket #{lastSale?.ticket_number || lastSale?.id.slice(0, 8)}</p>
        <div className="mb-6 w-full">
          {lastSale?.points_earned > 0 ? (
            <div className="px-4 py-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-center justify-center gap-2 shadow-sm">
              <Star size={20} className="fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-lg">+{lastSale.points_earned} Puntos ganados</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-gray-50 text-gray-500 rounded-lg border border-gray-200 flex items-center justify-center gap-2 text-sm">
              <Star size={16} className="text-gray-400" />
              <span>No se generaron puntos en esta venta</span>
            </div>
          )}
        </div>
        
        <div className="space-y-3 w-full">
          <p className="text-sm text-gray-400 text-center animate-pulse">Cerrando automáticamente...</p>
          <button 
            onClick={handlePrint}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Printer size={20} /> Imprimir Ticket
          </button>
          <button 
            onClick={handleNewSale}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} /> Nueva Venta
          </button>
        </div>

        <div className="hidden print:block fixed inset-0 bg-white z-[100]">
          <TicketReceipt 
            cart={cart} 
            customer={customer} 
            total={total} 
            subtotal={subtotal} 
            tax={tax} 
            settings={settings}
            ticketId={lastSale?.id}
            ticketNumber={lastSale?.ticket_number}
            pointsRedeemed={lastSale?.points_redeemed}
            pointsDiscount={lastSale?.points_discount_amount}
            cashierName={pos?.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l dark:border-gray-700 shadow-xl w-full md:w-96 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg dark:text-white">
              {customer ? (
                <div className="flex items-center gap-2">
                  {customer.full_name}
                  <button 
                    onClick={() => onSelectCustomer(null)} 
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full p-1 transition-colors"
                    title="Quitar cliente"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                'Nuevo Ticket'
              )}
            </h2>
            {!customer && (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="flex items-center gap-1 px-2 py-1 text-blue-600 text-sm hover:bg-blue-50 rounded"
                title="Agregar Cliente"
              >
                <User size={14} />
                Agregar Cliente
              </button>
            )}
            {customer && (
              <button
                onClick={() => setShowPointsModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-purple-600 text-sm hover:bg-purple-50 rounded"
                title="Canjear Puntos"
              >
                <Star size={14} />
                {customer.points_balance} Pts
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowDiscountDropdown(!showDiscountDropdown)}
                className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
                  globalDiscount > 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Descuento Global"
              >
                <Percent size={14} />
                {globalDiscount > 0 ? `-${globalDiscount}%` : 'Desc.'}
              </button>

              {showDiscountDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 p-3 w-64">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Descuento Global</span>
                    <button onClick={() => setShowDiscountDropdown(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {discounts.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onUpdateTicket({ globalDiscount: globalDiscount === d.value ? 0 : d.value });
                          setShowDiscountDropdown(false);
                        }}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          globalDiscount === d.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {d.name} {d.type === 'percentage' ? `${d.value}%` : `${d.value}`}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 bg-white border rounded-full px-2 w-full mt-1">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={globalDiscount} 
                        onChange={(e) => onUpdateTicket({ globalDiscount: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs border-none focus:ring-0 p-1"
                        placeholder="Personalizado %"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowQuoteModal(true)}
              className="bg-teal-100 text-teal-600 hover:bg-teal-200 px-3 py-1 rounded-lg text-sm flex items-center gap-1 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Crear Cotización"
              disabled={cart.length === 0}
            >
              <FileText size={16} />
              <span className="hidden sm:inline">Cotizar</span>
            </button>
            <button 
              onClick={handleHoldTicket}
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded-lg text-sm flex items-center gap-1 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Guardar Ticket Actual"
              disabled={cart.length === 0}
            >
              <Save size={16} />
            </button>
            <button 
              onClick={() => setShowHeldTicketsModal(true)}
              className="bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1 rounded-lg text-sm flex items-center gap-1 font-medium transition-colors"
              title="Ver Tickets Guardados"
            >
              <Archive size={16} />
            </button>
            <button 
              onClick={onClearCart}
              className="text-red-500 hover:text-red-700 text-sm px-2"
              title="Limpiar Carrito"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Customer Selection - Moved to Header Area */}
        <div className="relative mt-2">

          {showCustomerSearch && (
            <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-lg shadow-lg z-10 p-2">
              <div className="flex justify-between items-center mb-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar cliente..."
                  className="w-full p-2 border rounded text-sm"
                  value={customerSearchTerm}
                  onChange={handleCustomerSearch}
                />
                <button onClick={() => setShowCustomerSearch(false)} className="ml-2 text-gray-400">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {customers.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      setShowCustomerSearch(false);
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm rounded"
                  >
                    <div className="font-medium">{c.full_name}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </div>
                ))}
                <button 
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowNewCustomerModal(true);
                  }}
                  className="w-full text-center p-2 text-blue-600 text-sm hover:bg-blue-50 rounded mt-1"
                >
                  + Nuevo Cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Seleccionar Método de Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-gray-500 dark:text-gray-400 mb-1">Total a Pagar</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => handleSelectPaymentMethod('cash')}
                disabled={isProcessing}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200">
                    <Banknote size={24} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">Efectivo</span>
                </div>
                <span className="text-gray-400 group-hover:text-green-600">Seleccionar</span>
              </button>

              <button
                onClick={() => handleSelectPaymentMethod('card')}
                disabled={isProcessing}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200">
                    <CreditCard size={24} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">Tarjeta</span>
                </div>
                <span className="text-gray-400 group-hover:text-blue-600">Seleccionar</span>
              </button>

              <button
                onClick={() => handleSelectPaymentMethod('transfer')}
                disabled={isProcessing}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200">
                    <ArrowRightLeft size={24} />
                  </div>
                  <span className="font-bold text-gray-700 dark:text-gray-200">Transferencia</span>
                </div>
                <span className="text-gray-400 group-hover:text-purple-600">Seleccionar</span>
              </button>

              {customer && (customer.points_balance || 0) >= total && (
                <button
                  onClick={() => handleSelectPaymentMethod('points')}
                  disabled={isProcessing}
                  className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg group-hover:bg-yellow-200">
                      <Star size={24} />
                    </div>
                    <span className="font-bold text-gray-700 dark:text-gray-200">Puntos ({customer.points_balance})</span>
                  </div>
                  <span className="text-gray-400 group-hover:text-yellow-600">Seleccionar</span>
                </button>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4 text-center text-sm text-gray-500 animate-pulse">
                Procesando pago...
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">Nuevo Cliente</h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerData.full_name}
                  onChange={e => setNewCustomerData({...newCustomerData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerData.email}
                  onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerData.phone}
                  onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newCustomerData.birth_date}
                  onChange={e => setNewCustomerData({...newCustomerData, birth_date: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Manager Modal */}
      {showPointsModal && (
        <PointsManagerModal
          customer={customer}
          pointsToRedeem={pointsToRedeem}
          setPointsToRedeem={setPointsToRedeem}
          maxRedeemablePoints={maxRedeemablePoints}
          pointsDiscountAmount={pointsDiscountAmount}
          onClose={() => setShowPointsModal(false)}
          totalBeforePoints={totalBeforePoints}
          settings={settings}
        />
      )}

      {/* Held Tickets Modal */}
      {showHeldTicketsModal && (
        <HeldTicketsModal
          onClose={() => setShowHeldTicketsModal(false)}
          onLoadTicket={loadTicket}
        />
      )}

      {/* Quote Modal */}
      {showQuoteModal && (
        <QuoteModal
          cart={cart}
          customer={customer}
          settings={settings}
          total={total}
          subtotal={subtotal}
          tax={tax}
          onClose={() => setShowQuoteModal(false)}
        />
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 dark:bg-gray-900">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <ShoppingCart size={48} className="mb-2 opacity-20" />
            <p>Ticket vacío</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.cartItemId || item.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-3">
                <div className="flex-1 cursor-pointer" onClick={() => setEditingItem(item)}>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    {item.name}
                    {item.discount > 0 && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1 rounded">-{item.discount}%</span>}
                  </h4>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ${item.price} x {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    title="Descuento Individual"
                  >
                    <Percent size={16} />
                  </button>
                  <div className="flex items-center bg-white dark:bg-gray-700 rounded border dark:border-gray-600">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.cartItemId || item.id, item.quantity - 1); }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.cartItemId || item.id, item.quantity + 1); }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-bold text-gray-800 dark:text-white w-16 text-right">
                    ${calculateItemTotal(item).toFixed(2)}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(item.cartItemId || item.id); }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Options Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">{editingItem.name}</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descuento Individual</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {discounts.map(d => (
                    <button
                      key={d.id}
                      onClick={() => onUpdateItem(editingItem.cartItemId || editingItem.id, { discount: editingItem.discount === d.value ? 0 : d.value })}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        editingItem.discount === d.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-blue-400'
                      }`}
                    >
                      {d.name} {d.type === 'percentage' ? `${d.value}%` : `${d.value}`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Personalizado:</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={editingItem.discount || ''} 
                    onChange={(e) => onUpdateItem(editingItem.cartItemId || editingItem.id, { discount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 text-sm bg-transparent border-none focus:ring-0 p-0 dark:text-white"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="text-gray-700 dark:text-gray-300 font-medium">Acumula Puntos</label>
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  checked={editingItem.earnsPoints !== false}
                  onChange={(e) => onUpdateItem(editingItem.cartItemId || editingItem.id, { earnsPoints: e.target.checked })}
                />
              </div>
              
              <button 
                onClick={() => setEditingItem(null)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow hover:bg-blue-700 mt-4"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Totals */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {globalDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Descuento Global ({globalDiscount}%)</span>
              <span>-${globalDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          {couponCode && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Cupón ({couponCode})</span>
              <span>-${couponDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          {pointsDiscountAmount > 0 && (
            <div className="flex justify-between text-purple-600 dark:text-purple-400">
              <span>Puntos Canjeados ({actualPointsToRedeem})</span>
              <span>-${pointsDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>IVA ({settings.vat_rate}%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t dark:border-gray-700">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        
        <button 
          onClick={handleInitiateCheckout}
          disabled={cart.length === 0 || isProcessing}
          className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? 'Procesando...' : `Cobrar ${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}