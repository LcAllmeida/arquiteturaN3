import { ErroValidacao } from '../negocio/erros.js';
import { listaVeiculosView, veiculoView } from './veiculoView.js';

// Converte o ":id" da URL. Recusa "abc", "1.5", "-1" com 400 em vez de procurar "NaN".
function lerId(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroValidacao('Identificador inválido: use um número inteiro positivo.');
  return id;
}

// "C" do MVC: recebe a requisição HTTP, chama o serviço e escolhe a visão.
// Não contém regra de negócio nem SQL.
export class VeiculoController {
  constructor(service) {
    this.service = service;
  }

  listar = (req, res) => {
    res.json(listaVeiculosView(this.service.listar()));
  };

  buscar = (req, res) => {
    res.json(veiculoView(this.service.buscar(lerId(req))));
  };

  registrarEntrada = (req, res) => {
    const corpo = req.body;
    if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
      throw new ErroValidacao('Envie um objeto JSON com placa, modelo e cor.');
    }
    const veiculo = this.service.registrarEntrada(corpo);
    res.status(201).location(`/api/veiculos/${veiculo.id}`).json(veiculoView(veiculo));
  };

  registrarSaida = (req, res) => {
    res.json(veiculoView(this.service.registrarSaida(lerId(req))));
  };

  remover = (req, res) => {
    this.service.remover(lerId(req));
    res.status(204).end();
  };

  resumo = (req, res) => {
    res.json(this.service.resumo());
  };
}
