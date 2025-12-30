import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, ShoppingBag, Users, Settings, LogOut, Menu, BarChart3, Package, Printer, Percent, FileText, ChevronLeft, ChevronRight, Store, ClipboardList, Shield, Lock } from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, onLogout, isAdmin, userEmail, logoUrl, pendingOrdersCount, isLocked, onLockToggle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const audioRef = useRef(null);

  const menuGroups = [
    {
      title: 'Principal',
      items: [
        { id: 'pos', label: 'Punto de Venta', icon: ShoppingBag },
        { id: 'orders', label: 'Pedidos', icon: ClipboardList },
        { id: 'shared_store', label: 'Tienda Compartida', icon: Store },
        { id: 'receipts', label: 'Recibos', icon: FileText },
      ]
    },
    {
      title: 'Administración',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'products', label: 'Productos', icon: Package },
        { id: 'customers', label: 'Clientes', icon: Users },
        { id: 'settings', label: 'Configuración', icon: Settings },
        { id: 'legal', label: 'Información Legal', icon: Shield },
      ]
    }
  ];

  return (
    <>
      {/* Audio element for notifications */}
      <audio ref={audioRef} className="hidden" />

      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-slate-700"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-40 bg-slate-900 text-white transform transition-all duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-72'}
        md:relative md:translate-x-0 flex flex-col
      `}>
        {/* Logo Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-10 h-10 rounded-xl object-contain bg-white cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsCollapsed(!isCollapsed)}
              />
            ) : (
              <div 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0 cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <ShoppingBag size={20} className="text-white" />
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-white tracking-tight truncate">Bursglove</h1>
                <p className="text-xs text-slate-400 font-medium truncate">Punto de Venta</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
        </div>
        
        {/* Collapsed Expand Button (Mobile/Desktop) */}
        {isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-full p-4 text-slate-400 hover:text-white hover:bg-slate-800 flex justify-center border-b border-slate-800"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 truncate">
                  {group.title}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        setIsOpen(false);
                      }}
                      title={isCollapsed ? item.label : ''}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <div className="relative">
                        <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors shrink-0`} />
                        {item.id === 'orders' && pendingOrdersCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-slate-900 animate-pulse">
                            {pendingOrdersCount}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                      {!isCollapsed && isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          {!isCollapsed && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Users size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {userEmail || 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {isAdmin ? 'Administrador' : 'Cajero'}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={onLockToggle}
            title={isCollapsed ? (isLocked ? 'Desbloquear' : 'Bloquear') : ''}
            className={`w-full flex items-center gap-2 px-4 py-2.5 mb-2
              ${isLocked ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}
              rounded-lg transition-all duration-200 border border-slate-700 ${isCollapsed ? 'justify-center px-2' : 'justify-center'}`}
          >
            <Lock size={18} className="shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm truncate">{isLocked ? 'Desbloquear Sesión' : 'Bloquear Sesión'}</span>}
          </button>

          <button
            onClick={onLogout}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
            className={`w-full flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 rounded-lg transition-all duration-200 border border-slate-700 hover:border-red-900/30 ${isCollapsed ? 'justify-center px-2' : 'justify-center'}`}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm truncate">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}