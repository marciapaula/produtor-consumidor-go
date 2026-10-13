/* Coreografia de entrada das cenas.

   Cada tipo de elemento tem um gesto próprio, porque cada um tem uma
   voz diferente na página: o rótulo monoespaçado entra lateralmente,
   como um registro de máquina; o título editorial sobe por trás de uma
   máscara; o palco chega por escala, como um instrumento ligando.

   As timelines nascem pausadas e o ScrollTrigger apenas as dispara, em
   vez de hospedá-las. Acoplar as duas coisas cria uma corrida: o pin do
   hero só existe depois que os metadados do vídeo chegam, e o refresh
   resultante pode descartar um gatilho antes que sua timeline tenha
   sido preenchida — deixando a cena presa no estado inicial invisível.

   Os estados iniciais são aplicados aqui, e não no CSS: se este script
   falhar antes de rodar, a página continua legível. */

const SUAVE = "expo.out";

export function iniciarCenas() {
  coreografarAberturasDeAto();
  coreografarCenasComuns();
  coreografarLema();
  coreografarEixos();
}

function dispararAoEntrar(gatilho, inicio, linha) {
  ScrollTrigger.create({
    trigger: gatilho,
    start: inicio,
    once: true,
    onEnter: () => linha.play(),
  });
}

function coreografarAberturasDeAto() {
  document.querySelectorAll(".ato-abertura").forEach((cabecalho) => {
    const partes = cabecalho.querySelectorAll(".ato-num, .ato-nome");

    gsap.set(cabecalho, { "--regua": 0 });
    gsap.set(partes, { opacity: 0, y: 22 });

    const linha = gsap.timeline({ paused: true });
    linha
      .to(partes, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: SUAVE })
      .to(cabecalho, { "--regua": 1, duration: 1.1, ease: "expo.inOut" }, "-=0.55");

    dispararAoEntrar(cabecalho, "top 82%", linha);
  });
}

function coreografarCenasComuns() {
  const cenas = document.querySelectorAll(
    '.cena:not([data-cena="00"]):not([data-tipo="lema"])'
  );

  cenas.forEach((cena) => {
    const rotulo = cena.querySelector(".rotulo");
    const titulo = cena.querySelector(".titulo, .titulo-grande");
    const textos = cena.querySelectorAll(".prosa, .nota, .aviso, .referencias");
    const palco = cena.querySelector(".palco");

    const linha = gsap.timeline({ paused: true, defaults: { ease: SUAVE } });

    if (rotulo) {
      gsap.set(rotulo, { opacity: 0, x: -14 });
      linha.to(rotulo, { opacity: 1, x: 0, duration: 0.55 });
    }

    if (titulo) {
      // Revelação por máscara: o texto sobe por trás da própria caixa.
      gsap.set(titulo, { clipPath: "inset(100% 0 0 0)", y: "0.28em" });
      linha.to(titulo, { clipPath: "inset(0% 0 0 0)", y: 0, duration: 1 }, "-=0.32");
    }

    if (textos.length) {
      gsap.set(textos, { opacity: 0, y: 16 });
      linha.to(textos, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, "-=0.62");
    }

    if (palco) {
      gsap.set(palco, { opacity: 0, scale: 0.975 });
      linha.to(palco, { opacity: 1, scale: 1, duration: 0.9 }, "-=0.8");
    }

    dispararAoEntrar(cena, "top 74%", linha);
  });
}

/* Cena 11 — o vale da curva de tensão.
   Aqui a contenção é o efeito: nada se move, só o tempo passa. */
function coreografarLema() {
  const cena = document.querySelector('.cena[data-tipo="lema"]');
  const texto = cena.querySelector(".lema-texto");
  const destaque = texto.querySelector("em");
  const fonte = cena.querySelector(".lema-fonte");

  gsap.set([texto, destaque], { opacity: 0 });
  gsap.set(fonte, { opacity: 0, y: 12 });

  const linha = gsap.timeline({ paused: true });
  linha
    .to(texto, { opacity: 1, duration: 1.9, ease: "power1.out" })
    .to(destaque, { opacity: 1, duration: 1.6, ease: "power1.out" }, "-=0.45")
    .to(fonte, { opacity: 1, y: 0, duration: 1, ease: SUAVE }, "-=0.35");

  dispararAoEntrar(cena, "top 62%", linha);
}

/* O trilho ciano das cenas 04 e 13 é desenhado pela própria rolagem:
   o eixo do argumento sendo traçado enquanto o visitante o percorre. */
function coreografarEixos() {
  document.querySelectorAll(".cena--eixo").forEach((cena) => {
    gsap.set(cena, { "--eixo": 0 });

    gsap.to(cena, {
      "--eixo": 1,
      ease: "none",
      scrollTrigger: {
        trigger: cena,
        start: "top 78%",
        end: "bottom 65%",
        scrub: 0.6,
      },
    });
  });
}
