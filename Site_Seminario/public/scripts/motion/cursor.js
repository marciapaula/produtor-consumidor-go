/* Cursor customizado — o toque mais barato-por-impacto que existe em
   site premiado: um ponto que acompanha de perto e um anel que arrasta
   atrás, e os dois avisam quando há algo interativo por baixo.

   Só existe em dispositivo com mouse de verdade. Tela de toque não tem
   a noção de "cursor pairado" — criar esses elementos lá seria, na
   melhor das hipóteses, peso morto, e na pior, um ponto fantasma preso
   no canto depois do primeiro toque. */

const PODE_CURSOR_CUSTOM =
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const SELETOR_ATIVO =
  'a, button, input, [role="button"], [tabindex]:not([tabindex="-1"])';

export function iniciarCursor() {
  if (!PODE_CURSOR_CUSTOM) return;

  document.body.classList.add("tem-cursor-custom");

  const ponto = document.createElement("div");
  ponto.className = "cursor-ponto";

  const anel = document.createElement("div");
  anel.className = "cursor-anel";
  const rotulo = document.createElement("span");
  rotulo.className = "cursor-rotulo";
  anel.append(rotulo);

  document.body.append(ponto, anel);
  gsap.set([ponto, anel], { xPercent: -50, yPercent: -50 });

  // Duas velocidades: o ponto quase gruda na posição real, o anel
  // arrasta um pouco atrás — é essa defasagem que dá a sensação de peso.
  const moverPontoX = gsap.quickTo(ponto, "x", { duration: 0.08, ease: "power3" });
  const moverPontoY = gsap.quickTo(ponto, "y", { duration: 0.08, ease: "power3" });
  const moverAnelX = gsap.quickTo(anel, "x", { duration: 0.35, ease: "power3" });
  const moverAnelY = gsap.quickTo(anel, "y", { duration: 0.35, ease: "power3" });

  let visivel = false;

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;

    if (!visivel) {
      visivel = true;
      gsap.to([ponto, anel], { opacity: 1, duration: 0.25 });
    }

    moverPontoX(e.clientX);
    moverPontoY(e.clientY);
    moverAnelX(e.clientX);
    moverAnelY(e.clientY);
  });

  // mouseleave em documentElement não borbulha — só dispara quando o
  // ponteiro deixa a janela de verdade, não ao passar entre elementos.
  document.documentElement.addEventListener("mouseleave", () => {
    visivel = false;
    gsap.to([ponto, anel], { opacity: 0, duration: 0.25 });
  });

  document.addEventListener("pointerover", (e) => {
    const alvo = e.target.closest(SELETOR_ATIVO);
    // Um controle desabilitado não é "clicável" — o anel não deve
    // sugerir isso. .botao:disabled já tem cursor:not-allowed com
    // especificidade maior que o cursor:none daqui, então o ícone
    // nativo de bloqueio continua aparecendo por conta própria.
    if (!alvo || alvo.disabled) return;

    const arraste = alvo.matches('input[type="range"]');
    anel.dataset.estado = arraste ? "arraste" : "ativo";
    rotulo.textContent = arraste ? "arraste" : "";
  });

  document.addEventListener("pointerout", (e) => {
    const saindoDe = e.target.closest(SELETOR_ATIVO);
    if (!saindoDe) return;

    const entrandoEm = e.relatedTarget?.closest?.(SELETOR_ATIVO);
    if (entrandoEm) return;

    delete anel.dataset.estado;
    rotulo.textContent = "";
  });
}
