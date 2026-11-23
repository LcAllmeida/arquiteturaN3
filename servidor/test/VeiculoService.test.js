import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VeiculoRepositoryMemoria } from '../src/dados/VeiculoRepositoryMemoria.js';
import { ErroNaoEncontrado, ErroRegraNegocio, ErroValidacao } from '../src/negocio/erros.js';
import { VeiculoService } from '../src/negocio/VeiculoService.js';

// O serviço recebe o repositório em memória: a regra de negócio é testada sem banco de dados.
const novoServico = (vagas = 2) => new VeiculoService(new VeiculoRepositoryMemoria(), { vagas });
const gol = { placa: 'abc-1d23', modelo: 'Gol', cor: 'Prata' };

test('registra a entrada e normaliza a placa', () => {
  const v = novoServico().registrarEntrada(gol);
  assert.equal(v.id, 1);
  assert.equal(v.placa, 'ABC1D23');
  assert.equal(v.estaEstacionado(), true);
});

test('recusa placa inválida e campos vazios', () => {
  const s = novoServico();
  assert.throws(() => s.registrarEntrada({ ...gol, placa: '123' }), ErroValidacao);
  assert.throws(() => s.registrarEntrada({ ...gol, modelo: ' ' }), ErroValidacao);
  assert.throws(() => s.registrarEntrada({ placa: 'ABC1234' }), ErroValidacao);
});

test('não deixa a mesma placa entrar duas vezes', () => {
  const s = novoServico();
  s.registrarEntrada(gol);
  assert.throws(() => s.registrarEntrada(gol), ErroRegraNegocio);
});

test('respeita o limite de vagas e atualiza o resumo', () => {
  const s = novoServico(2);
  s.registrarEntrada(gol);
  s.registrarEntrada({ placa: 'XYZ9876', modelo: 'Uno', cor: 'Branco' });
  assert.deepEqual(s.resumo(), { vagas: 2, ocupadas: 2, livres: 0 });
  assert.throws(() => s.registrarEntrada({ placa: 'DEF4G56', modelo: 'Onix', cor: 'Preto' }), ErroRegraNegocio);
});

test('cobra R$ 10 na primeira hora e R$ 5 por hora adicional', () => {
  const s = novoServico();
  const v = s.registrarEntrada(gol);
  const duasHorasEMeia = new Date(new Date(v.entrada).getTime() + 2.5 * 60 * 60 * 1000);
  const saiu = s.registrarSaida(v.id, duasHorasEMeia);
  assert.equal(saiu.valor, 20); // 3 horas iniciadas: 10 + 5 + 5
  assert.equal(saiu.estaEstacionado(), false);
  assert.deepEqual(s.resumo(), { vagas: 2, ocupadas: 0, livres: 2 });
});

test('não registra saída duas vezes e acusa id inexistente', () => {
  const s = novoServico();
  const v = s.registrarEntrada(gol);
  s.registrarSaida(v.id);
  assert.throws(() => s.registrarSaida(v.id), ErroRegraNegocio);
  assert.throws(() => s.buscar(99), ErroNaoEncontrado);
});
