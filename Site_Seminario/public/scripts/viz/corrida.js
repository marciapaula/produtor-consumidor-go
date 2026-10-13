/* V2 — Condição de corrida.

   `contador = contador + 1` parece uma operação. São três: ler, somar
   e escrever. O visitante escolhe qual thread executa o próximo passo
   e descobre sozinho que algumas ordens perdem uma atualização.

   A lição não é "concorrência quebra". É que o resultado depende de uma
   ordem que ninguém controla — e que na máquina real é decidida pelo
   escalonador, não pelo programador. */

import { animarNumero } from "../lib/animar-numero.js";

const INSTRUCOES = [
  { rotulo: "reg ← contador", curto: "ler" },
  { rotulo: "reg ← reg + 1", curto: "somar" },
  { rotulo: "contador ← reg", curto: "escrever" },
];

const INICIAL = 5;

export function criarCorrida() {
  return {
    contador: INICIAL,
    inicial: INICIAL,
    threads: [
      { nome: "T1", pc: 0, reg: null },
      { nome: "T2", pc: 0, reg: null },
    ],
    historico: [],
    placar: { corretas: 0, perdidas: 0 },
    encerrada: false,
  };
}

export function executarPasso(s, indice) {
  const t = s.threads[indice];
  if (s.encerrada || t.pc > 2) return false;

  if (t.pc === 0) t.reg = s.contador;
  else if (t.pc === 1) t.reg += 1;
  else s.contador = t.reg;

  s.historico.push({ thread: t.nome, passo: INSTRUCOES[t.pc].curto });
  t.pc++;

  if (s.threads.every((x) => x.pc > 2)) {
    s.encerrada = true;
    const esperado = s.inicial + 2;
    if (s.contador === esperado) s.placar.corretas++;
    else s.placar.perdidas++;
  }

  return true;
}

export function reiniciar(s) {
  s.contador = s.inicial;
  s.threads.forEach((t) => { t.pc = 0; t.reg = null; });
  s.historico = [];
  s.encerrada = false;
}

/* ------------------------------------------------------------------ */

export function montarCorrida(palco) {
  const s = criarCorrida();
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "corrida";
  raiz.innerHTML = `
    <div class="corrida-mesa">
      ${coluna(0)}
      <div class="corrida-memoria">
        <span class="memoria-rotulo">memória compartilhada</span>
        <span class="memoria-valor" data-ref="contador">${s.contador}</span>
        <span class="memoria-nome">contador</span>
      </div>
      ${coluna(1)}
    </div>

    <p class="corrida-veredito" data-ref="veredito" role="status">
      Execute os seis passos na ordem que quiser.
    </p>

    <div class="corrida-controles">
      <button type="button" class="botao" data-acao="0">Executar T1</button>
      <button type="button" class="botao" data-acao="1">Executar T2</button>
      <button type="button" class="botao botao--discreto" data-acao="aleatorio">Aleatório</button>
      <button type="button" class="botao botao--discreto" data-acao="reiniciar">Reiniciar</button>
    </div>

    <p class="corrida-placar" data-ref="placar"></p>

    <p class="corrida-fato">
      Das <b>20</b> ordens possíveis, apenas <b>2</b> chegam ao resultado correto:
      exatamente aquelas em que uma thread termina antes de a outra começar.
      Nas outras dezoito, uma atualização se perde.
    </p>
  `;
  palco.append(raiz);

  const refs = {
    contador: raiz.querySelector('[data-ref="contador"]'),
    veredito: raiz.querySelector('[data-ref="veredito"]'),
    placar: raiz.querySelector('[data-ref="placar"]'),
    colunas: [0, 1].map((i) => ({
      reg: raiz.querySelector(`[data-ref="reg${i}"]`),
      linhas: [...raiz.querySelectorAll(`[data-thread="${i}"] .linha`)],
      botao: raiz.querySelector(`[data-acao="${i}"]`),
    })),
  };

  raiz.addEventListener("click", (e) => {
    const acao = e.target.closest("[data-acao]")?.dataset.acao;
    if (!acao) return;

    if (acao === "reiniciar") reiniciar(s);
    else if (acao === "aleatorio") {
      const vivas = s.threads.map((t, i) => (t.pc <= 2 ? i : -1)).filter((i) => i >= 0);
      if (vivas.length) executarPasso(s, vivas[Math.floor(Math.random() * vivas.length)]);
    } else {
      executarPasso(s, Number(acao));
    }

    desenhar(s, refs);
  });

  desenhar(s, refs);
  palco.simulacao = { estado: s, executarPasso: (i) => { executarPasso(s, i); desenhar(s, refs); }, reiniciar: () => { reiniciar(s); desenhar(s, refs); } };
  return palco.simulacao;
}

function coluna(i) {
  const linhas = INSTRUCOES
    .map((ins) => `<span class="linha">${ins.rotulo}</span>`)
    .join("");

  return `
    <div class="corrida-thread" data-thread="${i}">
      <span class="thread-nome">T${i + 1}</span>
      <div class="thread-codigo">${linhas}</div>
      <span class="thread-reg">reg <b data-ref="reg${i}">—</b></span>
    </div>
  `;
}

function desenhar(s, refs) {
  // A memória compartilhada é o único número que sobe com peso: os
  // registradores das threads trocam junto com o passo (sem drama
  // próprio), mas ver o contador subir — ou, na ordem errada, ficar
  // parado onde uma escrita deveria ter mudado ele — é o próprio
  // argumento da cena.
  animarNumero(refs.contador, s.contador);

  s.threads.forEach((t, i) => {
    const c = refs.colunas[i];
    c.reg.textContent = t.reg === null ? "—" : t.reg;
    c.linhas.forEach((linha, idx) => {
      linha.dataset.estado = idx < t.pc ? "feita" : idx === t.pc ? "proxima" : "";
    });
    c.botao.disabled = t.pc > 2 || s.encerrada;
  });

  const esperado = s.inicial + 2;

  if (!s.encerrada) {
    const restantes = 6 - s.historico.length;
    refs.veredito.dataset.tom = "";
    refs.veredito.textContent = s.historico.length === 0
      ? "Execute os seis passos na ordem que quiser."
      : `${restantes} ${restantes === 1 ? "passo restante" : "passos restantes"} · ordem até aqui: ${s.historico.map((h) => h.thread + ":" + h.passo).join("  ")}`;
  } else if (s.contador === esperado) {
    refs.veredito.dataset.tom = "certo";
    refs.veredito.textContent = `contador = ${s.contador} · correto. Esta ordem funcionou — mas ninguém a garantiu.`;
  } else {
    refs.veredito.dataset.tom = "errado";
    refs.veredito.textContent = `contador = ${s.contador}, esperado ${esperado} · uma atualização foi perdida. As duas threads leram o mesmo valor antes de qualquer uma escrever.`;
  }

  const total = s.placar.corretas + s.placar.perdidas;
  refs.placar.textContent = total === 0
    ? ""
    : `${total} ${total === 1 ? "execução" : "execuções"} · ${s.placar.corretas} correta(s) · ${s.placar.perdidas} com perda`;
}
