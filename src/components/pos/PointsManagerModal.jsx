import { X, Star } from 'lucide-react';

export default function PointsManagerModal({
  customer,
  pointsToRedeem,
  setPointsToRedeem,
  maxRedeemablePoints,
  pointsDiscountAmount,
  onClose,
  totalBeforePoints,
  settings
}) {
  const actualPointsToRedeem = Math.min(pointsToRedeem, maxRedeemablePoints);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Star size={20} className="text-purple-500" />
            Canjear Puntos
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {customer && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-bold text-purple-700 flex items-center gap-1">
                Puntos Disponibles
              </label>
              <span className="text-sm text-purple-600">
                {customer.points_balance} Pts
              </span>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-purple-700 flex items-center gap-1">
                Puntos Máx. a Canjear
              </label>
              <span className="text-sm text-purple-600">
                {maxRedeemablePoints} Pts
              </span>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Puntos a Canjear</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={maxRedeemablePoints}
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(parseInt(e.target.value) || 0)}
              className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center gap-1 bg-white border border-purple-200 rounded px-2 py-1 w-20">
              <input
                type="number"
                min="0"
                max={maxRedeemablePoints}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, maxRedeemablePoints))}
                className="w-full text-sm border-none focus:ring-0 p-0 text-right"
              />
              <span className="text-sm text-purple-400">pts</span>
            </div>
          </div>
        </div>

        {pointsDiscountAmount > 0 && (
          <div className="text-right text-lg text-purple-700 font-bold mb-4">
            Descuento por Puntos: - ${pointsDiscountAmount.toFixed(2)}
          </div>
        )}

        {actualPointsToRedeem > 0 && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded text-center">
            ⚠️ Al canjear puntos, esta venta no generará nuevos puntos.
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}