/* Problema Produtor-Consumidor em Java (threads + monitor: synchronized / wait / notifyAll)
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
                        saida.println("\n--- FASE 2: rajada de produção, o buffer vai encher ---");
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
}