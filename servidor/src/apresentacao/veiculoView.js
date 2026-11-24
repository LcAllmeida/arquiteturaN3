// "V" do MVC no servidor: define o formato em que o modelo é devolvido ao cliente.
// O controller nunca monta a resposta à mão; ele pede a visão aqui.
// Para veículo ainda no pátio, mostra quanto custaria se saísse agora (valorParcial).
export function veiculoView(veiculo, agora = new Date()) {
  const estacionado = veiculo.estaEstacionado();
  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    cor: veiculo.cor,
    status: estacionado ? 'estacionado' : 'saiu',
    entrada: veiculo.entrada,
    saida: veiculo.saida,
    permanenciaMinutos: veiculo.permanenciaMinutos(agora),
    valor: veiculo.valor,
    valorParcial: estacionado ? veiculo.calcularValor(agora) : null,
  };
}

export function listaVeiculosView(veiculos) {
  const agora = new Date();
  return veiculos.map((v) => veiculoView(v, agora));
}

export function erroView(mensagem, campo = null) {
  return campo ? { erro: mensagem, campo } : { erro: mensagem };
}
