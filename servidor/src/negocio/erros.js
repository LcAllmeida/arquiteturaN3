// Erros do domínio. A camada de apresentação traduz cada um para um status HTTP.
export class ErroValidacao extends Error {}   // dado de entrada inválido      -> 400
export class ErroNaoEncontrado extends Error {} // registro inexistente        -> 404
export class ErroRegraNegocio extends Error {}  // regra do domínio impede ação -> 409
