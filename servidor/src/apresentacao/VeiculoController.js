import { listaVeiculosView, veiculoView } from './veiculoView.js';

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
    res.json(veiculoView(this.service.buscar(Number(req.params.id))));
  };

  registrarEntrada = (req, res) => {
    const veiculo = this.service.registrarEntrada(req.body ?? {});
    res.status(201).location(`/api/veiculos/${veiculo.id}`).json(veiculoView(veiculo));
  };

  registrarSaida = (req, res) => {
    res.json(veiculoView(this.service.registrarSaida(Number(req.params.id))));
  };

  remover = (req, res) => {
    this.service.remover(Number(req.params.id));
    res.status(204).end();
  };

  resumo = (req, res) => {
    res.json(this.service.resumo());
  };
}
