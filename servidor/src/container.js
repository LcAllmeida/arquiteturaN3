import { PedidoController } from './apresentacao/PedidoController.js';
import { ProdutoController } from './apresentacao/ProdutoController.js';
import { abrirBanco } from './dados/banco.js';
import { CATALOGO_INICIAL } from './dados/catalogoInicial.js';
import { PedidoRepositoryMemoria, ProdutoRepositoryMemoria, TransacaoMemoria } from './dados/memoria.js';
import { PedidoRepositorySqlite } from './dados/PedidoRepositorySqlite.js';
import { ProdutoRepositorySqlite } from './dados/ProdutoRepositorySqlite.js';
import { TransacaoSqlite } from './dados/TransacaoSqlite.js';
import { PedidoService } from './negocio/PedidoService.js';
import { ProdutoService } from './negocio/ProdutoService.js';

// Implementações da camada de dados. Trocar de banco = escolher outro conjunto aqui.
function criarDados(banco) {
  if (banco === 'memoria') {
    const produtoRepository = new ProdutoRepositoryMemoria(CATALOGO_INICIAL);
    const pedidoRepository = new PedidoRepositoryMemoria();
    const transacao = new TransacaoMemoria([produtoRepository, pedidoRepository]);
    return { produtoRepository, pedidoRepository, transacao, fechar: () => {} };
  }
  const db = abrirBanco(banco);
  return {
    produtoRepository: new ProdutoRepositorySqlite(db),
    pedidoRepository: new PedidoRepositorySqlite(db),
    transacao: new TransacaoSqlite(db),
    fechar: () => db.close(),
  };
}

// Raiz de composição (o "montador" da injeção de dependência, FOWLER 2004).
// É o ÚNICO lugar que escolhe as classes concretas e as conecta por construtor:
//   repositórios + transação -> serviços -> controllers.
export function criarContainer({ banco = 'dados/loja.db' } = {}) {
  const { produtoRepository, pedidoRepository, transacao, fechar } = criarDados(banco);
  const produtoService = new ProdutoService(produtoRepository);
  const pedidoService = new PedidoService({ pedidoRepository, produtoRepository, transacao });
  return {
    produtoController: new ProdutoController(produtoService),
    pedidoController: new PedidoController(pedidoService),
    produtoService,
    pedidoService,
    fechar,
  };
}
