/* Cortina de abertura — um instante de escuro antes da cena entrar,
   a marca se formando letra por letra em vez do vídeo começar direto.

   O elemento só existe se este script rodar: sem JS, não há cortina
   nenhuma sobrando presa por cima do site. Mesmo princípio já usado
   em motion.css — o estado inicial nunca é responsabilidade do CSS
   sozinho, então uma falha no meio do caminho nunca deixa o conteúdo
   trancado atrás de um retângulo escuro. */

export function iniciarCortina() {
  const cortina = document.createElement("div");
  cortina.className = "cortina";
  cortina.setAttribute("aria-hidden", "true");
  cortina.innerHTML = `
    <p class="cortina-marca">
      <span>C</span><span>A</span><span>N</span><span>A</span><span>L</span><span class="cortina-ponto">.</span>
    </p>
  `;
  document.body.append(cortina);

  const letras = cortina.querySelectorAll("span");

  gsap.timeline({ onComplete: () => cortina.remove() })
    .from(letras, {
      opacity: 0,
      y: 14,
      duration: 0.5,
      stagger: 0.045,
      ease: "power3.out",
    })
    .to(cortina, {
      opacity: 0,
      duration: 0.55,
      ease: "power2.inOut",
    }, "+=0.4");
}
