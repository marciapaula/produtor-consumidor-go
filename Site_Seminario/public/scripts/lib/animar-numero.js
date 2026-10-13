/* Um número que sobe (ou desce) até o valor novo em vez de trocar de
   uma vez — o pequeno atraso é o que faz o olho registrar que aquele
   valor específico acabou de mudar, não só que ele é outro agora.

   De propósito simples: interpola um proxy numérico com GSAP e escreve
   o inteiro arredondado a cada quadro. Nenhuma rolagem mecânica de
   dígito por dígito — o ganho não pagaria a complexidade aqui. */

export function animarNumero(elemento, valorNovo, opcoes = {}) {
  const { duracao = 0.5, ease = "power2.out" } = opcoes;
  const valorAtual = Number(elemento.textContent);

  if (!Number.isFinite(valorAtual) || valorAtual === valorNovo) {
    elemento.textContent = valorNovo;
    return;
  }

  const proxy = { v: valorAtual };
  gsap.to(proxy, {
    v: valorNovo,
    duration: duracao,
    ease,
    onUpdate: () => { elemento.textContent = Math.round(proxy.v); },
  });
}
