/* V5 — Duas faces do canal.

   modo "csp"        → a topologia: memória compartilhada contra canais
   modo "rendezvous" → a semântica de bloqueio, sob o dedo do visitante

   No canal sem buffer, enviar não é depositar: é um encontro. O
   remetente fica parado até que alguém esteja pronto para receber, e os
   dois seguem no mesmo instante. Com buffer, o remetente segue adiante
   enquanto houver espaço — e só então volta a esperar. */

export function criarCanalV5(capacidade = 0) {
  return {
    capacidade,
    buffer: [],
    remetentes: [],
    receptores: [],
    proximaGoroutine: 1,
    proximoValor: 1,
    ultimo: null,
  };
}

const anota = (s, tom, texto) => { s.ultimo = { tom, texto }; };

export function enviarV5(s) {
  const valor = s.proximoValor++;

  if (s.receptores.length > 0) {
    const r = s.receptores.shift();
    anota(s, "encontro",
      `Encontro. g${r} já esperava, então o valor ${valor} passa direto e as duas goroutines seguem no mesmo instante.`);
    return s;
  }

  if (s.buffer.length < s.capacidade) {
    s.buffer.push(valor);
    anota(s, "segue",
      `Havia espaço no buffer: o valor ${valor} foi depositado e o remetente seguiu adiante sem esperar por ninguém.`);
    return s;
  }

  const g = s.proximaGoroutine++;
  s.remetentes.push({ g, valor });
  anota(s, "bloqueio",
    s.capacidade === 0
      ? `Canal sem buffer: g${g} fica parada com o valor ${valor} na mão até que alguém receba. Enviar aqui é um encontro, não uma entrega.`
      : `Buffer cheio: g${g} fica parada até que uma posição seja liberada.`);
  return s;
}

export function receberV5(s) {
  if (s.buffer.length > 0) {
    const valor = s.buffer.shift();
    if (s.remetentes.length > 0) {
      const r = s.remetentes.shift();
      s.buffer.push(r.valor);
      anota(s, "segue",
        `Valor ${valor} retirado do buffer. Isso abriu espaço: g${r.g} acordou e depositou o valor ${r.valor}.`);
    } else {
      anota(s, "segue", `Valor ${valor} retirado do buffer, sem espera.`);
    }
    return s;
  }

  if (s.remetentes.length > 0) {
    const r = s.remetentes.shift();
    anota(s, "encontro",
      `Encontro. g${r.g} estava parada segurando o valor ${r.valor}; agora as duas seguem juntas.`);
    return s;
  }

  const g = s.proximaGoroutine++;
  s.receptores.push(g);
  anota(s, "bloqueio", `Nada para receber: g${g} fica parada até que alguém envie.`);
  return s;
}

/* ------------------------------------------------------------------ */

export function montarCanal(palco) {
  if (palco.dataset.modo === "csp") return montarTopologia(palco);
  return montarRendezvous(palco);
}

function montarRendezvous(palco) {
  let s = criarCanalV5(0);
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "canal";
  raiz.innerHTML = `
    <div class="canal-modo">
      <button type="button" class="alternativa alternativa--canal" data-cap="0" aria-pressed="true">make(chan T)</button>
      <button type="button" class="alternativa alternativa--canal" data-cap="2" aria-pressed="false">make(chan T, 2)</button>
    </div>

    <div class="canal-mesa">
      <div class="canal-lado">
        <span class="thread-nome">Remetentes parados</span>
        <div class="canal-parados" data-ref="remetentes"></div>
      </div>

      <div class="canal-tubo">
        <div class="canal-celulas" data-ref="celulas"></div>
        <span class="canal-cap" data-ref="cap"></span>
      </div>

      <div class="canal-lado">
        <span class="thread-nome">Receptores parados</span>
        <div class="canal-parados" data-ref="receptores"></div>
      </div>
    </div>

    <p class="canal-log" data-ref="log" role="status">
      Envie sem receber e veja o que acontece em cada um dos dois canais.
    </p>

    <div class="canal-controles">
      <button type="button" class="botao" data-acao="enviar">ch &lt;- valor</button>
      <button type="button" class="botao" data-acao="receber">&lt;-ch</button>
      <button type="button" class="botao botao--discreto" data-acao="reiniciar">Reiniciar</button>
    </div>
  `;
  palco.append(raiz);

  const refs = {
    celulas: raiz.querySelector('[data-ref="celulas"]'),
    cap: raiz.querySelector('[data-ref="cap"]'),
    remetentes: raiz.querySelector('[data-ref="remetentes"]'),
    receptores: raiz.querySelector('[data-ref="receptores"]'),
    log: raiz.querySelector('[data-ref="log"]'),
  };

  raiz.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-cap], [data-acao]");
    if (!alvo) return;

    if (alvo.dataset.cap !== undefined) {
      s = criarCanalV5(Number(alvo.dataset.cap));
      raiz.querySelectorAll("[data-cap]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === alvo))
      );
    } else if (alvo.dataset.acao === "enviar") enviarV5(s);
    else if (alvo.dataset.acao === "receber") receberV5(s);
    else s = criarCanalV5(s.capacidade);

    desenharRendezvous(s, refs);
  });

  desenharRendezvous(s, refs);
  palco.simulacao = {
    get estado() { return s; },
    enviar: () => { enviarV5(s); desenharRendezvous(s, refs); },
    receber: () => { receberV5(s); desenharRendezvous(s, refs); },
    capacidade: (n) => { s = criarCanalV5(n); desenharRendezvous(s, refs); },
  };
  return palco.simulacao;
}

function desenharRendezvous(s, refs) {
  if (s.capacidade === 0) {
    refs.celulas.innerHTML = '<span class="canal-sembuffer">sem buffer — o encontro é a única forma de passagem</span>';
    refs.cap.textContent = "capacidade 0";
  } else {
    refs.celulas.innerHTML = Array.from({ length: s.capacidade }, (_, i) => {
      const valor = s.buffer[i];
      return `<span class="celula" data-estado="${valor !== undefined ? "cheia" : ""}">${valor ?? ""}</span>`;
    }).join("");
    refs.cap.textContent = `${s.buffer.length} / ${s.capacidade}`;
  }

  refs.remetentes.innerHTML = s.remetentes.length
    ? s.remetentes.map((r) => `<span class="parada">g${r.g} · valor ${r.valor}</span>`).join("")
    : '<span class="fila-vazia">nenhum</span>';

  refs.receptores.innerHTML = s.receptores.length
    ? s.receptores.map((g) => `<span class="parada">g${g}</span>`).join("")
    : '<span class="fila-vazia">nenhum</span>';

  if (s.ultimo) {
    refs.log.textContent = s.ultimo.texto;
    refs.log.dataset.tom = s.ultimo.tom;
  }
}

/* ---------- Modo topologia (cena 10) ---------- */

function montarTopologia(palco) {
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "topologia";
  raiz.innerHTML = `
    <div class="canal-modo">
      <button type="button" class="alternativa alternativa--canal" data-topo="compartilhada" aria-pressed="true">Memória compartilhada</button>
      <button type="button" class="alternativa alternativa--canal" data-topo="csp" aria-pressed="false">Canais</button>
    </div>

    <svg viewBox="0 0 320 180" class="topologia-svg" data-estado="compartilhada" role="img"
         aria-label="Comparação entre quatro processos acessando uma mesma região de memória e quatro processos ligados por canais explícitos.">
      <g class="topo-ligacoes topo-ligacoes--compartilhada">
        <line x1="40" y1="40" x2="160" y2="90"/><line x1="280" y1="40" x2="160" y2="90"/>
        <line x1="40" y1="140" x2="160" y2="90"/><line x1="280" y1="140" x2="160" y2="90"/>
      </g>
      <g class="topo-ligacoes topo-ligacoes--csp">
        <line x1="40" y1="40" x2="280" y2="40"/><line x1="280" y1="40" x2="280" y2="140"/>
        <line x1="280" y1="140" x2="40" y2="140"/><line x1="40" y1="140" x2="40" y2="40"/>
      </g>
      <rect class="topo-memoria" x="126" y="72" width="68" height="36"/>
      <text class="topo-rotulo-memoria" x="160" y="95" text-anchor="middle">estado</text>
      <g class="topo-nos">
        <circle cx="40" cy="40" r="15"/><circle cx="280" cy="40" r="15"/>
        <circle cx="40" cy="140" r="15"/><circle cx="280" cy="140" r="15"/>
      </g>
    </svg>

    <p class="canal-log" data-ref="log" role="status">
      Quatro processos disputando uma mesma região: cada seta é um acesso que o programador precisa arbitrar.
    </p>
  `;
  palco.append(raiz);

  const svg = raiz.querySelector(".topologia-svg");
  const log = raiz.querySelector('[data-ref="log"]');

  raiz.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-topo]");
    if (!alvo) return;

    const estado = alvo.dataset.topo;
    svg.dataset.estado = estado;
    raiz.querySelectorAll("[data-topo]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === alvo))
    );

    log.textContent = estado === "csp"
      ? "Sem estado comum. Cada ligação é um canal explícito, e a passagem de dados é o próprio ponto de sincronização."
      : "Quatro processos disputando uma mesma região: cada seta é um acesso que o programador precisa arbitrar.";
  });

  return { svg };
}
