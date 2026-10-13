/* V4 — Primitivas tradicionais.

   Duas cenas, duas fases do mesmo argumento:

   compartilhada (cena 05) → o buffer como região de memória comum, sem
   árbitro estrutural. Dois ponteiros — in de escrita, out de leitura —
   avançam de forma independente sobre o mesmo array. Nada nesta estrutura
   impede que os dois toquem a mesma posição ao mesmo tempo; essa colisão é
   o que a cena 06 (condição de corrida) em seguida aprofunda.

   primitivas (cena 07) → a resposta clássica: um semáforo conta espaços
   livres, outro conta itens disponíveis, um mutex protege o buffer. Os dois
   atores atravessam esses portões, sempre na ordem correta — a ordem que a
   cena 08 vai trocar para provocar o impasse.

   As duas rodam sozinhas (autoplay), pausadas fora da tela. A animação é
   obrigatória em toda a experiência — prefersReducedMotion() sempre
   retorna false, por decisão de produto (ver lib/prefers-motion.js) — mas
   o código continua pronto para reverter isso num só lugar, se a decisão
   mudar: os ramos abaixo que tratam reduced-motion continuam aqui, só
   inativos. */

import { prefersReducedMotion } from "../lib/prefers-motion.js";

/* ================================================================
   Cena 05 — memória compartilhada
   ================================================================ */

const CAPACIDADE_COMPARTILHADA = 6;

/* Roteiro fixo: cada quadro diz que posição o produtor grava e que posição
   o consumidor lê naquele instante. O quadro 4 é a colisão — deliberada,
   não fruto do acaso, para que o argumento da cena não dependa de sorte. */
const ROTEIRO_COMPARTILHADA = [
  { in: 0, out: 4 },
  { in: 1, out: 5 },
  { in: 2, out: 0 },
  { in: 3, out: 1 },
  { in: 4, out: 4 },
  { in: 5, out: 2 },
  { in: 0, out: 3 },
  { in: 1, out: 5 },
];

export function criarCompartilhada() {
  return {
    capacidade: CAPACIDADE_COMPARTILHADA,
    celulas: Array(CAPACIDADE_COMPARTILHADA).fill(null),
    quadro: 0,
    evento: null,
  };
}

export function avancarCompartilhada(s) {
  const passo = ROTEIRO_COMPARTILHADA[s.quadro % ROTEIRO_COMPARTILHADA.length];
  const colisao = passo.in === passo.out;

  s.celulas.fill(null);
  s.celulas[passo.in] = colisao ? "colisao" : "escrita";
  if (!colisao) s.celulas[passo.out] = "leitura";

  s.evento = colisao
    ? {
        tipo: "colisao",
        texto: `Produtor grava a posição ${passo.in} no exato instante em que o consumidor a lê. Nada nesta estrutura impede o cruzamento — evitá-lo é responsabilidade do programador.`,
      }
    : {
        tipo: "normal",
        texto: `Produtor escreve buf[${passo.in}] · consumidor lê buf[${passo.out}] — dois acessos independentes, sem árbitro entre eles.`,
      };

  s.quadro++;
  return s;
}

function montarCompartilhada(palco) {
  const s = criarCompartilhada();
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "compartilhada";
  raiz.innerHTML = `
    <div class="compartilhada-atores">
      <div class="ator-rotulo" data-papel="produtor">
        <span class="ator-nome">Produtor</span>
        <span class="ator-acao">escreve em <code>buf[in]</code></span>
      </div>

      <div class="compartilhada-buffer">
        <div class="celulas" data-ref="celulas"></div>
        <p class="compartilhada-legenda">memória única, sem trava — qualquer um acessa a qualquer instante</p>
      </div>

      <div class="ator-rotulo" data-papel="consumidor">
        <span class="ator-nome">Consumidor</span>
        <span class="ator-acao">lê de <code>buf[out]</code></span>
      </div>
    </div>

    <p class="compartilhada-log" data-ref="log" role="status"></p>
  `;
  palco.append(raiz);

  const refs = {
    celulas: [...criarCelulas(raiz.querySelector('[data-ref="celulas"]'), s.capacidade)],
    log: raiz.querySelector('[data-ref="log"]'),
  };

  if (prefersReducedMotion()) {
    // Nasce parada no quadro que já ensina o conceito: a colisão.
    s.quadro = 4;
    avancarCompartilhada(s);
    desenharCompartilhada(s, refs);
  } else {
    desenharCompartilhada(s, refs);
    autoplayEnquantoVisivel(palco, 1100, () => {
      avancarCompartilhada(s);
      desenharCompartilhada(s, refs);
    });
  }

  palco.simulacao = {
    get estado() { return s; },
    avancar: () => { avancarCompartilhada(s); desenharCompartilhada(s, refs); },
  };
  return palco.simulacao;
}

function criarCelulas(recipiente, n) {
  recipiente.innerHTML = Array.from({ length: n }, () => '<span class="celula"></span>').join("");
  return recipiente.querySelectorAll(".celula");
}

const TOM_CELULA = { escrita: "cheia", leitura: "lida", colisao: "corrompida" };

function desenharCompartilhada(s, refs) {
  refs.celulas.forEach((celula, i) => {
    const tom = TOM_CELULA[s.celulas[i]] ?? "";
    if (celula.dataset.estado !== tom) celula.dataset.estado = tom;
  });

  if (s.evento) {
    refs.log.textContent = s.evento.texto;
    refs.log.dataset.tom = s.evento.tipo === "colisao" ? "colisao" : "";
  }
}

/* ================================================================
   Cena 07 — as travas
   ================================================================ */

const CAPACIDADE_PRIMITIVAS = 3;

const PRODUTOR_PRIMITIVAS = [
  { texto: "sem_wait(empty)", tipo: "sem_wait", sem: "empty" },
  { texto: "lock(mutex)", tipo: "lock" },
  { texto: "insere item", tipo: "insere" },
  { texto: "unlock(mutex)", tipo: "unlock" },
  { texto: "sem_post(full)", tipo: "sem_post", sem: "full" },
];

const CONSUMIDOR_PRIMITIVAS = [
  { texto: "sem_wait(full)", tipo: "sem_wait", sem: "full" },
  { texto: "lock(mutex)", tipo: "lock" },
  { texto: "remove item", tipo: "remove" },
  { texto: "unlock(mutex)", tipo: "unlock" },
  { texto: "sem_post(empty)", tipo: "sem_post", sem: "empty" },
];

export function criarPrimitivas() {
  return {
    capacidade: CAPACIDADE_PRIMITIVAS,
    ocupacao: 0,
    sem: { empty: CAPACIDADE_PRIMITIVAS, full: 0 },
    mutexDono: null,
    produtor: { pc: 0, bloqueadoEm: null },
    consumidor: { pc: 0, bloqueadoEm: null },
    eventos: [],
  };
}

function programaPrimitivasDe(quem) {
  return quem === "consumidor" ? CONSUMIDOR_PRIMITIVAS : PRODUTOR_PRIMITIVAS;
}

function tentarPrimitivas(s, quem) {
  const ator = s[quem];
  const programa = programaPrimitivasDe(quem);
  const op = programa[ator.pc];

  const avancar = () => {
    ator.bloqueadoEm = null;
    ator.pc = (ator.pc + 1) % programa.length;
    s.eventos.push({ quem, texto: op.texto });
    return true;
  };

  switch (op.tipo) {
    case "sem_wait":
      if (s.sem[op.sem] > 0) { s.sem[op.sem]--; return avancar(); }
      ator.bloqueadoEm = op.texto;
      return false;

    case "lock":
      if (s.mutexDono === null) { s.mutexDono = quem; return avancar(); }
      ator.bloqueadoEm = op.texto;
      return false;

    case "insere": s.ocupacao++; return avancar();
    case "remove": s.ocupacao--; return avancar();
    case "unlock": s.mutexDono = null; return avancar();
    case "sem_post": s.sem[op.sem]++; return avancar();
  }

  return false;
}

export function avancarPrimitivas(s) {
  s.eventos = [];
  tentarPrimitivas(s, "produtor");
  tentarPrimitivas(s, "consumidor");
  return s;
}

function montarPrimitivas(palco) {
  let s = criarPrimitivas();
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "travas";
  raiz.innerHTML = `
    <div class="impasse-mesa">
      <div class="impasse-ator" data-papel="produtor">
        <span class="thread-nome">Produtor</span>
        <div class="thread-codigo" data-ref="codigoProdutor"></div>
      </div>

      <div class="impasse-recursos">
        <div class="recurso"><span class="recurso-nome">mutex</span><span class="recurso-valor" data-ref="mutex">livre</span></div>
        <div class="recurso"><span class="recurso-nome">sem empty</span><span class="recurso-valor" data-ref="empty">${CAPACIDADE_PRIMITIVAS}</span></div>
        <div class="recurso"><span class="recurso-nome">sem full</span><span class="recurso-valor" data-ref="full">0</span></div>
        <div class="recurso"><span class="recurso-nome">buffer</span><span class="recurso-valor" data-ref="buffer">0 / ${CAPACIDADE_PRIMITIVAS}</span></div>
      </div>

      <div class="impasse-ator" data-papel="consumidor">
        <span class="thread-nome">Consumidor</span>
        <div class="thread-codigo" data-ref="codigoConsumidor"></div>
      </div>
    </div>

    <p class="impasse-estado" data-ref="estado" role="status"></p>
  `;
  palco.append(raiz);

  const refs = {
    codigoProdutor: raiz.querySelector('[data-ref="codigoProdutor"]'),
    codigoConsumidor: raiz.querySelector('[data-ref="codigoConsumidor"]'),
    mutex: raiz.querySelector('[data-ref="mutex"]'),
    empty: raiz.querySelector('[data-ref="empty"]'),
    full: raiz.querySelector('[data-ref="full"]'),
    buffer: raiz.querySelector('[data-ref="buffer"]'),
    estado: raiz.querySelector('[data-ref="estado"]'),
  };

  desenharPrimitivas(s, refs);

  if (prefersReducedMotion()) {
    // Sem autoplay: o visitante avança um portão por vez, no próprio ritmo.
    // O bloco de controles só existe neste modo — vazio, deixaria um vão
    // no grid sob motion normal, que aqui não usa nenhum botão.
    const controles = document.createElement("div");
    controles.className = "impasse-controles";
    controles.innerHTML = `
      <button type="button" class="botao" data-acao="avancar">Avançar passo</button>
      <button type="button" class="botao botao--discreto" data-acao="reiniciar">Reiniciar</button>
    `;
    raiz.append(controles);

    raiz.addEventListener("click", (e) => {
      const acao = e.target.closest("[data-acao]")?.dataset.acao;
      if (!acao) return;
      if (acao === "reiniciar") s = criarPrimitivas();
      else avancarPrimitivas(s);
      desenharPrimitivas(s, refs);
    });
  } else {
    autoplayEnquantoVisivel(palco, 900, () => {
      avancarPrimitivas(s);
      desenharPrimitivas(s, refs);
    });
  }

  palco.simulacao = {
    get estado() { return s; },
    avancar: () => { avancarPrimitivas(s); desenharPrimitivas(s, refs); },
  };
  return palco.simulacao;
}

function desenharPrimitivas(s, refs) {
  refs.codigoProdutor.innerHTML = linhasPrimitivas(s, "produtor");
  refs.codigoConsumidor.innerHTML = linhasPrimitivas(s, "consumidor");

  refs.mutex.textContent = s.mutexDono ? `preso por ${s.mutexDono}` : "livre";
  refs.mutex.dataset.tom = s.mutexDono ? "ocupado" : "";
  refs.empty.textContent = s.sem.empty;
  refs.full.textContent = s.sem.full;
  refs.buffer.textContent = `${s.ocupacao} / ${s.capacidade}`;

  const { tom, texto } = descreverPrimitivas(s);
  refs.estado.dataset.tom = tom;
  refs.estado.textContent = texto;
}

function linhasPrimitivas(s, quem) {
  const ator = s[quem];
  return programaPrimitivasDe(quem)
    .map((op, i) => {
      const atual = i === ator.pc;
      const bloqueada = atual && ator.bloqueadoEm === op.texto;
      const estado = bloqueada ? "bloqueada" : atual ? "proxima" : "";
      return `<span class="linha" data-estado="${estado}">${op.texto}</span>`;
    })
    .join("");
}

function descreverPrimitivas(s) {
  if (s.eventos.length) {
    const texto = s.eventos
      .map((e) => `${e.quem === "produtor" ? "Produtor" : "Consumidor"} atravessa ${e.texto}`)
      .join(" · ");
    return { tom: "", texto: `${texto}.` };
  }

  const pB = s.produtor.bloqueadoEm;
  const cB = s.consumidor.bloqueadoEm;

  if (pB && cB) return { tom: "espera", texto: "Os dois esperando: um recurso que o outro ainda não liberou." };
  if (pB) return { tom: "espera", texto: `Produtor aguarda em ${pB}.` };
  if (cB) return { tom: "espera", texto: `Consumidor aguarda em ${cB}.` };
  return { tom: "", texto: "Cada operação passa por um portão — na ordem certa, ninguém trava." };
}

/* ================================================================
   Compartilhado entre as duas cenas
   ================================================================ */

/* Laço automático, ativo só com a cena em campo. Mesmo princípio de
   buffer.js (rAF) e impasse.js (setInterval sob clique): nunca gastar
   ciclo com uma simulação que ninguém está vendo. */
function autoplayEnquantoVisivel(palco, cadenciaMs, tick) {
  let relogio = null;
  const parar = () => { clearInterval(relogio); relogio = null; };
  const iniciar = () => { if (!relogio) relogio = setInterval(tick, cadenciaMs); };

  new IntersectionObserver(
    ([entrada]) => (entrada.isIntersecting ? iniciar() : parar()),
    { threshold: 0.2 }
  ).observe(palco);
}

export { montarCompartilhada, montarPrimitivas };
