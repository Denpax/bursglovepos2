import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Tag, Edit2, Save, X } from 'lucide-react';

export default function CouponsManager({ storeMode = 'retail' }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    max_uses: '',
    min_purchase_amount: '',
    is_birthday_coupon: false
  });

  useEffect(() => {
    fetchCoupons();
  }, [storeMode]);

  async function fetchCoupons() {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_type', storeMode)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (!formData.code || !formData.discount_value || !formData.max_uses) {
        alert('Por favor completa todos los campos');
        return;
      }

      const couponData = {
        code: formData.code.trim().toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: parseInt(formData.max_uses),
        min_purchase_amount: parseFloat(formData.min_purchase_amount || 0),
        is_birthday_coupon: formData.is_birthday_coupon,
        active: true,
        store_type: storeMode
      };

      if (editingId) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        if (error) throw error;
      }

      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        max_uses: '',
        is_birthday_coupon: false
      });
      setIsCreating(false);
      setEditingId(null);
      fetchCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      alert('Error al guardar el cupón: ' + error.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Error al eliminar el cupón');
    }
  }

  function startEdit(coupon) {
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses,
      min_purchase_amount: coupon.min_purchase_amount,
      is_birthday_coupon: coupon.is_birthday_coupon || false
    });
    setEditingId(coupon.id);
    setIsCreating(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 dark:text-gray-300">Cupones y Códigos Promocionales</h4>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded hover:bg-blue-200 flex items-center gap-1"
          >
            <Plus size={14} /> Nuevo Cupón
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                placeholder="Ej: VERANO2024"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Usos Máximos</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={e => setFormData({...formData, max_uses: e.target.value})}
                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ej: 100"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo Descuento</label>
              <select
                value={formData.discount_type}
                onChange={e => setFormData({...formData, discount_type: e.target.value})}
                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto Fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_value}
                onChange={e => setFormData({...formData, discount_value: e.target.value})}
                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ej: 10 o 50.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monto Mínimo Compra</label>
              <input
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={e => setFormData({...formData, min_purchase_amount: e.target.value})}
                className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ej: 100.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_birthday_coupon"
              checked={formData.is_birthday_coupon}
              onChange={e => setFormData({...formData, is_birthday_coupon: e.target.checked})}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_birthday_coupon" className="text-sm text-gray-700 dark:text-gray-300">
              Cupón exclusivo para cumpleaños
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingId(null);
                setFormData({ code: '', discount_type: 'percentage', discount_value: '', max_uses: '', min_purchase_amount: '', is_birthday_coupon: false });
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <Save size={14} /> {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {coupons.map(coupon => (
          <div key={coupon.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-full dark:bg-green-900/30 dark:text-green-400">
                <Tag size={16} />
              </div>
              <div>
                <div className="font-bold text-gray-800 dark:text-white">{coupon.code}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value}`} • {coupon.current_uses} / {coupon.max_uses} usos
                  {coupon.min_purchase_amount > 0 && ` • Min: ${coupon.min_purchase_amount}`}
                  {coupon.is_birthday_coupon && <span className="ml-2 text-purple-600 font-medium">🎂 Cumpleaños</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => startEdit(coupon)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="Editar"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(coupon.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {coupons.length === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm py-4">No hay cupones creados</p>
        )}
      </div>
    </div>
  );
}