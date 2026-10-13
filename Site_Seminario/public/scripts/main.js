/* CANAL — ponto de entrada.
   GSAP e ScrollTrigger chegam como globais pelos scripts auto-hospedados. */

import { iniciarProgresso, iniciarIndicadorDeAto } from "./motion/scroll.js";
import { iniciarAbertura } from "./motion/hero.js";
import { iniciarCenas } from "./motion/cenas.js";
import { iniciarCursor } from "./motion/cursor.js";
import { iniciarCortina } from "./motion/cortina.js";
import { montarBuffer } from "./viz/buffer.js";
import { montarCorrida } from "./viz/corrida.js";
import { montarImpasse } from "./viz/impasse.js";
import { montarCanal } from "./viz/canal.js";
import { montarHchan } from "./viz/hchan.js";
import { montarCompartilhada, montarPrimitivas } from "./viz/primitivas.js";
import { montarCodigoTradicional, montarComparacao } from "./viz/codigo.js";
import { montarCicloVida } from "./viz/ciclo-vida.js";
import { montarDemonstracao } from "./viz/demonstracao.js";
import { montarEscalonador } from "./viz/escalonador.js";
import { montarSintese } from "./viz/sintese.js";

gsap.registerPlugin(ScrollTrigger);

// No celular, mostrar/esconder a barra de endereço muda a altura da
// janela sem o visitante ter redimensionado nada — sem isto, esse
// "resize" falso recalcula todos os gatilhos no meio da rolagem.
ScrollTrigger.config({ ignoreMobileResize: true });

// Primeiro de tudo: cobre a tela antes que qualquer outra coisa pinte.
iniciarCortina();

const VISUALIZACOES = {
  buffer: montarBuffer,
  corrida: montarCorrida,
  impasse: montarImpasse,
  canal: montarCanal,
  hchan: montarHchan,
  compartilhada: montarCompartilhada,
  primitivas: montarPrimitivas,
  "codigo-tradicional": montarCodigoTradicional,
  comparacao: montarComparacao,
  "ciclo-vida": montarCicloVida,
  demonstracao: montarDemonstracao,
  escalonador: montarEscalonador,
  sintese: montarSintese,
};

document.querySelectorAll("[data-viz]").forEach((palco) => {
  VISUALIZACOES[palco.dataset.viz]?.(palco);
});

iniciarAbertura();
iniciarCenas();
iniciarProgresso();
iniciarIndicadorDeAto();
iniciarCursor();

/* Reagir a fontes que terminam de carregar depois do primeiro cálculo:
   a troca de métrica muda a altura das cenas e invalida os gatilhos. */
document.fonts?.ready.then(() => ScrollTrigger.refresh());
