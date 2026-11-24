import { produtoView } from './views.js';

// "C" do MVC para o catálogo de produtos.
export class ProdutoController {
  constructor(produtoService) {
    this.produtoService = produtoService;
  }

  listar = (req, res) => {
    res.json(this.produtoService.listar().map(produtoView));
  };
}
