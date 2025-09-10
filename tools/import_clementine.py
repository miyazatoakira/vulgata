#!/usr/bin/env python3
import json
import re
import sys
import unicodedata
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'

URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/la/VulgClementine/VulgClementine.json'


def slugify(s: str) -> str:
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s or 'book'


def fetch_json(url: str) -> dict:
    with urlopen(url) as resp:
        data = resp.read()
    return json.loads(data)


def convert_and_write(db: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    books = db.get('books', [])
    written = 0
    for b in books:
        name = b.get('name')
        chapters = b.get('chapters', [])
        if not name or not chapters:
            continue
        slug = slugify(name)
        out = {
            'name': name,
            'slug': slug,
            'chapters': {}
        }
        for ch in chapters:
            num = ch.get('chapter')
            verses = ch.get('verses', [])
            if not num or not verses:
                continue
            out['chapters'][str(int(num))] = [v.get('text', '').strip() for v in verses]
        # Ignore books without verses
        if not out['chapters']:
            continue
        path = DATA_DIR / f'{slug}.json'
        path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
        written += 1
    print(f'Escrito(s) {written} arquivo(s) em {DATA_DIR}')


def main(argv: list[str]) -> int:
    print('Baixando Clementine Vulgate JSON...')
    db = fetch_json(URL)
    print('Convertendo e escrevendo por livro...')
    convert_and_write(db)
    print('Concluído.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))

