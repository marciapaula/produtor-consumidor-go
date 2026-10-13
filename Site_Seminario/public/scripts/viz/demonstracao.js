/* Demonstração prática (cena 17).

   Três programas completos e reais — não fragmentos — cada um compila e
   roda de verdade nas próprias ferramentas gratuitas que o link abre.
   Verificados antes de entrar na página, não só escritos e assumidos
   corretos:

   Go — enviado ao endpoint público de compilação do go.dev
   (https://go.dev/_/compile) e ao de compartilhamento
   (https://go.dev/_/share), o mesmo que o botão "Run"/"Share" do
   Playground usa. Saída conferida, permalink real gerado e resolvido
   antes de aparecer aqui embaixo.

   C e Java — carregados no embed real do OneCompiler
   (onecompiler.com/embed/c e /java) pelo mesmo mecanismo de
   postMessage que este módulo usa (populateCode), com o botão "Run"
   do próprio editor. Saída conferida nos dois.

   Go não tem embed oficial equivalente ao do OneCompiler — só o botão
   Share, que grava um permalink público. Por isso aqui é link real
   para um permalink real, não um iframe: nada inventado pra parecer
   mais integrado do que é. */

import { realcarBloco } from "../lib/realce.js";

const GO_PLAYGROUND_URL = "https://go.dev/play/p/U9MCwuryCb5";

const FONTES = {
  go: {
    nome: "Go",
    arquivo: "main.go",
    observar: "Altere capacidade, consumidores ou os tempos (tempoLento, tempoRapido, tempoConsumo) e rode de novo.",
    codigo: `// Problema Produtor-Consumidor em Go (goroutines + canal com buffer)
// Seminário C1 - Paradigmas de Linguagens de Programação
// Executa em: https://go.dev/play
//
// O produtor gera itens e os envia para um canal de capacidade finita.
// Dois consumidores retiram os itens desse mesmo canal e os processam.
// O canal já resolve as duas condições críticas do problema, sem semáforos
// nem mutex: enviar para um canal cheio espera por espaço, e receber de um
// canal vazio espera por item.
//
// A execução tem duas fases, para que as duas condições apareçam:
//   FASE 1 - produção lenta: o canal vive vazio e os consumidores esperam.
//   FASE 2 - rajada de produção: o canal enche e o produtor espera.

package main

import (
	"fmt"
	"sync"
	"time"
)

const (
	capacidade   = 3  // tamanho do buffer do canal (o N do problema)
	totalItens   = 10 // quantos itens o produtor vai gerar
	itensLentos  = 4  // os primeiros itens saem devagar (fase 1)
	consumidores = 2  // quantas goroutines consumidoras

	tempoLento   = 350 * time.Millisecond // fase 1: mais lento que o consumo
	tempoRapido  = 20 * time.Millisecond  // fase 2: bem mais rápido que o consumo
	tempoConsumo = 300 * time.Millisecond // tempo para processar um item
)

var inicio = time.Now()

// registrar imprime uma linha do log: quando, quem, como está o canal e o que houve.
func registrar(quem string, ocupados int, mensagem string) {
	fmt.Printf("[%5.2fs] %-12s | canal %d/%d | %s\\n",
		time.Since(inicio).Seconds(), quem, ocupados, capacidade, mensagem)
}

// tempoDeProducao devolve a pausa antes de gerar cada item:
// os primeiros saem devagar e os últimos saem em rajada.
func tempoDeProducao(item int) time.Duration {
	if item <= itensLentos {
		return tempoLento
	}
	return tempoRapido
}

// produtor gera os itens e os envia para o canal.
// chan<- int significa que, aqui dentro, o canal só aceita envio.
func produtor(canal chan<- int) {
	for item := 1; item <= totalItens; item++ {
		if item == itensLentos+1 {
			fmt.Println("\\n--- FASE 2: rajada de produção, o canal vai encher ---")
		}
		time.Sleep(tempoDeProducao(item)) // simula o tempo de gerar o item

		// Esta verificação é só para o log, avisando que o envio vai esperar.
		// Quem realmente faz a espera é o canal, na linha seguinte.
		if len(canal) == capacidade {
			registrar("Produtor", len(canal), "canal cheio, esperando espaço")
		}

		canal <- item // espera aqui enquanto não houver espaço livre
		registrar("Produtor", len(canal), fmt.Sprintf("produziu o item %d", item))
	}

	close(canal) // avisa os consumidores que não virão mais itens
	registrar("Produtor", len(canal), "terminou e fechou o canal")
}

// consumidor retira itens do canal até ele ser fechado e esvaziado.
// <-chan int significa que, aqui dentro, o canal só aceita recebimento.
func consumidor(id int, canal <-chan int, grupo *sync.WaitGroup) {
	defer grupo.Done() // avisa o WaitGroup quando esta goroutine terminar

	nome := fmt.Sprintf("Consumidor %d", id)

	// range recebe do canal até ele ser fechado e esvaziado, e então
	// encerra sozinho. Não é preciso testar nenhuma marcação.
	for item := range canal {
		registrar(nome, len(canal), fmt.Sprintf("consumiu o item %d", item))
		time.Sleep(tempoConsumo) // simula o processamento do item

		if len(canal) == 0 {
			registrar(nome, 0, "canal vazio, esperando item")
		}
	}

	registrar(nome, 0, "canal fechado e vazio, encerrou")
}

func main() {
	fmt.Printf("Produtor-consumidor em Go | canal de %d | %d itens | consumidores: %d\\n\\n",
		capacidade, totalItens, consumidores)
	fmt.Println("--- FASE 1: produção lenta, os consumidores vão esperar ---")

	canal := make(chan int, capacidade) // o buffer limitado do problema
	var grupo sync.WaitGroup

	go produtor(canal) // o produtor fecha o canal ao terminar

	for id := 1; id <= consumidores; id++ {
		grupo.Add(1) // registra uma goroutine a ser esperada
		go consumidor(id, canal, &grupo)
	}

	grupo.Wait() // a main espera os consumidores encerrarem

	fmt.Printf("\\nOs %d itens foram produzidos e consumidos.\\n", totalItens)
}

// Cenários para a demonstração ao vivo:
//   1. capacidade = 1    -> na fase 2 o produtor espera a cada item.
//   2. capacidade = 10   -> o canal nunca enche e o produtor nunca espera.
//   3. consumidores = 1  -> na rajada o canal fica cheio por mais tempo e o
//      produtor espera várias vezes.
//   4. comentar close(canal) e o registrar logo abaixo dele (sozinho, o
//      registrar anunciaria um fechamento que não aconteceu) -> o laço range
//      nunca termina e o runtime aborta com
//      "fatal error: all goroutines are asleep - deadlock!"`,
  },

  c: {
    nome: "C",
    arquivo: "main.c",
    observar: "Altere CAPACIDADE, CONSUMIDORES ou os tempos (TEMPO_LENTO_MS, TEMPO_RAPIDO_MS, TEMPO_CONSUMO_MS) e carregue o editor de novo.",
    codigo: `/* Problema Produtor-Consumidor em C (threads + mutex + variáveis de condição)
 * Seminário C1 - Paradigmas de Linguagens de Programação
 * Versão de comparação com a solução em Go.
 *
 * Faz exatamente o mesmo que o programa em Go, mas aqui o buffer é uma
 * estrutura na memória compartilhada: o programador precisa criar a trava,
 * as duas variáveis de condição e coordenar cada acesso na mão.
 *
 * Compilar: gcc produtor_consumidor.c -o produtor_consumidor -pthread
 * Executar: ./produtor_consumidor
 */

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <pthread.h>
#include <unistd.h>
#include <time.h>

#define CAPACIDADE 3     /* tamanho do buffer (o N do problema) */
#define TOTAL_ITENS 10   /* quantos itens o produtor vai gerar */
#define ITENS_LENTOS 4   /* os primeiros itens saem devagar (fase 1) */
#define CONSUMIDORES 2   /* quantas threads consumidoras */

#define TEMPO_LENTO_MS 350    /* fase 1: mais lento que o consumo */
#define TEMPO_RAPIDO_MS 20    /* fase 2: bem mais rápido que o consumo */
#define TEMPO_CONSUMO_MS 300  /* tempo para processar um item */

typedef struct {
    int *itens;                 /* vetor alocado dinamicamente com malloc */
    int inicio;                 /* posição de onde sai o próximo item */
    int fim;                    /* posição onde entra o próximo item */
    int tam;                    /* quantos itens estão no buffer agora */
    int fechado;                /* 1 = o produtor terminou (o close do Go) */
    pthread_mutex_t trava;      /* protege todos os campos acima */
    pthread_cond_t tem_espaco;  /* o produtor espera aqui quando está cheio */
    pthread_cond_t tem_item;    /* o consumidor espera aqui quando está vazio */
} Buffer;

typedef struct {
    int id;
    Buffer *buffer;
} DadosConsumidor;              /* argumentos de cada thread consumidora */

static struct timespec inicio_programa;

/* decorrido devolve quantos segundos se passaram desde o início do programa. */
double decorrido(void) {
    struct timespec agora;

    clock_gettime(CLOCK_MONOTONIC, &agora);
    return (agora.tv_sec - inicio_programa.tv_sec) +
           (agora.tv_nsec - inicio_programa.tv_nsec) / 1000000000.0;
}

void dormir_ms(int milissegundos) {
    usleep(milissegundos * 1000);
}

/* registrar imprime uma linha do log: quando, quem, como está o buffer e o que houve. */
void registrar(const char *quem, int ocupados, const char *mensagem) {
    printf("[%5.2fs] %-12s | buffer %d/%d | %s\\n",
           decorrido(), quem, ocupados, CAPACIDADE, mensagem);
    fflush(stdout);
}

/* criar_buffer aloca o buffer e o vetor de itens no heap, com malloc.
 * Devolve NULL quando falta memória, para a main poder avisar o usuário. */
Buffer *criar_buffer(void) {
    Buffer *buffer = malloc(sizeof(Buffer));

    if (buffer == NULL) {
        return NULL;
    }

    buffer->itens = malloc(CAPACIDADE * sizeof(int));
    if (buffer->itens == NULL) {
        free(buffer);   /* libera o que já tinha sido alocado antes de desistir */
        return NULL;
    }

    buffer->inicio = 0;
    buffer->fim = 0;
    buffer->tam = 0;
    buffer->fechado = 0;
    pthread_mutex_init(&buffer->trava, NULL);
    pthread_cond_init(&buffer->tem_espaco, NULL);
    pthread_cond_init(&buffer->tem_item, NULL);
    return buffer;
}

/* destruir_buffer libera a trava, as variáveis de condição e a memória.
 * Em Go e em Java não existe passo equivalente: o coletor de lixo cuida disso. */
void destruir_buffer(Buffer *buffer) {
    pthread_mutex_destroy(&buffer->trava);
    pthread_cond_destroy(&buffer->tem_espaco);
    pthread_cond_destroy(&buffer->tem_item);

    free(buffer->itens);   /* primeiro o vetor que está dentro da struct... */
    free(buffer);          /* ...e só depois a própria struct */
}

/* inserir coloca um item no buffer, esperando se ele estiver cheio. */
void inserir(Buffer *buffer, int item) {
    char mensagem[40];

    pthread_mutex_lock(&buffer->trava);

    if (buffer->tam == CAPACIDADE) {
        registrar("Produtor", buffer->tam, "buffer cheio, esperando espaço");
    }
    /* while, e não if: ao acordar, a condição precisa ser testada de novo,
     * porque outra thread pode ter ocupado a vaga antes desta. */
    while (buffer->tam == CAPACIDADE) {
        pthread_cond_wait(&buffer->tem_espaco, &buffer->trava);
    }

    buffer->itens[buffer->fim] = item;
    buffer->fim = (buffer->fim + 1) % CAPACIDADE;
    buffer->tam++;

    sprintf(mensagem, "produziu o item %d", item);
    registrar("Produtor", buffer->tam, mensagem);

    pthread_cond_signal(&buffer->tem_item);   /* avisa um consumidor que chegou item */
    pthread_mutex_unlock(&buffer->trava);
}

/* remover retira um item do buffer, esperando se ele estiver vazio.
 * Devolve 1 quando entregou um item e 0 quando o buffer foi fechado e esvaziado
 * (o mesmo ponto em que o laço range do Go encerra sozinho). */
int remover(Buffer *buffer, const char *quem, int *item) {
    char mensagem[40];

    pthread_mutex_lock(&buffer->trava);

    if (buffer->tam == 0 && !buffer->fechado) {
        registrar(quem, buffer->tam, "buffer vazio, esperando item");
    }
    while (buffer->tam == 0 && !buffer->fechado) {
        pthread_cond_wait(&buffer->tem_item, &buffer->trava);
    }

    if (buffer->tam == 0 && buffer->fechado) {
        pthread_mutex_unlock(&buffer->trava);
        return 0;
    }

    *item = buffer->itens[buffer->inicio];
    buffer->inicio = (buffer->inicio + 1) % CAPACIDADE;
    buffer->tam--;

    sprintf(mensagem, "consumiu o item %d", *item);
    registrar(quem, buffer->tam, mensagem);

    pthread_cond_signal(&buffer->tem_espaco); /* avisa o produtor que abriu espaço */
    pthread_mutex_unlock(&buffer->trava);
    return 1;
}

/* fechar_buffer marca o fim da produção e acorda todos os consumidores. */
void fechar_buffer(Buffer *buffer) {
    pthread_mutex_lock(&buffer->trava);

    buffer->fechado = 1;
    registrar("Produtor", buffer->tam, "terminou e fechou o buffer");
    pthread_cond_broadcast(&buffer->tem_item); /* broadcast: todos precisam acordar */

    pthread_mutex_unlock(&buffer->trava);
}

/* tempo_de_producao devolve a pausa antes de gerar cada item:
 * os primeiros saem devagar e os últimos saem em rajada. */
int tempo_de_producao(int item) {
    if (item <= ITENS_LENTOS) {
        return TEMPO_LENTO_MS;
    }
    return TEMPO_RAPIDO_MS;
}

void *produtor(void *argumento) {
    Buffer *buffer = (Buffer *) argumento;
    int item;

    for (item = 1; item <= TOTAL_ITENS; item++) {
        if (item == ITENS_LENTOS + 1) {
            printf("\\n--- FASE 2: rajada de produção, o buffer vai encher ---\\n");
        }

        dormir_ms(tempo_de_producao(item));   /* simula o tempo de gerar o item */
        inserir(buffer, item);
    }

    fechar_buffer(buffer);
    return NULL;
}

void *consumidor(void *argumento) {
    DadosConsumidor *dados = (DadosConsumidor *) argumento;
    char nome[20];
    int item;

    sprintf(nome, "Consumidor %d", dados->id);

    while (remover(dados->buffer, nome, &item)) {
        dormir_ms(TEMPO_CONSUMO_MS);   /* simula o processamento do item */
    }

    registrar(nome, 0, "buffer fechado e vazio, encerrou");
    return NULL;
}

int main(void) {
    Buffer *buffer;
    pthread_t thread_produtor;
    pthread_t threads_consumidores[CONSUMIDORES];
    DadosConsumidor dados[CONSUMIDORES];
    int i;

    setlocale(LC_ALL, "Portuguese");
    clock_gettime(CLOCK_MONOTONIC, &inicio_programa);

    printf("Produtor-consumidor em C | buffer de %d | %d itens | consumidores: %d\\n\\n",
           CAPACIDADE, TOTAL_ITENS, CONSUMIDORES);
    printf("--- FASE 1: produção lenta, os consumidores vão esperar ---\\n");

    buffer = criar_buffer();
    if (buffer == NULL) {
        printf("Erro na alocação de memória!\\n");
        return 1;
    }

    pthread_create(&thread_produtor, NULL, produtor, buffer);
    for (i = 0; i < CONSUMIDORES; i++) {
        dados[i].id = i + 1;
        dados[i].buffer = buffer;
        pthread_create(&threads_consumidores[i], NULL, consumidor, &dados[i]);
    }

    pthread_join(thread_produtor, NULL);
    for (i = 0; i < CONSUMIDORES; i++) {
        pthread_join(threads_consumidores[i], NULL);
    }

    destruir_buffer(buffer);   /* em C a limpeza é responsabilidade do programador */

    printf("\\nOs %d itens foram produzidos e consumidos.\\n", TOTAL_ITENS);
    return 0;
}`,
  },

  java: {
    nome: "Java",
    arquivo: "Main.java",
    observar: "Altere CAPACIDADE, CONSUMIDORES ou os tempos (TEMPO_LENTO_MS, TEMPO_RAPIDO_MS, TEMPO_CONSUMO_MS) e carregue o editor de novo.",
    codigo: `/* Problema Produtor-Consumidor em Java (threads + monitor: synchronized / wait / notifyAll)
 * Seminário C1 - Paradigmas de Linguagens de Programação
 * Versão de comparação com a solução em Go.
 *
 * Faz exatamente o mesmo que o programa em Go. Aqui o buffer é um objeto e a
 * trava fica embutida nele (monitor): synchronized garante uma thread por vez,
 * mas a coordenação de quem espera e quem acorda continua sendo escrita à mão.
 *
 * Compilar: javac Main.java
 * Executar: java Main
 */

import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

public class Main {

    static final int CAPACIDADE = 3;    // tamanho do buffer (o N do problema)
    static final int TOTAL_ITENS = 10;  // quantos itens o produtor vai gerar
    static final int ITENS_LENTOS = 4;  // os primeiros itens saem devagar (fase 1)
    static final int CONSUMIDORES = 2;  // quantas threads consumidoras

    static final int TEMPO_LENTO_MS = 350;    // fase 1: mais lento que o consumo
    static final int TEMPO_RAPIDO_MS = 20;    // fase 2: bem mais rápido que o consumo
    static final int TEMPO_CONSUMO_MS = 300;  // tempo para processar um item

    /* Força a saída em UTF-8: sem isto, dependendo do sistema ou do compilador
     * online, as letras acentuadas apareceriam como "?". */
    static final PrintStream saida =
            new PrintStream(System.out, true, StandardCharsets.UTF_8);

    static long inicioPrograma;

    /* registrar imprime uma linha do log: quando, quem, como está o buffer e o que houve. */
    static synchronized void registrar(String quem, int ocupados, String mensagem) {
        double decorrido = (System.nanoTime() - inicioPrograma) / 1000000000.0;

        saida.printf("[%5.2fs] %-12s | buffer %d/%d | %s%n",
                decorrido, quem, ocupados, CAPACIDADE, mensagem);
    }

    static void dormirMs(int milissegundos) {
        try {
            Thread.sleep(milissegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /* tempoDeProducao devolve a pausa antes de gerar cada item:
     * os primeiros saem devagar e os últimos saem em rajada. */
    static int tempoDeProducao(int item) {
        if (item <= ITENS_LENTOS) {
            return TEMPO_LENTO_MS;
        }
        return TEMPO_RAPIDO_MS;
    }

    /* Buffer é o monitor: todo acesso ao estado passa por métodos synchronized. */
    static class Buffer {
        private final int[] itens = new int[CAPACIDADE];
        private int inicio = 0;   // posição de onde sai o próximo item
        private int fim = 0;      // posição onde entra o próximo item
        private int tam = 0;      // quantos itens estão no buffer agora
        private boolean fechado = false;   // o close do canal em Go

        public synchronized void inserir(int item) throws InterruptedException {
            if (tam == CAPACIDADE) {
                registrar("Produtor", tam, "buffer cheio, esperando espaço");
            }
            // while, e não if: ao acordar, a condição precisa ser testada de novo.
            while (tam == CAPACIDADE) {
                wait();
            }

            itens[fim] = item;
            fim = (fim + 1) % CAPACIDADE;
            tam++;
            registrar("Produtor", tam, "produziu o item " + item);

            notifyAll();   // acorda quem esperava por item
        }

        /* remover devolve o próximo item, ou null quando o buffer foi fechado e
         * esvaziado - o mesmo ponto em que o laço range do Go encerra sozinho. */
        public synchronized Integer remover(String quem) throws InterruptedException {
            if (tam == 0 && !fechado) {
                registrar(quem, tam, "buffer vazio, esperando item");
            }
            while (tam == 0 && !fechado) {
                wait();
            }
            if (tam == 0 && fechado) {
                return null;
            }

            int item = itens[inicio];
            inicio = (inicio + 1) % CAPACIDADE;
            tam--;
            registrar(quem, tam, "consumiu o item " + item);

            notifyAll();   // acorda quem esperava por espaço
            return item;
        }

        public synchronized void fechar() {
            fechado = true;
            registrar("Produtor", tam, "terminou e fechou o buffer");
            notifyAll();   // todos os consumidores precisam acordar para encerrar
        }
    }

    static class Produtor implements Runnable {
        private final Buffer buffer;

        public Produtor(Buffer buffer) {
            this.buffer = buffer;
        }

        @Override
        public void run() {
            try {
                for (int item = 1; item <= TOTAL_ITENS; item++) {
                    if (item == ITENS_LENTOS + 1) {
                        saida.println("\\n--- FASE 2: rajada de produção, o buffer vai encher ---");
                    }

                    dormirMs(tempoDeProducao(item));   // simula o tempo de gerar o item
                    buffer.inserir(item);
                }
                buffer.fechar();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    static class Consumidor implements Runnable {
        private final int id;
        private final Buffer buffer;

        public Consumidor(int id, Buffer buffer) {
            this.id = id;
            this.buffer = buffer;
        }

        @Override
        public void run() {
            String nome = "Consumidor " + id;

            try {
                while (buffer.remover(nome) != null) {
                    dormirMs(TEMPO_CONSUMO_MS);   // simula o processamento do item
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            registrar(nome, 0, "buffer fechado e vazio, encerrou");
        }
    }

    public static void main(String[] args) throws InterruptedException {
        inicioPrograma = System.nanoTime();

        saida.printf("Produtor-consumidor em Java | buffer de %d | %d itens | consumidores: %d%n%n",
                CAPACIDADE, TOTAL_ITENS, CONSUMIDORES);
        saida.println("--- FASE 1: produção lenta, os consumidores vão esperar ---");

        Buffer buffer = new Buffer();
        Thread threadProdutor = new Thread(new Produtor(buffer));
        Thread[] threadsConsumidores = new Thread[CONSUMIDORES];

        threadProdutor.start();
        for (int i = 0; i < CONSUMIDORES; i++) {
            threadsConsumidores[i] = new Thread(new Consumidor(i + 1, buffer));
            threadsConsumidores[i].start();
        }

        threadProdutor.join();
        for (int i = 0; i < CONSUMIDORES; i++) {
            threadsConsumidores[i].join();
        }
        // Não há nada a liberar: o coletor de lixo cuida do buffer e dos objetos.

        saida.printf("%nOs %d itens foram produzidos e consumidos.%n", TOTAL_ITENS);
    }
}`,
  },
};

function montarPainel(chave) {
  const f = FONTES[chave];
  const realceLinguagem = chave === "go" ? "go" : chave;
  const codigoHtml = realcarBloco(f.codigo, realceLinguagem);

  const acoes = chave === "go"
    ? `<a class="botao" href="${GO_PLAYGROUND_URL}" target="_blank" rel="noopener noreferrer">Abrir no Go Playground</a>`
    : `<button type="button" class="botao" data-acao="carregar-editor">Carregar editor OneCompiler</button>
       <a class="botao botao--discreto" href="https://onecompiler.com/${chave}" target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>`;

  return `
    <div class="demo-painel" id="demo-painel-${chave}" data-lang="${chave}"
         role="tabpanel" aria-labelledby="demo-aba-${chave}" tabindex="0" ${chave === "go" ? "" : "hidden"}>
      <pre class="codigo demo-codigo">${codigoHtml}</pre>
      <p class="demo-observar">${f.observar}</p>
      <div class="demo-acoes">
        <button type="button" class="botao botao--discreto" data-acao="copiar" aria-live="polite">Copiar código</button>
        ${acoes}
      </div>
      <div class="demo-editor" data-ref="editor"></div>
    </div>
  `;
}

export function montarDemonstracao(palco) {
  palco.querySelector(".palco-vazio")?.remove();

  const raiz = document.createElement("div");
  raiz.className = "demo";
  raiz.innerHTML = `
    <div class="demo-abas" role="tablist" aria-label="Linguagem da demonstração">
      ${Object.entries(FONTES).map(([chave, f], i) => `
        <button type="button" class="demo-aba" role="tab" id="demo-aba-${chave}"
                aria-controls="demo-painel-${chave}" aria-selected="${i === 0}"
                tabindex="${i === 0 ? 0 : -1}" data-lang="${chave}">${f.nome}</button>
      `).join("")}
    </div>
    ${Object.keys(FONTES).map(montarPainel).join("")}
  `;
  palco.append(raiz);

  ligarAbas(raiz);
  ligarAcoes(raiz);
}

function ligarAbas(raiz) {
  const abas = [...raiz.querySelectorAll('[role="tab"]')];
  const paineis = [...raiz.querySelectorAll('[role="tabpanel"]')];

  const selecionar = (aba, focar = true) => {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute("aria-selected", String(ativa));
      a.tabIndex = ativa ? 0 : -1;
    });
    paineis.forEach((p) => { p.hidden = p.dataset.lang !== aba.dataset.lang; });
    if (focar) aba.focus();
  };

  abas.forEach((aba, i) => {
    aba.addEventListener("click", () => selecionar(aba, false));
    aba.addEventListener("keydown", (e) => {
      // preventDefault nas quatro: sem isto, o navegador também rola a
      // página nessas teclas (Home/End rolam pro topo/fim do documento
      // por padrão), competindo com a troca de aba.
      if (e.key === "ArrowRight") { e.preventDefault(); selecionar(abas[(i + 1) % abas.length]); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); selecionar(abas[(i - 1 + abas.length) % abas.length]); }
      else if (e.key === "Home") { e.preventDefault(); selecionar(abas[0]); }
      else if (e.key === "End") { e.preventDefault(); selecionar(abas[abas.length - 1]); }
    });
  });
}

const ARQUIVOS = { c: "main.c", java: "Main.java" };
const ORIGEM_ONECOMPILER = "https://onecompiler.com";
const TEMPO_LIMITE_EDITOR_MS = 9000;

function ligarAcoes(raiz) {
  raiz.addEventListener("click", async (e) => {
    const copiar = e.target.closest('[data-acao="copiar"]');
    if (copiar) {
      // Rótulo original gravado uma única vez, nunca lido de volta do
      // textContent atual — clique duplo antes do primeiro revert não
      // corrompe mais o rótulo (o segundo clique não podia mais capturar
      // "Copiado" como se fosse o original).
      if (!copiar.dataset.rotuloOriginal) copiar.dataset.rotuloOriginal = copiar.textContent;
      clearTimeout(Number(copiar.dataset.timeoutCopia));

      const codigo = copiar.closest(".demo-painel").querySelector(".demo-codigo").textContent;
      try {
        await navigator.clipboard.writeText(codigo);
        copiar.textContent = "Copiado";
      } catch {
        copiar.textContent = "Selecione e copie manualmente";
      }
      const id = setTimeout(() => { copiar.textContent = copiar.dataset.rotuloOriginal; }, 1800);
      copiar.dataset.timeoutCopia = String(id);
      return;
    }

    const carregar = e.target.closest('[data-acao="carregar-editor"]');
    if (carregar) {
      const painel = carregar.closest(".demo-painel");
      const lang = painel.dataset.lang;
      const destino = painel.querySelector('[data-ref="editor"]');
      const codigo = painel.querySelector(".demo-codigo").textContent;

      destino.innerHTML = ""; // limpa uma tentativa anterior malsucedida
      carregar.disabled = true;
      carregar.textContent = "Carregando editor…";

      const iframe = document.createElement("iframe");
      iframe.className = "demo-iframe";
      iframe.src = `${ORIGEM_ONECOMPILER}/embed/${lang}?listenToEvents=true&theme=dark`;
      iframe.title = `Editor OneCompiler — ${FONTES[lang].nome}`;
      // Sem loading="lazy": o carregamento já é sob demanda (só entra no
      // DOM neste clique). Combinar os dois atrasa o carregamento real
      // ao heurístico do navegador, que pode nunca disparar aqui dentro.

      let resolvido = false;

      // Bloqueador de anúncios, firewall de escola, DNS fora do ar: o
      // evento load pode nunca disparar. Sem isto o botão ficava preso em
      // "Carregando editor…" para sempre, sem saída a não ser o link
      // separado de nova aba.
      const tempoEsgotado = setTimeout(() => {
        if (resolvido) return;
        resolvido = true;
        iframe.remove();
        carregar.disabled = false;
        carregar.textContent = "Não carregou — tentar de novo";
      }, TEMPO_LIMITE_EDITOR_MS);

      iframe.addEventListener("load", () => {
        if (resolvido) return;
        // O app dentro do iframe precisa de um instante pra montar e
        // começar a escutar postMessage — sem isto o populateCode chega
        // cedo demais e é descartado.
        setTimeout(() => {
          if (resolvido) return;
          resolvido = true;
          clearTimeout(tempoEsgotado);
          iframe.contentWindow.postMessage({
            eventType: "populateCode",
            language: lang,
            files: [{ name: ARQUIVOS[lang], content: codigo }],
          }, ORIGEM_ONECOMPILER);
          carregar.remove();
        }, 1200);
      });

      destino.append(iframe);
    }
  });
}
