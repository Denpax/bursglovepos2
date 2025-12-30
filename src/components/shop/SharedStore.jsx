import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import ProductList from '../pos/ProductList';
import SimpleTicket from './SimpleTicket';
import { ShoppingCart, X, MessageCircle, Moon, Sun } from 'lucide-react';

export default function SharedStore() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [storePhone, setStorePhone] = useState('');
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Get store type from URL
  const searchParams = new URLSearchParams(window.location.search);
  const storeMode = searchParams.get('store_type') || 'retail';

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('business_phone').maybeSingle();
    if (data?.business_phone) setStorePhone(data.business_phone);
  }

  const handleAddToCart = (product) => {
    setCart(prevCart => {
      const price = parseFloat(product.price) || 0;
      const productWithPrice = { ...product, price };
      
      const existingItemIndex = prevCart.findIndex(item => 
        item.id === product.id && item.variant_id === product.variant_id
      );
      
      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1
        };
        return newCart;
      } else {
        return [...prevCart, { ...productWithPrice, quantity: 1, cartItemId: uuidv4() }];
      }
    });
    
    setToast(`Agregado: ${product.name}`);
    setTimeout(() => setToast(null), 2000);
  };

  const handleUpdateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCart(cart.map(item => 
      (item.cartItemId === cartItemId || item.id === cartItemId) ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (cartItemId) => {
    setCart(cart.filter(item => (item.cartItemId !== cartItemId && item.id !== cartItemId)));
  };

  const handleCheckCustomer = async (phone) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, points_balance, birth_date')
        .eq('phone', phone)
        .eq('store_type', storeMode)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking customer:', error);
      return null;
    }
  };

  const handleValidateCoupon = async (code, cartTotal, customerId = null) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('active', true)
        .eq('store_type', storeMode) // Filter by storeMode (assuming coupons have store_type, if not, need to add it)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Cupón no válido o expirado');

      if (data.max_uses > 0 && data.current_uses >= data.max_uses) {
        throw new Error('Este cupón ha alcanzado su límite de usos');
      }

      const minAmount = parseFloat(data.min_purchase_amount || 0);
      if (minAmount > 0 && cartTotal < minAmount) {
        throw new Error(`El monto mínimo para este cupón es ${minAmount.toFixed(2)}`);
      }

      if (data.is_birthday_coupon) {
        if (!customerId) {
          throw new Error('Este cupón es exclusivo para cumpleañeros. Por favor identifícate primero.');
        }

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('birth_date')
          .eq('id', customerId)
          .single();

        if (customerError || !customer) {
          throw new Error('Error al verificar información del cliente');
        }

        if (!customer.birth_date) {
          throw new Error('No tienes registrada tu fecha de cumpleaños');
        }

        const today = new Date();
        const birthDate = new Date(customer.birth_date);
        
        // Check if birthday is today (or maybe this month?)
        // Let's be generous and say valid during birth month
        if (today.getMonth() !== birthDate.getMonth()) {
           throw new Error('Este cupón solo es válido durante el mes de tu cumpleaños');
        }
      }

      return data;
    } catch (error) {
      console.error('Coupon validation error:', error);
      throw error;
    }
  };

  const handleSendOrder = async (customerName, phoneNumber, notes, customerId = null, couponCode = null, discountAmount = 0) => {
    try {
      setLoading(true);
      
      let finalCustomerId = customerId;

      // If no customer ID provided (new customer or not searched), try to find or create
      if (!finalCustomerId) {
        // Check if exists first (double check)
        const existing = await handleCheckCustomer(phoneNumber);
        if (existing) {
          finalCustomerId = existing.id;
        } else {
          // Create new customer
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              full_name: customerName,
              phone: phoneNumber,
              points_balance: 0
            })
            .select()
            .single();
          
          if (createError) throw createError;
          finalCustomerId = newCustomer.id;
        }
      }

      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create sale record with status 'order'
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: null, // Anonymous user
          customer_id: finalCustomerId, // Link to customer
          total_amount: totalAmount,
          status: 'order',
          source: 'shared_store',
          payment_method: 'pending',
          customer_info: `${customerName} (${phoneNumber})`,
          notes: notes,
          ticket_number: undefined, // Let DB handle identity
          coupon_code: couponCode,
          discount_amount: discountAmount
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Update coupon usage if used
      if (couponCode) {
        await supabase.rpc('increment_coupon_usage', { coupon_code: couponCode });
      }

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id, // Original product ID
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        product_name: item.name // Store name in case product changes (optional, but good for history if schema supported it, here we rely on product_id)
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      alert('¡Pedido enviado con éxito!');
      setCart([]);
      setShowMobileTicket(false);

    } catch (error) {
      console.error('Error sending order:', error);
      alert('Error al enviar el pedido. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-screen overflow-hidden relative bg-gray-50 dark:bg-gray-900">
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={darkMode ? "Modo Claro" : "Modo Oscuro"}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Product List Area */}
      <div className="flex-1 overflow-hidden pb-20 md:pb-0">
        <ProductList onAddToCart={handleAddToCart} storeMode={storeMode} isSharedStore={true} />
      </div>

      {/* Desktop Ticket Panel */}
      <div className="hidden md:block w-96 border-l bg-white shadow-xl z-10 h-full">
        <SimpleTicket 
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSendOrder={handleSendOrder}
          onCheckCustomer={handleCheckCustomer}
          onValidateCoupon={handleValidateCoupon}
          loading={loading}
        />
      </div>

      {/* Mobile Ticket Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shadow-lg z-20">
        <button 
          onClick={() => setShowMobileTicket(true)}
          className="w-full bg-blue-600 text-white py-3 rounded-xl flex justify-between items-center px-6 font-bold shadow-blue-200 dark:shadow-none active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} />
            <span>{cartItemCount} items</span>
          </div>
          <span>${cartTotal.toFixed(2)}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Mobile Ticket Overlay */}
      {showMobileTicket && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h2 className="font-bold text-lg dark:text-white">Tu Pedido</h2>
            <button onClick={() => setShowMobileTicket(false)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <SimpleTicket 
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onSendOrder={handleSendOrder}
              onCheckCustomer={handleCheckCustomer}
              onValidateCoupon={handleValidateCoupon}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* WhatsApp Button */}
      {storePhone && (
        <a
          href={`https://wa.me/${storePhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-transform hover:scale-105 flex items-center gap-2 font-bold"
          title="Contactar por WhatsApp"
        >
          <MessageCircle size={24} />
          <span className="hidden md:inline">Contactar</span>
        </a>
      )}
    </div>
  );
}