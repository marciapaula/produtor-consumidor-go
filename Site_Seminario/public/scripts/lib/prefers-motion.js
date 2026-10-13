/* Preferência de movimento do visitante.

   Decisão de produto: a animação é obrigatória em toda a experiência.
   prefersReducedMotion() sempre retorna false — nenhuma cena nasce parada
   ou vira controle manual por causa de prefers-reduced-motion do sistema.
   O ponto de checagem continua existindo só para que os módulos de
   visualização não precisem de nenhuma outra mudança: eles pedem a
   preferência aqui, e a resposta do produto é sempre "sem preferência". */

export function prefersReducedMotion() {
  return false;
}

/* Sem uso enquanto a decisão acima estiver de pé: nada reage a mudança de
   preferência do sistema com a página já aberta. */
export function aoMudarPreferenciaDeMovimento() {
  return () => {};
}
