(() => {
  const cfg = window.APP_CONFIG || { assetsBase: 'assets', rootBase: './', current: { bookSlug: null, chapter: null } };
  const state = { books: [], bySlug: {} };

  const $ = (sel) => document.querySelector(sel);
  const bookSelect = () => $('#bookSelect');
  const chapterSelect = () => $('#chapterSelect');
  const chaptersBadge = () => $('#chaptersCountBadge');
  const goBtn = () => $('#goBtn');

  function setChaptersOptions(total, selected) {
    const sel = chapterSelect();
    sel.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      if (selected && Number(selected) === i) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function updateBadge(total) {
    const badge = chaptersBadge();
    if (!badge) return;
    badge.textContent = `Capítulos: ${total}`;
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function navigateToSelected() {
    const b = bookSelect().value;
    const c = chapterSelect().value;
    if (!b || !c) return;
    const href = `${cfg.rootBase}${b}/${c}.html`;
    window.location.href = href;
  }

  // ============ Translator (selection → quick lookup) ============
  function createTranslatorPanel() {
    if (document.getElementById('translatorPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'translatorPanel';
    panel.className = 'translator-panel bg-white border border-gray-200 rounded-lg shadow-lg';
    panel.innerHTML = `
      <div class="p-3">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-sm">Palavra selecionada: <span id="selWord" class="text-blue-600"></span></div>
          <button type="button" data-close class="inline-flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:bg-gray-100" aria-label="Fechar">&times;</button>
        </div>
        <div class="mt-2 text-sm text-gray-500">Tradução automática pode conter imprecisões.</div>
        <div id="transResult" class="mt-2 text-sm"></div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button id="quickTranslateBtn" class="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Traduzir (la → pt-BR)</button>
          <a target="_blank" id="googleLink" class="px-3 py-1.5 text-sm rounded border text-gray-700 hover:bg-gray-50">Google</a>
          <a target="_blank" id="wiktionaryLink" class="px-3 py-1.5 text-sm rounded border text-gray-700 hover:bg-gray-50">Wiktionary</a>
          <a target="_blank" id="logeionLink" class="px-3 py-1.5 text-sm rounded border text-gray-700 hover:bg-gray-50">Logeion</a>
          <a target="_blank" id="perseusLink" class="px-3 py-1.5 text-sm rounded border text-gray-700 hover:bg-gray-50">Perseus</a>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function normalizeWord(text) {
    if (!text) return '';
    let t = String(text).trim();
    // Remove leading/trailing punctuation
    t = t.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
    return t;
  }

  function openTranslator(word) {
    const panel = document.getElementById('translatorPanel');
    if (!panel) return;
    const w = normalizeWord(word);
    if (!w) return;
    panel.style.display = 'block';
    panel.querySelector('#selWord').textContent = w;
    panel.querySelector('#transResult').textContent = '';
    // External links
    panel.querySelector('#googleLink').href = `https://translate.google.com/?sl=la&tl=pt&text=${encodeURIComponent(w)}&op=translate`;
    panel.querySelector('#wiktionaryLink').href = `https://la.wiktionary.org/wiki/${encodeURIComponent(w)}`;
    panel.querySelector('#logeionLink').href = `https://logeion.uchicago.edu/${encodeURIComponent(w)}`;
    panel.querySelector('#perseusLink').href = `https://www.perseus.tufts.edu/hopper/morph?l=${encodeURIComponent(w)}&la=la`;

    // Bind actions
    const closeBtn = panel.querySelector('[data-close]');
    if (closeBtn) closeBtn.onclick = () => { panel.style.display = 'none'; };
    const qt = panel.querySelector('#quickTranslateBtn');
    qt.onclick = async () => {
      const target = panel.querySelector('#transResult');
      target.innerHTML = '<span class="text-gray-500">Traduzindo...</span>';
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=la|pt-BR`;
        const res = await fetch(url);
        const data = await res.json();
        const out = data?.responseData?.translatedText || '';
        if (out) target.textContent = out;
        else target.innerHTML = '<span class="text-red-600">Sem resultado.</span>';
      } catch (e) {
        target.innerHTML = '<span class="text-red-600">Falha ao traduzir.</span>';
      }
    };
  }

  function initTranslator() {
    createTranslatorPanel();
    const container = document.querySelector('main') || document;
    // Helpers to check if selection is inside verse content
    const isNodeInVerse = (node) => {
      if (!node) return false;
      const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!el) return false;
      return (
        el.classList?.contains('verse-text') ||
        el.classList?.contains('verse') ||
        el.closest?.('.verse') ||
        el.closest?.('.verse-text')
      );
    };
    const getSelectedWord = () => {
      const sel = window.getSelection && window.getSelection();
      if (!sel) return '';
      const text = String(sel.toString() || '');
      return normalizeWord(text);
    };
    let lastWord = '';
    const maybeOpenFromSelection = (eTarget) => {
      const w = getSelectedWord();
      if (!w || w === lastWord) return;
      const sel = window.getSelection();
      const anchor = sel && (sel.anchorNode || sel.focusNode);
      if (!isNodeInVerse(eTarget || anchor)) return;
      if (document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
      lastWord = w;
      openTranslator(w);
    };

    // Open on mouse selection inside content (desktop)
    container.addEventListener('mouseup', (e) => {
      maybeOpenFromSelection(e.target);
    });
    // Open on touch selection end (mobile)
    container.addEventListener('touchend', (e) => {
      // slight delay to ensure selection is updated by the browser
      setTimeout(() => maybeOpenFromSelection(e.target), 0);
    }, { passive: true });
    // Also react to selection changes (covers long-press selections on iOS/Android)
    document.addEventListener('selectionchange', () => {
      // throttle redundant openings by checking if selection actually changed
      maybeOpenFromSelection();
    });
    // Also open on double-click inside verses
    document.addEventListener('dblclick', (e) => {
      const target = e.target;
      if (!(target && (target.classList?.contains('verse-text') || target.classList?.contains('verse') || target.closest?.('.verse-text')))) return;
      const sel = window.getSelection();
      const text = sel ? String(sel.toString()) : '';
      const w = normalizeWord(text);
      if (w) openTranslator(w);
    });
  }

  async function init() {
    try {
      const res = await fetch(`${cfg.assetsBase}/books.json`, { cache: 'no-cache' });
      state.books = await res.json();
      state.bySlug = Object.fromEntries(state.books.map(b => [b.slug, b]));

      // Populate books select
      const bSel = bookSelect();
      bSel.innerHTML = '';
      state.books.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.slug;
        opt.textContent = b.name;
        if (cfg.current && cfg.current.bookSlug === b.slug) opt.selected = true;
        bSel.appendChild(opt);
      });

      // Set chapters select
      const currentSlug = bSel.value || (state.books[0] ? state.books[0].slug : null);
      const total = currentSlug && state.bySlug[currentSlug] ? state.bySlug[currentSlug].chapters : 0;
      setChaptersOptions(total, cfg.current && cfg.current.chapter ? Number(cfg.current.chapter) : 1);
      updateBadge(total);

      // Events
      bSel.addEventListener('change', () => {
        const slug = bSel.value;
        const t = state.bySlug[slug]?.chapters || 0;
        setChaptersOptions(t, 1);
        updateBadge(t);
      });
      chapterSelect().addEventListener('change', () => {
        // On chapter change, just prepare selection; navigation via button.
      });
      // Enable/disable Go button
      const updateGoState = () => {
        const b = bSel.value;
        const c = chapterSelect().value;
        const enabled = Boolean(b && c);
        const btn = goBtn();
        btn.disabled = !enabled;
      };
      bSel.addEventListener('change', updateGoState);
      chapterSelect().addEventListener('change', updateGoState);
      updateGoState();
      goBtn().addEventListener('click', navigateToSelected);
      // Init translator after UI is ready
      initTranslator();
    } catch (err) {
      console.error('Erro ao carregar índice de livros:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  // Tailwind navbar toggler with outside-click/escape support
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('navbarToggle');
    const menu = document.getElementById('navbarMenu');
    const navRoot = document.querySelector('nav[data-nav-root]');
    if (!toggle || !menu || !navRoot) return;

    const closeMenu = () => {
      if (!menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      }
    };
    const openMenu = () => {
      if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
      }
    };
    const toggleMenu = () => {
      if (menu.classList.contains('hidden')) openMenu();
      else closeMenu();
    };

    toggle.addEventListener('click', toggleMenu);

    // Close on outside click (only on small screens)
    document.addEventListener('click', (e) => {
      if (window.innerWidth >= 1024) return; // lg breakpoint
      if (!navRoot.contains(e.target)) closeMenu();
    });
    // Close with Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    // Keep state consistent on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        menu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Initial state (hidden on small, visible on lg)
    if (window.innerWidth >= 1024) {
      menu.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      menu.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
