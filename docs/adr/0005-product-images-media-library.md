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
remove_media_ids[]. A ordem da coleção é persistida no order_column da
biblioteca: a primeira imagem é a principal. Para atualizações, o formulário
também envia image_order[] para preservar a posição de imagens existentes e
novas. A primeira imagem é usada como principal no catálogo; a conversão thumb
é usada quando a velocidade de carregamento for prioritária.

O editor do formulário é obrigatório e normaliza o enquadramento para a
proporção 4:5. O navegador pode receber imagens maiores que 5 MB e reduz a
imagem de origem antes de abrir o editor, reduzindo o consumo de dados no
celular. O servidor mantém apenas um limite técnico de 25 MB para o arquivo
recebido e aceita JPG, PNG e WebP.

Independentemente do formato enviado, o servidor orienta, limita a imagem
principal a 1600 × 2000 px sem ampliar nem alterar o enquadramento escolhido e
salva uma versão canônica em WebP com qualidade 84. Assim, todas as fotos da
coleção têm uma qualidade e peso previsíveis, inclusive quando o upload não
vem do formulário. A conversão thumb continua em WebP 480 × 600 para listas.

## Consequências

Vantagens:

- suporta até cinco imagens por produto;
- centraliza arquivos, conversões e exclusão no ciclo de vida da mídia;
- reduz o peso das imagens exibidas na listagem;
- mantém uma imagem grande o bastante para visualização detalhada, sem guardar
  a foto original de alta resolução;
- torna o servidor a fonte de verdade para formato e dimensões das fotos;
- permite adicionar outras conversões sem alterar o schema de produtos.

Custo:

- adiciona a tabela e a infraestrutura de mídia da biblioteca;
- exige que as conversões sejam regeneradas se a definição de thumb mudar.
- requer processamento de imagem no servidor durante o upload.
