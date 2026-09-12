'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Algo não carregou como esperado</h1>
        <p className="text-slate-500 text-sm mt-2">
          Tente novamente. Se persistir, atualize a página ou entre novamente.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <RotateCcw size={16} />
            Tentar novamente
          </button>
          <a
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2.5"
          >
            Ir para o login
          </a>
        </div>
      </div>
    </div>
  );
}
