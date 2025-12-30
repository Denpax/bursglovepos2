import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { X } from "lucide-react";

export default function CategoryManagerModal({ onClose, storeMode }) {
  const [debug, setDebug] = useState("🟡 Montando modal...");

  useEffect(() => {
    console.log("[MobileTest] Modal montado. storeMode:", storeMode);
    setDebug("✅ Modal montado. Cargando categorías...");

    async function testFetch() {
      try {
        if (!storeMode) {
          setDebug("⚠️ storeMode indefinido: " + String(storeMode));
          return;
        }

        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .eq("store_type", storeMode)
          .limit(1);

        if (error) throw error;
        setDebug(`✅ Supabase OK (${data?.length || 0} categorías encontradas)`);
      } catch (err) {
        console.error("[MobileTest] Error:", err);
        setDebug("❌ Error: " + (err.message || JSON.stringify(err)));
      }
    }

    setTimeout(testFetch, 1000); // esperamos 1s en móviles
  }, [storeMode]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 text-center max-w-sm w-full">
        <h2 className="text-xl font-bold mb-2">Prueba de Modal</h2>
        <p className="text-gray-700 text-sm whitespace-pre-wrap">{debug}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
