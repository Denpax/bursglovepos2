import { useState } from 'react';
import { Plus, X, Archive } from 'lucide-react';

export default function MultiTicketTabs({
  tickets,
  activeTicketId,
  onSwitchTicket,
  onNewTicket,
  onCloseTicket,
  onOpenHeldTickets
}) {
  return (
    <div className="flex items-center bg-gray-100 border-b relative z-20">
      <div className="sticky left-0 z-30 bg-gray-100 border-r border-gray-200 h-full flex items-center">
        <button 
          onClick={onOpenHeldTickets}
          className="px-4 py-3 flex items-center gap-1 text-orange-600 hover:bg-orange-50 transition-colors font-bold"
          title="Tickets Guardados"
        >
          <Archive size={18} />
          <span className="text-sm hidden sm:inline">Tickets</span>
        </button>
      </div>
      
      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
        {tickets.map(ticket => (
          <div 
            key={ticket.id} 
            onClick={() => onSwitchTicket(ticket.id)} 
            className={`
              flex items-center gap-2 px-4 py-3 min-w-[120px] cursor-pointer border-r transition-colors flex-shrink-0
              ${activeTicketId === ticket.id ? 'bg-white border-b-white text-blue-600 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
          >
            <span className="whitespace-nowrap">
              {ticket.customer ? ticket.customer.full_name : `Ticket #${ticket.id.slice(0, 4)}`}
            </span>
            {tickets.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTicket(ticket.id);
                }} 
                className="p-1 hover:bg-red-100 hover:text-red-500 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="sticky right-0 z-30 bg-gray-100 border-l border-gray-200 h-full flex items-center">
        <button 
          onClick={onNewTicket} 
          className="px-4 py-3 flex items-center gap-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 transition-colors"
        >
          <Plus size={18} />
          <span className="text-sm font-medium hidden sm:inline">Nuevo</span>
        </button>
      </div>
    </div>
  );
}