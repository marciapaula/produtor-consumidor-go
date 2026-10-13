/* V7 + V8 — Escala goroutine×thread e escalonador GMP (cena 12).

   V7: 2 KB (stackMin, runtime/stack.go — já verificado e citado na
   prosa da própria cena) contra até 8 MB (RLIMIT_STACK padrão de uma
   thread POSIX no Linux, man pthread_create). Números verificados em
   fonte primária antes de virar barra, como o briefing exige — nenhum
   dos dois é inventado nem é benchmark, são tetos de alocação inicial
   documentados.

   V8: P2, prioridade mais baixa do inventário. Peça estática — sem
   motor de estado, sem autoplay — mostrando a relação G/M/P: cada P
   (processador lógico, GOMAXPROCS) mantém fila própria de goroutines
   prontas; work-stealing é explicado na legenda, não animado. Entrada
   de cena já vem de graça da coreografia genérica em motion/cenas.js. */

const KB = 2;
const MB_THREAD = 8;
const PROPORCAO_GOROUTINE = KB / (MB_THREAD * 1024); // ~0.00024 — quase invisível de propósito

export function montarEscalonador(palco) {
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "escalonador";
  raiz.innerHTML = `
    <div class="escala">
      <div class="escala-barra">
        <span class="escala-rotulo">goroutine</span>
        <div class="escala-trilha"><div class="escala-preenchimento" style="--proporcao:${PROPORCAO_GOROUTINE}"></div></div>
        <span class="escala-valor">2 KB</span>
      </div>
      <div class="escala-barra">
        <span class="escala-rotulo">thread POSIX (Linux)</span>
        <div class="escala-trilha"><div class="escala-preenchimento" style="--proporcao:1"></div></div>
        <span class="escala-valor">até 8 MB</span>
      </div>
      <p class="escala-nota">
        Pilha inicial mínima — a goroutine cresce sob demanda, a thread reserva o teto de uma vez.
        Fontes: <code>stackMin</code> em <code>runtime/stack.go</code> e
        <code>RLIMIT_STACK</code> padrão em <code>man pthread_create</code>.
      </p>
    </div>

    <div class="gmp">
      <p class="gmp-legenda">G — goroutine&ensp;·&ensp;M — thread do SO&ensp;·&ensp;P — processador lógico (GOMAXPROCS)</p>
      <div class="gmp-processadores">
        ${montarProcessador("P0", "M0", 3)}
        ${montarProcessador("P1", "M1", 2)}
      </div>
      <p class="gmp-nota">
        Cada P mantém sua própria fila de goroutines prontas. Se a fila de um P esvazia,
        ele rouba trabalho da fila de outro P — nenhum thread do sistema fica ocioso
        enquanto há goroutine pronta em algum lugar.
      </p>
    </div>
  `;
  palco.append(raiz);
}

function montarProcessador(nomeP, nomeM, filaTamanho) {
  const fila = Array.from({ length: filaTamanho }, () => '<span class="gmp-g"></span>').join("");
  return `
    <div class="gmp-p">
      <span class="gmp-rotulo">${nomeP}</span>
      <div class="gmp-fila">${fila}</div>
      <div class="gmp-m">
        <span class="gmp-rotulo-m">${nomeM}</span>
        <span class="gmp-g gmp-g--executando"></span>
      </div>
    </div>
  `;
}
