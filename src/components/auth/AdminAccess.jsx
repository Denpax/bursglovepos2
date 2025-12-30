import { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminAccess({ onAccessGranted }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hardcoded for MVP based on user request, ideally should verify against DB or auth
    if (password === 'bursglove2021') {
      onAccessGranted();
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
        <p className="text-gray-500 mb-8">
          Esta sección está protegida. Ingresa la contraseña de administrador para continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Contraseña de administrador"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            Desbloquear Acceso
          </button>
        </form>
      </div>
    </div>
  );
}