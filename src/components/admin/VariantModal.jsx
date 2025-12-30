import { useState } from 'react';
import { X, Save, Upload, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function VariantModal({ onClose, onSave, initialVariantData, variantIndex }) {
  const [formData, setFormData] = useState(
    initialVariantData || {
      name: '',
      price: '',
      cost: '',
      stock: '',
      image_url: ''
    }
  );
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // Local state for image preview

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData, variantIndex);
  };

  const handleImageUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `variant-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Assuming we use the same bucket 'products'
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const modalTitle = initialVariantData ? 'Editar Variante' : 'Agregar Variante';
  const saveButtonText = initialVariantData ? 'Guardar Cambios' : 'Agregar';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {previewImage && <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            <button className="absolute -top-4 -right-4 bg-white text-black rounded-full p-1 shadow-lg hover:bg-gray-100" onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
          </div>
        </div>}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">{modalTitle}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Variante</label>
            <input
              type="text"
              required
              placeholder="Ej. Grande, Rojo, Extra Picante"
              className="w-full p-2 border rounded-lg"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                className="w-full p-2 border rounded-lg"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full p-2 border rounded-lg"
                value={formData.cost}
                onChange={e => setFormData({...formData, cost: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
              <input
                type="number"
                placeholder="0"
                className="w-full p-2 border rounded-lg"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de la Variante</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 p-2 border rounded-lg text-sm"
                value={formData.image_url || ''}
                onChange={e => setFormData({...formData, image_url: e.target.value})}
                placeholder="URL de la imagen"
              />
              <label className="cursor-pointer p-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center justify-center">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />}
              </label>
            </div>
            {formData.image_url && (
              <div className="mt-2">
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80" 
                  onClick={() => setPreviewImage(formData.image_url)} 
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save size={18} />
              {saveButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}