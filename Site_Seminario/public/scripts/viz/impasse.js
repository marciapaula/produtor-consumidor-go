/* V3 — Impasse por ordem errada.

   O cenário é o clássico do buffer cheio. Com a ordem correta, o
   produtor adormece *antes* de pegar o mutex, e o consumidor continua
   livre para esvaziar o buffer e acordá-lo. Com as duas primeiras
   linhas trocadas, o produtor adormece *segurando* o mutex — exatamente
   a trava que o consumidor precisa para liberar espaço.

   Ninguém falha. Ninguém trava a máquina. O programa simplesmente para,
   em silêncio. É esse silêncio que a cena precisa mostrar. */

const CONSUMIDOR = [
  { texto: "sem_wait(full)", tipo: "sem_wait", sem: "full" },
  { texto: "lock(mutex)", tipo: "lock" },
  { texto: "remove item", tipo: "remove" },
  { texto: "unlock(mutex)", tipo: "unlock" },
  { texto: "sem_post(empty)", tipo: "sem_post", sem: "empty" },
];

const PRODUTOR = [
  { texto: "sem_wait(empty)", tipo: "sem_wait", sem: "empty" },
  { texto: "lock(mutex)", tipo: "lock" },
  { texto: "insere item", tipo: "insere" },
  { texto: "unlock(mutex)", tipo: "unlock" },
  { texto: "sem_post(full)", tipo: "sem_post", sem: "full" },
];

const PRODUTOR_TROCADO = [PRODUTOR[1], PRODUTOR[0], ...PRODUTOR.slice(2)];

const CAPACIDADE = 2;

export function criarImpasse(ordemTrocada = false) {
  return {
    capacidade: CAPACIDADE,
    ocupacao: CAPACIDADE,
    // Cenário: buffer cheio. É o único momento em que a ordem importa.
    sem: { empty: 0, full: CAPACIDADE },
    mutexDono: null,
    ordemTrocada,
    produtor: { pc: 0, bloqueadoEm: null, voltas: 0 },
    consumidor: { pc: 0, bloqueadoEm: null, voltas: 0 },
    passos: 0,
    tentativasParadas: 0,
    impasse: false,
  };
}

export function programaDe(s, quem) {
  if (quem === "consumidor") return CONSUMIDOR;
  return s.ordemTrocada ? PRODUTOR_TROCADO : PRODUTOR;
}

function tentar(s, quem) {
  const ator = s[quem];
  const programa = programaDe(s, quem);
  const op = programa[ator.pc];

  const avancar = () => {
    ator.bloqueadoEm = null;
    ator.pc++;
    if (ator.pc >= programa.length) { ator.pc = 0; ator.voltas++; }
    s.passos++;
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

export function avancarImpasse(s) {
  if (s.impasse) return s;

  const p = tentar(s, "produtor");
  const c = tentar(s, "consumidor");

  // Ninguém progrediu: os dois estão esperando um pelo outro.
  if (!p && !c) {
    s.tentativasParadas++;
    if (s.tentativasParadas >= 2) s.impasse = true;
  } else {
    s.tentativasParadas = 0;
  }

  return s;
}

/* ------------------------------------------------------------------ */

export function montarImpasse(palco) {
  let s = criarImpasse(false);
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "impasse";
  raiz.innerHTML = `
    <div class="impasse-ordem">
      <button type="button" class="alternativa" data-ordem="correta" aria-pressed="true">Ordem correta</button>
      <button type="button" class="alternativa" data-ordem="trocada" aria-pressed="false">Duas linhas trocadas</button>
    </div>

    <div class="impasse-mesa">
      <div class="impasse-ator" data-papel="produtor">
        <span class="thread-nome">Produtor</span>
        <div class="thread-codigo" data-ref="codigoProdutor"></div>
      </div>

      <div class="impasse-recursos">
        <div class="recurso"><span class="recurso-nome">mutex</span><span class="recurso-valor" data-ref="mutex">livre</span></div>
        <div class="recurso"><span class="recurso-nome">sem empty</span><span class="recurso-valor" data-ref="empty">0</span></div>
        <div class="recurso"><span class="recurso-nome">sem full</span><span class="recurso-valor" data-ref="full">2</span></div>
        <div class="recurso"><span class="recurso-nome">buffer</span><span class="recurso-valor" data-ref="buffer">2 / 2</span></div>
      </div>

      <div class="impasse-ator" data-papel="consumidor">
        <span class="thread-nome">Consumidor</span>
        <div class="thread-codigo" data-ref="codigoConsumidor"></div>
      </div>
    </div>

    <p class="impasse-estado" data-ref="estado" role="status"></p>

    <div class="impasse-controles">
      <button type="button" class="botao" data-acao="rodar">Executar</button>
      <button type="button" class="botao botao--discreto" data-acao="reiniciar">Reiniciar</button>
      <span class="impasse-passos">passos executados <b data-ref="passos">0</b></span>
    </div>
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
    passos: raiz.querySelector('[data-ref="passos"]'),
    botaoRodar: raiz.querySelector('[data-acao="rodar"]'),
    raiz,
  };

  let relogio = null;
  const parar = () => { clearInterval(relogio); relogio = null; refs.botaoRodar.textContent = "Executar"; };

  const rodar = () => {
    if (relogio) { parar(); return; }
    refs.botaoRodar.textContent = "Pausar";
    relogio = setInterval(() => {
      avancarImpasse(s);
      desenhar(s, refs);
      if (s.impasse) parar();
    }, 700);
  };

  raiz.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-ordem], [data-acao]");
    if (!alvo) return;

    if (alvo.dataset.ordem) {
      parar();
      s = criarImpasse(alvo.dataset.ordem === "trocada");
      raiz.querySelectorAll("[data-ordem]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === alvo))
      );
    } else if (alvo.dataset.acao === "rodar") {
      rodar();
    } else {
      parar();
      s = criarImpasse(s.ordemTrocada);
    }

    desenhar(s, refs);
  });

  new IntersectionObserver(
    ([e]) => { if (!e.isIntersecting) parar(); },
    { threshold: 0.1 }
  ).observe(palco);

  desenhar(s, refs);

  palco.simulacao = {
    get estado() { return s; },
    avancar: () => { avancarImpasse(s); desenhar(s, refs); },
    trocarOrdem: (trocada) => { parar(); s = criarImpasse(trocada); desenhar(s, refs); },
  };
  return palco.simulacao;
}

function desenhar(s, refs) {
  refs.codigoProdutor.innerHTML = linhas(s, "produtor");
  refs.codigoConsumidor.innerHTML = linhas(s, "consumidor");

  refs.mutex.textContent = s.mutexDono ? `preso por ${s.mutexDono}` : "livre";
  refs.mutex.dataset.tom = s.mutexDono ? "ocupado" : "";
  refs.empty.textContent = s.sem.empty;
  refs.full.textContent = s.sem.full;
  refs.buffer.textContent = `${s.ocupacao} / ${s.capacidade}`;
  refs.passos.textContent = s.passos;

  if (s.impasse) {
    refs.estado.dataset.tom = "impasse";
    refs.estado.innerHTML = `
      <b>Impasse.</b> O produtor adormeceu segurando o mutex e espera por
      <code>empty</code>. O consumidor precisa desse mesmo mutex para remover
      um item e devolver <code>empty</code>. Nenhum dos dois vai acordar —
      e o contador de passos parou.`;
  } else if (s.produtor.bloqueadoEm && s.consumidor.bloqueadoEm) {
    refs.estado.dataset.tom = "espera";
    refs.estado.textContent = "Os dois esperando…";
  } else if (s.ordemTrocada) {
    refs.estado.dataset.tom = "";
    refs.estado.textContent = "O produtor pega o mutex antes de verificar se há espaço. Execute e acompanhe.";
  } else {
    refs.estado.dataset.tom = "";
    refs.estado.textContent = "O produtor espera por espaço antes de pegar o mutex — e por isso não bloqueia o consumidor.";
  }
}

function linhas(s, quem) {
  const ator = s[quem];
  return programaDe(s, quem)
    .map((op, i) => {
      const atual = i === ator.pc;
      const bloqueada = atual && ator.bloqueadoEm === op.texto;
      const estado = bloqueada ? "bloqueada" : atual ? "proxima" : "";
      return `<span class="linha" data-estado="${estado}">${op.texto}</span>`;
    })
    .join("");
}
