import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import CouponsManager from './CouponsManager';
import { Save, Printer, Monitor, CreditCard, Percent, Bluetooth, Plus, Trash2, Moon, Sun, FileText, ChevronDown, ChevronUp, Shield, Package, Bell } from 'lucide-react';

export default function SettingsPanel({ darkMode, setDarkMode, storeMode = 'retail' }) {
  const [settings, setSettings] = useState({
    points_per_currency_unit: 1,
    currency_per_point_redemption: 0.1,
    store_name: '',
    ticket_header: '',
    ticket_footer: '',
    business_address: '',
    business_phone: '',
    vat_rate: 16,
    points_earning_percentage: 10,
    terms_of_use: '',
    privacy_policy: '',
    low_stock_threshold: 5,
    order_notification_sound: false,
    selected_notification_sound_id: null,
    store_type: storeMode
  });
  const [terminals, setTerminals] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [openSection, setOpenSection] = useState('appearance');

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchSettings(),
          fetchTerminals(),
          fetchDiscounts()
        ]);
        
        // Check for saved printer
        const savedPrinter = localStorage.getItem('bluetooth_printer_name');
        if (savedPrinter) setConnectedPrinter({ name: savedPrinter });
      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [storeMode]);

  // Bucket creation handled via SQL


  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('store_type', storeMode)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        console.log('Fetched settings:', data);
        setSettings(prev => ({
          ...prev,
          ...data,
          // Ensure numeric values are parsed correctly if they come as strings
          points_earning_percentage: data.points_earning_percentage !== null ? Number(data.points_earning_percentage) : prev.points_earning_percentage,
          vat_rate: data.vat_rate !== null ? Number(data.vat_rate) : prev.vat_rate,
          currency_per_point_redemption: data.currency_per_point_redemption !== null ? Number(data.currency_per_point_redemption) : prev.currency_per_point_redemption,
          points_per_currency_unit: data.points_per_currency_unit !== null ? Number(data.points_per_currency_unit) : prev.points_per_currency_unit,
          low_stock_threshold: data.low_stock_threshold !== null ? Number(data.low_stock_threshold) : prev.low_stock_threshold,
          order_notification_sound: data.order_notification_sound !== null ? data.order_notification_sound : prev.order_notification_sound,
          selected_notification_sound_id: data.selected_notification_sound_id || prev.selected_notification_sound_id,
          store_type: storeMode
        }));
      } else {
        // Reset to defaults if no settings found for this store mode
        setSettings({
          points_per_currency_unit: 1,
          currency_per_point_redemption: 0.1,
          store_name: '',
          ticket_header: '',
          ticket_footer: '',
          business_address: '',
          business_phone: '',
          vat_rate: 16,
          points_earning_percentage: 10,
          terms_of_use: '',
          privacy_policy: '',
          low_stock_threshold: 5,
          order_notification_sound: false,
          selected_notification_sound_id: null,
          store_type: storeMode
        });
      }
    } catch (err) {
      console.error('Unexpected error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTerminals() {
    const { data } = await supabase.from('terminals').select('*');
    if (data) setTerminals(data);
  }

  async function fetchDiscounts() {
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('store_type', storeMode)
      .order('created_at');
    if (data) setDiscounts(data);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Get the single settings row ID for this store mode
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('store_type', storeMode)
        .maybeSingle();
      
      const settingsData = {
        store_name: settings.store_name,
        ticket_header: settings.ticket_header,
        ticket_footer: settings.ticket_footer,
        business_address: settings.business_address,
        business_phone: settings.business_phone,
        business_logo_url: settings.business_logo_url,
        vat_rate: settings.vat_rate,
        points_earning_percentage: settings.points_earning_percentage,
        currency_per_point_redemption: settings.currency_per_point_redemption,
        points_per_currency_unit: settings.points_per_currency_unit,
        quote_notes: settings.quote_notes,
        terms_of_use: settings.terms_of_use,
        privacy_policy: settings.privacy_policy,
        low_stock_threshold: settings.low_stock_threshold,
        order_notification_sound: settings.order_notification_sound,
        selected_notification_sound_id: settings.selected_notification_sound_id,
        store_type: storeMode
      };

      let error;
      
      if (existing) {
        const { error: updateError } = await supabase
          .from('settings')
          .update(settingsData)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('settings')
          .insert([settingsData]);
        error = insertError;
      }
      
      if (error) throw error;
      
      await fetchSettings(); // Refresh state
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTerminal() {
    const name = prompt('Nombre del punto de venta (ej: Caja 2):');
    if (!name) return;
    
    const { error } = await supabase.from('terminals').insert([{ name, location: 'Tienda' }]);
    if (error) alert('Error al crear terminal');
    else fetchTerminals();
  }

  async function handleEditTerminal(terminal) {
    const name = prompt('Nuevo nombre del punto de venta:', terminal.name);
    if (!name) return;

    const { error } = await supabase
      .from('terminals')
      .update({ name })
      .eq('id', terminal.id);

    if (error) alert('Error al actualizar terminal');
    else fetchTerminals();
  }

  async function handleDeleteTerminal(id) {
    if (!confirm('¿Estás seguro de eliminar este punto de venta?')) return;

    const { error } = await supabase
      .from('terminals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting terminal:', error);
      alert('Error al eliminar terminal: ' + error.message);
    } else {
      fetchTerminals();
    }
  }

  async function handleAddDiscount() {
    const name = prompt('Nombre del descuento (ej: Verano):');
    if (!name) return;
    const valueStr = prompt('Valor del descuento (número):');
    if (!valueStr) return;
    const value = parseFloat(valueStr);
    const type = confirm('¿Es porcentaje? Aceptar = Sí (%), Cancelar = No ($)') ? 'percentage' : 'fixed';

    const { error } = await supabase
      .from('discounts')
      .insert([{ name, value, type, store_type: storeMode }]);
    if (error) alert('Error al crear descuento');
    else fetchDiscounts();
  }

  async function handleDeleteDiscount(id) {
    if (!confirm('¿Eliminar descuento?')) return;
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) alert('Error al eliminar');
    else fetchDiscounts();
  }

  async function handleConnectPrinter() {
    try {
      if (navigator.bluetooth) {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] // Standard printer service UUID
          // Note: In production you might need more specific filters or acceptAllDevices: true
        });
        setConnectedPrinter(device);
        localStorage.setItem('bluetooth_printer_name', device.name);
        alert(`Conectado a: ${device.name}`);
      } else {
        alert('Tu navegador no soporta Web Bluetooth. Intenta usar Chrome o Edge.');
      }
    } catch (error) {
      console.error('Bluetooth error:', error);
      alert('No se pudo conectar a la impresora. Asegúrate de que esté encendida y visible.');
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setSettings({ ...settings, business_logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert(`Error al subir el logo: ${error.message || 'Error desconocido'}`);
    }
  }

  if (loading) return <div className="p-8">Cargando configuración...</div>;

  return (
    <div className="p-6 h-full overflow-y-auto dark:bg-gray-900">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Configuración del Sistema</h2>

      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Appearance Settings */}
        <Section 
          id="appearance" 
          title="Apariencia" 
          icon={darkMode ? Moon : Sun} 
          colorClass="text-gray-600 dark:text-gray-300"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Modo Oscuro</span>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {darkMode ? 'Activado' : 'Desactivado'}
            </button>
          </div>
        </Section>

        {/* General & Ticket Settings */}
        <Section 
          id="general" 
          title="Datos del Ticket y Negocio" 
          icon={Printer} 
          colorClass="text-blue-600 dark:text-blue-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Negocio</label>
              <input
                type="text"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.store_name || ''}
                onChange={e => setSettings({...settings, store_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dirección</label>
              <input
                type="text"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.business_address || ''}
                onChange={e => setSettings({...settings, business_address: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
              <input
                type="text"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.business_phone || ''}
                onChange={e => setSettings({...settings, business_phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo del Negocio</label>
              <div className="mt-2 flex items-center gap-4">
                {settings.business_logo_url ? (
                  <div className="relative group">
                    <img 
                      src={settings.business_logo_url} 
                      alt="Logo Preview" 
                      className="h-20 w-20 object-contain border rounded bg-gray-50 dark:bg-gray-700" 
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({...settings, business_logo_url: ''})}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                      title="Eliminar logo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400">
                    <span className="text-xs text-center">Sin logo</span>
                  </div>
                )}
                
                <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex flex-col items-center justify-center transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Subir Imagen</span>
                  <span className="text-xs text-blue-500 dark:text-blue-400 mt-1">PNG, JPG, etc.</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Encabezado del Ticket</label>
              <textarea
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="2"
                value={settings.ticket_header || ''}
                onChange={e => setSettings({...settings, ticket_header: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pie de Página del Ticket</label>
              <textarea
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="2"
                value={settings.ticket_footer || ''}
                onChange={e => setSettings({...settings, ticket_footer: e.target.value})}
              />
            </div>
            
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2">
              <Save size={18} /> Guardar Cambios
            </button>
          </form>
        </Section>

        {/* Inventory Settings */}
        <Section 
          id="inventory" 
          title="Inventario" 
          icon={Package} 
          colorClass="text-amber-600 dark:text-amber-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alerta de Stock Bajo</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={settings.low_stock_threshold}
                  onChange={e => setSettings({...settings, low_stock_threshold: parseInt(e.target.value) || 0})}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">unidades</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Los productos con stock igual o menor a este número mostrarán una alerta.
              </p>
            </div>
            <button onClick={handleSaveSettings} className="w-full py-2 bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center justify-center gap-2">
              <Save size={18} /> Guardar Configuración de Inventario
            </button>
          </div>
        </Section>

        {/* Legal Information Settings */}
        <Section 
          id="legal" 
          title="Información Legal" 
          icon={Shield} 
          colorClass="text-red-600 dark:text-red-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Términos de Uso</label>
              <textarea
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                rows="6"
                value={settings.terms_of_use || ''}
                onChange={e => setSettings({...settings, terms_of_use: e.target.value})}
                placeholder="Escribe aquí los términos de uso..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Política de Privacidad</label>
              <textarea
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                rows="6"
                value={settings.privacy_policy || ''}
                onChange={e => setSettings({...settings, privacy_policy: e.target.value})}
                placeholder="Escribe aquí la política de privacidad..."
              />
            </div>
            <button onClick={handleSaveSettings} className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2">
              <Save size={18} /> Guardar Información Legal
            </button>
          </div>
        </Section>

        {/* Quote Settings */}
        <Section 
          id="quotes" 
          title="Cotizaciones" 
          icon={FileText} 
          colorClass="text-teal-600 dark:text-teal-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas de la Cotización</label>
              <textarea
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
                value={settings.quote_notes || ''}
                onChange={e => setSettings({...settings, quote_notes: e.target.value})}
                placeholder="Ej: Precios sujetos a cambio sin previo aviso. Validez de 15 días."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Este texto aparecerá al final de las cotizaciones generadas.</p>
            </div>
            <button onClick={handleSaveSettings} className="w-full py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center justify-center gap-2">
              <Save size={18} /> Guardar Notas
            </button>
          </div>
        </Section>

        {/* Bluetooth Printers */}
        <Section 
          id="printers" 
          title="Impresora Bluetooth" 
          icon={Bluetooth} 
          colorClass="text-indigo-600 dark:text-indigo-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 flex items-center justify-between">
              <div>
                <div className="font-medium dark:text-white">Estado: {connectedPrinter ? 'Conectado' : 'Desconectado'}</div>
                {connectedPrinter && <div className="text-sm text-gray-500 dark:text-gray-400">{connectedPrinter.name}</div>}
              </div>
              <div className={`w-3 h-3 rounded-full ${connectedPrinter ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            
            <button 
              onClick={handleConnectPrinter}
              className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Bluetooth size={18} /> Buscar y Conectar Impresora
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Nota: Requiere un navegador compatible (Chrome/Edge) y una impresora Bluetooth encendida.
            </p>
          </div>
        </Section>

        {/* Discounts Management */}
        <Section 
          id="discounts" 
          title="Descuentos" 
          icon={Percent} 
          colorClass="text-orange-600 dark:text-orange-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Lista de Descuentos</h4>
            <button onClick={handleAddDiscount} className="text-sm bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-3 py-1 rounded hover:bg-orange-200 flex items-center gap-1">
              <Plus size={14} /> Agregar
            </button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {discounts.map(discount => (
              <div key={discount.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                <div>
                  <div className="font-medium dark:text-white">{discount.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {discount.type === 'percentage' ? `${discount.value}%` : `${discount.value}`}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteDiscount(discount.id)}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {discounts.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-2">No hay descuentos configurados</p>
            )}
          </div>

          <div className="my-6 border-t dark:border-gray-700"></div>
          
          <CouponsManager storeMode={storeMode} />
        </Section>

        {/* Points & Financial Settings */}
        <Section 
          id="financial" 
          title="Puntos e Impuestos" 
          icon={CreditCard} 
          colorClass="text-green-600 dark:text-green-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Puntos ganados por venta (%)</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.points_earning_percentage ?? 10}
                onChange={e => setSettings({...settings, points_earning_percentage: parseFloat(e.target.value)})}
                placeholder="Ej: 10 para 10%"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Porcentaje del total de la venta que se convierte en puntos para el cliente.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de 1 punto en $ (Canje)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.currency_per_point_redemption}
                onChange={e => setSettings({...settings, currency_per_point_redemption: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tasa de IVA (%)</label>
              <input
                type="number"
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={settings.vat_rate}
                onChange={e => setSettings({...settings, vat_rate: parseFloat(e.target.value)})}
              />
            </div>
            <button onClick={handleSaveSettings} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Actualizar Valores
            </button>
          </div>
        </Section>

        {/* Terminals / POS Devices */}
        <Section 
          id="terminals" 
          title="Puntos de Venta" 
          icon={Monitor} 
          colorClass="text-purple-600 dark:text-purple-400"
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Lista de Terminales</h4>
            <button onClick={handleAddTerminal} className="text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded hover:bg-purple-200">
              + Agregar
            </button>
          </div>
          
          <div className="space-y-2">
            {terminals.map(term => (
              <div key={term.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                <div>
                  <div className="font-medium dark:text-white">{term.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{term.location}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${term.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700'}`}>
                    {term.status}
                  </span>
                  <button 
                    onClick={() => handleEditTerminal(term)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Editar"
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTerminal(term.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

// Helper component defined outside to prevent re-renders
const Section = ({ id, title, icon: Icon, colorClass, children, openSection, setOpenSection }) => {
  const isOpen = openSection === id;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
      <button 
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon size={24} />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};