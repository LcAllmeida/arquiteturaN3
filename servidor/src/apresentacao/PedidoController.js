import { ErroValidacao } from '../negocio/erros.js';
import { paraNovoPedidoDTO } from './pedidoDTO.js';
import { pedidoView, resumoView } from './views.js';

// Converte o ":id" da URL. Recusa "abc", "1.5", "-1" com 400.
function lerId(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new ErroValidacao('Número do pedido inválido: use um inteiro positivo.');
  return id;
}

// "C" do MVC para pedidos: recebe o HTTP, converte em DTO, chama o serviço e escolhe a visão.
// Não contém regra de negócio nem SQL.
export class PedidoController {
  constructor(pedidoService) {
    this.pedidoService = pedidoService;
  }

  listar = (req, res) => {
    res.json(this.pedidoService.listar().map(pedidoView));
  };

  buscar = (req, res) => {
    res.json(pedidoView(this.pedidoService.buscar(lerId(req))));
  };

  // Figura 3: 1 POST /pedidos -> 2 criar(pedido) -> ... -> 8 resposta HTTP 201
  criar = (req, res) => {
    const pedido = this.pedidoService.criar(paraNovoPedidoDTO(req.body));
    res.status(201).location(`/api/pedidos/${pedido.id}`).json(pedidoView(pedido));
  };

  cancelar = (req, res) => {
    res.json(pedidoView(this.pedidoService.cancelar(lerId(req))));
  };

  resumo = (req, res) => {
    res.json(resumoView(this.pedidoService.resumo()));
  };
}
