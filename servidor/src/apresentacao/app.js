import express from 'express';
import { fileURLToPath } from 'node:url';
import { ErroNaoEncontrado, ErroRegraNegocio, ErroValidacao } from '../negocio/erros.js';
import { erroView } from './veiculoView.js';

const PASTA_CLIENTE_WEB = fileURLToPath(new URL('../../../clientes/web', import.meta.url));

// Cabeçalhos de segurança básicos: o navegador só carrega arquivos deste próprio servidor.
function cabecalhosSeguranca(req, res, next) {
  res.set({
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  next();
}

// Monta o servidor HTTP (camada de apresentação) a partir de um controller já pronto.
export function criarApp(controller) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cabecalhosSeguranca);
  app.use(express.json({ limit: '10kb' }));

  // Rotas da API REST (o contrato entre clientes e servidor).
  app.get('/api/garagem/resumo', controller.resumo);
  app.get('/api/veiculos', controller.listar);
  app.get('/api/veiculos/:id', controller.buscar);
  app.post('/api/veiculos', controller.registrarEntrada);
  app.post('/api/veiculos/:id/saida', controller.registrarSaida);
  app.delete('/api/veiculos/:id', controller.remover);

  // Entrega os arquivos do cliente web (o navegador é quem executa esse cliente).
  app.use(express.static(PASTA_CLIENTE_WEB));

  app.use('/api', (req, res) => res.status(404).json(erroView('Rota não encontrada.')));

  // Traduz erros do domínio em status HTTP.
  app.use((erro, req, res, next) => {
    if (erro instanceof ErroValidacao) return res.status(400).json(erroView(erro.message, erro.campo));
    if (erro instanceof ErroNaoEncontrado) return res.status(404).json(erroView(erro.message));
    if (erro instanceof ErroRegraNegocio) return res.status(409).json(erroView(erro.message, erro.campo));
    if (erro.type === 'entity.parse.failed') return res.status(400).json(erroView('JSON inválido.'));
    if (erro.type === 'entity.too.large') return res.status(413).json(erroView('Requisição grande demais.'));
    console.error(erro);
    res.status(500).json(erroView('Erro interno no servidor.'));
  });

  return app;
}
