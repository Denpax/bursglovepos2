import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Monitor, LogOut, Loader } from 'lucide-react';

export default function TerminalSelection({ onSelectTerminal, onLogout }) {
  const [terminals, setTerminals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerminals();
  }, []);

  async function fetchTerminals() {
    try {
      const { data, error } = await supabase
        .from('terminals')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setTerminals(data || []);
    } catch (error) {
      console.error('Error fetching terminals:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500 dark:text-gray-400">Cargando puntos de venta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center border-b dark:border-gray-700">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Monitor size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Seleccionar Punto de Venta</h2>
          <p className="text-gray-500 dark:text-gray-400">Elige la terminal para iniciar operaciones</p>
        </div>

        <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
          {terminals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay terminales activas.</p>
              <p className="text-sm mt-2">Contacta al administrador.</p>
            </div>
          ) : (
            terminals.map((terminal) => (
              <button
                key={terminal.id}
                onClick={() => onSelectTerminal(terminal)}
                className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {terminal.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{terminal.location}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
          <button 
            onClick={onLogout}
            className="w-full py-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
