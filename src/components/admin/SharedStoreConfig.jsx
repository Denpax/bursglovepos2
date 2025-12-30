import { useState } from 'react';
import { Copy, ExternalLink, Share2, Store } from 'lucide-react';

export default function SharedStoreConfig() {
  const [copied, setCopied] = useState(false);
  
  const storeUrl = `${window.location.origin}/?view=shop`;

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi Tienda Online',
          text: '¡Mira nuestro catálogo y haz tu pedido!',
          url: storeUrl,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <Store size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda Compartida</h1>
          <p className="text-gray-500 mb-8">
            Comparte este enlace con tus clientes para que puedan ver tu catálogo y enviarte pedidos directamente.
          </p>

          <div className="bg-gray-50 p-4 rounded-xl border flex items-center gap-3 mb-6">
            <input 
              type="text" 
              value={storeUrl} 
              readOnly 
              onClick={(e) => e.target.select()}
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-600 font-medium text-sm"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-600' : 'bg-white border hover:bg-gray-100 text-gray-600'}`}
              title="Copiar enlace"
            >
              {copied ? <span className="font-bold text-xs px-1">Copiado</span> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-6">
            Nota: Si el enlace no funciona, recarga esta página y copia el nuevo enlace generado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href={storeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={20} />
              Abrir Tienda
            </a>
            
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Mi Tienda Online',
                    text: '¡Mira nuestro catálogo y haz tu pedido!',
                    url: storeUrl,
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(storeUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <Share2 size={20} />
              Compartir por WhatsApp
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">¿Cómo funciona?</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
            <li>Comparte el enlace con tus clientes.</li>
            <li>Ellos verán tu catálogo de productos (sin ver información sensible).</li>
            <li>Podrán agregar productos al carrito y enviar el pedido.</li>
            <li>Recibirás los pedidos en la sección <strong>"Pedidos"</strong> del menú principal.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
