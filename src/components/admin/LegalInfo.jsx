import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Shield } from 'lucide-react';

export default function LegalInfo({ storeMode = 'retail' }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [storeMode]);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('terms_of_use, privacy_policy')
        .eq('store_type', storeMode)
        .maybeSingle();
      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching legal info:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8">Cargando información legal...</div>;

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Información Legal</h2>

      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Terms of Use */}
        <div className="bg-white p-8 rounded-xl shadow-sm border dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6 border-b pb-4 dark:border-gray-700">
            <FileText className="text-blue-600 dark:text-blue-400" size={28} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Términos de Uso</h3>
          </div>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {settings?.terms_of_use || 'No hay términos de uso definidos.'}
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="bg-white p-8 rounded-xl shadow-sm border dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6 border-b pb-4 dark:border-gray-700">
            <Shield className="text-green-600 dark:text-green-400" size={28} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Política de Privacidad</h3>
          </div>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {settings?.privacy_policy || 'No hay política de privacidad definida.'}
          </div>
        </div>
      </div>
    </div>
  );
}
