import { useEffect, useState } from 'react';
import { useCartStore } from '../store/cartStore.js';
import Cart from './Cart.jsx';
import { IconCart, IconChevronDown } from './Icons.jsx';

export default function MobileCartBar({ onPreview }) {
  const count = useCartStore((s) => s.items.length);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-white shadow-soft active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <IconCart className="h-5 w-5" />
            <span className="text-sm font-semibold">장바구니</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
              {count}
            </span>
          </span>
          <span className="text-xs font-medium opacity-90">열기</span>
        </button>
      </div>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-card">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-slate-200"
              aria-label="바텀시트 닫기"
            />
            <div className="flex-1 overflow-hidden p-2">
              <Cart
                variant="sheet"
                className="!shadow-none !ring-0"
                onPreview={() => {
                  setOpen(false);
                  onPreview?.();
                }}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
