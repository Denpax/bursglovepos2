import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TicketReceipt({
  cart = [],
  customer,
  total = 0,
  subtotal = 0,
  tax = 0,
  discount = 0,
  couponCode = null,
  pointsUsed = 0,
  pointsEarned = 0,
  pointsBalance = 0,
  settings = {},
  cashierName,
  ticketId,
  ticketNumber,
  date,
}) {
  const displayDate = date ? new Date(date).toLocaleString() : new Date().toLocaleString();
  const safeSettings = settings || {};

  return (
    <div
  id="printable-ticket"
 className="bg-white p-4 text-sm font-mono min-w-[700px] sm:min-w-[320px] mx-auto border border-gray-200 shadow-sm"
>
      {/* Encabezado */}
      <div className="text-center mb-4">
        {safeSettings.business_logo_url && (
          <img src={safeSettings.business_logo_url} alt="Logo" className="h-12 mx-auto mb-2" />
        )}
        <h2 className="font-bold text-lg">{safeSettings.store_name || 'Bursglove POS'}</h2>
        {safeSettings.business_address && <p>{safeSettings.business_address}</p>}
        {safeSettings.business_phone && <p>{safeSettings.business_phone}</p>}
      </div>

      {/* Información del ticket */}
      <div className="mb-4 border-b pb-2">
        <p>Ticket: #{ticketNumber || ticketId?.slice(0, 8)}</p>
        <p>Fecha: {displayDate}</p>
        <p>Atendido por: {cashierName || 'Cajero'}</p>

        {customer && (
          <div className="mt-1 pt-1 border-t border-dashed">
            <p>Cliente: {customer.full_name || 'Cliente General'}</p>
            {pointsBalance > 0 && <p>Balance de puntos: {pointsBalance}</p>}
          </div>
        )}
      </div>
{/* Detalle de productos */}
<div className="w-full overflow-x-auto">
  <div className="mb-4 overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
    {safeSettings.ticket_header && (
      <p className="font-bold mb-2">{safeSettings.ticket_header}</p>
    )}

    <table className="min-w-[700px] w-full text-left">
      <thead>
        <tr className="border-b">
          <th className="pb-1">Cant</th>
          <th className="pb-1">Prod</th>
          <th className="pb-1 text-right">Precio</th>
          <th className="pb-1 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {cart.map((item, i) => {
          const itemTotal = (item.price * item.quantity) * (1 - (item.discount || 0) / 100);
          return (
            <tr key={i} className="border-b border-dashed">
              <td className="py-1 align-top">{item.quantity}</td>
              <td className="py-1 align-top">
                {item.name}
                {item.discount > 0 && (
                  <div className="text-xs text-gray-500">
                    Desc: {item.discount}%
                  </div>
                )}
              </td>
              <td className="py-1 align-top text-right">${item.price.toFixed(2)}</td>
              <td className="py-1 align-top text-right">${itemTotal.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>

      {/* Totales y puntos */}
      <div className="mb-4 border-t pt-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {couponCode && (
          <div className="flex justify-between text-gray-700">
            <span>Cupón ({couponCode}):</span>
            <span>- ${discount.toFixed(2)}</span>
          </div>
        )}

        {!couponCode && discount > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Descuento:</span>
            <span>- ${discount.toFixed(2)}</span>
          </div>
        )}

        {pointsUsed > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Puntos usados:</span>
            <span>-{pointsUsed}</span>
          </div>
        )}

        {pointsEarned > 0 && (
          <div className="flex justify-between text-blue-600">
            <span>Puntos ganados:</span>
            <span>+{pointsEarned}</span>
          </div>
        )}

        {tax > 0 && (
          <div className="flex justify-between">
            <span>IVA ({safeSettings.vat_rate || 16}%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg mt-1 border-t pt-1">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Pie de ticket */}
      <div className="text-center text-xs mt-6">
        {safeSettings.ticket_footer && <p>{safeSettings.ticket_footer}</p>}
        <p className="mt-2">¡Gracias por su preferencia!</p>
      </div>
    </div>
  );
}