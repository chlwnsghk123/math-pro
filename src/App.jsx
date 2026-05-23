import { useMemo, useState } from 'react';
import Tabs from './components/Tabs.jsx';
import ProblemGrid from './components/ProblemGrid.jsx';
import Cart from './components/Cart.jsx';
import MobileCartBar from './components/MobileCartBar.jsx';
import SearchBar from './components/SearchBar.jsx';
import Toaster from './components/Toaster.jsx';
import PrintPreview from './components/PrintPreview.jsx';
import NotebookList from './components/NotebookList.jsx';
import CreateNotebookModal from './components/CreateNotebookModal.jsx';
import { IconPrint } from './components/Icons.jsx';
import { CATEGORIES, parseProblemId } from './config.js';
import ANSWERS from './data/answers.js';
import { useCartStore } from './store/cartStore.js';
import { useNotebookStore } from './store/notebookStore.js';

export default function App() {
  const cartCount = useCartStore((s) => s.items.length);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const getNotebook = useNotebookStore((s) => s.notebooks.find);

  /** UI state: which screen is overlaying the main view. */
  const [createOpen, setCreateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [openNotebookId, setOpenNotebookId] = useState(null);

  const counts = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    for (const id of Object.keys(ANSWERS)) {
      const p = parseProblemId(id);
      if (p && map[p.category] != null) map[p.category]++;
    }
    return map;
  }, []);

  const [tab, setTab] = useState(
    () => CATEGORIES.find((c) => (counts[c] ?? 0) > 0) || CATEGORIES[0],
  );

  const openNotebook = openNotebookId
    ? notebooks.find((nb) => nb.id === openNotebookId)
    : null;

  return (
    <div className="min-h-screen bg-canvas-muted">
      <Toaster />

      <header className="no-print sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white font-bold">
              M
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-bold text-slate-900">Math Pro</h1>
              <p className="text-[11px] text-slate-500">오답노트 생성기</p>
            </div>
          </div>
          <div className="hidden flex-1 max-w-md sm:block">
            <SearchBar onJump={(p) => setTab(p.category)} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="btn-ghost !px-3 !py-1.5 text-xs sm:!px-4 sm:!py-2 sm:text-sm"
            >
              <IconPrint className="h-4 w-4" />
              <span className="hidden sm:inline">내 오답노트</span>
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                {notebooks.length}
              </span>
            </button>
            <div className="hidden text-xs text-slate-500 lg:block">
              담은 문제 <span className="font-semibold text-slate-900">{cartCount}</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 sm:hidden">
          <SearchBar onJump={(p) => setTab(p.category)} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 pb-28 sm:px-6 lg:pb-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Problem section */}
          <section className="flex flex-col gap-4">
            <Tabs active={tab} onChange={setTab} counts={counts} />
            <ProblemGrid category={tab} />
          </section>

          {/* Desktop cart sidebar */}
          <div className="no-print hidden lg:block">
            <div className="sticky top-[88px] h-[calc(100vh-104px)]">
              <Cart onCreate={() => setCreateOpen(true)} className="h-full" />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom cart bar */}
      <MobileCartBar onCreate={() => setCreateOpen(true)} />

      <CreateNotebookModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setListOpen(true);
          setOpenNotebookId(id);
        }}
      />

      {listOpen && (
        <NotebookList
          onClose={() => setListOpen(false)}
          onOpen={(id) => setOpenNotebookId(id)}
        />
      )}

      {openNotebook && (
        <PrintPreview
          notebook={openNotebook}
          onClose={() => setOpenNotebookId(null)}
        />
      )}
    </div>
  );
}
