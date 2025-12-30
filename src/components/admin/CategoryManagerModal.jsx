import { useState, useEffect } from 'react';
import { X, Save, Loader, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CategoryManagerModal({ onClose, storeMode }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Montaje seguro con cleanup y control de errores
  useEffect(() => {
    let isMounted = true;

    async function safeFetchCategories() {
      if (!storeMode) return; // 🛑 Previene llamada sin store definido
      setLoading(true);
      try {
        const { data, error } = await supabase
          ?.from('categories')
          ?.select('*')
          ?.eq('store_type', storeMode)
          ?.order('name', { ascending: true });

        if (error) throw error;
        if (!data || !Array.isArray(data)) {
          if (isMounted) setCategories([]);
          return;
        }

        if (isMounted) {
          const sortedData = data.sort((a, b) =>
            a.name?.localeCompare(b.name ?? '', 'es', { sensitivity: 'base' })
          );
          setCategories(sortedData);
        }
      } catch (error) {
        console.error('[CategoryManager] Error inicial:', error);
        if (isMounted)
          alert('Error al cargar categorías. Verifica tu conexión a internet.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    safeFetchCategories();

    return () => {
      isMounted = false;
    };
  }, [storeMode]);

  // ✅ Reutilizable fuera del montaje
  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('store_type', storeMode)
        .order('name', { ascending: true });

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setCategories(sortedData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Error al cargar categorías: ' + error.message);
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      alert('Por favor ingrese un nombre de categoría');
      return;
    }

    const duplicate = categories.find(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      alert('Esta categoría ya existe');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: trimmedName, store_type: storeMode }])
        .select();

      if (error) {
        if (error.code === '23505') {
          alert('Esta categoría ya existe en la base de datos');
        } else {
          throw error;
        }
      } else {
        setNewCategoryName('');
        await fetchCategories(); // recarga lista
      }
    } catch (error) {
      console.error('[CategoryManager] Error adding category:', error);
      alert('Error al agregar categoría: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;

      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error al eliminar categoría');
    } finally {
      setLoading(false);
    }
  }

  // ✅ Limpieza al cerrar
  const handleClose = () => {
    setCategories([]);
    setNewCategoryName('');
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mt-10 sm:mt-0 mb-10 sm:mb-0 overflow-y-auto max-h-[90vh]">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Gestionar Categorías
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría..."
              className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Agregar
            </button>
          </form>

          <div className="space-y-2">
            {categories.length === 0 && !loading && (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No hay categorías.
              </p>
            )}
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {category.name}
                </span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  disabled={loading}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
