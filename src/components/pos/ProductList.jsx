import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, ShoppingCart, X, LayoutGrid, List, AlertTriangle } from 'lucide-react';

export default function ProductList({ onAddToCart, storeMode = 'retail', isSharedStore = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, [storeMode]); // Re-fetch when storeMode changes

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('low_stock_threshold').maybeSingle();
    if (data?.low_stock_threshold !== undefined) {
      setLowStockThreshold(data.low_stock_threshold);
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('is_active', true)
        .eq('store_type', storeMode)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleProductClick = (product) => {
    if (product.product_variants && product.product_variants.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      onAddToCart(product);
    }
  };

  const handleVariantSelect = (variant) => {
    if (!selectedProductForVariant) return;
    
    const productToAdd = {
      ...selectedProductForVariant,
      id: selectedProductForVariant.id, // Keep original product ID for reference
      variant_id: variant.id,
      name: `${selectedProductForVariant.name} (${variant.name})`,
      price: variant.price || selectedProductForVariant.price, // Use variant price if available
      cost: variant.cost || selectedProductForVariant.cost || 0, // Use variant cost if available
      original_price: selectedProductForVariant.price,
      variant_name: variant.name,
      image_url: variant.image_url || selectedProductForVariant.image_url // Use variant image if available
    };
    
    onAddToCart(productToAdd);
    setSelectedProductForVariant(null);
  };

  const filteredProducts = products.filter(product => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(term) || 
      (product.product_variants && product.product_variants.some(v => v.name.toLowerCase().includes(term)));
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(products.map(p => p.category))];

  if (loading) return <div className="p-4">Cargando productos...</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative">
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button 
              className="absolute -top-4 -right-4 bg-white text-black rounded-full p-1 shadow-lg hover:bg-gray-100"
              onClick={() => setPreviewImage(null)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {selectedProductForVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">{selectedProductForVariant.name}</h3>
              <button 
                onClick={() => setSelectedProductForVariant(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Selecciona una variante:</p>
            <div className="space-y-2">
              {selectedProductForVariant.product_variants.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className="w-full p-4 border dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 flex justify-between items-center transition-all dark:text-gray-200"
                >
                  <div className="flex items-center gap-3">
                    {variant.image_url && (
                      <img 
                        src={variant.image_url} 
                        alt={variant.name} 
                        className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(variant.image_url);
                        }}
                      />
                    )}
                    <span className="font-medium">{variant.name}</span>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    ${(variant.price || selectedProductForVariant.price).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-gray-800 shadow-sm dark:border-b dark:border-gray-700">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                categoryFilter === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="flex gap-1 border dark:border-gray-600 rounded-lg p-1 bg-gray-100 dark:bg-gray-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            title="Vista Lista"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-2'}`}>
        {filteredProducts.map(product => (
          <div 
            key={product.id}
            onClick={() => handleProductClick(product)}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer ${
              viewMode === 'grid' 
                ? 'p-4 flex flex-col justify-between h-full' 
                : 'p-3 flex items-center gap-4'
            }`}
          >
           <div
  className={`${viewMode === 'grid' ? 'relative aspect-square mb-2' : 'w-16 h-16 shrink-0 relative'} overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700`}
>
  {product.image_url ? (
    <img
      src={product.image_url}
      alt={product.name}
      className="w-full h-full object-cover cursor-pointer hover:opacity-90"
      onClick={(e) => {
        e.stopPropagation();
        setPreviewImage(product.image_url);
      }}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
      <ShoppingCart size={viewMode === 'grid' ? 32 : 20} />
    </div>
  )}

  {/* 🔵 Indicador de variantes — sólo dentro del contenedor */}
  {isSharedStore && product.product_variants && product.product_variants.length > 0 && (
    <div
      className="absolute top-1 right-1 bg-blue-600 text-white text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg"
      style={{ animation: 'blink 1.2s infinite' }}
    >
      {product.product_variants.length}
    </div>
  )}

  {/* 🔺 Indicador de stock bajo (solo POS interno) */}
  {!isSharedStore && product.stock <= lowStockThreshold && (
    <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
      <AlertTriangle size={10} />
      <span>{product.stock}</span>
    </div>
  )}
</div>
            <div className={`flex-1 ${viewMode === 'list' ? 'flex justify-between items-center' : ''}`}>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{product.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.category}</p>
              </div>
              
              <div className={`flex justify-between items-center ${viewMode === 'grid' ? 'mt-auto' : 'gap-4'}`}>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">${product.price}</span>
                <button className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}