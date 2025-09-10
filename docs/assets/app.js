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
    panel.className = 'translator-panel card shadow border-0';
    panel.innerHTML = `
      <div class="card-body p-2">
        <div class="d-flex justify-content-between align-items-center gap-2">
          <div class="fw-semibold small">Palavra selecionada: <span id="selWord" class="text-primary"></span></div>
          <button type="button" class="btn-close btn-sm" aria-label="Fechar"></button>
        </div>
        <div class="mt-2 small text-body-secondary">Tradução automática pode conter imprecisões.</div>
        <div id="transResult" class="mt-2 small"></div>
        <div class="mt-2 d-flex flex-wrap gap-2">
          <button id="quickTranslateBtn" class="btn btn-sm btn-primary">Traduzir (la → pt-BR)</button>
          <a target="_blank" id="googleLink" class="btn btn-sm btn-outline-secondary">Google</a>
          <a target="_blank" id="wiktionaryLink" class="btn btn-sm btn-outline-secondary">Wiktionary</a>
          <a target="_blank" id="logeionLink" class="btn btn-sm btn-outline-secondary">Logeion</a>
          <a target="_blank" id="perseusLink" class="btn btn-sm btn-outline-secondary">Perseus</a>
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
    const closeBtn = panel.querySelector('.btn-close');
    closeBtn.onclick = () => { panel.style.display = 'none'; };
    const qt = panel.querySelector('#quickTranslateBtn');
    qt.onclick = async () => {
      const target = panel.querySelector('#transResult');
      target.innerHTML = '<span class="text-muted">Traduzindo...</span>';
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=la|pt-BR`;
        const res = await fetch(url);
        const data = await res.json();
        const out = data?.responseData?.translatedText || '';
        if (out) target.textContent = out;
        else target.innerHTML = '<span class="text-danger">Sem resultado.</span>';
      } catch (e) {
        target.innerHTML = '<span class="text-danger">Falha ao traduzir.</span>';
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
      goBtn().addEventListener('click', navigateToSelected);
      // Init translator after UI is ready
      initTranslator();
    } catch (err) {
      console.error('Erro ao carregar índice de livros:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  // Robust navbar toggler fallback for mobile
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const toggler = document.querySelector('.navbar-toggler');
      const collapseEl = document.getElementById('navbarSupportedContent');
      if (!toggler || !collapseEl || !(window.bootstrap && window.bootstrap.Collapse)) return;
      // Use capture to run before data-api; prevent duplicate toggles
      toggler.addEventListener('click', (ev) => {
        if (window.innerWidth >= 992) return; // only care on mobile
        ev.preventDefault();
        ev.stopPropagation();
        const inst = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
        inst.toggle();
      }, true);
    } catch (_e) {
      // no-op
    }
  });
})();
