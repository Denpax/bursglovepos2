import { useState, useEffect } from 'react';
import { X, Archive, Clock, Trash2, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import TicketReceipt from './TicketReceipt';

export default function HeldTicketsModal({ onClose, onLoadTicket }) {
  const [heldTickets, setHeldTickets] = useState([]);
  const [ticketToPrint, setTicketToPrint] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchHeldTickets();
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').maybeSingle();
    if (data) setSettings(data);
  }

  async function fetchHeldTickets() {
    const { data } = await supabase
      .from('sales')
      .select('*, customers(*)')
      .eq('status', 'held')
      .order('created_at', { ascending: false });
    if (data) setHeldTickets(data);
  }

  const handleDeleteHeldTicket = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de eliminar este ticket guardado?')) return;
    
    try {
      const { error } = await supabase.from('sales').delete().eq('id', ticketId);
      if (error) throw error;
      
      setHeldTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error al eliminar ticket: ' + error.message);
    }
  };

  const handleRestoreTicket = async (ticket) => {
    try {
      const { data: items, error } = await supabase
        .from('sale_items')
        .select('*, products(*)')
        .eq('sale_id', ticket.id);

      if (error) throw error;

      if (!items || items.length === 0) {
        alert('El ticket está vacío o no se pudieron cargar los items.');
        return;
      }

      const restoredCart = items.map(item => ({
        id: item.product_id,
        name: item.products?.name || 'Producto (Eliminado)',
        price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount_amount || 0, // This might be amount or percentage depending on how it was saved. 
        // In TicketPanel, item.discount is percentage.
        // In save: discount_amount: (item.discount ? (item.price * item.quantity * (item.discount / 100)) : 0) + ...
        // Wait, sale_items.discount_amount stores the amount.
        // But TicketPanel expects item.discount as percentage.
        // I need to convert back if possible.
        // item.discount_amount / (item.unit_price * item.quantity) * 100
        // But wait, the previous code was: discount: item.discount_amount || 0
        // If item.discount_amount is 0, then 0%.
        // If it's not 0, it's the amount. But TicketPanel treats it as %.
        // This seems like a bug in existing restore logic or I misunderstood.
        // Let's check TicketPanel: const discount = item.discount ? (base * (item.discount / 100)) : 0;
        // So item.discount IS percentage.
        // But in DB sale_items, we store discount_amount (value).
        // We don't store the percentage in sale_items explicitly unless we added a column.
        // We should probably fix this or approximate.
        // For now, let's assume the previous logic was "working" or I should fix it.
        // If I change it now, I might break things.
        // But `item.discount_amount` is definitely currency.
        // Let's try to recover percentage:
        // discount_percent = (item.discount_amount / (item.unit_price * item.quantity)) * 100
        
        // Let's stick to the plan for coupon.
        stock: item.products?.stock || 0,
        earnsPoints: true
      }));
      
      // Fix item discount percentage recovery
      restoredCart.forEach(item => {
         if (item.discount > 0) { // currently holding amount
             const total = item.price * item.quantity;
             if (total > 0) {
                 item.discount = (item.discount / total) * 100;
             }
         }
      });

      if (onLoadTicket) {
        // Calculate discounts
        const itemDiscounts = restoredCart.reduce((sum, item) => {
            const base = item.price * item.quantity;
            const discount = item.discount ? (base * (item.discount / 100)) : 0;
            return sum + discount;
        }, 0);
        
        const totalDiscount = ticket.discount_amount || 0;
        const remainingDiscount = Math.max(0, totalDiscount - itemDiscounts);
        
        let couponDiscount = 0;
        let globalDiscount = 0;
        
        if (ticket.coupon_code) {
            couponDiscount = remainingDiscount;
        } else {
            const subtotal = restoredCart.reduce((sum, item) => {
                const base = item.price * item.quantity;
                const discount = item.discount ? (base * (item.discount / 100)) : 0;
                return sum + (base - discount);
            }, 0);
            
            if (subtotal > 0 && remainingDiscount > 0) {
                globalDiscount = (remainingDiscount / subtotal) * 100;
                globalDiscount = Math.round(globalDiscount * 100) / 100;
            }
        }

        onLoadTicket(restoredCart, ticket.customers, globalDiscount, ticket.coupon_code, couponDiscount);
      } else {
        console.error('onLoadTicket function is missing');
        alert('Error interno: Función de cargar ticket no disponible.');
        return;
      }

      // Delete the held ticket after successful load
      const { error: deleteError } = await supabase.from('sales').delete().eq('id', ticket.id);
      if (deleteError) {
        console.error('Error deleting restored ticket:', deleteError);
      }
      
      onClose();
    } catch (error) {
      console.error('Error restoring ticket:', error);
      alert('Error al restaurar ticket: ' + error.message);
    }
  };

  const handlePrintTicket = async (ticket) => {
    try {
      // Fetch items for the ticket
      const { data: items, error } = await supabase
        .from('sale_items')
        .select('*, products(*)')
        .eq('sale_id', ticket.id);

      if (error) throw error;

      const cart = items.map(item => ({
        id: item.product_id,
        name: item.products?.name || 'Producto',
        price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount_amount || 0
      }));

      setTicketToPrint({
        ...ticket,
        cart,
        customer: ticket.customers
      });
      
    } catch (error) {
      console.error('Error preparing ticket for print:', error);
      alert('Error al preparar impresión');
    }
  };

  useEffect(() => {
    if (ticketToPrint) {
      // Small delay to ensure render
      setTimeout(() => {
        window.print();
        setTicketToPrint(null); // Reset after print dialog opens
      }, 500);
    }
  }, [ticketToPrint]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Archive size={20} className="text-orange-500" />
            Tickets Guardados
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {heldTickets.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay tickets guardados</p>
          ) : (
            heldTickets.map(ticket => (
              <div key={ticket.id} className="p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-medium">Ticket #{ticket.id.slice(0, 4)}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(ticket.created_at).toLocaleString()}
                  </div>
                  {ticket.customers && (
                    <div className="text-xs text-blue-600">{ticket.customers.full_name}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-green-600 mb-1">${ticket.total_amount.toFixed(2)}</span>
                  
                  <div className="flex flex-row gap-2 w-full justify-end mt-2">
                    <button 
                      onClick={() => handlePrintTicket(ticket)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded flex items-center justify-center gap-1"
                      title="Imprimir"
                    >
                      <Printer size={18} />
                    </button>

                    <button 
                      onClick={() => handleRestoreTicket(ticket)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                    >
                      Cargar
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteHeldTicket(ticket.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex items-center justify-center gap-1"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hidden Ticket Receipt for Printing */}
      {ticketToPrint && (
        <div className="hidden print:block fixed inset-0 bg-white z-[10001]">
          <TicketReceipt 
            cart={ticketToPrint.cart} 
            customer={ticketToPrint.customer} 
            total={ticketToPrint.total_amount} 
            subtotal={ticketToPrint.total_amount / (1 + (settings.vat_rate || 0) / 100)} 
            tax={ticketToPrint.total_amount - (ticketToPrint.total_amount / (1 + (settings.vat_rate || 0) / 100))} 
            settings={settings}
            ticketId={ticketToPrint.id}
            date={ticketToPrint.created_at}
          />
        </div>
      )}
    </div>
  );
}
