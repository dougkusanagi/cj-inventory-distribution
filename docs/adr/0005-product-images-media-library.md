# ADR 0005 — Imagens de produto em coleção de mídia

## Status

Accepted

## Contexto

O cadastro precisava aceitar mais de uma foto por produto e carregar imagens
menores nas listagens. Um caminho único em products.image_path não representa
essa coleção nem permite conversões reutilizáveis.

## Decisão

As imagens do produto serão armazenadas na coleção product-images da Spatie
Media Library, no disco público, com limite de cinco itens. Cada imagem terá
uma conversão síncrona thumb em WebP para uso nas listas.

O formulário envia novas imagens em images[] e os IDs removidos em
remove_media_ids[]. A imagem original permanece disponível para o formulário
e a conversão é usada quando a velocidade de carregamento for prioritária.

## Consequências

Vantagens:

- suporta até cinco imagens por produto;
- centraliza arquivos, conversões e exclusão no ciclo de vida da mídia;
- reduz o peso das imagens exibidas na listagem;
- permite adicionar outras conversões sem alterar o schema de produtos.

Custo:

- adiciona a tabela e a infraestrutura de mídia da biblioteca;
- exige que as conversões sejam regeneradas se a definição de thumb mudar.
