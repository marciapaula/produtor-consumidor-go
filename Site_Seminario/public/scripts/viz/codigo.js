/* Cena 09 (C e Java tradicionais) e cena 18 — V10, comparação C × Java × Go.

   As duas cenas são a mesma peça em escalas diferentes: blocos de código
   reais, realçados por lib/realce.js, com o número de chamadas de
   sincronização manual contado a partir do próprio bloco exibido — não
   uma afirmação solta, uma contagem do que está na tela.

   Os trechos de C e Java são o padrão de monitor clássico (mutex + variável
   de condição / synchronized + wait/notifyAll), o mesmo coberto em
   Tanenbaum e nos materiais do seminário. O de Go é a operação de canal
   equivalente: um `for range` bloqueante, nada mais — o próprio contador
   chegando a zero é o argumento da cena 18, sem precisar de texto
   declarando um vencedor. */

import { realcarBloco, contarRisco } from "../lib/realce.js";

const CODIGO_C = `pthread_mutex_lock(&mutex);
while (count == 0)
    pthread_cond_wait(&cond_full, &mutex);

item = buffer[out];
out = (out + 1) % N;
count--;

pthread_cond_signal(&cond_empty);
pthread_mutex_unlock(&mutex);`;

const CODIGO_JAVA = `synchronized (buffer) {
    while (count == 0) {
        buffer.wait();
    }
    item = buffer.remove();
    count--;
    buffer.notifyAll();
}`;

const CODIGO_GO = `for item := range canal {
    processar(item)
}`;

const COLUNAS = {
  c: { rotulo: "C · pthreads", codigo: CODIGO_C, linguagem: "c" },
  java: { rotulo: "Java · monitor", codigo: CODIGO_JAVA, linguagem: "java" },
  go: { rotulo: "Go · canal", codigo: CODIGO_GO, linguagem: "go" },
};

/* index.html mostra as cenas 09 e 18 na mesma página ao mesmo tempo —
   as duas chamam montarBlocoComparacao com as mesmas chaves de idioma,
   então o id do rótulo não pode depender só da chave (colidiria). */
let proximoIdColuna = 0;

function montarColuna({ rotulo, codigo, linguagem }) {
  const n = contarRisco(codigo, linguagem);
  const idRotulo = `comparacao-rotulo-${linguagem}-${proximoIdColuna++}`;
  return `
    <div class="comparacao-coluna" tabindex="0" role="group" aria-labelledby="${idRotulo}">
      <span class="comparacao-rotulo" id="${idRotulo}">${rotulo}</span>
      <pre class="codigo">${realcarBloco(codigo, linguagem)}</pre>
      <p class="comparacao-custo" ${n === 0 ? "data-zero" : ""}>
        <b>${n}</b> ${n === 1 ? "chamada de sincronização manual" : "chamadas de sincronização manual"}
      </p>
    </div>
  `;
}

function montarBlocoComparacao(palco, chaves) {
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "comparacao-livre";
  raiz.innerHTML = `
    <div class="comparacao-colunas" data-colunas="${chaves.length}">
      ${chaves.map((k) => montarColuna(COLUNAS[k])).join("")}
    </div>
  `;
  palco.append(raiz);
  return raiz;
}

export function montarCodigoTradicional(palco) {
  montarBlocoComparacao(palco, ["c", "java"]);
}

// A cena 19 fecha com esses mesmos números, em vez de repeti-los à
// mão: se o código de exemplo mudar aqui, o fechamento muda junto,
// sem risco de as duas cenas divergirem.
export function contagensDeRisco() {
  return Object.fromEntries(
    Object.entries(COLUNAS).map(([chave, { codigo, linguagem }]) => [
      chave,
      contarRisco(codigo, linguagem),
    ])
  );
}

export function montarComparacao(palco) {
  montarBlocoComparacao(palco, ["c", "java", "go"]);
}
