// Erros do domínio. A camada de apresentação traduz cada um para um status HTTP.
// "campo" (opcional) diz qual campo do formulário causou o erro, para o cliente mostrar no lugar certo.

export class ErroValidacao extends Error { // dado de entrada inválido -> 400
  constructor(mensagem, campo = null) {
    super(mensagem);
    this.campo = campo;
  }
}

export class ErroNaoEncontrado extends Error {} // registro inexistente -> 404

export class ErroRegraNegocio extends Error { // regra do domínio impede a ação -> 409
  constructor(mensagem, campo = null) {
    super(mensagem);
    this.campo = campo;
  }
}
