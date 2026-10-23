<!-- cspell:disable -->

# Documentação e identidade da v3

> **Estado:** implementado (na branch `docs/v3-identity-and-docs`). **Alvo:** antes de divulgar a v3 às equipas que usam a v2.

## Contexto

A v2 está em produção em vários projetos e tem tido boa adesão das equipas. A v3 muda a forma de declarar flows, e o sucesso dela
depende de três coisas:

1. **Quem já usa a v2** perceber depressa o que ganha, o que fica igual e quanto custa migrar.
2. **Quem chega de novo** perceber o modelo (ecrãs, ações, flows) e ter algo a funcionar em minutos.
3. **Quem avalia a lib** (tech leads, arquitetos) ver logo que é um projeto cuidado: identidade, documentação, exemplos, qualidade.

Hoje o site já tem os guias, a migração, a demo e a referência, mas fala pouco com o primeiro público, e o projeto não tem identidade
visual: não tem logótipo, nem favicon, e o README é texto corrido.

## Públicos e o que cada um procura

| Público                     | Pergunta                                         | Onde responde                                                  |
| --------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Equipas com a v2            | Porquê migrar? Quanto custa? Posso fazê-lo aos poucos? | "Why v3", guia de migração com checklist e FAQ, README    |
| Devs novos                  | Como começo? Qual é o modelo mental?             | Quick start, página de conceitos, receitas                     |
| Quem avalia                 | É sério? Está testado? Escala?                   | Página inicial, README (badges), demo, números de qualidade    |

## A. Identidade visual

**Conceito:** um flow como mapa de linhas, a mesma linguagem visual da demo e do diagrama. Estações (passos) ligadas por uma linha que
se divide num ramo (um `branch`), na cor de destaque laranja (`#d9480f`), com as cores secundárias das outras linhas (azul e violeta).
Diz "navegação como mapa" sem precisar de texto.

Entregáveis:

- `logo.svg`: o símbolo e a variante com o nome (wordmark), legíveis em fundo claro e escuro.
- `favicon.svg`, `favicon.ico` e `apple-touch-icon.png`: o símbolo simplificado, legível a 16 px.
- `og-image.png` (1200 × 630): a imagem para partilha (link no Slack, Teams, redes), gerada a partir de um SVG com o Playwright, para
  ser reproduzível.
- Tudo em `website/public/brand/` e reutilizado pelo site, pelo README e pelo Storybook.

Restrições: SVG feito à mão (sem dependências), sem texto convertido em paths no símbolo, com contraste AA nos dois temas.

## B. README

O README passa a ser uma montra curta que encaminha para o site, e não uma segunda documentação:

1. Logótipo, tagline e badges: versão no npm (`latest` e `alpha`), CI da v3, licença e link para a documentação.
2. Uma caixa **"Coming from v2?"** logo no topo: três linhas sobre o que ganha, um link para "Why v3" e outro para a migração.
3. Um exemplo de 30 segundos: um ecrã, um flow, o Provider.
4. Uma imagem da demo (o mapa dos flows ao lado da loja), gerada com o Playwright a partir da demo real.
5. As funcionalidades, cada uma numa frase com link para o guia respetivo.
6. Instalação, links (docs, demo, Storybook, changelog) e contribuição.

O README atual (quick start completo, eventos, URLs, testes) passa para o site, para não haver dois sítios a manter.

## C. Site

### Página inicial
- O logótipo no hero e a imagem da demo.
- Um bloco "Using v2?", com os três ganhos principais e os links para "Why v3" e para a migração.
- Uma faixa de confiança, com números verificáveis: a paridade com a v2 (cenários), os browsers testados, o tempo de type-check com
  1000 ecrãs, e o pacote testado como pacote.

### "Why v3" (nova)
Para as equipas com a v2, com o antes e depois de cada ponto, a partir da revisão do código da v2:

| Na v2                                                        | Na v3                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Configuração de screens e flows separada, tipos com `any`    | Um ficheiro por ecrã e por flow, tipos de ponta a ponta       |
| Navegação em funções (`navigateTo`) que nenhuma ferramenta lê | Navegação como dados: diagrama, validação, testes gerados    |
| Listeners com eventos de ordem variável                       | Contrato de eventos estável, adaptadores de analytics         |
| URL só com `replaceState`: o back do browser não navega       | O back e o forward do browser funcionam, com deep links       |
| Testar flows exige render                                    | Engine sem DOM: testes em Node, em milissegundos              |

Inclui também: o que fica igual (o modelo e as regras de histórico), o custo estimado de migração por flow, e os riscos (alpha, lacunas
conhecidas).

### Guia de migração
- Uma **checklist** por flow (ecrãs, flow, transições, Provider, listeners, check no CI).
- Uma **FAQ**:
  - Posso ter a v2 e a v3 na mesma app?
  - Quanto tempo leva um flow?
  - E o `keepPreviousMounted`?
  - E os templates com `StepRender`?
  - E o `LoggerHelper`?
- Uma nota sobre um possível codemod no futuro: só a nota, sem prometer.

### Conceitos (nova)
O modelo mental num diagrama SVG: ecrã → ação → flow → engine → eventos → adaptadores (URL, scroll, analytics) e Provider. É a página
que se lê antes dos guias.

### Receitas (nova secção)
- Login a meio de um flow (`goto` e `goto.exit()`).
- Wizard com rascunho guardado (`effect` e `useFlowEvents`).
- Analytics com consentimento (RGPD).
- Next.js App Router (`'use client'`, SSR).
- Lista → detalhe sem perder o estado (`keepPreviousMounted`).
- Deep link para o meio de um flow, com histórico (`initial.history`, `entrypoint`).
- Testar um flow em Vitest (o que existe hoje e o que vem no RFC 04).

### Em todos os guias
- Uma caixa **"v2 equivalent"** onde se aplica, para quem vem da v2 se orientar.
- A meta description e a og-image por página.

## D. Storybook
- O tema com a marca: o `brandTitle`, o `brandImage` (logótipo), as cores e o link para o site.
- O favicon.
- Na página Introduction, os links para a documentação e para a migração.

## E. Qualidade da documentação (no CI)
- **Links:** percorrer o `website/dist` e falhar quando há links internos partidos (o mesmo crawler usado na verificação manual).
- **Ortografia:** cspell em inglês no conteúdo do site.
- **Exemplos de código:** os excertos do quick start, das receitas e do README, que hoje não são verificados. Passam a vir de ficheiros
  `.ts` reais compilados com os tipos da lib, ou a ser verificados por um teste que os extrai. Assim um exemplo nunca fica com uma
  API desatualizada.

## Ordem de execução

| Passo | Entrega                                                            | Critério de aceitação                                            |
| ----- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 1     | Identidade (logótipo, favicon, og-image)                           | Legível a 16 px e nos dois temas; aprovada por ti antes do resto  |
| 2     | README                                                             | Curto, com a caixa para a v2, badges e a imagem da demo          |
| 3     | Site: página inicial, "Why v3", conceitos                          | Quem vem da v2 chega à migração num clique a partir do topo      |
| 4     | Site: migração (checklist e FAQ) e receitas                        | Uma receita por caso listado, com código que compila             |
| 5     | Storybook com a marca                                              | O logótipo e os links para o site no Storybook                   |
| 6     | Qualidade no CI (links, ortografia, exemplos)                      | O CI falha com um link partido ou um exemplo que não compila     |

O passo 1 precede tudo: a identidade é validada contigo antes de ser usada no resto.

## Decisões para validar

| Decisão                        | Proposta                                                  | Alternativa                                     |
| ------------------------------ | --------------------------------------------------------- | ----------------------------------------------- |
| Conceito do logótipo           | Mapa de linhas com um ramo (a linguagem da demo)          | Monograma "rfa", ou setas de navegação          |
| Imagem no README               | Imagem estática da demo                                   | GIF animado (mais pesado, mais apelativo)       |
| README                         | Montra curta que encaminha para o site                    | Manter o README completo                        |
| Exemplos de código verificados | Ficheiros `.ts` reais incluídos nas páginas               | Teste que extrai os blocos de código do Markdown |

## Fora do âmbito
- Traduções (o site fica em inglês, como decidido).
- Domínio próprio (fica `react-flow-app-pr.vercel.app` até haver um).
- Codemod v2 → v3 (só mencionado na FAQ).
- Versões da documentação por release (fazem sentido na versão estável, com a v2 e a v3 lado a lado).
