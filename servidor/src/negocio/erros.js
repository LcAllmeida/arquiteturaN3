// Erros do domínio. A camada de apresentação traduz cada um para um status HTTP.

// Dado de entrada inválido -> 400. "campo" diz qual campo do formulário causou o erro.
export class ErroValidacao extends Error {
  constructor(mensagem, campo = null) {
    super(mensagem);
    this.campo = campo;
  }
}

export class ErroNaoEncontrado extends Error {} // registro inexistente        -> 404
// Regra do domínio impede a ação -> 409. "campo" é opcional (ex.: placa repetida).
export class ErroRegraNegocio extends Error {
  constructor(mensagem, campo = null) {
    super(mensagem);
    this.campo = campo;
  }
}
