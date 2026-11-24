import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { abrirBanco } from '../src/dados/banco.js';
import { CATALOGO_INICIAL } from '../src/dados/catalogoInicial.js';
import { PedidoRepositoryMemoria, ProdutoRepositoryMemoria, TransacaoMemoria } from '../src/dados/memoria.js';
import { PedidoRepositorySqlite } from '../src/dados/PedidoRepositorySqlite.js';
import { ProdutoRepositorySqlite } from '../src/dados/ProdutoRepositorySqlite.js';
import { TransacaoSqlite } from '../src/dados/TransacaoSqlite.js';
import { ErroNaoEncontrado, ErroRegraNegocio, ErroValidacao } from '../src/negocio/erros.js';
import { PedidoService } from '../src/negocio/PedidoService.js';

// O serviço recebe os repositórios em memória: as regras são testadas sem banco de dados.
function novoServico() {
  const produtoRepository = new ProdutoRepositoryMemoria(CATALOGO_INICIAL);
  const pedidoRepository = new PedidoRepositoryMemoria();
  const transacao = new TransacaoMemoria([produtoRepository, pedidoRepository]);
  return { servico: new PedidoService({ pedidoRepository, produtoRepository, transacao }), produtoRepository, pedidoRepository };
}
const estoque = (repo, id) => repo.buscarPorId(id).estoque;

test('cria o pedido com preço do catálogo, calcula total e baixa o estoque', () => {
  const { servico, produtoRepository } = novoServico();
  const pedido = servico.criar({ cliente: '  Ana   Souza ', itens: [{ produtoId: 2, quantidade: 2 }] });
  assert.equal(pedido.id, 1);
  assert.equal(pedido.cliente, 'Ana Souza');
  assert.equal(pedido.itens[0].precoCentavos, 8990);
  assert.equal(pedido.subtotalCentavos, 17980);
  assert.equal(pedido.descontoCentavos, 0);
  assert.equal(pedido.totalCentavos, 17980);
  assert.equal(estoque(produtoRepository, 2), 23);
});

test('aplica 10% de desconto a partir de R$ 300,00', () => {
  const { servico } = novoServico();
  const pedido = servico.criar({ cliente: 'Bruno', itens: [{ produtoId: 1, quantidade: 1 }, { produtoId: 2, quantidade: 1 }] });
  assert.equal(pedido.subtotalCentavos, 33980); // 249,90 + 89,90
  assert.equal(pedido.descontoCentavos, 3398);
  assert.equal(pedido.totalCentavos, 30582);
  const semDesconto = servico.criar({ cliente: 'Bruno', itens: [{ produtoId: 1, quantidade: 1 }] });
  assert.equal(semDesconto.descontoCentavos, 0); // 249,90 < 300,00
});

test('junta o mesmo produto repetido numa linha só', () => {
  const { servico } = novoServico();
  const pedido = servico.criar({ cliente: 'Carla', itens: [{ produtoId: 2, quantidade: 1 }, { produtoId: 2, quantidade: 3 }] });
  assert.equal(pedido.itens.length, 1);
  assert.equal(pedido.itens[0].quantidade, 4);
});

test('recusa estoque insuficiente e não baixa nada (nem dos outros itens)', () => {
  const { servico, produtoRepository, pedidoRepository } = novoServico();
  assert.throws(
    () => servico.criar({ cliente: 'Davi', itens: [{ produtoId: 2, quantidade: 1 }, { produtoId: 5, quantidade: 3 }] }),
    (e) => e instanceof ErroRegraNegocio && /Hub USB-C.*disponível: 2/.test(e.message),
  );
  assert.equal(estoque(produtoRepository, 2), 25); // o mouse, que tinha estoque, foi devolvido pela transação
  assert.equal(pedidoRepository.listar().length, 0);
  assert.throws(() => servico.criar({ cliente: 'Davi', itens: [{ produtoId: 6, quantidade: 1 }] }), /esgotado/);
});

test('recusa cliente inválido e produto inexistente', () => {
  const { servico } = novoServico();
  assert.throws(() => servico.criar({ cliente: ' ', itens: [{ produtoId: 1, quantidade: 1 }] }), (e) => e instanceof ErroValidacao && e.campo === 'cliente');
  assert.throws(() => servico.criar({ cliente: 'x'.repeat(61), itens: [{ produtoId: 1, quantidade: 1 }] }), (e) => e.campo === 'cliente');
  assert.throws(() => servico.criar({ cliente: 'Eva', itens: [{ produtoId: 99, quantidade: 1 }] }), (e) => e.campo === 'itens');
});

test('cancelar devolve o estoque e não cancela duas vezes', () => {
  const { servico, produtoRepository } = novoServico();
  const pedido = servico.criar({ cliente: 'Fábio', itens: [{ produtoId: 3, quantidade: 2 }] });
  assert.equal(estoque(produtoRepository, 3), 3);
  assert.equal(servico.cancelar(pedido.id).status, 'cancelado');
  assert.equal(estoque(produtoRepository, 3), 5);
  assert.throws(() => servico.cancelar(pedido.id), ErroRegraNegocio);
  assert.throws(() => servico.cancelar(42), ErroNaoEncontrado);
});

test('resumo soma só os pedidos confirmados', () => {
  const { servico } = novoServico();
  servico.criar({ cliente: 'Gil', itens: [{ produtoId: 2, quantidade: 1 }] });
  const cancelado = servico.criar({ cliente: 'Gil', itens: [{ produtoId: 4, quantidade: 1 }] });
  servico.cancelar(cancelado.id);
  const r = servico.resumo();
  assert.equal(r.pedidosConfirmados, 1);
  assert.equal(r.faturamentoCentavos, 8990);
  assert.equal(r.itensVendidos, 1);
});

test('transação SQLite: se gravar o pedido falhar, o estoque volta ao que era', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'loja-'));
  const db = abrirBanco(join(pasta, 'teste.db'));
  try {
    const produtoRepository = new ProdutoRepositorySqlite(db);
    const pedidoRepository = new PedidoRepositorySqlite(db);
    pedidoRepository.salvar = () => { throw new Error('falha simulada ao gravar o pedido'); };
    const servico = new PedidoService({ pedidoRepository, produtoRepository, transacao: new TransacaoSqlite(db) });

    assert.throws(() => servico.criar({ cliente: 'Hugo', itens: [{ produtoId: 1, quantidade: 3 }] }), /falha simulada/);
    assert.equal(produtoRepository.buscarPorId(1).estoque, 10); // ROLLBACK desfez a baixa
  } finally {
    db.close();
    rmSync(pasta, { recursive: true, force: true });
  }
});
