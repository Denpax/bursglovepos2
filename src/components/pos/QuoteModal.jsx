import { useState, useEffect } from 'react';
import { X, Share2, Printer, FileText } from 'lucide-react';

export default function QuoteModal({ cart, customer, settings, onClose, total, subtotal, tax }) {
  const [quoteNumber, setQuoteNumber] = useState('');

  useEffect(() => {
    // Generate a random quote number or use timestamp
    setQuoteNumber(`COT-${Date.now().toString().slice(-6)}`);
  }, []);

  const handleShareWhatsApp = () => {
    const storeName = settings.store_name || 'Mi Tienda';
    const address = settings.business_address || '';
    const phone = settings.business_phone || '';
    const notes = settings.quote_notes || '';
    
    let message = `*COTIZACIÓN - ${storeName}*\n`;
    message += `Folio: ${quoteNumber}\n`;
    message += `Fecha: ${new Date().toLocaleDateString()}\n`;
    if (customer) {
      message += `Cliente: ${customer.full_name}\n`;
    }
    message += `--------------------------------\n`;
    
    cart.forEach(item => {
      const itemTotal = (item.price * item.quantity) - (item.discount ? (item.price * item.quantity * (item.discount / 100)) : 0);
      message += `${item.quantity} x ${item.name} - $${itemTotal.toFixed(2)}\n`;
    });
    
    message += `--------------------------------\n`;
    message += `*TOTAL: $${total.toFixed(2)}*\n\n`;
    
    if (address) message += `${address}\n`;
    if (phone) message += `Tel: ${phone}\n`;
    if (notes) message += `\n${notes}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileText size={20} className="text-teal-600" />
            Cotización
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border mb-4 overflow-y-auto flex-1 text-sm font-mono">
          <div className="text-center font-bold mb-2">{settings.store_name}</div>
          <div className="text-center text-gray-500 mb-4">
            {settings.business_address}<br />
            {settings.business_phone}
          </div>
          
          <div className="flex justify-between mb-2">
            <span>Folio:</span>
            <span className="font-bold">{quoteNumber}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span>Fecha:</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          
          {customer && (
            <div className="mb-4 border-b pb-2">
              <div className="font-bold">Cliente:</div>
              <div>{customer.full_name}</div>
            </div>
          )}

          <div className="space-y-2 mb-4 border-b pb-2">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>{item.quantity} x {item.name}</span>
                <span>${((item.price * item.quantity) - (item.discount ? (item.price * item.quantity * (item.discount / 100)) : 0)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>
          
          {settings.quote_notes && (
            <div className="mt-4 pt-2 border-t text-xs text-gray-500 text-center">
              {settings.quote_notes}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleShareWhatsApp}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Share2 size={18} /> WhatsApp
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>
      
      {/* Hidden Print Area */}
      <div className="hidden print:block fixed inset-0 bg-white z-[10001] p-8 font-mono">
        <div className="text-center font-bold text-xl mb-2">{settings.store_name}</div>
        <div className="text-center mb-6">
          {settings.business_address}<br />
          {settings.business_phone}
        </div>
        
        <div className="text-center font-bold text-lg mb-4">COTIZACIÓN</div>
        
        <div className="flex justify-between mb-2">
          <span>Folio: {quoteNumber}</span>
          <span>Fecha: {new Date().toLocaleDateString()}</span>
        </div>
        
        {customer && (
          <div className="mb-6 border-b pb-2">
            <div className="font-bold">Cliente:</div>
            <div>{customer.full_name}</div>
          </div>
        )}

        <table className="w-full mb-6">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Cant</th>
              <th className="text-left py-2">Descripción</th>
              <th className="text-right py-2">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, index) => (
              <tr key={index} className="border-b border-dashed">
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{item.name}</td>
                <td className="text-right py-2">${((item.price * item.quantity) - (item.discount ? (item.price * item.quantity * (item.discount / 100)) : 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="text-right">
            <div className="font-bold text-xl">TOTAL: ${total.toFixed(2)}</div>
          </div>
        </div>
        
        {settings.quote_notes && (
          <div className="text-sm text-gray-600 text-center border-t pt-4">
            {settings.quote_notes}
          </div>
        )}
      </div>
    </div>
  );
}