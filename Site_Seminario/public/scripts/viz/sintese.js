/* Cena 19 — fechamento. A síntese troca texto corrido por número: as
   mesmas contagens de "chamadas de sincronização manual" da cena 18
   (contagensDeRisco, derivada do código de verdade, não digitada à
   mão de novo), agora como a última imagem antes das referências.

   C e Java sobem contando — o peso que o programador carrega a cada
   linha, ficando visível na tela. O número de Go não sobe: começa e
   termina em zero, porque não há o que contar. Em vez de animar um
   zero (o que não teria nada pra mostrar), o item inteiro aparece
   depois de uma pausa deliberada — o silêncio depois da contagem dos
   outros dois é a própria resposta. */

import { contagensDeRisco } from "./codigo.js";
import { animarNumero } from "../lib/animar-numero.js";

export function montarSintese(palco) {
  palco.querySelector(".palco-vazio")?.remove();
  const n = contagensDeRisco();

  const raiz = document.createElement("div");
  raiz.className = "sintese-numeros";
  raiz.innerHTML = `
    <div class="sintese-item">
      <span class="sintese-valor" data-ref="c">0</span>
      <span class="sintese-rotulo">C</span>
    </div>
    <div class="sintese-item">
      <span class="sintese-valor" data-ref="java">0</span>
      <span class="sintese-rotulo">Java</span>
    </div>
    <div class="sintese-item sintese-item--go">
      <span class="sintese-valor" data-ref="go">0</span>
      <span class="sintese-rotulo">Go</span>
    </div>
  `;
  raiz.insertAdjacentHTML(
    "beforeend",
    '<p class="sintese-legenda">chamadas de sincronização manual — mesmo problema, três linguagens</p>'
  );
  palco.append(raiz);

  const refs = {
    c: raiz.querySelector('[data-ref="c"]'),
    java: raiz.querySelector('[data-ref="java"]'),
    itemGo: raiz.querySelector(".sintese-item--go"),
  };

  gsap.set(refs.itemGo, { opacity: 0, scale: 0.85 });

  ScrollTrigger.create({
    trigger: raiz,
    start: "top 75%",
    once: true,
    onEnter: () => {
      animarNumero(refs.c, n.c, { duracao: 0.7 });
      animarNumero(refs.java, n.java, { duracao: 0.7 });
      gsap.to(refs.itemGo, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        delay: 0.85,
        ease: "back.out(1.7)",
      });
    },
  });
}
