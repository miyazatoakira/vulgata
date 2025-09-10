Vulgata Latina — Site estático (Tailwind CSS)

Sobre
- Um capítulo por página com todos os versículos.
- Cabeçalho com seleção de livro e capítulo (dropdowns).
- Estilo discreto, minimalista, elegante usando Tailwind CSS (CDN).
- Publicação via GitHub Pages (pasta `docs/`).

Como funciona
- Os capítulos são lidos de arquivos JSON em `data/` (um por livro).
- Um script de build gera páginas estáticas em `docs/{livro}/{capitulo}.html`.
- Um arquivo `docs/assets/books.json` é gerado com o índice de livros e total de capítulos.

Importar texto (Clementina — domínio público)
- Rode: `python3 tools/import_clementine.py`
- O script baixa o JSON da Clementine Vulgate e gera um arquivo por livro em `data/`.
- Depois, rode o build para gerar todas as páginas.

Formato dos dados
- Coloque arquivos JSON em `data/` com este formato por livro:

```
{
  "name": "Genesis",
  "slug": "genesis",
  "chapters": {
    "1": ["In principio creavit Deus caelum et terram.", "..."],
    "2": ["..."],
    "...": ["..."]
  }
}
```

Build
- Requer Python 3.8+.
- Rode: `python3 tools/build.py`
- Saída ficará em `docs/`. Abra `docs/index.html` localmente ou publique no Pages.

Publicação (GitHub Pages)
- Configure o Pages para publicar a partir da pasta `docs/` do branch principal.

Notas
- Incluímos dados de exemplo (Gênesis 1 e 2) apenas para demonstração.
- Ao adicionar mais livros, basta rodar o build novamente.
