import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/apresentacao/app.js';
import { criarContainer } from '../src/container.js';

// Teste de ponta a ponta: cliente HTTP -> controller -> serviço -> repositórios SQLite reais.
let servidor;
let container;
let base;
const pasta = mkdtempSync(join(tmpdir(), 'loja-api-'));

before(async () => {
  container = criarContainer({ banco: join(pasta, 'teste.db') });
  servidor = criarApp(container).listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://localhost:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  container.fechar(); // no Windows o arquivo precisa ser fechado antes de apagar
  rmSync(pasta, { recursive: true, force: true });
});

const enviar = (metodo, caminho, corpo) =>
  fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
const obter = async (caminho) => (await fetch(base + caminho)).json();

test('catálogo inicial com preços em reais', async () => {
  const produtos = await obter('/produtos');
  assert.equal(produtos.length, 6);
  assert.deepEqual(produtos[0], { id: 1, nome: 'Teclado mecânico', preco: 249.9, estoque: 10 });
});

test('fluxo da Figura 3: POST /pedidos responde 201 com o número do pedido', async () => {
  const resposta = await enviar('POST', '/pedidos', {
    cliente: 'Ana',
    itens: [{ produtoId: 1, quantidade: 1 }, { produtoId: 2, quantidade: 1, preco: 0.01 }], // preço do cliente é ignorado
  });
  assert.equal(resposta.status, 201);
  const pedido = await resposta.json();
  assert.equal(resposta.headers.get('location'), `/api/pedidos/${pedido.id}`);
  assert.equal(pedido.subtotal, 339.8);
  assert.equal(pedido.desconto, 33.98);
  assert.equal(pedido.total, 305.82);
  assert.equal(pedido.status, 'confirmado');

  const teclado = (await obter('/produtos')).find((p) => p.id === 1);
  assert.equal(teclado.estoque, 9);
  assert.equal((await obter(`/pedidos/${pedido.id}`)).cliente, 'Ana');
  assert.deepEqual(await obter('/loja/resumo'), {
    pedidosConfirmados: 1, faturamento: 305.82, itensVendidos: 2, regraDesconto: { pedidoMinimo: 300, percentual: 10 },
  });
});

test('cancelamento devolve o estoque', async () => {
  const pedido = await (await enviar('POST', '/pedidos', { cliente: 'Bia', itens: [{ produtoId: 3, quantidade: 2 }] })).json();
  assert.equal((await obter('/produtos')).find((p) => p.id === 3).estoque, 3);
  const cancelado = await enviar('POST', `/pedidos/${pedido.id}/cancelamento`);
  assert.equal(cancelado.status, 200);
  assert.equal((await cancelado.json()).status, 'cancelado');
  assert.equal((await obter('/produtos')).find((p) => p.id === 3).estoque, 5);
  assert.equal((await enviar('POST', `/pedidos/${pedido.id}/cancelamento`)).status, 409);
});

test('erros de formato (DTO) e de regra viram status HTTP com campo', async () => {
  const casos = [
    [{ cliente: 'Caio', itens: [] }, 400, 'itens'],
    [{ itens: [{ produtoId: 1, quantidade: 1 }] }, 400, 'cliente'],
    [{ cliente: 'Caio', itens: [{ produtoId: 'um', quantidade: 1 }] }, 400, 'itens'],
    [{ cliente: 'Caio', itens: [{ produtoId: 1, quantidade: 0 }] }, 400, 'itens'],
    [{ cliente: 'Caio', itens: [{ produtoId: 1, quantidade: 1.5 }] }, 400, 'itens'],
    [{ cliente: 'C', itens: [{ produtoId: 1, quantidade: 1 }] }, 400, 'cliente'],
    [{ cliente: 'Caio', itens: [{ produtoId: 6, quantidade: 1 }] }, 409, 'itens'],
  ];
  for (const [corpo, status, campo] of casos) {
    const r = await enviar('POST', '/pedidos', corpo);
    assert.equal(r.status, status, JSON.stringify(corpo));
    assert.equal((await r.json()).campo, campo, JSON.stringify(corpo));
  }
  assert.equal((await enviar('POST', '/pedidos', [1])).status, 400);
});

test('número inválido na URL, rota inexistente e cabeçalhos de segurança', async () => {
  for (const id of ['abc', '1.5', '-1', '0']) assert.equal((await fetch(`${base}/pedidos/${id}`)).status, 400, id);
  assert.equal((await fetch(`${base}/pedidos/999`)).status, 404);
  assert.equal((await fetch(`${base}/nao-existe`)).status, 404);
  const r = await fetch(`${base}/produtos`);
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
