import { useState, useEffect } from 'react';
import { X, Save, Upload, Loader, Image as ImageIcon, Plus, Edit, Trash2, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import VariantModal from './VariantModal';

export default function ProductFormModal({ onClose, onSave, initialData, storeMode, onProductUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    cost: '',
    stock: '',
    image_url: '',
    description: '',
    store_type: storeMode
  });
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Variant state
  const [variants, setVariants] = useState([]);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        price: initialData.price || '',
        cost: initialData.cost || '',
        stock: initialData.stock || '',
      });
      if (initialData.product_variants) {
        // Only show active variants
        setVariants(initialData.product_variants.filter(v => v.is_active !== false));
      }
    }
    fetchCategories();
  }, [initialData]);

  async function fetchCategories() {
    console.log('[ProductFormModal] Fetching categories for store:', storeMode);

    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .eq('store_type', storeMode)
      .order('name', { ascending: true });

    if (error) {
      console.error('[ProductFormModal] Error fetching categories:', error);
      return;
    }

    if (data) {
      console.log('[ProductFormModal] Fetched categories:', data.length);
      // Sort alphabetically with locale comparison (Spanish)
      const sortedCategories = data
        .map(c => c.name)
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      setCategories(sortedCategories);
      console.log('[ProductFormModal] Categories sorted:', sortedCategories);
    }
  }

  async function handleSaveVariant(variantData, index) {
    try {
      // If we are in "new product" mode (no ID yet), just update local state
      if (!initialData?.id) {
        if (index !== null && index !== undefined) {
          // Update existing local variant
          const newVariants = [...variants];
          newVariants[index] = { ...variantData, id: variants[index].id || Date.now() };
          setVariants(newVariants);
        } else {
          // Add new local variant
          setVariants([...variants, { ...variantData, id: Date.now() }]);
        }
        setIsVariantModalOpen(false);
        setEditingVariant(null);
        setEditingVariantIndex(null);
        return;
      }

      if (index !== null && index !== undefined) {
        // Update existing variant
        const variantToUpdate = variants[index];
        const { error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', variantToUpdate.id);

        if (error) throw error;
      } else {
        // Create new variant
        const { error } = await supabase
          .from('product_variants')
          .insert([{ ...variantData, product_id: initialData.id }]);

        if (error) throw error;
      }

      setIsVariantModalOpen(false);
      setEditingVariant(null);
      setEditingVariantIndex(null);
      
      // Refresh variants (only active ones)
      const { data: updatedVariants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', initialData.id)
        .eq('is_active', true);

      if (updatedVariants) setVariants(updatedVariants);
      if (onProductUpdated) onProductUpdated();

    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Error al guardar variante');
    }
  }

  async function handleDeleteVariant(variantId) {
    if (!confirm('¿Eliminar esta variante?\n\nNota: La variante se archivará para mantener la integridad de los datos históricos.')) return;

    // If local variant (new product mode)
    if (!initialData?.id) {
      setVariants(prev => prev.filter(v => v.id !== variantId));
      return;
    }

    try {
      // Soft-delete: Mark as inactive instead of deleting
      const { error } = await supabase
        .from('product_variants')
        .update({ is_active: false })
        .eq('id', variantId);

      if (error) throw error;

      // Remove from local state (no longer shown as active)
      setVariants(prev => prev.filter(v => v.id !== variantId));
      if (onProductUpdated) onProductUpdated();
      alert('✅ Variante archivada correctamente');
    } catch (error) {
      console.error('Error archiving variant:', error);
      alert('❌ Error al archivar variante: ' + (error.message || 'Error desconocido'));
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, variants);
  };

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `product-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {initialData ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <div className="relative">
                  <input
                    type="text"
                    list="categories"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  />
                  <datalist id="categories">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Inicial</label>
                <input
                  type="number"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Barcode removed as requested */}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                  {formData.image_url ? (
                    <div className="relative inline-block">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="h-32 w-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, image_url: ''})}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-1 text-sm text-gray-500">Sin imagen</p>
                    </div>
                  )}
                  
                  <label className="mt-4 cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                    <Upload size={18} />
                    <span>{uploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Variants Section - Always visible now */}
          <div className="border-t dark:border-gray-700 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Variantes</h4>
              <button
                type="button"
                onClick={() => { setEditingVariant(null); setEditingVariantIndex(null); setIsVariantModalOpen(true); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
              >
                <Plus size={16} />
                Agregar Variante
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={variant.id || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {variant.image_url ? (
                      <img src={variant.image_url} alt={variant.name} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-400">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{variant.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${variant.price} | Stock: {variant.stock}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingVariant(variant); setEditingVariantIndex(index); setIsVariantModalOpen(true); }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariant(variant.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {variants.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                  No hay variantes registradas
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={18} />
              Guardar Producto
            </button>
          </div>
        </form>
      </div>

      {isVariantModalOpen && (
        <VariantModal
          onClose={() => { setIsVariantModalOpen(false); setEditingVariant(null); setEditingVariantIndex(null); }}
          onSave={handleSaveVariant}
          initialVariantData={editingVariant}
          variantIndex={editingVariantIndex}
        />
      )}
    </div>
  );
}