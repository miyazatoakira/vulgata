#!/usr/bin/env python3
import json
import os
from pathlib import Path
from typing import Dict, Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
DOCS_DIR = ROOT / 'docs'
ASSETS_DIR = DOCS_DIR / 'assets'
TEMPLATE_FILE = ROOT / 'src' / 'template.html'


CANON_LATIN = [
    # Pentateuch
    ("Genesis", "genesis"),
    ("Exodus", "exodus"),
    ("Leviticus", "leviticus"),
    ("Numeri", "numbers"),
    ("Deuteronomium", "deuteronomy"),
    # Historical
    ("Iosue", "joshua"),
    ("Iudices", "judges"),
    ("Ruth", "ruth"),
    ("I Regum", "i-samuel"),
    ("II Regum", "ii-samuel"),
    ("III Regum", "i-kings"),
    ("IV Regum", "ii-kings"),
    ("I Paralipomenon", "i-chronicles"),
    ("II Paralipomenon", "ii-chronicles"),
    ("Esdrae I", "ezra"),
    ("Esdrae II (Nehemias)", "nehemiah"),
    ("Tobias", "tobit"),
    ("Iudith", "judith"),
    ("Esther", "esther"),
    ("I Machabaeorum", "i-maccabees"),
    ("II Machabaeorum", "ii-maccabees"),
    # Wisdom
    ("Iob", "job"),
    ("Psalmi", "psalms"),
    ("Proverbia", "proverbs"),
    ("Ecclesiastes", "ecclesiastes"),
    ("Canticum Canticorum", "song-of-solomon"),
    ("Sapientia", "wisdom"),
    ("Ecclesiasticus (Sirach)", "sirach"),
    # Prophets
    ("Isaias", "isaiah"),
    ("Ieremias", "jeremiah"),
    ("Lamentationes", "lamentations"),
    ("Baruch", "baruch"),
    ("Ezechiel", "ezekiel"),
    ("Daniel", "daniel"),
    ("Osee", "hosea"),
    ("Ioel", "joel"),
    ("Amos", "amos"),
    ("Abdias", "obadiah"),
    ("Ionas", "jonah"),
    ("Michaeas", "micah"),
    ("Nahum", "nahum"),
    ("Habacuc", "habakkuk"),
    ("Sophonias", "zephaniah"),
    ("Aggaeus", "haggai"),
    ("Zacharias", "zechariah"),
    ("Malachias", "malachi"),
    # New Testament
    ("Matthaeus", "matthew"),
    ("Marcus", "mark"),
    ("Lucas", "luke"),
    ("Ioannes", "john"),
    ("Actus Apostolorum", "acts"),
    ("Ad Romanos", "romans"),
    ("I ad Corinthios", "i-corinthians"),
    ("II ad Corinthios", "ii-corinthians"),
    ("Ad Galatas", "galatians"),
    ("Ad Ephesios", "ephesians"),
    ("Ad Philippenses", "philippians"),
    ("Ad Colossenses", "colossians"),
    ("I ad Thessalonicenses", "i-thessalonians"),
    ("II ad Thessalonicenses", "ii-thessalonians"),
    ("I ad Timotheum", "i-timothy"),
    ("II ad Timotheum", "ii-timothy"),
    ("Ad Titum", "titus"),
    ("Ad Philemonem", "philemon"),
    ("Ad Hebraeos", "hebrews"),
    ("Iacobi", "james"),
    ("I Petri", "i-peter"),
    ("II Petri", "ii-peter"),
    ("I Ioannis", "i-john"),
    ("II Ioannis", "ii-john"),
    ("III Ioannis", "iii-john"),
    ("Iudae", "jude"),
    ("Apocalypsis Ioannis", "revelation-of-john"),
]

LATIN_BY_SLUG = {slug: latin for (latin, slug) in CANON_LATIN}

def load_books() -> Dict[str, Any]:
    books = []
    by_slug = {}
    if not DATA_DIR.exists():
        return {"list": books, "by_slug": by_slug}
    for f in sorted(DATA_DIR.glob('*.json')):
        with f.open('r', encoding='utf-8') as fh:
            try:
                data = json.load(fh)
            except Exception as e:
                raise RuntimeError(f"Erro lendo {f}: {e}")
        name = data.get('name')
        slug = data.get('slug')
        chapters = data.get('chapters', {})
        if not name or not slug or not isinstance(chapters, dict):
            raise ValueError(f"Arquivo inválido: {f}")
        total = len(chapters.keys())
        # Use Latin name if present in canonical map
        display_name = LATIN_BY_SLUG.get(slug, name)
        meta = {"name": display_name, "slug": slug, "chapters": total}
        books.append(meta)
        by_slug[slug] = {**meta, "data": chapters}
    return {"list": books, "by_slug": by_slug}


def ensure_dirs():
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)


def read_template() -> str:
    with TEMPLATE_FILE.open('r', encoding='utf-8') as fh:
        return fh.read()


def render(template: str, ctx: Dict[str, Any]) -> str:
    html = template
    for k, v in ctx.items():
        html = html.replace('{{' + k + '}}', str(v))
    return html


def escape_js_str(s: str) -> str:
    return json.dumps(s)


def make_content_chapter(book_name: str, chapter_num: int, verses: list[str]) -> str:
    parts = [
        f'<h1 class="chapter-title h3 mb-4">{book_name} {chapter_num}</h1>'
    ]
    for idx, verse in enumerate(verses, start=1):
        parts.append('<div class="verse">')
        parts.append(f'  <span class="verse-num">{idx}</span><span class="verse-text">{verse}</span>')
        parts.append('</div>')
        parts.append('<hr>')
    return '\n'.join(parts)


def build():
    ensure_dirs()
    db = load_books()
    # Order books by canonical order if we have a mapping
    books_map = {b['slug']: b for b in db['list']}
    ordered = []
    seen = set()
    for latin, slug in CANON_LATIN:
        if slug in books_map:
            ordered.append(books_map[slug])
            seen.add(slug)
    # Append any extras (e.g., Laodiceans, Additional Psalm) after, in name order
    extras = [b for b in db['list'] if b['slug'] not in seen]
    extras.sort(key=lambda x: x['name'])
    books_list = ordered + extras
    by_slug = db['by_slug']

    # Write books index
    with (ASSETS_DIR / 'books.json').open('w', encoding='utf-8') as fh:
        json.dump(books_list, fh, ensure_ascii=False, indent=2)

    template = read_template()

    # Home page (index)
    home_ctx = {
        'title': 'Vulgata — Seleção',
        'assets_base': 'assets',
        'root_base': '',
        'book_slug_js': 'null',
        'chapter_js': 'null',
        'content_html': '<div class="lead">Selecione um livro e um capítulo para abrir o texto.</div>'
    }
    index_html = render(template, home_ctx)
    with (DOCS_DIR / 'index.html').open('w', encoding='utf-8') as fh:
        fh.write(index_html)

    # Generate chapter pages
    for slug, meta in by_slug.items():
        book_name = meta['name']
        chapters: Dict[str, list[str]] = meta['data']
        for ch_key in sorted(chapters.keys(), key=lambda x: int(x)):
            verses = chapters[ch_key]
            rel_assets = '../assets'
            root_base = '../'
            ctx = {
                'title': f'Vulgata — {book_name} {ch_key}',
                'assets_base': rel_assets,
                'root_base': root_base,
                'book_slug_js': escape_js_str(slug),
                'chapter_js': int(ch_key),
                'content_html': make_content_chapter(book_name, int(ch_key), verses)
            }
            out_dir = DOCS_DIR / slug
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file = out_dir / f'{ch_key}.html'
            out_file.write_text(render(template, ctx), encoding='utf-8')

    print(f"Gerado com sucesso em {DOCS_DIR}")


if __name__ == '__main__':
    build()
