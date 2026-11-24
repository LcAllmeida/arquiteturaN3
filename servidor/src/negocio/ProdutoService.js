// Camada de negócio do catálogo.
// A consulta ao catálogo não tem regra de negócio: o serviço só repassa ao repositório.
// É o caso de "architecture sinkhole" citado na seção 6.2 do trabalho. Mantivemos a camada
// fechada (a apresentação nunca fala direto com os dados) para preservar o isolamento.
export class ProdutoService {
  constructor(produtoRepository) {
    this.produtoRepository = produtoRepository;
  }

  listar() {
    return this.produtoRepository.listar();
  }
}
