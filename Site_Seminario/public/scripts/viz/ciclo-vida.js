/* V9 — Ciclo de vida do canal (cena 15).

   Duas seções na mesma peça:

   1. close/range — um canal com buffer recebe três valores (o buffer
      não esvazia por causa do close: close só impede novos envios), é
      fechado, e o for range continua drenando o que já estava lá. O
      laço só encerra quando o buffer está vazio E o canal fechado — aí
      a recepção devolve o valor zero na hora, sem bloquear. Esse
      mecanismo já está detalhado a fundo na cena 16 (hchan.js); aqui é
      a versão que introduz a ideia antes do mergulho no runtime.

   2. Direção de canal como contrato de compilação — chan<- e <-chan
      não são documentação, são tipos. Violar a direção não compila.
      O texto do erro reproduz o formato real do compilador (Go 1.20+,
      pacote go/types): "invalid operation: cannot send to receive-only
      channel ch (variable of type <-chan int)" — verificado contra o
      código-fonte de teste oficial do compilador antes de entrar aqui,
      não inventado pra parecer real. */

import { realcarLinha } from "../lib/realce.js";

const CAPACIDADE = 3;

const ROTEIRO = [
  { tipo: "envia" },
  { tipo: "envia" },
  { tipo: "envia" },
  { tipo: "fecha" },
  { tipo: "recebe" },
  { tipo: "recebe" },
  { tipo: "recebe" },
  { tipo: "recebe" }, // buffer vazio + fechado: for range encerra sozinho
];

export function criarCiclo() {
  return {
    capacidade: CAPACIDADE,
    buffer: [],
    fechado: false,
    proximoValor: 1,
    passo: 0,
    evento: null,
    encerrado: false,
  };
}

function reiniciar(s) {
  s.buffer = [];
  s.fechado = false;
  s.proximoValor = 1;
  s.passo = 0;
  // Evento próprio, não null: sem isto o parágrafo do log mantinha o
  // texto "...for range encerra sozinho" do ciclo anterior, contradizendo
  // o buffer e o badge closed já reiniciados na tela.
  s.evento = { tom: "", texto: "Um novo canal com buffer 3." };
  s.encerrado = false;
}

export function avancarCiclo(s) {
  if (s.encerrado) {
    reiniciar(s);
    return s;
  }

  const acao = ROTEIRO[s.passo % ROTEIRO.length];

  if (acao.tipo === "envia") {
    const v = s.proximoValor++;
    s.buffer.push(v);
    s.evento = { tom: "", texto: `ch <- ${v} — depositado no buffer (${s.buffer.length}/${s.capacidade}).` };
  } else if (acao.tipo === "fecha") {
    s.fechado = true;
    s.evento = { tom: "fechado", texto: "close(ch). Nenhum novo envio é permitido — mas o que já está no buffer continua entregável." };
  } else if (acao.tipo === "recebe") {
    if (s.buffer.length > 0) {
      const v = s.buffer.shift();
      s.evento = { tom: "", texto: `for range recebe ${v} do buffer.` };
    } else {
      s.evento = {
        tom: "encerra",
        texto: "Buffer vazio e canal fechado: a recepção devolve o valor zero na hora, sem bloquear. O for range encerra sozinho.",
      };
      s.encerrado = true;
    }
  }

  s.passo++;
  return s;
}

/* ------------------------------------------------------------------ */

const LINHAS_DIRECAO = [
  "func consumir(ch <-chan int) {",
  "    ch <- 1",
  "}",
];
const LINHA_INVALIDA = 1;

const ERRO_COMPILADOR =
  "./main.go:2:5: invalid operation: cannot send to " +
  "receive-only channel ch (variable of type &lt;-chan int)";

function montarCicloVida(palco) {
  const s = criarCiclo();
  palco.querySelector(".palco-vazio")?.remove();

  const codigoHtml = LINHAS_DIRECAO
    .map((linha, i) => {
      const realcada = realcarLinha(linha, "go");
      return i === LINHA_INVALIDA
        ? `<span class="linha-invalida">${realcada}</span>`
        : realcada;
    })
    .join("\n");

  const raiz = document.createElement("div");
  raiz.className = "ciclo-vida";
  raiz.innerHTML = `
    <section class="ciclo-secao">
      <p class="ciclo-rotulo">close · for range</p>
      <div class="ciclo-canal">
        <div class="canal-celulas" data-ref="celulas"></div>
        <span class="campo">
          <span class="campo-nome">closed</span>
          <span class="campo-valor" data-ref="fechado">0</span>
        </span>
      </div>
      <p class="ciclo-log" data-ref="log" role="status"></p>
    </section>

    <section class="ciclo-secao">
      <p class="ciclo-rotulo">direção do canal · contrato de compilação</p>
      <pre class="codigo">${codigoHtml}</pre>
      <div class="erro-compilacao">
        <p class="erro-linha"><span class="erro-prompt">$ go build</span></p>
        <p class="erro-texto">${ERRO_COMPILADOR}</p>
        <p class="erro-nota">Erro de compilação — o programa nunca chega a rodar.</p>
      </div>
    </section>
  `;
  palco.append(raiz);

  const refs = {
    celulas: criarCelulas(raiz.querySelector('[data-ref="celulas"]'), s.capacidade),
    fechado: raiz.querySelector('[data-ref="fechado"]'),
    log: raiz.querySelector('[data-ref="log"]'),
  };

  desenharCiclo(s, refs);
  autoplayEnquantoVisivel(palco, 1200, () => {
    avancarCiclo(s);
    desenharCiclo(s, refs);
  });

  palco.simulacao = {
    get estado() { return s; },
    avancar: () => { avancarCiclo(s); desenharCiclo(s, refs); },
  };
  return palco.simulacao;
}

function criarCelulas(recipiente, n) {
  recipiente.innerHTML = Array.from({ length: n }, () => '<span class="celula"></span>').join("");
  return [...recipiente.querySelectorAll(".celula")];
}

function desenharCiclo(s, refs) {
  refs.celulas.forEach((celula, i) => {
    const valor = s.buffer[i];
    celula.textContent = valor ?? "";
    celula.dataset.estado = valor !== undefined ? "cheia" : "";
  });

  refs.fechado.textContent = s.fechado ? "1" : "0";
  refs.fechado.dataset.tom = s.fechado ? "fechado" : "";

  if (s.evento) {
    refs.log.textContent = s.evento.texto;
    refs.log.dataset.tom = s.evento.tom;
  }
}

/* Mesmo princípio de primitivas.js: laço só ativo com a cena em campo. */
function autoplayEnquantoVisivel(palco, cadenciaMs, tick) {
  let relogio = null;
  const parar = () => { clearInterval(relogio); relogio = null; };
  const iniciar = () => { if (!relogio) relogio = setInterval(tick, cadenciaMs); };

  new IntersectionObserver(
    ([entrada]) => (entrada.isIntersecting ? iniciar() : parar()),
    { threshold: 0.2 }
  ).observe(palco);
}

export { montarCicloVida };
