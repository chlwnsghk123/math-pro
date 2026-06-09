import { useMemo, useState } from 'react';
import Navigator from './components/Navigator.jsx';
import ProblemGrid from './components/ProblemGrid.jsx';
import Cart from './components/Cart.jsx';
import MobileCartBar from './components/MobileCartBar.jsx';
import SearchBar from './components/SearchBar.jsx';
import Toaster from './components/Toaster.jsx';
import PrintPreview from './components/PrintPreview.jsx';
import NotebookList from './components/NotebookList.jsx';
import CreateNotebookModal from './components/CreateNotebookModal.jsx';
import { IconPrint } from './components/Icons.jsx';
import {
  BOOKS,
  CATEGORIES,
  bookIdOf,
  categoriesForBook,
  getBook,
  getCategory,
  parseProblemId,
} from './data/catalog.js';
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

  // First category of a book, preferring one that actually has problems.
  const firstCategoryOf = (bookId) => {
    const cats = categoriesForBook(bookId);
    return (cats.find((c) => (counts[c.code] ?? 0) > 0) || cats[0])?.code;
  };
  const defaultBook =
    BOOKS.find((b) => categoriesForBook(b.id).some((c) => (counts[c.code] ?? 0) > 0))?.id ||
    BOOKS[0].id;

  const [book, setBook] = useState(defaultBook);
  const [tab, setTab] = useState(() => firstCategoryOf(defaultBook));

  function handleBook(id) {
    setBook(id);
    setTab(firstCategoryOf(id));
  }

  // Jump from search: switch to the problem's book + unit, then it can be added.
  function handleJump(p) {
    const b = bookIdOf(p.category);
    if (b) setBook(b);
    setTab(p.category);
  }

  const openNotebook = openNotebookId
    ? notebooks.find((nb) => nb.id === openNotebookId)
    : null;

  return (
    <div className="app-root min-h-screen bg-canvas-muted">
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
            <SearchBar onJump={handleJump} />
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
            <Navigator
              book={book}
              category={tab}
              counts={counts}
              onBook={handleBook}
              onCategory={setTab}
            />
            <div className="flex items-baseline gap-2 px-1">
              <span className="text-xs font-semibold text-slate-400">{getBook(book)?.name}</span>
              <span className="text-slate-300">·</span>
              <h2 className="text-sm font-bold text-slate-800">{getCategory(tab)?.unitName}</h2>
            </div>
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
