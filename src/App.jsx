import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { ShoppingCart, X, ChevronLeft, Lock } from 'lucide-react';
import LoginForm from './components/auth/LoginForm';
import AdminAccess from './components/auth/AdminAccess';
import Sidebar from './components/layout/Sidebar';
import MultiTicketTabs from './components/pos/MultiTicketTabs';
import ProductList from './components/pos/ProductList';
import TicketPanel from './components/pos/TicketPanel';
import ProductManager from './components/admin/ProductManager';
import DashboardMetrics from './components/admin/DashboardMetrics';
import SettingsPanel from './components/admin/SettingsPanel';
import CustomerList from './components/admin/CustomerList';
import ReceiptsHistory from './components/admin/ReceiptsHistory';
import HeldTicketsModal from './components/pos/HeldTicketsModal';
import SharedStore from './components/shop/SharedStore';
import OrdersManager from './components/admin/OrdersManager';
import SharedStoreConfig from './components/admin/SharedStoreConfig';
import LegalInfo from './components/admin/LegalInfo';

// App component - Main entry point
// Main App Component
export default function App() {
  // Check for public shared store view
  const searchParams = new URLSearchParams(window.location.search);
  const isSharedStore = searchParams.get('view') === 'shop';

  if (isSharedStore) {
    return <SharedStore />;
  }

  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabHistory, setTabHistory] = useState(['pos']);
  const [settings, setSettings] = useState(null);
  
  // Missing state variables restored
  const [activeTab, setActiveTab] = useState('pos');
  const [tickets, setTickets] = useState([{ id: uuidv4(), cart: [], customer: null }]);
  const [activeTicketId, setActiveTicketId] = useState(tickets[0]?.id);
  const [isTicketMinimized, setIsTicketMinimized] = useState(false);
  const [showMobileTicket, setShowMobileTicket] = useState(false);
  const [tempAdminAccess, setTempAdminAccess] = useState(false);
  const [showHeldTicketsModal, setShowHeldTicketsModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [storeMode, setStoreMode] = useState('retail'); // 'retail' | 'wholesale'

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Ensure activeTicketId is valid
  useEffect(() => {
    if (tickets.length > 0 && !tickets.find(t => t.id === activeTicketId)) {
      setActiveTicketId(tickets[0].id);
    }
  }, [tickets, activeTicketId]);

  const handleTabChange = (newTab) => {
    if (newTab !== activeTab) {
      setTabHistory(prev => [...prev, newTab]);
      setActiveTab(newTab);
    }
  };

  const handleBack = () => {
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // Remove current
      const prevTab = newHistory[newHistory.length - 1];
      setTabHistory(newHistory);
      setActiveTab(prevTab);
    } else {
      // If no history, go to POS
      setActiveTab('pos');
    }
  };
 
  useEffect(() => {
    console.log('App mounted, checking session...');
    fetchSettings();
    fetchPendingOrdersCount();

    // Subscribe to new orders
    const ordersSubscription = supabase
      .channel('global_orders_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sales',
        filter: 'status=eq.order'
      }, (payload) => {
        console.log('New order received:', payload);
        setPendingOrdersCount(prev => prev + 1);
        
        // Play sound if enabled
        console.log('Checking sound settings:', settings);
        if (settings?.order_notification_sound) {
          console.log('Playing notification sound...');
          playNotificationSound();
        } else {
          console.log('Sound disabled in settings');
        }
      })
      .subscribe();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    }).catch((err) => {
      console.error('Error getting session:', err);
    }).finally(() => {
      setLoading(false);
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setUserRole(null);
      setLoading(false);
    });

    return () => {
      ordersSubscription.unsubscribe();
      authSubscription.unsubscribe();
    };
  }, []); // Re-subscribe if settings change (to get latest sound preference)

  async function fetchPendingOrdersCount() {
    const { count, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'order');
    
    if (!error) {
      setPendingOrdersCount(count || 0);
    }
  }

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').maybeSingle();
    if (data) setSettings(data);
  }

  async function fetchUserRole(userId) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (data) setUserRole(data.role);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setIsLocked(false); // Unlock on logout
  };

  const handleLockToggle = () => {
    if (tempAdminAccess) {
      setTempAdminAccess(false);
    } else {
      setIsLocked(true);
    }
  };

  // Ticket Management
  const activeTicket = tickets.find(t => t.id === activeTicketId) || tickets[0];

  // Debug log to track cart updates
  useEffect(() => {
    console.log('[App] Active ticket cart updated:', activeTicket?.cart.length, 'items');
  }, [activeTicket?.cart]);

  const handleNewTicket = () => {
    const newTicket = { id: uuidv4(), cart: [], customer: null, globalDiscount: 0, couponCode: null, discountAmount: 0 };
    setTickets([...tickets, newTicket]);
    setActiveTicketId(newTicket.id);
  };

  const handleCloseTicket = (ticketId) => {
    if (tickets.length === 1) {
      const newTicket = { id: uuidv4(), cart: [], customer: null, globalDiscount: 0, couponCode: null, discountAmount: 0 };
      setTickets([newTicket]);
      setActiveTicketId(newTicket.id);
      return;
    }
    const newTickets = tickets.filter(t => t.id !== ticketId);
    setTickets(newTickets);
    if (activeTicketId === ticketId) {
      setActiveTicketId(newTickets[0].id);
    }
  };

  const updateActiveTicket = (updates) => {
    setTickets(prevTickets => prevTickets.map(t => 
      t.id === activeTicketId ? { ...t, ...updates } : t
    ));
  };

  // Cart Actions
  const handleAddToCart = (product) => {
    console.log('[App] handleAddToCart called with product:', product.name);

    setTickets(prevTickets => {
      console.log('[App] Previous tickets:', prevTickets.length);

      // Create completely new array to force React re-render
      const newTickets = prevTickets.map(ticket => {
        if (ticket.id !== activeTicketId) return ticket;

        const currentCart = ticket.cart;
        console.log('[App] Current cart size:', currentCart.length);

        // Check if item exists considering variant
        const existingItemIndex = currentCart.findIndex(item =>
          item.id === product.id && item.variant_id === product.variant_id
        );

        let newCart;
        if (existingItemIndex >= 0) {
          // Create new array with updated item (completely immutable)
          newCart = currentCart.map((item, idx) =>
            idx === existingItemIndex
              ? { ...item, quantity: item.quantity + 1 }
              : { ...item }
          );
          console.log('[App] Updated existing item, new quantity:', newCart[existingItemIndex].quantity);
        } else {
          // Add new item with unique cart ID
          newCart = [...currentCart, { ...product, quantity: 1, cartItemId: uuidv4() }];
          console.log('[App] Added new item to cart, new size:', newCart.length);
        }

        // Return completely new ticket object (deep copy)
        return { ...ticket, cart: newCart };
      });

      console.log('[App] Returning new tickets array');
      return newTickets;
    });
  };

  const handleUpdateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(cartItemId);
      return;
    }
    const newCart = activeTicket.cart.map(item => 
      (item.cartItemId === cartItemId || item.id === cartItemId) ? { ...item, quantity: newQuantity } : item
    );
    updateActiveTicket({ cart: newCart });
  };

  const handleUpdateItem = (cartItemId, updates) => {
    const newCart = activeTicket.cart.map(item => 
      (item.cartItemId === cartItemId || item.id === cartItemId) ? { ...item, ...updates } : item
    );
    updateActiveTicket({ cart: newCart });
  };

  const handleRemoveItem = (cartItemId) => {
    const newCart = activeTicket.cart.filter(item => 
      (item.cartItemId !== cartItemId && item.id !== cartItemId)
    );
    updateActiveTicket({ cart: newCart });
  };

  const handleClearCart = () => {
    updateActiveTicket({ cart: [] });
  };

  const handleSelectCustomer = (customer) => {
    updateActiveTicket({ customer });
  };

  const loadTicket = (cart, customer, globalDiscount = 0, couponCode = null, discountAmount = 0) => {
    updateActiveTicket({ cart, customer, globalDiscount, couponCode, discountAmount });
  };

  const cartTotal = activeTicket.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = activeTicket.cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoginForm 
          onLoginSuccess={() => {}} // Login form just sets session, terminal selection comes next
          logoUrl={settings?.business_logo_url} 
        />
      </div>
    );
  }

  // Protected Route Check
  const isAdmin = userRole === 'admin';
  const hasAdminAccess = (isAdmin && !isLocked) || tempAdminAccess;
  
  const adminTabs = ['dashboard', 'products', 'customers', 'settings', 'legal', 'orders', 'shared_store', 'receipts'];
  const showAdminSwitch = adminTabs.includes(activeTab) && hasAdminAccess;

  return (
   <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-auto">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onLogout={handleLogout}
        isAdmin={isAdmin}
        userEmail={session?.user?.email}
        logoUrl={settings?.business_logo_url}
        pendingOrdersCount={pendingOrdersCount}
        storeMode={storeMode}
        tempAdminAccess={tempAdminAccess}
        setTempAdminAccess={setTempAdminAccess}
        isLocked={isLocked}
        onLockToggle={handleLockToggle}
      />
      
      {/* Mobile Back Button for non-POS tabs */}
      {activeTab !== 'pos' && (
        <button 
          onClick={handleBack}
          className="md:hidden fixed top-4 left-16 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700 flex items-center gap-1 border border-gray-200"
        >
          <ChevronLeft size={20} />
          <span className="text-xs font-bold">Volver</span>
        </button>
      )}
      
      <main className="flex-1 flex flex-col overflow-auto relative pt-16 md:pt-0">
        {showAdminSwitch && (
          <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3 flex justify-end items-center shadow-sm z-10">
             <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
               <button
                 onClick={() => setStoreMode('retail')}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${storeMode === 'retail' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
               >
                 Menudeo
               </button>
               <button
                 onClick={() => setStoreMode('wholesale')}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${storeMode === 'wholesale' ? 'bg-white dark:bg-gray-600 shadow text-purple-600 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
               >
                 Mayoreo
               </button>
             </div>
             {isAdmin && (
               <button
                 onClick={handleLockToggle}
                 className="ml-4 px-4 py-1.5 rounded-md text-sm font-medium transition-all bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2"
                 title="Bloquear Administrador"
               >
                 <Lock size={16} />
                 Bloquear
               </button>
             )}
          </div>
        )}

        {activeTab === 'pos' ? (
          <>
            <MultiTicketTabs 
              tickets={tickets}
              activeTicketId={activeTicketId}
              onSwitchTicket={setActiveTicketId}
              onNewTicket={handleNewTicket}
              onCloseTicket={handleCloseTicket}
              onOpenHeldTickets={() => setShowHeldTicketsModal(true)}
            />
            
            <div className="flex-1 flex overflow-hidden relative">
              <div className="flex-1 overflow-hidden pb-20 md:pb-0">
                <ProductList onAddToCart={handleAddToCart} storeMode={storeMode} />
              </div>
              
              {/* Desktop Ticket Panel */}
              <div className={`hidden md:block border-l bg-white shadow-xl z-10 transition-[width] duration-300 ${isTicketMinimized ? 'w-16' : 'w-96'}`}>
                <TicketPanel 
                  cart={activeTicket.cart}
                  activeTicketId={activeTicketId}
                  customer={activeTicket.customer}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  onNewTicket={handleNewTicket}
                  onSelectCustomer={handleSelectCustomer}
                  loadTicket={loadTicket}
                  globalDiscount={activeTicket.globalDiscount || 0}
                  couponCode={activeTicket.couponCode}
                  discountAmount={activeTicket.discountAmount || 0}
                  onUpdateTicket={updateActiveTicket}
                  onCloseTicket={handleCloseTicket}
                  isMinimized={isTicketMinimized}
                  onToggleMinimize={() => setIsTicketMinimized(!isTicketMinimized)}
                  pos={null}
                  storeMode={storeMode}
                />
              </div>

              {/* Mobile Ticket Button */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg z-20">
                <button 
                  onClick={() => setShowMobileTicket(true)}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl flex justify-between items-center px-6 font-bold shadow-blue-200"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={20} />
                    <span>{cartItemCount} items</span>
                  </div>
                  <span>${cartTotal.toFixed(2)}</span>
                </button>
              </div>

              {/* Mobile Ticket Overlay */}
              {showMobileTicket && (
                <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-lg">Ticket Actual</h2>
                    <button onClick={() => setShowMobileTicket(false)} className="p-2 bg-gray-200 rounded-full">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <TicketPanel 
                      cart={activeTicket.cart}
                      activeTicketId={activeTicketId}
                      customer={activeTicket.customer}
                      onUpdateQuantity={handleUpdateQuantity}
                      onUpdateItem={handleUpdateItem}
                      onRemoveItem={handleRemoveItem}
                      onClearCart={handleClearCart}
                      onNewTicket={handleNewTicket}
                      onSelectCustomer={handleSelectCustomer}
                      loadTicket={loadTicket}
                      globalDiscount={activeTicket.globalDiscount || 0}
                      couponCode={activeTicket.couponCode}
                      discountAmount={activeTicket.discountAmount || 0}
                      onUpdateTicket={updateActiveTicket}
                      onCloseTicket={handleCloseTicket}
                      isMinimized={false}
                      onToggleMinimize={() => {}}
                      pos={null}
                      storeMode={storeMode}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'receipts' ? (
          <ReceiptsHistory storeMode={storeMode} />
        ) : activeTab === 'orders' ? (
          <OrdersManager storeMode={storeMode} />
        ) : activeTab === 'shared_store' ? (
          <SharedStoreConfig storeMode={storeMode} />
        ) : activeTab === 'products' ? (
          hasAdminAccess ? <ProductManager storeMode={storeMode} /> : <AdminAccess onAccessGranted={() => setTempAdminAccess(true)} />
        ) : activeTab === 'dashboard' ? (
          hasAdminAccess ? <DashboardMetrics storeMode={storeMode} /> : <AdminAccess onAccessGranted={() => setTempAdminAccess(true)} />
        ) : activeTab === 'settings' ? (
          hasAdminAccess ? <SettingsPanel darkMode={darkMode} setDarkMode={setDarkMode} storeMode={storeMode} /> : <AdminAccess onAccessGranted={() => setTempAdminAccess(true)} />
        ) : activeTab === 'customers' ? (
          hasAdminAccess ? <CustomerList storeMode={storeMode} /> : <AdminAccess onAccessGranted={() => setTempAdminAccess(true)} />
        ) : activeTab === 'legal' ? (
          hasAdminAccess ? <LegalInfo storeMode={storeMode} /> : <AdminAccess onAccessGranted={() => setTempAdminAccess(true)} />
        ) : null}
      </main>

      {showHeldTicketsModal && (
        <HeldTicketsModal 
          onClose={() => setShowHeldTicketsModal(false)}
          onLoadTicket={loadTicket}
        />
      )}
    </div>
  );
}