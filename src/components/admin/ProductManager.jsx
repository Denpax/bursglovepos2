import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, X, Save, Image as ImageIcon, Upload, Loader, List, AlertTriangle, Download, Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check } from 'lucide-react';
import VariantModal from './VariantModal';
import ProductFormModal from './ProductFormModal';
import CategoryManagerModal from './CategoryManagerModal';
import * as XLSX from 'xlsx';

export default function ProductManager({ storeMode = 'retail' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [currentProductForVariant, setCurrentProductForVariant] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isAddOptionsOpen, setIsAddOptionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortOption, setSortOption] = useState('date_desc');

  const searchRef = useRef(null);
  const addRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (addRef.current && !addRef.current.contains(event.target)) {
        setIsAddOptionsOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    fetchProducts();
  }, [storeMode]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('is_active', true)
        .eq('store_type', storeMode)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  }

  async function handleSaveProduct(productData, variants = []) {
    try {
      let error;
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        // Insert new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{ ...productData, store_type: storeMode }])
          .select()
          .single();
        
        error = insertError;

        // If success and we have variants, insert them
        if (!error && newProduct && variants.length > 0) {
          const variantsToInsert = variants.map(v => ({
            product_id: newProduct.id,
            name: v.name,
            price: v.price,
            cost: v.cost,
            stock: v.stock,
            image_url: v.image_url
          }));

          const { error: variantsError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert);
          
          if (variantsError) {
            console.error('Error saving variants:', variantsError);
            // We don't throw here to avoid rolling back the product creation, but we alert
            alert('Producto creado pero hubo error al guardar variantes');
          }
        }
      }

      if (error) throw error;
      
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error al guardar producto');
    }
  }

  async function handleSaveVariant(variantData, index) {
    try {
      if (!currentProductForVariant) return;

      const { error } = await supabase
        .from('product_variants')
        .insert([{ ...variantData, product_id: currentProductForVariant.id }]);

      if (error) throw error;

      setIsVariantModalOpen(false);
      fetchProducts(); // Refresh to see new variant
    } catch (error) {
      console.error('Error saving variant:', error);
      alert('Error al guardar variante');
    }
  }

  async function handleDeleteVariant(variantId) {
    if (!confirm('¿Eliminar esta variante?\n\nLos datos históricos de ventas se mantendrán intactos.')) return;
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      alert('✅ Variante eliminada correctamente');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert('❌ Error al eliminar variante: ' + (error.message || 'Error desconocido'));
    }
  }

  const handleExport = () => {
    const data = products.map(p => ({
      Nombre: p.name,
      Categoría: p.category,
      Precio: p.price,
      Costo: p.cost,
      Stock: p.stock,
      Variantes: p.product_variants?.length || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, `productos_${storeMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filter and Pagination logic
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortOption) {
      case 'name_asc': return a.name.localeCompare(b.name);
      case 'name_desc': return b.name.localeCompare(a.name);
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'stock_asc': return a.stock - b.stock;
      case 'stock_desc': return b.stock - a.stock;
      case 'date_desc': return new Date(b.created_at) - new Date(a.created_at);
      default: return 0;
    }
  });
  
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin" /></div>;

  return (
   <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 p-4">
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            <button className="absolute -top-4 -right-4 bg-white text-black rounded-full p-1 shadow-lg hover:bg-gray-100" onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Productos ({storeMode === 'retail' ? 'Menudeo' : 'Mayoreo'})</h2>
          {/* Export Button moved here */}
          <button onClick={handleExport} className="px-3 py-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-lg border dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title="Exportar Excel">
            <Download size={18} />
          </button>
        </div>
        
        {/* UNITED TOOLBAR - Reorganized as requested */}
        <div className="flex flex-wrap items-center bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm overflow-visible z-30">
          {/* Search Button */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`px-3 py-2 border-r dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 ${isSearchOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              title="Buscar"
            >
              <Search size={18} />
            </button>
            {isSearchOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border dark:border-gray-700 p-2">
                <input
                  type="text"
                  placeholder="Buscar producto o categoría..."
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
          
          {/* New Product/Category Dropdown */}
          <div className="relative" ref={addRef}>
            <button 
              onClick={() => setIsAddOptionsOpen(!isAddOptionsOpen)}
              className={`px-4 py-2 border-r dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors ${isAddOptionsOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo</span>
              {isAddOptionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isAddOptionsOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => { setEditingProduct(null); setIsModalOpen(true); setIsAddOptionsOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Plus size={16} /> Nuevo Producto
                </button>
                <button
                  onClick={() => { setIsCategoryModalOpen(true); setIsAddOptionsOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 border-t dark:border-gray-700"
                >
                  <List size={16} /> Gestionar Categorías
                </button>
              </div>
            )}
          </div>
          
          {/* Sort Button */}
          <div className="relative" ref={sortRef}>
            <button 
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className={`px-3 py-2 border-r dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 ${isSortMenuOpen ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              title="Ordenar"
            >
              <ArrowUpDown size={18} />
            </button>
            {isSortMenuOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border dark:border-gray-700 overflow-hidden">
                <div className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ordenar por</div>
                {[
                  { id: 'date_desc', label: 'Más recientes' },
                  { id: 'name_asc', label: 'Nombre (A-Z)' },
                  { id: 'name_desc', label: 'Nombre (Z-A)' },
                  { id: 'price_asc', label: 'Precio (Menor a Mayor)' },
                  { id: 'price_desc', label: 'Precio (Mayor a Menor)' },
                  { id: 'stock_asc', label: 'Stock (Menor a Mayor)' },
                  { id: 'stock_desc', label: 'Stock (Mayor a Menor)' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => { setSortOption(option.id); setIsSortMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                      sortOption === option.id 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                    {sortOption === option.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center px-2 gap-1 bg-gray-50 dark:bg-gray-900/50 h-full">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 dark:text-gray-300"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium px-2 dark:text-gray-300">
              {currentPage} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 dark:text-gray-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

{/* ✅ Contenedor corregido sin overflow-hidden */}
<div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
  {/* 🧭 Scroll horizontal y vertical con padding para no cortar bordes */}
  <div className="overflow-auto rounded-b-xl pb-2">
    <table className="min-w-max w-full text-left text-sm border-separate border-spacing-0">

          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 sticky top-0 z-20 backdrop-blur-sm">
            <tr>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 w-10"></th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Imagen</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Producto</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Categoría</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-center">Precio/Costo</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-center">Stock</th>
              <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {paginatedProducts.map(product => (
              <React.Fragment key={product.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    {product.product_variants && product.product_variants.length > 0 && (
                      <button 
                        onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {expandedProductId === product.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80"
                        onClick={() => setPreviewImage(product.image_url)}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    {product.product_variants && product.product_variants.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{product.product_variants.length} variantes</div>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{product.category}</td>
                  <td className="p-4 text-center">
                    <div className="font-medium text-gray-900 dark:text-white">${product.price}</div>
                    {product.cost && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Costo: ${product.cost}</div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.stock <= 5
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setCurrentProductForVariant(product); setIsVariantModalOpen(true); }}
                        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg"
                        title="Agregar Variante"
                      >
                        <List size={18} />
                      </button>
                      <button 
                        onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Variants Expansion */}
                {expandedProductId === product.id && product.product_variants && (
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan="7" className="p-4 pl-14">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Variantes:</div>
                      <div className="grid gap-2">
                        {product.product_variants.map(variant => (
                          <div key={variant.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              {variant.image_url ? (
                                <img 
                                  src={variant.image_url} 
                                  alt={variant.name} 
                                  className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-80"
                                  onClick={() => setPreviewImage(variant.image_url)}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                  <ImageIcon size={14} />
                                </div>
                              )}
                              <span className="font-medium dark:text-gray-200">{variant.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-gray-600 dark:text-gray-300">${variant.price || product.price}</span>
                              <span className="text-gray-500 dark:text-gray-400">Stock: {variant.stock}</span>
                              <button 
                                onClick={() => handleDeleteVariant(variant.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {paginatedProducts.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron productos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
          initialData={editingProduct}
          storeMode={storeMode}
          onProductUpdated={fetchProducts}
        />
      )}

      {isVariantModalOpen && (
        <VariantModal
          onClose={() => { setIsVariantModalOpen(false); setCurrentProductForVariant(null); }}
          onSave={handleSaveVariant}
          initialVariantData={null}
          variantIndex={null}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          storeMode={storeMode}
        />
      )}
    </div>
  );
}