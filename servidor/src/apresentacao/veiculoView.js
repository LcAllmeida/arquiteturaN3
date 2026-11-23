// "V" do MVC no servidor: define o formato em que o modelo é devolvido ao cliente.
// O controller nunca monta a resposta à mão; ele pede a visão aqui.
export function veiculoView(veiculo) {
  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    cor: veiculo.cor,
    status: veiculo.estaEstacionado() ? 'estacionado' : 'saiu',
    entrada: veiculo.entrada,
    saida: veiculo.saida,
    valor: veiculo.valor,
  };
}

export function listaVeiculosView(veiculos) {
  return veiculos.map(veiculoView);
}

export function erroView(mensagem) {
  return { erro: mensagem };
}
