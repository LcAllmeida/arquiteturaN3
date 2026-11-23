# Diagramas da solução

Os diagramas estão em Mermaid, que o GitHub desenha direto na página. Eles seguem as Figuras 1 a 4 do trabalho teórico, aplicadas à Garagem de Veículos.

1. [Cliente-servidor](#1-cliente-servidor)
2. [Camadas lógicas e níveis físicos](#2-camadas-lógicas-e-níveis-físicos)
3. [Sequência: registrar entrada](#3-sequência-registrar-entrada-post-apiveiculos)
4. [Classes: Repository e injeção de dependência](#4-classes-repository-e-injeção-de-dependência)
5. [Estrutura de pastas por camada](#5-estrutura-de-pastas-por-camada)

## 1. Cliente-servidor

Dois clientes diferentes falam com o mesmo servidor, pelo mesmo contrato (API REST sobre HTTP). Nenhum dos dois conhece a implementação interna do servidor.

```mermaid
flowchart LR
    subgraph Clientes
        W["Cliente web<br/>(navegador)<br/>clientes/web"]
        T["Cliente de terminal<br/>(Node CLI)<br/>clientes/terminal"]
    end
    S["Servidor da garagem<br/>API REST /api/*<br/>servidor/src"]
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
        A["Camada de apresentação<br/>rotas, VeiculoController, veiculoView"]
        B["Camada de negócio<br/>VeiculoService, Veiculo, regras"]
        D["Camada de acesso a dados<br/>VeiculoRepositorySqlite"]
        A --> B --> D
    end
    subgraph N3["Nível 3: dados"]
        DB[("SQLite<br/>dados/garagem.db")]
    end
    C <-- "HTTP" --> A
    D <-- "SQL" --> DB
```

## 3. Sequência: registrar entrada (`POST /api/veiculos`)

Cada camada faz só a parte que lhe cabe: o controller traduz HTTP, o serviço aplica as regras e o repositório grava.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant CL as Cliente (web ou CLI)
    participant CT as VeiculoController
    participant SV as VeiculoService
    participant RP as VeiculoRepositorySqlite
    participant DB as SQLite

    U->>CL: placa, modelo, cor
    CL->>CT: 1: POST /api/veiculos (JSON)
    CT->>SV: 2: registrarEntrada(dados)
    SV->>SV: valida placa, vaga livre, placa repetida
    SV->>RP: 3: salvar(veiculo)
    RP->>DB: 4: INSERT INTO veiculos
    DB-->>RP: 5: id gerado
    RP-->>SV: 6: veículo salvo
    SV-->>CT: 7: veículo
    CT-->>CL: 8: 201 Created + veiculoView(JSON)
    CL-->>U: "Entrada registrada"

    Note over SV,CT: Se uma regra falhar, o serviço lança ErroValidacao (400) ou ErroRegraNegocio (409), e o controller devolve a mensagem.
```

## 4. Classes: Repository e injeção de dependência

`VeiculoService` depende só da abstração `VeiculoRepository`, que fica na camada de negócio. As duas implementações ficam na camada de dados. O `container` é o único ponto que escolhe a classe concreta e a injeta pelo construtor.

```mermaid
classDiagram
    direction LR
    class VeiculoController {
        -service: VeiculoService
        +listar()
        +buscar()
        +registrarEntrada()
        +registrarSaida()
        +remover()
        +resumo()
    }
    class VeiculoService {
        -repository: VeiculoRepository
        -vagas: number
        +registrarEntrada(dados) Veiculo
        +registrarSaida(id) Veiculo
        +resumo()
    }
    class VeiculoRepository {
        <<interface>>
        +listar()
        +buscarPorId(id)
        +buscarEstacionadoPorPlaca(placa)
        +contarEstacionados()
        +salvar(veiculo)
        +atualizar(veiculo)
        +remover(id)
    }
    class VeiculoRepositorySqlite
    class VeiculoRepositoryMemoria
    class Veiculo {
        +placa
        +modelo
        +cor
        +entrada
        +saida
        +valor
        +validar()
        +registrarSaida(agora)
    }
    class container {
        +criarContainer(banco, vagas)
    }

    VeiculoController --> VeiculoService : usa
    VeiculoService --> VeiculoRepository : usa
    VeiculoService ..> Veiculo : cria
    VeiculoRepositorySqlite ..|> VeiculoRepository : implementa
    VeiculoRepositoryMemoria ..|> VeiculoRepository : implementa
    container ..> VeiculoRepositorySqlite : instancia
    container ..> VeiculoService : injeta repositório
    container ..> VeiculoController : injeta serviço
```

## 5. Estrutura de pastas por camada

```mermaid
flowchart TB
    R["servidor/src"] --> AP["apresentacao/<br/>app.js · VeiculoController.js · veiculoView.js"]
    R --> NG["negocio/<br/>Veiculo.js · VeiculoService.js · VeiculoRepository.js · erros.js"]
    R --> DA["dados/<br/>VeiculoRepositorySqlite.js · VeiculoRepositoryMemoria.js"]
    R --> CO["container.js (injeção de dependência)"]
    R --> SE["servidor.js (ponto de entrada)"]
```
