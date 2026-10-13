/* V6 — Anatomia do hchan.

   Camada interna do runtime, não comportamento garantido pela
   linguagem. Os campos e os caminhos abaixo foram conferidos em
   src/runtime/chan.go do código-fonte oficial do Go.

   A estrutura real tem mais campos do que os mostrados aqui (entre
   eles `timer` e `bubble`); exibimos os que governam a mecânica do
   buffer, das filas de espera e do bloqueio.

   O caminho que costuma surpreender: quando já existe um receptor
   estacionado na recvq, o valor NÃO passa pelo buffer. O runtime o
   copia direto para o receptor — em chan.go, "we pass the value we
   want to send directly to the receiver, bypassing the channel buffer
   (if any)", via sendDirect(). */

const TAMANHO = 3;

export function criarCanal() {
  return {
    dataqsiz: TAMANHO,
    buf: Array(TAMANHO).fill(null),
    qcount: 0,
    sendx: 0,
    recvx: 0,
    closed: false,
    sendq: [],
    recvq: [],
    proximaGoroutine: 1,
    proximoValor: 1,
    ultimo: null,
  };
}

function registrar(s, caminho, texto) {
  s.ultimo = { caminho, texto };
}

export function enviar(s) {
  if (s.closed) {
    registrar(s, "falha", "Envio em canal fechado provoca panic. Fechar é responsabilidade de quem produz.");
    return s;
  }

  const valor = s.proximoValor++;

  // Caminho 1 — receptor já esperando: entrega direta, sem buffer.
  if (s.recvq.length > 0) {
    const receptor = s.recvq.shift();
    registrar(s, "direto",
      `sendDirect — havia um receptor estacionado (g${receptor.g}). O valor ${valor} foi copiado direto para ele, sem encostar no buffer. goready(g${receptor.g}) devolve a goroutine ao escalonador.`);
    return s;
  }

  // Caminho 2 — há espaço no buffer circular.
  if (s.qcount < s.dataqsiz) {
    s.buf[s.sendx] = valor;
    s.sendx = (s.sendx + 1) % s.dataqsiz;
    s.qcount++;
    registrar(s, "buffer",
      `Valor ${valor} copiado para buf[${(s.sendx - 1 + s.dataqsiz) % s.dataqsiz}]. sendx avança circularmente e qcount sobe para ${s.qcount}.`);
    return s;
  }

  // Caminho 3 — buffer cheio: a goroutine estaciona.
  const g = s.proximaGoroutine++;
  s.sendq.push({ g, valor });
  registrar(s, "bloqueio",
    `Buffer cheio. A goroutine g${g} vira um sudog na sendq e gopark a retira do processador — sem consumir CPU, sem espera ocupada.`);
  return s;
}

export function receber(s) {
  // Caminho 1 — há item no buffer.
  if (s.qcount > 0) {
    const valor = s.buf[s.recvx];
    s.buf[s.recvx] = null;
    s.recvx = (s.recvx + 1) % s.dataqsiz;
    s.qcount--;

    // Se havia remetente estacionado, ele acorda e seu valor ocupa a
    // posição que acabou de vagar.
    if (s.sendq.length > 0) {
      const remetente = s.sendq.shift();
      s.buf[s.sendx] = remetente.valor;
      s.sendx = (s.sendx + 1) % s.dataqsiz;
      s.qcount++;
      registrar(s, "acorda",
        `Valor ${valor} lido de buf[${(s.recvx - 1 + s.dataqsiz) % s.dataqsiz}]. Havia um remetente parado: goready(g${remetente.g}) o acorda e seu valor ${remetente.valor} entra no espaço que vagou.`);
    } else {
      registrar(s, "buffer",
        `Valor ${valor} lido de buf[${(s.recvx - 1 + s.dataqsiz) % s.dataqsiz}]. recvx avança circularmente e qcount cai para ${s.qcount}.`);
    }
    return s;
  }

  // Caminho 2 — canal fechado e vazio: não bloqueia.
  if (s.closed) {
    registrar(s, "fechado",
      "Canal fechado e vazio: o recebimento devolve o valor zero do tipo imediatamente, sem bloquear. É isso que encerra o laço for range.");
    return s;
  }

  // Caminho 3 — vazio: o receptor estaciona.
  const g = s.proximaGoroutine++;
  s.recvq.push({ g });
  registrar(s, "bloqueio",
    `Buffer vazio. A goroutine g${g} vira um sudog na recvq e gopark a suspende até que alguém envie.`);
  return s;
}

export function fechar(s) {
  if (s.closed) {
    registrar(s, "falha", "Fechar um canal já fechado provoca panic.");
    return s;
  }
  s.closed = true;
  const acordados = s.recvq.length;
  s.recvq = [];
  registrar(s, "fechado",
    acordados > 0
      ? `closed = 1. Todos os ${acordados} receptores estacionados são acordados de uma vez e recebem o valor zero.`
      : "closed = 1. Nenhum receptor esperando; os próximos recebimentos não bloqueiam.");
  return s;
}

/* ------------------------------------------------------------------ */

export function montarHchan(palco) {
  let s = criarCanal();
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "hchan";
  raiz.innerHTML = `
    <div class="hchan-campos">
      <div class="campo"><span class="campo-nome">qcount</span><span class="campo-valor" data-ref="qcount">0</span></div>
      <div class="campo"><span class="campo-nome">dataqsiz</span><span class="campo-valor">${TAMANHO}</span></div>
      <div class="campo"><span class="campo-nome">sendx</span><span class="campo-valor" data-ref="sendx">0</span></div>
      <div class="campo"><span class="campo-nome">recvx</span><span class="campo-valor" data-ref="recvx">0</span></div>
      <div class="campo"><span class="campo-nome">closed</span><span class="campo-valor" data-ref="closed">0</span></div>
    </div>

    <div class="hchan-anel" data-ref="anel"></div>

    <div class="hchan-filas">
      <div class="fila">
        <span class="fila-nome">sendq <i>remetentes parados</i></span>
        <div class="fila-itens" data-ref="sendq"></div>
      </div>
      <div class="fila">
        <span class="fila-nome">recvq <i>receptores parados</i></span>
        <div class="fila-itens" data-ref="recvq"></div>
      </div>
    </div>

    <p class="hchan-log" data-ref="log" role="status">
      Envie e receba para percorrer os caminhos que o runtime executa.
    </p>

    <div class="hchan-controles">
      <button type="button" class="botao" data-acao="enviar">ch &lt;- valor</button>
      <button type="button" class="botao" data-acao="receber">&lt;-ch</button>
      <button type="button" class="botao botao--discreto" data-acao="fechar">close(ch)</button>
      <button type="button" class="botao botao--discreto" data-acao="reiniciar">Reiniciar</button>
    </div>

    <p class="hchan-aviso">
      Campos conferidos em <code>src/runtime/chan.go</code>. A estrutura real tem outros
      campos além destes; são detalhes de implementação e podem mudar entre versões.
    </p>
  `;
  palco.append(raiz);

  const refs = {
    qcount: raiz.querySelector('[data-ref="qcount"]'),
    sendx: raiz.querySelector('[data-ref="sendx"]'),
    recvx: raiz.querySelector('[data-ref="recvx"]'),
    closed: raiz.querySelector('[data-ref="closed"]'),
    anel: raiz.querySelector('[data-ref="anel"]'),
    sendq: raiz.querySelector('[data-ref="sendq"]'),
    recvq: raiz.querySelector('[data-ref="recvq"]'),
    log: raiz.querySelector('[data-ref="log"]'),
  };

  raiz.addEventListener("click", (e) => {
    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (!acao) return;

    if (acao === "enviar") enviar(s);
    else if (acao === "receber") receber(s);
    else if (acao === "fechar") fechar(s);
    else s = criarCanal();

    desenhar(s, refs);
  });

  desenhar(s, refs);
  palco.simulacao = {
    get estado() { return s; },
    enviar: () => { enviar(s); desenhar(s, refs); },
    receber: () => { receber(s); desenhar(s, refs); },
    fechar: () => { fechar(s); desenhar(s, refs); },
  };
  return palco.simulacao;
}

function desenhar(s, refs) {
  refs.qcount.textContent = s.qcount;
  refs.sendx.textContent = s.sendx;
  refs.recvx.textContent = s.recvx;
  refs.closed.textContent = s.closed ? "1" : "0";
  refs.closed.dataset.tom = s.closed ? "fechado" : "";

  refs.anel.innerHTML = s.buf
    .map((valor, i) => {
      const marcas = [];
      if (i === s.sendx) marcas.push("sendx");
      if (i === s.recvx) marcas.push("recvx");
      return `
        <div class="slot" data-ocupado="${valor !== null}">
          <span class="slot-indice">buf[${i}]</span>
          <span class="slot-valor">${valor ?? "—"}</span>
          <span class="slot-marca">${marcas.join(" · ")}</span>
        </div>`;
    })
    .join("");

  refs.sendq.innerHTML = s.sendq.length
    ? s.sendq.map((x) => `<span class="sudog">sudog g${x.g} → ${x.valor}</span>`).join("")
    : '<span class="fila-vazia">vazia</span>';

  refs.recvq.innerHTML = s.recvq.length
    ? s.recvq.map((x) => `<span class="sudog">sudog g${x.g}</span>`).join("")
    : '<span class="fila-vazia">vazia</span>';

  if (s.ultimo) {
    refs.log.textContent = s.ultimo.texto;
    refs.log.dataset.caminho = s.ultimo.caminho;
  }
}
