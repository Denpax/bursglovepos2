import { useState, useEffect } from "react";
import { X, Save, Loader, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function CategoryManagerModal({ onClose, storeMode }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function safeFetchCategories() {
      try {
        if (!storeMode) {
          setDebug("⚠️ storeMode indefinido, abortando fetch");
          return;
        }

        setLoading(true);
        setDebug("📡 Cargando categorías desde Supabase...");

        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("store_type", storeMode)
          .order("name", { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        const safeData = Array.isArray(data) ? data : [];
        const sorted = safeData.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
        );

        setCategories(sorted);
        setDebug(`✅ ${sorted.length} categorías cargadas correctamente`);
      } catch (err) {
        console.error("[CategoryModal] Error al cargar:", err);
        setDebug("❌ Error: " + (err.message || "Error desconocido"));
        alert("Error al cargar categorías: " + (err.message || "desconocido"));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // Espera un segundo para dar tiempo a que storeMode se inicialice correctamente en móviles
    const timeout = setTimeout(safeFetchCategories, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [storeMode]);

  async function handleAddCategory(e) {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      alert("Por favor ingresa un nombre de categoría");
      return;
    }

    const duplicate = categories.find(
      (cat) => cat.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      alert("Esta categoría ya existe");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: trimmed, store_type: storeMode }]);

      if (error) throw error;

      setNewCategoryName("");
      setDebug("✅ Categoría agregada correctamente");
      // Refrescamos lista después de insertar
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("store_type", storeMode)
        .order("name", { ascending: true });
      setCategories(data || []);
    } catch (err) {
      console.error("Error agregando categoría:", err);
      alert("Error al agregar categoría: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id) {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (err) {
      console.error("Error al eliminar categoría:", err);
      alert("Error al eliminar categoría: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start sm:items-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mt-10 sm:mt-0 mb-10 sm:mb-0 overflow-y-auto max-h-[90vh]">
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Gestionar Categorías
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Muestra debug temporalmente (puedes quitarlo luego) */}
        {debug && (
          <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
            {debug}
          </div>
        )}

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
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
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
