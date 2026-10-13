/* Problema Produtor-Consumidor em C (threads + mutex + variáveis de condição)
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
    printf("[%5.2fs] %-12s | buffer %d/%d | %s\n",
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
            printf("\n--- FASE 2: rajada de produção, o buffer vai encher ---\n");
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

    printf("Produtor-consumidor em C | buffer de %d | %d itens | consumidores: %d\n\n",
           CAPACIDADE, TOTAL_ITENS, CONSUMIDORES);
    printf("--- FASE 1: produção lenta, os consumidores vão esperar ---\n");

    buffer = criar_buffer();
    if (buffer == NULL) {
        printf("Erro na alocação de memória!\n");
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

    printf("\nOs %d itens foram produzidos e consumidos.\n", TOTAL_ITENS);
    return 0;
}