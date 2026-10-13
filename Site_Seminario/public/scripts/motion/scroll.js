/* Camada de rolagem: progresso global e ato corrente.
   As animações narrativas de cada cena entram na Sprint 4. */

export function iniciarProgresso() {
  const barra = document.getElementById("barra-progresso");
  const preenchimento = barra.querySelector(".barra-preenchimento");

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      gsap.set(preenchimento, { scaleX: self.progress });
      barra.setAttribute("aria-valuenow", Math.round(self.progress * 100));
    },
  });
}

export function iniciarIndicadorDeAto() {
  const rotulo = document.getElementById("barra-ato");

  document.querySelectorAll(".ato").forEach((ato) => {
    const texto = `Ato ${ato.dataset.ato} — ${ato.dataset.atoNome}`;

    ScrollTrigger.create({
      trigger: ato,
      start: "top 40%",
      end: "bottom 40%",
      onEnter: () => (rotulo.textContent = texto),
      onEnterBack: () => (rotulo.textContent = texto),
    });
  });
}
