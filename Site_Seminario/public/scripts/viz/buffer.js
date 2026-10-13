/* V1 — Produtor, buffer limitado e consumidor.

   A peça central do site: aparece quatro vezes, com a mesma interface,
   mudando só o motor de sincronização. No Ato I ela roda sobre travas
   manuais e mostra toda a maquinaria que o programador precisa
   escrever; no Ato III roda sobre um canal, onde a mesma transferência
   é uma operação só.

   A simulação é uma função pura do tempo: `avancar(dt)` muda o estado
   e nada mais. A renderização lê esse estado. Isso mantém a lógica
   verificável sem depender do relógio de animação do navegador. */

const MOTORES = {
  travas: {
    // Solução clássica: um semáforo conta espaços livres, outro conta
    // itens disponíveis, e um mutex protege o buffer em si.
    envio: ["sem_wait(empty)", "lock(mutex)", "unlock(mutex)", "sem_post(full)"],
    recebimento: ["sem_wait(full)", "lock(mutex)", "unlock(mutex)", "sem_post(empty)"],
  },
  canal: {
    envio: ["ch <- item"],
    recebimento: ["<-ch"],
  },
};

export function criarSimulacao(opcoes = {}) {
  return {
    capacidade: opcoes.capacidade ?? 4,
    ritmoProdutor: opcoes.ritmoProdutor ?? 1.1,
    ritmoConsumidor: opcoes.ritmoConsumidor ?? 0.8,
    motor: opcoes.motor ?? "travas",
    ocupacao: 0,
    produzidos: 0,
    consumidos: 0,
    produtor: { fase: "produzindo", progresso: 0 },
    consumidor: { fase: "bloqueado", progresso: 0 },
    // Marcadores de transferência, para a renderização pulsar o portão
    // correspondente sem precisar inspecionar o histórico.
    entregouAgora: false,
    retirouAgora: false,
  };
}

export function avancar(s, dt) {
  s.entregouAgora = false;
  s.retirouAgora = false;

  const p = s.produtor;

  if (p.fase === "produzindo") {
    p.progresso += dt * s.ritmoProdutor;
    if (p.progresso >= 1) {
      p.progresso = 0;
      p.fase = "pronto";
    }
  }

  // Buffer cheio: o produtor espera até existir espaço. Não é erro —
  // é a primeira das duas condições críticas de sincronização.
  if (p.fase === "pronto") {
    if (s.ocupacao < s.capacidade) {
      s.ocupacao++;
      s.produzidos++;
      s.entregouAgora = true;
      p.fase = "produzindo";
    } else {
      p.fase = "bloqueado";
    }
  } else if (p.fase === "bloqueado" && s.ocupacao < s.capacidade) {
    s.ocupacao++;
    s.produzidos++;
    s.entregouAgora = true;
    p.fase = "produzindo";
  }

  const c = s.consumidor;

  if (c.fase === "consumindo") {
    c.progresso += dt * s.ritmoConsumidor;
    if (c.progresso >= 1) {
      c.progresso = 0;
      s.consumidos++;
      c.fase = "bloqueado";
    }
  }

  // Buffer vazio: o consumidor espera até existir item. A segunda
  // condição crítica.
  if (c.fase === "bloqueado" && s.ocupacao > 0) {
    s.ocupacao--;
    s.retirouAgora = true;
    c.fase = "consumindo";
  }

  return s;
}

/* ------------------------------------------------------------------ */

const MODOS = {
  apresentacao: { capacidade: 4, ritmoProdutor: 0.85, ritmoConsumidor: 0.8, motor: "travas", controles: false },
  descompasso: { capacidade: 4, ritmoProdutor: 1.6, ritmoConsumidor: 0.45, motor: "travas", controles: false },
  "interativo-travas": { capacidade: 4, ritmoProdutor: 1.1, ritmoConsumidor: 0.75, motor: "travas", controles: true },
  "interativo-canal": { capacidade: 4, ritmoProdutor: 1.1, ritmoConsumidor: 0.75, motor: "canal", controles: true },
};

export function montarBuffer(palco) {
  const modo = MODOS[palco.dataset.modo] ?? MODOS.apresentacao;
  const s = criarSimulacao(modo);
  const portoes = MOTORES[s.motor];

  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "sim";
  raiz.innerHTML = montarMarcacao(s, portoes, modo.controles);
  palco.append(raiz);

  const refs = {
    produtorEstado: raiz.querySelector('[data-ref="produtorEstado"]'),
    produtorAnel: raiz.querySelector('[data-ref="produtorAnel"]'),
    consumidorEstado: raiz.querySelector('[data-ref="consumidorEstado"]'),
    consumidorAnel: raiz.querySelector('[data-ref="consumidorAnel"]'),
    celulas: [...raiz.querySelectorAll(".celula")],
    leitura: raiz.querySelector('[data-ref="leitura"]'),
    fluxo: raiz.querySelector('[data-ref="fluxo"]'),
    trilhaEnvio: raiz.querySelector('[data-ref="trilhaEnvio"]'),
    trilhaRecebimento: raiz.querySelector('[data-ref="trilhaRecebimento"]'),
    raiz,
  };

  if (modo.controles) ligarControles(raiz, s, refs);

  let anterior = null;
  let rodando = false;
  let quadro = 0;

  const laco = (agora) => {
    if (!rodando) return;
    const dt = anterior === null ? 0 : Math.min((agora - anterior) / 1000, 0.1);
    anterior = agora;
    avancar(s, dt);
    desenhar(s, refs);
    quadro = requestAnimationFrame(laco);
  };

  // Só simula com a cena em campo: manter quatro simulações girando
  // fora da tela desperdiçaria bateria sem ninguém ver.
  new IntersectionObserver(
    ([entrada]) => {
      if (entrada.isIntersecting && !rodando) {
        rodando = true;
        anterior = null;
        quadro = requestAnimationFrame(laco);
      } else if (!entrada.isIntersecting && rodando) {
        rodando = false;
        cancelAnimationFrame(quadro);
      }
    },
    { threshold: 0.15 }
  ).observe(palco);

  desenhar(s, refs);

  // Exposto para verificação: permite avançar a simulação sem depender
  // do relógio de animação do navegador.
  palco.simulacao = { estado: s, avancar: (dt) => { avancar(s, dt); desenhar(s, refs); } };

  return palco.simulacao;
}

function montarMarcacao(s, portoes, comControles) {
  const celulas = Array.from({ length: s.capacidade }, () => '<span class="celula"></span>').join("");
  const passos = (lista) => lista.map((t) => `<span class="passo">${t}</span>`).join("");

  return `
    <div class="sim-palco">
      <div class="ator" data-papel="produtor">
        <span class="ator-nome">Produtor</span>
        <span class="ator-anel" data-ref="produtorAnel"></span>
        <span class="ator-estado" data-ref="produtorEstado">produzindo</span>
      </div>

      <div class="sim-meio">
        <div class="trilha" data-ref="trilhaEnvio">${passos(portoes.envio)}</div>
        <div class="celulas" data-ref="celulas">${celulas}</div>
        <p class="sim-leitura" data-ref="leitura"></p>
        <div class="trilha" data-ref="trilhaRecebimento">${passos(portoes.recebimento)}</div>
      </div>

      <div class="ator" data-papel="consumidor">
        <span class="ator-nome">Consumidor</span>
        <span class="ator-anel" data-ref="consumidorAnel"></span>
        <span class="ator-estado" data-ref="consumidorEstado">aguardando</span>
      </div>
    </div>

    <p class="sim-custo">
      <b data-ref="fluxo">${portoes.envio.length}</b>
      ${portoes.envio.length === 1
        ? "operação de sincronização por item, escrita pelo programador"
        : "operações de sincronização por item, escritas pelo programador"}
    </p>

    ${comControles ? montarControles(s) : ""}
  `;
}

function montarControles(s) {
  return `
    <div class="sim-controles">
      <label class="controle">
        <span class="controle-nome">Capacidade do buffer <b data-saida="capacidade">${s.capacidade}</b></span>
        <input type="range" min="1" max="8" step="1" value="${s.capacidade}" data-entrada="capacidade">
      </label>
      <label class="controle">
        <span class="controle-nome">Ritmo do produtor <b data-saida="ritmoProdutor">${s.ritmoProdutor.toFixed(2)}</b>/s</span>
        <input type="range" min="0.2" max="2.5" step="0.05" value="${s.ritmoProdutor}" data-entrada="ritmoProdutor">
      </label>
      <label class="controle">
        <span class="controle-nome">Ritmo do consumidor <b data-saida="ritmoConsumidor">${s.ritmoConsumidor.toFixed(2)}</b>/s</span>
        <input type="range" min="0.2" max="2.5" step="0.05" value="${s.ritmoConsumidor}" data-entrada="ritmoConsumidor">
      </label>
    </div>
  `;
}

function ligarControles(raiz, s, refs) {
  raiz.querySelectorAll("[data-entrada]").forEach((entrada) => {
    entrada.addEventListener("input", () => {
      const campo = entrada.dataset.entrada;
      const valor = Number(entrada.value);
      s[campo] = valor;

      const saida = raiz.querySelector(`[data-saida="${campo}"]`);
      saida.textContent = campo === "capacidade" ? valor : valor.toFixed(2);

      if (campo === "capacidade") {
        reconstruirCelulas(s, refs);
        if (s.ocupacao > valor) s.ocupacao = valor;
      }
    });
  });
}

function reconstruirCelulas(s, refs) {
  const recipiente = refs.raiz.querySelector(".celulas");
  recipiente.innerHTML = Array.from(
    { length: s.capacidade },
    () => '<span class="celula"></span>'
  ).join("");
  refs.celulas = [...recipiente.querySelectorAll(".celula")];
}

const ROTULOS = {
  produzindo: "produzindo",
  pronto: "entregando",
  bloqueado: "bloqueado",
  consumindo: "consumindo",
};

function desenhar(s, refs) {
  refs.celulas.forEach((celula, i) => {
    const cheia = i < s.ocupacao;
    const estado = cheia ? "cheia" : "";
    if (celula.dataset.estado !== estado) celula.dataset.estado = estado;
  });

  const pFase = s.produtor.fase;
  const cFase = s.consumidor.fase;

  aplicarAtor(refs.produtorEstado, refs.produtorAnel, pFase, s.produtor.progresso,
    pFase === "bloqueado" ? "bloqueado · buffer cheio" : ROTULOS[pFase]);

  aplicarAtor(refs.consumidorEstado, refs.consumidorAnel, cFase, s.consumidor.progresso,
    cFase === "bloqueado" ? "bloqueado · buffer vazio" : ROTULOS[cFase]);

  const leitura = `qcount ${s.ocupacao} / dataqsiz ${s.capacidade}  ·  ${s.produzidos} produzidos  ·  ${s.consumidos} consumidos`;
  if (refs.leitura.textContent !== leitura) refs.leitura.textContent = leitura;

  if (s.entregouAgora) pulsar(refs.trilhaEnvio);
  if (s.retirouAgora) pulsar(refs.trilhaRecebimento);
}

function aplicarAtor(alvoEstado, alvoAnel, fase, progresso, rotulo) {
  if (alvoEstado.textContent !== rotulo) alvoEstado.textContent = rotulo;
  if (alvoEstado.dataset.fase !== fase) alvoEstado.dataset.fase = fase;
  if (alvoAnel.dataset.fase !== fase) alvoAnel.dataset.fase = fase;
  alvoAnel.style.setProperty("--progresso", fase === "bloqueado" ? 1 : progresso);
}

function pulsar(trilha) {
  trilha.dataset.pulso = "1";
  // Reinicia a animação mesmo em transferências consecutivas rápidas.
  void trilha.offsetWidth;
  setTimeout(() => delete trilha.dataset.pulso, 320);
}
