import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TicketReceipt({ cart = [], customer, total = 0, subtotal = 0, tax = 0, settings = {}, cashierName, ticketId, ticketNumber, date, pointsRedeemed = 0, pointsDiscount = 0, discount = 0, customerPointsBalanceAfter, pointsEarned = 0 }) {
  const displayDate = date ? new Date(date).toLocaleString() : new Date().toLocaleString();
  const safeSettings = settings || {};

  console.log('[TicketReceipt] Props:', {
    subtotal,
    tax,
    total,
    discount,
    pointsRedeemed,
    pointsDiscount,
    customerPointsBalanceAfter,
    pointsEarned
  });

  return (
    <div className="overflow-x-auto w-full">
      <div id="printable-ticket" className="bg-white p-4 text-sm font-mono w-80 mx-auto border border-gray-200 shadow-sm min-w-[320px]">
      <div className="text-center mb-4">
        {safeSettings.business_logo_url && (
          <img src={safeSettings.business_logo_url} alt="Logo" className="h-12 mx-auto mb-2" />
        )}
        <h2 className="font-bold text-lg">{safeSettings.store_name || 'Bursglove POS'}</h2>
        <p>{safeSettings.business_address}</p>
        <p>{safeSettings.business_phone}</p>
      </div>

      <div className="mb-4 border-b pb-2">
        <p>Ticket: #{ticketNumber || ticketId?.slice(0, 8)}</p>
        <p>Fecha: {displayDate}</p>
        <p>Atendido por: {cashierName || 'Cajero'}</p>
        {customer && (
          <div className="mt-1 pt-1 border-t border-dashed">
            <p className="font-semibold">Cliente: {customer.full_name}</p>
            {pointsRedeemed > 0 ? (
              <p className="text-purple-600">
                Puntos Restantes: {customerPointsBalanceAfter !== undefined ? customerPointsBalanceAfter : (customer.points_balance - pointsRedeemed)} pts
              </p>
            ) : (
              <>
                {pointsEarned > 0 && (
                  <p className="text-green-600">
                    Puntos Ganados: +{pointsEarned} pts
                  </p>
                )}
                {(customer.points_balance !== undefined || customerPointsBalanceAfter !== undefined) && (
                  <p className="text-blue-600">
                    Balance de Puntos: {customerPointsBalanceAfter !== undefined ? customerPointsBalanceAfter : customer.points_balance} pts
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="font-bold mb-2">{safeSettings.ticket_header}</p>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="pb-1">Cant</th>
              <th className="pb-1">Prod</th>
              <th className="pb-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {cart && cart.map((item, i) => {
              const itemTotal = (item.price * item.quantity) * (1 - (item.discount || 0) / 100);
              return (
                <tr key={i} className="border-b border-dashed">
                  <td className="py-1 align-top">{item.quantity}</td>
                  <td className="py-1 align-top">
                    {item.name}
                    {item.discount > 0 && <div className="text-xs text-gray-500">Desc: {item.discount}%</div>}
                  </td>
                  <td className="py-1 align-top text-right">${itemTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-4 border-t pt-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal (sin IVA):</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Descuento:</span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}
        {pointsDiscount > 0 && (
          <div className="flex justify-between text-purple-600">
            <span>Puntos Usados ({pointsRedeemed}):</span>
            <span>-${pointsDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>IVA ({safeSettings.vat_rate || 0}%):</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg mt-1 pt-1 border-t">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center text-xs mt-6">
        <p>{safeSettings.ticket_footer}</p>
        <p className="mt-2">¡Gracias por su preferencia!</p>
      </div>
      </div>
    </div>
  );
}