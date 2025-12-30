import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { DollarSign, ShoppingBag, TrendingUp, Calendar, BarChart2, PieChart, X, Download, ArrowUpDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
export default function DashboardMetrics({ storeMode = 'retail' }) {
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    monthSales: 0,
    totalOrders: 0,
    topProducts: [],
    salesData: [],
    recentReceipts: []
  });
  const [loading, setLoading] = useState(true);
  const [receiptSearch, setReceiptSearch] = useState('');
  const [productSort, setProductSort] = useState('desc'); // 'desc' or 'asc'

  useEffect(() => {
    fetchMetrics();
  }, [receiptSearch, storeMode]); // Re-fetch when storeMode changes

  async function fetchMetrics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      // Fetch sales
      const {
        data: sales,
        error: salesError
      } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', lastYear.toISOString())
        .eq('store_type', storeMode); // Filter by storeMode
      
      if (salesError) throw salesError;

      // Calculate metrics
      const todaySales = sales.filter(s => new Date(s.created_at) >= today).reduce((sum, s) => sum + s.total_amount, 0);
      const monthSales = sales.filter(s => new Date(s.created_at) >= firstDayOfMonth).reduce((sum, s) => sum + s.total_amount, 0);
      const monthCost = sales.filter(s => new Date(s.created_at) >= firstDayOfMonth).reduce((sum, s) => sum + (s.cost_amount || 0), 0);
      const monthDiscounts = sales.filter(s => new Date(s.created_at) >= firstDayOfMonth).reduce((sum, s) => sum + (s.discount_amount || 0), 0);
      const monthPointsRedeemed = sales.filter(s => new Date(s.created_at) >= firstDayOfMonth).reduce((sum, s) => sum + (s.points_redeemed || 0), 0);

      // Prepare chart data (Sales by day)
      const salesByDay = {};
      sales.forEach(sale => {
        const date = new Date(sale.created_at).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short'
        });
        if (!salesByDay[date]) salesByDay[date] = 0;
        salesByDay[date] += sale.total_amount;
      });
      const salesData = Object.entries(salesByDay).map(([date, total]) => ({
        name: date,
        total: total
      })).reverse(); // Show oldest to newest? No, map order depends on iteration. Let's sort.

      // Better sort
      const sortedSalesData = Object.entries(salesByDay).sort((a, b) => {
        // This simple sort might fail with "short" months. 
        // Better to use the raw date for sorting if needed, but for now let's trust the order or just use the array.
        return 0;
      }).map(([date, total]) => ({
        name: date,
        total
      }));

      // Fetch top products
      const {
        data: items,
        error: itemsError
      } = await supabase
        .from('sale_items')
        .select('*, products(name), sales!inner(store_type)') // Join with sales to filter
        .gte('created_at', last30Days.toISOString())
        .eq('sales.store_type', storeMode); // Filter by storeMode
      
      if (itemsError) throw itemsError;
      const productStats = {};
      items.forEach(item => {
        const name = item.products?.name || 'Desconocido';
        if (!productStats[name]) productStats[name] = 0;
        productStats[name] += item.quantity;
      });
      const topProducts = Object.entries(productStats).map(([name, quantity]) => ({
        name,
        quantity
      })).sort((a, b) => b.quantity - a.quantity); // Removed slice to show all

      // Fetch recent receipts with search
      let query = supabase.from('sales').select('*, customers(full_name)').eq('store_type', storeMode).order('created_at', {
        ascending: false
      });
      
      // Fetch more receipts to show history (last year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      query = query.gte('created_at', oneYearAgo.toISOString());

      if (receiptSearch && receiptSearch.match(/^[0-9a-fA-F-]+$/)) {
         query = query.ilike('id', `%${receiptSearch}%`);
      } else if (receiptSearch) {
         query = query.ilike('ticket_number', `%${receiptSearch}%`);
      }
      
      // Limit to 1000 for UI performance, but download will fetch all
      query = query.limit(1000);

      const {
        data: recentReceiptsData
      } = await query;
      let recentReceipts = recentReceiptsData || [];
      if (receiptSearch && !receiptSearch.match(/^[0-9a-fA-F-]+$/)) {
        // Filter by customer name in JS
        recentReceipts = recentReceipts.filter(r => r.customers?.full_name?.toLowerCase().includes(receiptSearch.toLowerCase()));
      } else if (!receiptSearch) {
        recentReceipts = recentReceipts.slice(0, 5);
      }
      setMetrics({
        todaySales,
        monthSales,
        monthCost,
        monthDiscounts,
        monthPointsRedeemed,
        monthProfit: monthSales - monthCost,
        totalOrders: sales.length,
        topProducts,
        salesData: sortedSalesData,
        recentReceipts
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  }
  async function downloadReceiptsCSV() {
    setLoading(true);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const { data: allReceipts, error } = await supabase
        .from('sales')
        .select('*, customers(full_name)')
        .gte('created_at', oneYearAgo.toISOString())
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (!allReceipts || !allReceipts.length) {
        alert('No hay recibos para descargar');
        return;
      }
      
      const headers = ['ID Recibo', 'Fecha', 'Cliente', 'Total', 'Método Pago', 'Estado'];
      const rows = allReceipts.map(r => [
        r.id,
        new Date(r.created_at).toLocaleString(),
        r.customers?.full_name || 'Cliente General',
        r.total_amount.toFixed(2),
        r.payment_method,
        r.status
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `recibos_anuales_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Error al descargar el archivo');
    } finally {
      setLoading(false);
    }
  }

  async function downloadTopProductsExcel() {
    try {
      if (!metrics.topProducts || !metrics.topProducts.length) {
        alert('No hay productos para descargar');
        return;
      }

      const data = metrics.topProducts.map((p, index) => ({
        'Ranking': index + 1,
        'Producto': p.name,
        'Cantidad Vendida': p.quantity
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Más Vendidos");
      XLSX.writeFile(wb, `productos_mas_vendidos_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Error al descargar el archivo Excel');
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando métricas...</div>;

  return <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {storeMode === 'wholesale' ? 'Panel de Control (Mayoreo)' : 'Panel de Control (Menudeo)'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Ventas Brutas (Mes)" value={`${(metrics.monthSales || 0).toFixed(2)}`} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Beneficio Bruto" value={`${(metrics.monthProfit || 0).toFixed(2)}`} icon={TrendingUp} color="bg-blue-500" />
        <StatCard title="Costo de Bienes" value={`${(metrics.monthCost || 0).toFixed(2)}`} icon={ShoppingBag} color="bg-red-500" />
        <StatCard title="Descuentos" value={`${(metrics.monthDiscounts || 0).toFixed(2)}`} icon={DollarSign} color="bg-orange-500" />
        <StatCard title="Puntos Usados" value={metrics.monthPointsRedeemed || 0} icon={Calendar} color="bg-purple-500" />
        <StatCard title="Ventas Hoy" value={`${(metrics.todaySales || 0).toFixed(2)}`} icon={DollarSign} color="bg-green-600" />
        <StatCard title="Total Pedidos" value={metrics.totalOrders || 0} icon={ShoppingBag} color="bg-indigo-500" />
        <StatCard title="Ticket Promedio" value={`${metrics.totalOrders ? ((metrics.monthSales || 0) / metrics.totalOrders).toFixed(2) : '0.00'}`} icon={TrendingUp} color="bg-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-blue-600" />
            Ventas (Últimos 30 días)
          </h3>
          <div className="h-64 w-full">
            {metrics.salesData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.salesData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}`} />
                  <Tooltip formatter={value => [`${value}`, 'Ventas']} contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center text-gray-400">
                No hay datos de ventas suficientes
              </div>}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-purple-600" />
            Ventas por Artículo (Top 10)
          </h3>
          <div className="h-64 w-full">
            {metrics.topProducts.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topProducts} layout="vertical" margin={{
              left: 0,
              right: 20,
              top: 10,
              bottom: 10
            }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{
                fill: 'transparent'
              }} contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }} />
                  <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} name="Cantidad" />
                </BarChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center text-gray-400">
                No hay datos de productos
              </div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Receipts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Historial de Recibos</h3>
            <div className="relative flex items-center gap-2">
              <button 
                onClick={downloadReceiptsCSV}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Descargar CSV"
              >
                <Download size={20} />
              </button>
              <div className="relative">
                <input type="text" placeholder="Buscar recibo..." className="text-sm border rounded px-2 py-1 w-40 pr-6" value={receiptSearch} onChange={e => setReceiptSearch(e.target.value)} />
                {receiptSearch && <button onClick={() => setReceiptSearch('')} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="p-3 rounded-l-lg">Recibo</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metrics.recentReceipts.map(receipt => <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">#{receipt.ticket_number || receipt.id.slice(0, 8)}</td>
                    <td className="p-3 text-gray-500 text-sm">
                      {new Date(receipt.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-gray-600 text-sm">
                      {receipt.customers?.full_name || 'Cliente General'}
                    </td>
                    <td className="p-3 text-right font-bold text-green-600">
                      ${(receipt.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>)}
                {metrics.recentReceipts.length === 0 && <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400">No hay recibos recientes</td>
                  </tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Productos Más Vendidos</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setProductSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                title={productSort === 'desc' ? "Ordenar Ascendente" : "Ordenar Descendente"}
              >
                <ArrowUpDown size={20} />
                <span className="text-xs font-medium">{productSort === 'desc' ? 'Mayor a Menor' : 'Menor a Mayor'}</span>
              </button>
              <button 
                onClick={downloadTopProductsExcel}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Descargar Excel"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 pr-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left min-w-[300px]">
              <thead className="bg-gray-50 text-gray-500 text-sm sticky top-0 z-10">
                <tr>
                  <th className="p-3 rounded-l-lg">#</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-right rounded-r-lg">Cantidad Vendida</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...metrics.topProducts]
                  .sort((a, b) => productSort === 'desc' ? b.quantity - a.quantity : a.quantity - b.quantity)
                  .map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{index + 1}</td>
                    <td className="p-3 font-medium text-gray-900">{product.name}</td>
                    <td className="p-3 text-right font-bold text-gray-900">{product.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>;
}
function StatCard({
  title,
  value,
  icon: Icon,
  color
}) {
  return <div className="bg-white p-6 rounded-xl shadow-sm border flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color} text-white`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>;
}