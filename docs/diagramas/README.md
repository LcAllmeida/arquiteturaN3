# Diagramas da solução

Os diagramas estão em Mermaid, que o GitHub desenha direto na página. Eles seguem as Figuras 1 a 4 do trabalho teórico, aplicadas à loja virtual de pedidos da seção 6.2.

1. [Cliente-servidor](#1-cliente-servidor)
2. [Camadas lógicas e níveis físicos](#2-camadas-lógicas-e-níveis-físicos)
3. [Sequência: finalizar a compra](#3-sequência-finalizar-a-compra-post-apipedidos)
4. [Classes: Repository e injeção de dependência](#4-classes-repository-e-injeção-de-dependência)
5. [Estrutura de pastas por camada](#5-estrutura-de-pastas-por-camada)

## 1. Cliente-servidor

Dois clientes diferentes falam com o mesmo servidor, pelo mesmo contrato (API REST sobre HTTP). Os dois reutilizam as mesmas regras de negócio, que ficam no servidor.

```mermaid
flowchart LR
    subgraph Clientes
        W["Cliente web<br/>(navegador)<br/>clientes/web"]
        T["Cliente de terminal<br/>(Node CLI)<br/>clientes/terminal"]
    end
    S["Servidor da loja<br/>API REST /api/*<br/>servidor/src"]
    W -- "requisição HTTP + JSON" --> S
    S -. "resposta HTTP + JSON" .-> W
    T -- "requisição HTTP + JSON" --> S
    S -. "resposta HTTP + JSON" .-> T
```

## 2. Camadas lógicas e níveis físicos

As caixas internas são **camadas** (organização do código). Os blocos externos são **níveis** (onde cada parte executa). A dependência entre camadas desce em um só sentido.

```mermaid
flowchart LR
    subgraph N1["Nível 1: cliente"]
        C["Navegador ou terminal"]
    end
    subgraph N2["Nível 2: servidor de aplicação (Node.js)"]
        direction TB
        A["Camada de apresentação<br/>rotas, PedidoController, ProdutoController, DTO, views"]
        B["Camada de negócio<br/>PedidoService, ProdutoService, Pedido, Produto"]
        D["Camada de acesso a dados<br/>PedidoRepositorySqlite, ProdutoRepositorySqlite, TransacaoSqlite"]
        A --> B --> D
    end
    subgraph N3["Nível 3: dados"]
        DB[("SQLite<br/>dados/loja.db")]
    end
    C <-- "HTTP" --> A
    D <-- "SQL" --> DB
```

## 3. Sequência: finalizar a compra (`POST /api/pedidos`)

Mesmo fluxo da Figura 3 do trabalho, com os passos de 1 a 8. Cada camada faz só a parte que lhe cabe.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant CL as Cliente (web ou terminal)
    participant CT as PedidoController
    participant SV as PedidoService
    participant PR as ProdutoRepository
    participant RP as PedidoRepository
    participant DB as SQLite

    U->>CL: itens do carrinho + nome
    CL->>CT: 1: POST /api/pedidos (JSON)
    CT->>CT: valida o formato e cria o DTO
    CT->>SV: 2: criar(pedido)
    SV->>DB: BEGIN (início da transação)
    loop cada item
        SV->>PR: buscarPorId(produtoId)
        SV->>SV: confere o estoque
        SV->>PR: atualizarEstoque(produto)
    end
    SV->>SV: calcula o total e aplica o desconto
    SV->>RP: 3: salvar(pedido)
    RP->>DB: 4: INSERT pedido e itens
    DB-->>RP: 5: confirmação
    SV->>DB: COMMIT
    RP-->>SV: 6: pedido salvo
    SV-->>CT: 7: resultado
    CT-->>CL: 8: 201 Created + número do pedido
    CL-->>U: "Pedido nº N confirmado"

    Note over SV,DB: Se faltar estoque ou algo falhar, o serviço faz ROLLBACK: nenhuma baixa de estoque fica gravada, e o cliente recebe 409 com a mensagem e o campo.
```

## 4. Classes: Repository e injeção de dependência

Mesma ideia da Figura 4 do trabalho. `PedidoService` depende só das abstrações (`PedidoRepository`, `ProdutoRepository` e `Transacao`), que ficam na camada de negócio. As implementações ficam na camada de dados. O `container` é o único ponto que escolhe as classes concretas e as injeta pelo construtor.

```mermaid
classDiagram
    direction LR
    class PedidoController {
        -pedidoService
        +listar()
        +buscar()
        +criar()
        +cancelar()
        +resumo()
    }
    class PedidoService {
        -pedidoRepository
        -produtoRepository
        -transacao
        +criar(dto) Pedido
        +cancelar(id) Pedido
        +resumo()
    }
    class PedidoRepository {
        <<interface>>
        +listar()
        +buscarPorId(id)
        +salvar(pedido)
        +atualizarStatus(pedido)
    }
    class ProdutoRepository {
        <<interface>>
        +listar()
        +buscarPorId(id)
        +atualizarEstoque(produto)
    }
    class Transacao {
        <<interface>>
        +executar(funcao)
    }
    class PedidoRepositorySqlite
    class ProdutoRepositorySqlite
    class TransacaoSqlite
    class Pedido {
        +cliente
        +itens
        +descontoCentavos
        +status
        +criar(cliente, itens)$
        +cancelar()
    }
    class Produto {
        +nome
        +precoCentavos
        +estoque
        +baixarEstoque(qtd)
        +devolverEstoque(qtd)
    }
    class container {
        +criarContainer(banco)
    }

    PedidoController --> PedidoService : usa
    PedidoService --> PedidoRepository : usa
    PedidoService --> ProdutoRepository : usa
    PedidoService --> Transacao : usa
    PedidoService ..> Pedido : cria
    PedidoService ..> Produto : altera estoque
    PedidoRepositorySqlite ..|> PedidoRepository : implementa
    ProdutoRepositorySqlite ..|> ProdutoRepository : implementa
    TransacaoSqlite ..|> Transacao : implementa
    container ..> PedidoRepositorySqlite : instancia
    container ..> PedidoService : injeta dependências
    container ..> PedidoController : injeta serviço
```

As versões em memória (`PedidoRepositoryMemoria`, `ProdutoRepositoryMemoria`, `TransacaoMemoria`, em `dados/memoria.js`) implementam os mesmos três contratos. Elas são usadas nos testes e com `DB=memoria`.

## 5. Estrutura de pastas por camada

```mermaid
flowchart TB
    R["servidor/src"] --> AP["apresentacao/<br/>app.js · PedidoController.js · ProdutoController.js · pedidoDTO.js · views.js"]
    R --> NG["negocio/<br/>Pedido.js · Produto.js · PedidoService.js · ProdutoService.js · contratos.js · erros.js"]
    R --> DA["dados/<br/>banco.js · PedidoRepositorySqlite.js · ProdutoRepositorySqlite.js · TransacaoSqlite.js · memoria.js · catalogoInicial.js"]
    R --> CO["container.js (injeção de dependência)"]
    R --> SE["servidor.js (ponto de entrada)"]
```
