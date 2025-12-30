import { useState } from 'react';
import { Trash2, Send, Plus, Minus, Search, UserCheck, Tag, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SimpleTicket({ cart, onUpdateQuantity, onRemoveItem, onSendOrder, onCheckCustomer, onValidateCoupon, loading }) {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState(''); // 👈 Nuevo campo
  const [notes, setNotes] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const safeCart = cart || [];
  const subtotal = safeCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = subtotal * (appliedCoupon.discount_value / 100);
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }
  
  const total = subtotal - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsValidatingCoupon(true);
    try {
      const coupon = await onValidateCoupon(couponCode.trim(), subtotal, customerId);
      setAppliedCoupon(coupon);
      setCouponCode('');
    } catch (error) {
      setCouponError(error.message);
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handlePhoneBlur = async () => {
    if (phoneNumber.length >= 10 && !customerFound) {
      setIsChecking(true);
      const customer = await onCheckCustomer(phoneNumber);
      setIsChecking(false);
      
      if (customer) {
        setCustomerName(customer.full_name);
        setCustomerId(customer.id);
        setCustomerFound(true);
      }
    }
  };

  const handleResetCustomer = () => {
    setCustomerName('');
    setPhoneNumber('');
    setBirthDate(''); // 👈 limpiar campo
    setCustomerId(null);
    setCustomerFound(false);
  };

  // 👇 Nueva función para crear el perfil del cliente
  async function handleCreateCustomer() {
    if (!phoneNumber || !customerName || !birthDate) {
      alert("Por favor completa tu número, nombre y fecha de nacimiento.");
      return;
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phoneNumber)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        alert("Ya existe un cliente con este número de teléfono.");
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            full_name: customerName,
            phone: phoneNumber,
            birth_date: birthDate,
            points_balance: 0
          }
        ])
        .select()
        .single();

      if (error) throw error;

      alert("Perfil creado con éxito ✅");
      setCustomerFound(true);
      setCustomerId(data.id);
    } catch (error) {
      console.error("Error creando cliente:", error);
      alert("Error al crear el perfil del cliente.");
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }
    if (!phoneNumber.trim()) {
      alert('Por favor ingresa tu número de teléfono');
      return;
    }
    if (safeCart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    onSendOrder(customerName, phoneNumber, notes, customerId, appliedCoupon?.code, discountAmount);
    handleResetCustomer();
    setNotes('');
    handleRemoveCoupon();
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-lg border-l">
      <div className="p-4 bg-blue-600 text-white">
        <h2 className="text-xl font-bold">Tu Pedido</h2>
        <p className="text-blue-100 text-sm">Completa tus datos y revisa tu pedido</p>
      </div>

      {/* ===================== BLOQUE DATOS DEL CLIENTE ===================== */}
      <details open className="group p-4 bg-gray-50 border-b space-y-3">
        <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-700 hover:text-blue-600 transition-colors">
          <span>Datos del Cliente</span>
          <span className="transition group-open:rotate-180">
            <ChevronDown size={20} />
          </span>
        </summary>

        <div className="text-gray-600 mt-3 space-y-3 pl-2 border-l-2 border-gray-200 animate-in slide-in-from-top-1">

          {/* Teléfono */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Teléfono</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (customerFound) {
                    setCustomerFound(false);
                    setCustomerId(null);
                    setCustomerName('');
                    setBirthDate('');
                  }
                }}
                onBlur={handlePhoneBlur}
                disabled={customerFound}
                placeholder="Ej. 55 1234 5678"
                className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${customerFound ? 'bg-green-50 border-green-200' : ''}`}
              />
              {!customerFound && (
                <button
                  onClick={handlePhoneBlur}
                  disabled={isChecking || phoneNumber.length < 10}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                  title="Buscar mi perfil"
                >
                  <Search size={20} />
                </button>
              )}
              {customerFound && (
                <button 
                  onClick={handleResetCustomer}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  title="Cambiar usuario"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            {isChecking && <span className="text-xs text-blue-500 absolute right-2 top-9">Buscando...</span>}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
            <div className="relative">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={customerFound}
                placeholder="Ej. Juan Pérez"
                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${customerFound ? 'bg-green-50 border-green-200 pl-9' : ''}`}
              />
              {customerFound && (
                <UserCheck size={16} className="absolute left-3 top-3 text-green-600" />
              )}
            </div>
            {customerFound && <p className="text-xs text-green-600 mt-1">¡Hola de nuevo! Tu perfil ha sido cargado.</p>}
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={customerFound}
              className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${customerFound ? 'bg-green-50 border-green-200' : ''}`}
            />
          </div>

          {/* Botón Crear Perfil */}
          {!customerFound && (
            <button
              onClick={handleCreateCustomer}
              disabled={!phoneNumber || !customerName || !birthDate}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              Crear perfil
            </button>
          )}
        </div>
      </details>
      {/* ================================================================ */}

      {/* LISTA DE PRODUCTOS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {safeCart.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No hay productos en el pedido</p>
            <p className="text-sm">Selecciona productos del menú</p>
          </div>
        ) : (
          safeCart.map((item) => (
            <div key={item.cartItemId || item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{item.name}</h3>
                <p className="text-blue-600 font-bold">${item.price.toFixed(2)}</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white rounded-lg border">
                  <button 
                    onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-100 text-gray-600"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100 text-gray-600"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <button 
                  onClick={() => onRemoveItem(item.cartItemId || item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SUBTOTAL Y CUPONES */}
      <div className="p-4 bg-gray-50 border-t space-y-4">
        <details className="group">
          <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-gray-700 hover:text-blue-600 transition-colors">
            <span>Subtotal y Descuentos</span>
            <span className="transition group-open:rotate-180">
              <ChevronDown size={20} />
            </span>
          </summary>
          <div className="text-gray-600 mt-3 space-y-2 pl-2 border-l-2 border-gray-200 animate-in slide-in-from-top-1">
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {/* Coupon Section */}
            {!appliedCoupon ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  className="flex-1 p-2 text-sm border rounded-lg uppercase"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={isValidatingCoupon || !couponCode}
                  className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {isValidatingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200 text-sm mt-2">
                <div className="flex items-center gap-2 text-green-700">
                  <Tag size={14} />
                  <span>Cupón <b>{appliedCoupon.code}</b> aplicado</span>
                </div>
                <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-700">
                  <X size={16} />
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500">{couponError}</p>}

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-green-600 font-medium">
                <span>Descuento:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </details>

        {/* TOTAL Y BOTÓN ENVIAR */}
        <div className="flex justify-between items-center text-xl font-bold text-gray-800 pt-2 border-t">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={loading || safeCart.length === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Enviando...</span>
            ) : (
              <>
                <Send size={20} />
                <span>Enviar Pedido</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}