import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/apresentacao/app.js';
import { criarContainer } from '../src/container.js';

// Teste de ponta a ponta: cliente HTTP -> controller -> serviço -> repositório SQLite real.
let servidor;
let repository;
let base;
const pasta = mkdtempSync(join(tmpdir(), 'garagem-'));

before(async () => {
  let controller;
  ({ controller, repository } = criarContainer({ banco: join(pasta, 'teste.db'), vagas: 3 }));
  servidor = criarApp(controller).listen(0);
  await new Promise((ok) => servidor.once('listening', ok));
  base = `http://localhost:${servidor.address().port}/api`;
});

after(() => {
  servidor.close();
  repository.db.close(); // no Windows o arquivo precisa ser fechado antes de apagar
  rmSync(pasta, { recursive: true, force: true });
});

const enviar = (metodo, caminho, corpo) =>
  fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

test('fluxo completo: entrada, consulta, saída e remoção', async () => {
  const criado = await enviar('POST', '/veiculos', { placa: 'BRA2E19', modelo: 'Civic', cor: 'Cinza' });
  assert.equal(criado.status, 201);
  const veiculo = await criado.json();
  assert.equal(veiculo.status, 'estacionado');
  assert.equal(criado.headers.get('location'), `/api/veiculos/${veiculo.id}`);

  const lista = await (await fetch(`${base}/veiculos`)).json();
  assert.equal(lista.length, 1);
  assert.deepEqual(await (await fetch(`${base}/garagem/resumo`)).json(), { vagas: 3, ocupadas: 1, livres: 2 });

  const saida = await enviar('POST', `/veiculos/${veiculo.id}/saida`);
  assert.equal(saida.status, 200);
  const saiu = await saida.json();
  assert.equal(saiu.status, 'saiu');
  assert.equal(saiu.valor, 10);

  assert.equal((await enviar('DELETE', `/veiculos/${veiculo.id}`)).status, 204);
  assert.equal((await fetch(`${base}/veiculos/${veiculo.id}`)).status, 404);
});

test('erros viram status HTTP com mensagem', async () => {
  const invalido = await enviar('POST', '/veiculos', { placa: 'X', modelo: 'Gol', cor: 'Azul' });
  assert.equal(invalido.status, 400);
  assert.match((await invalido.json()).erro, /Placa inválida/);

  await enviar('POST', '/veiculos', { placa: 'AAA1111', modelo: 'Gol', cor: 'Azul' });
  const repetido = await enviar('POST', '/veiculos', { placa: 'AAA1111', modelo: 'Gol', cor: 'Azul' });
  assert.equal(repetido.status, 409);

  assert.equal((await fetch(`${base}/nao-existe`)).status, 404);
});
