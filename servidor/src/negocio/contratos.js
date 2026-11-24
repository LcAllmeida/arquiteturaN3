// Contratos (abstrações) definidos pela camada de NEGÓCIO e implementados pela camada de DADOS.
// É a inversão de dependência da Figura 4: os serviços conhecem só estas classes, nunca o SQLite.
// JavaScript não tem "interface"; cada método lança erro se a implementação esquecer de sobrescrever.

const naoImplementado = () => { throw new Error('não implementado'); };

export class ProdutoRepository {
  listar() { naoImplementado(); }
  buscarPorId(id) { naoImplementado(); }
  atualizarEstoque(produto) { naoImplementado(); }
}

export class PedidoRepository {
  listar() { naoImplementado(); }
  buscarPorId(id) { naoImplementado(); }
  salvar(pedido) { naoImplementado(); }
  atualizarStatus(pedido) { naoImplementado(); }
}

// Executa uma função como uma única transação: ou tudo é gravado, ou nada é.
// Usada para gravar o pedido e baixar o estoque juntos.
export class Transacao {
  executar(funcao) { naoImplementado(); }
}
