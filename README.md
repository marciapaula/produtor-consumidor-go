## Avaliação A2 - Paradigmas de Linguagens de Programação

### Grupo 01

#### Integrantes
- Andrei Rodrigues de Barros (33468982)
- Gabriel Silva Medeiros (32825706)
- Márcia Paula de Sousa (35835133)

## Definição do Tema

- **Paradigma:** Concorrente
- **Linguagem:** Go
- **Código do Tema:** C1
- **Descrição do Desafio:** Produtor-consumidor. Implementar o problema clássico do produtor-consumidor com goroutines (unidades de execução leves) e channels (comunicação entre elas), em vez de threads e locks explícitos. O foco é o modelo de concorrência de Go, "compartilhar memória comunicando" em vez de "comunicar compartilhando memória", comparado com threads e mutex em C e Java.

## Execução do Código

- **Ambiente Online Utilizado:** Go Playground (go.dev/play)
- **Permalink:** [https://go.dev/play/p/gJwv2ypibzx](https://go.dev/play/p/U9MCwuryCb5)
- **Site de apoio do seminário:** [https://prodconsumer.web.app](https://prodconsumer.web.app)

### Instruções de Teste (Entrada e Saída)

1. Abra o permalink acima. Não é preciso login nem instalação.
2. Clique em **Run**. A saída aparece no painel abaixo do código.
3. O programa não lê nada do teclado (stdin). A entrada são as **constantes no topo do arquivo**. Para testar outros cenários, altere um valor, clique em **Run** de novo e compare a saída.

A execução foi desenhada em duas fases, para que as duas condições críticas do problema apareçam numa única rodada:

- **Fase 1 — produção lenta (350 ms por item).** O consumo é mais rápido que a produção, o canal vive vazio e são os consumidores que esperam.
- **Fase 2 — rajada de produção (20 ms por item).** A produção supera o consumo, o canal enche até 3/3 e passa a ser o produtor que espera.

Cenários para alterar e observar:

| Alteração                                           | O que acontece                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `capacidade = 1`                                    | O produtor espera a cada item da rajada.                                                                 |
| `capacidade = 10`                                   | O canal nunca enche e o produtor nunca espera.                                                           |
| `consumidores = 1`                                  | Na rajada o canal fica cheio por mais tempo e o produtor espera várias vezes.                            |
| Comentar `close(canal)` e o `registrar` logo abaixo | O laço `range` nunca termina e o runtime aborta com `fatal error: all goroutines are asleep - deadlock!` |

No último cenário, o `registrar` logo abaixo de `close(canal)` também deve ser comentado: sozinho, ele anunciaria no log um fechamento que não aconteceu.

**Entrada de Exemplo:**

text

```text
const (
	capacidade   = 3  // tamanho do buffer do canal (o N do problema)
	totalItens   = 10 // quantos itens o produtor vai gerar
	itensLentos  = 4  // os primeiros itens saem devagar (fase 1)
	consumidores = 2  // quantas goroutines consumidoras

	tempoLento   = 350 * time.Millisecond // fase 1: mais lento que o consumo
	tempoRapido  = 20 * time.Millisecond  // fase 2: bem mais rápido que o consumo
	tempoConsumo = 300 * time.Millisecond // tempo para processar um item
)
```

**Saída Esperada:**

text

```text
Produtor-consumidor em Go | canal de 3 | 10 itens | consumidores: 2

--- FASE 1: produção lenta, os consumidores vão esperar ---
[ 0.35s] Produtor     | canal 0/3 | produziu o item 1
[ 0.35s] Consumidor 2 | canal 0/3 | consumiu o item 1
[ 0.65s] Consumidor 2 | canal 0/3 | canal vazio, esperando item
[ 0.70s] Produtor     | canal 0/3 | produziu o item 2
[ 0.70s] Consumidor 1 | canal 0/3 | consumiu o item 2
[ 1.00s] Consumidor 1 | canal 0/3 | canal vazio, esperando item
[ 1.05s] Produtor     | canal 0/3 | produziu o item 3
[ 1.05s] Consumidor 2 | canal 0/3 | consumiu o item 3
[ 1.35s] Consumidor 2 | canal 0/3 | canal vazio, esperando item
[ 1.40s] Produtor     | canal 0/3 | produziu o item 4

--- FASE 2: rajada de produção, o canal vai encher ---
[ 1.40s] Consumidor 1 | canal 0/3 | consumiu o item 4
[ 1.42s] Produtor     | canal 0/3 | produziu o item 5
[ 1.42s] Consumidor 2 | canal 0/3 | consumiu o item 5
[ 1.44s] Produtor     | canal 1/3 | produziu o item 6
[ 1.46s] Produtor     | canal 2/3 | produziu o item 7
[ 1.48s] Produtor     | canal 3/3 | produziu o item 8
[ 1.50s] Produtor     | canal 3/3 | canal cheio, esperando espaço
[ 1.70s] Consumidor 1 | canal 3/3 | consumiu o item 6
[ 1.70s] Produtor     | canal 3/3 | produziu o item 9
[ 1.72s] Produtor     | canal 3/3 | canal cheio, esperando espaço
[ 1.72s] Consumidor 2 | canal 3/3 | consumiu o item 7
[ 1.72s] Produtor     | canal 3/3 | produziu o item 10
[ 1.72s] Produtor     | canal 3/3 | terminou e fechou o canal
[ 2.01s] Consumidor 1 | canal 2/3 | consumiu o item 8
[ 2.03s] Consumidor 2 | canal 1/3 | consumiu o item 9
[ 2.31s] Consumidor 1 | canal 0/3 | consumiu o item 10
[ 2.33s] Consumidor 2 | canal 0/3 | canal vazio, esperando item
[ 2.33s] Consumidor 2 | canal 0/3 | canal fechado e vazio, encerrou
[ 2.61s] Consumidor 1 | canal 0/3 | canal vazio, esperando item
[ 2.61s] Consumidor 1 | canal 0/3 | canal fechado e vazio, encerrou

Os 10 itens foram produzidos e consumidos.
```

> Como o programa é concorrente, a ordem exata das linhas e qual consumidor recebe cada item podem variar entre execuções. O que vale em qualquer execução: cada item de 1 a 10 é enviado uma única vez e consumido uma única vez, nenhum item se perde nem se repete, o canal nunca passa de 3 posições, e a última linha é sempre `Os 10 itens foram produzidos e consumidos.`

## Relatório Técnico

### Descrição da Solução

O buffer limitado do problema clássico é o próprio **canal com buffer** de Go:

go

```go
canal := make(chan int, capacidade)
```

A solução tem três partes.

**`produtor(canal chan<- int)`** — uma goroutine que gera os itens de 1 a `totalItens`. Antes de cada item, simula o tempo de produção com `time.Sleep`, usando a função auxiliar `tempoDeProducao(item)`, que devolve a pausa longa na fase 1 e a curta na fase 2. O envio é uma única instrução:

go

```go
canal <- item // espera aqui enquanto não houver espaço livre
```

Se o canal estiver cheio, esse envio bloqueia sozinho até um consumidor liberar espaço. Ao terminar, o produtor chama `close(canal)` para avisar que não haverá mais itens.

**`consumidor(id int, canal <-chan int, grupo *sync.WaitGroup)`** — duas goroutines leem do mesmo canal com o laço idiomático:

go

```go
for item := range canal {
	// processa o item
}
```

Se o canal estiver vazio, o recebimento bloqueia até chegar um item. O laço termina sozinho quando o canal é fechado **e** esvaziado — não há flag nem teste de término escrito à mão. Cada consumidor usa `defer grupo.Done()` para avisar o `WaitGroup` quando encerra.

**`main()`** — cria o canal, dispara a goroutine produtora e as consumidoras com `go`, e usa um único `sync.WaitGroup` para esperar os consumidores. Não é preciso esperar o produtor separadamente: como ele fecha o canal ao terminar, os consumidores só encerram depois que todo o trabalho acabou.

As duas condições críticas do problema — **canal cheio** (o produtor precisa esperar) e **canal vazio** (o consumidor precisa esperar) — não aparecem no código como `if`, `while` ou variável de condição. Elas fazem parte da semântica das operações de envio e recebimento. As direções `chan<- int` (só envio) e `<-chan int` (só recebimento) fazem o compilador impedir que o consumidor envie ou que o produtor leia.

As mensagens do tipo `canal cheio, esperando espaço` existem apenas para tornar a espera visível no log: a verificação `len(canal) == capacidade` só decide o que imprimir, e quem realmente faz a espera é o canal, na instrução seguinte.

**Versões de comparação.** O grupo escreveu o mesmo programa, com o mesmo comportamento e a mesma saída, em C (`pthread`, um `pthread_mutex_t` e duas `pthread_cond_t` — `tem_espaco` e `tem_item` — sobre um buffer circular alocado com `malloc`) e em Java (monitor, com métodos `synchronized`, `wait()` e `notifyAll()` sobre um vetor circular). Os três estão na raiz do repositório e também aparecem no site do seminário.

**Estrutura do repositório:**

```
.
├── Docs/
│   ├── Paradigma01.md        # relatório técnico (texto-fonte)
│   └── Paradigma01.pdf       # relatório técnico em PDF
├── produtor_consumidor.go    # solução em Go (a do permalink)
├── produtor_consumidor.c     # versão de comparação em C
├── Main.java                 # versão de comparação em Java
├── .gitignore
└── README.md
```

### Análise Comparativa

#### 1. Sintaxe

Em Go a solução é mais curta e mais declarativa: escreve-se **o que precisa ser comunicado**, e não **como proteger a memória**. Contando apenas linhas de código (sem linhas em branco e sem comentários) dos três programas, que fazem exatamente a mesma coisa e produzem a mesma saída:

| Linguagem | Linhas de código | O que o programador manipula                                                                       |
| --------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| Go        | 67               | `chan`, `go`, `close`, `range`, `sync.WaitGroup`                                                   |
| Java      | 134              | vetor circular, índices, `synchronized`, `wait()`, `notifyAll()`, flag `fechado`                   |
| C         | 173              | vetor circular, índices, `pthread_mutex_t`, duas `pthread_cond_t`, flag `fechado`, `malloc`/`free` |

O envio de um item ilustra a diferença. Em Go:

go

```go
canal <- item
```

Em C, a mesma operação exige trancar, testar a condição em laço, escrever no buffer, atualizar os índices, sinalizar e destrancar:

c

```c
pthread_mutex_lock(&buffer->trava);
while (buffer->tam == CAPACIDADE) {
    pthread_cond_wait(&buffer->tem_espaco, &buffer->trava);
}
buffer->itens[buffer->fim] = item;
buffer->fim = (buffer->fim + 1) % CAPACIDADE;
buffer->tam++;
pthread_cond_signal(&buffer->tem_item);
pthread_mutex_unlock(&buffer->trava);
```

Em Java o padrão é o mesmo, com `synchronized`, `while (tam == CAPACIDADE) wait();` e `notifyAll()`.

No consumidor, `for item := range canal` substitui todo o protocolo de término que C e Java precisam montar à mão: a flag `fechado`, o `broadcast`/`notifyAll` final e o teste `tam == 0 && fechado`. Criar uma unidade concorrente também é mais simples — `go consumidor(id, canal, &grupo)` contra `pthread_create(&t, NULL, consumidor, &dados[i])` ou `new Thread(new Consumidor(id, buffer)).start()`.

Parte da diferença de linhas vem do log formatado, que em C exige funções próprias de alinhamento. Mas o núcleo do problema — buffer, espera e término — é o que mais encolhe: em Go são três construções da linguagem, contra três mecanismos coordenados manualmente nas outras duas.

#### 2. Semântica

**Comunicação por canais (CSP).** Go segue o modelo *Communicating Sequential Processes*, de C. A. R. Hoare (1978). As goroutines não compartilham o buffer diretamente: elas transferem a posse de cada item pelo canal. Em C e Java, as threads compartilham a mesma estrutura, e a correção depende da disciplina do programador em sempre passar pelo lock.

**Semântica de bloqueio.** Num canal com buffer, o envio bloqueia quando o buffer está cheio e o recebimento bloqueia quando está vazio. Num canal sem buffer (`make(chan int)`), cada envio só termina quando há um receptor pronto — o *rendezvous* do CSP original. Em C e Java esse comportamento precisa ser reconstruído com `while` + `wait`. Trocar o `while` por um `if`, ou inverter a ordem de duas operações de sincronização, produz exatamente os bugs clássicos: condição de corrida e impasse.

**Tipos e escopo.** Go é estática e fortemente tipada, como C e Java. A diferença é que o canal é um tipo de primeira classe e **carrega a direção no próprio tipo**: `chan<- int` só envia e `<-chan int` só recebe. Um consumidor que tentasse enviar não compilaria. Em C e Java nada impede uma thread consumidora de escrever no buffer. O escopo é léxico, com blocos e closures, e a avaliação é estrita (*eager*), como nas duas outras.

**Ciclo de vida.** `close(canal)` é uma operação da linguagem. Depois dela, o `range` drena os itens restantes e termina. Enviar para um canal fechado causa `panic` — um erro explícito, em vez de corrupção silenciosa.

**Modelo de memória.** O *Go Memory Model* garante que um envio no canal *acontece antes* (happens-before) do recebimento correspondente. Quem recebe o item enxerga tudo o que o produtor escreveu antes de enviá-lo, sem `volatile` nem barreiras de memória manuais. Em Java, a mesma garantia existe, mas depende de `synchronized` ou `volatile` usados corretamente.

**Detecção de impasse.** Se todas as goroutines ficarem bloqueadas, o runtime de Go aborta com `fatal error: all goroutines are asleep - deadlock!`. O grupo reproduziu isso comentando a linha `close(canal)` — a saída está em `codigo/saida_go_deadlock.txt`. Em C, um deadlock simplesmente congela o programa, sem mensagem.

#### 3. Gerenciamento de Memória

|                 | C                                                       | Java                                | Go                               |
| --------------- | ------------------------------------------------------- | ----------------------------------- | -------------------------------- |
| Como aloca      | `malloc` — explícito, no código                         | `new` — todo objeto vai para o heap | `make` / `new`                   |
| Quem libera     | o programador, com `free`                               | o coletor de lixo                   | o coletor de lixo                |
| Riscos          | vazamento, uso após liberação, liberação dupla          | —                                   | —                                |
| Outros recursos | `pthread_mutex_destroy` e `pthread_cond_destroy` na mão | o monitor desaparece com o objeto   | o canal desaparece com o coletor |

**C: tudo na mão.** Na versão do grupo, `criar_buffer()` aloca a struct e o vetor de itens com `malloc` e trata a falta de memória; `destruir_buffer()` destrói a trava e as duas variáveis de condição e só então libera o vetor e a struct, nessa ordem — liberar a struct primeiro perderia o endereço do vetor. A limpeza em C vai além da memória: as primitivas de sincronização também precisam ser destruídas. O programa foi verificado com Valgrind:

text

```text
total heap usage: 42 allocs, 42 frees, 16.032 bytes allocated
All heap blocks were freed -- no leaks are possible
```

**Java: alocação dinâmica sem liberação manual.** Em Java *todo* objeto é alocado dinamicamente no heap — cada `new` é uma alocação. O que não existe é o `free`: quando ninguém mais referencia o objeto, o coletor de lixo recolhe. A versão do grupo usa um vetor de `int` (primitivos), sem *boxing*.

**Go: coleta de lixo e análise de escape.** Go tem coletor de lixo concorrente, e o compilador faz análise de escape para decidir se cada valor fica na pilha ou no heap. O canal é alocado no heap pelo `make`, e os itens enviados são **copiados** para o buffer interno do canal (a estrutura `hchan` do runtime), de modo que produtor e consumidor não escrevem na mesma posição de memória ao mesmo tempo. Nenhuma linha do programa libera memória.

**Goroutines e threads.** Uma goroutine começa com uma pilha de 2 KB (`stackMin = 2048`, em `runtime/stack.go`), que cresce e encolhe sob demanda, e é escalonada pelo runtime no espaço de usuário — o modelo GMP, em que goroutines (G) são distribuídas sobre threads do sistema (M) por meio de processadores lógicos (P). Uma thread do sistema operacional, usada por C (pthreads) e pelas threads de plataforma do Java, reserva uma pilha bem maior, definida pelo sistema, e é escalonada pelo kernel. Por isso é viável criar muitas goroutines, e o número de consumidores vira apenas uma constante no código.

#### 4. Trade-offs

**Vantagens do modelo de Go para este desafio:**

- A exclusão mútua deixa de ser uma disciplina do programador e passa a ser uma propriedade da estrutura: não existe sequência de `canal <- x` / `<-canal` que deixe o buffer inconsistente.
- Menos código e menos pontos de falha: não há como esquecer um `unlock`, trocar `while` por `if` ou inverter a ordem de duas operações de sincronização.
- O término é limpo, com `close` e `range`, e a direção do canal é verificada em tempo de compilação.
- Escala melhor: goroutines são baratas, e aumentar o número de consumidores é mudar uma constante.

**Desvantagens e limites:**

- O canal **não** elimina todos os problemas de concorrência. Ainda é possível causar deadlock — por exemplo, esquecendo o `close` — e vazar goroutines que ficam bloqueadas para sempre. O grupo demonstrou o primeiro caso na prática.
- Canais não substituem todas as primitivas: o próprio `hchan` tem uma trava interna, e para proteger um estado simples, como um contador, um `sync.Mutex` costuma ser mais claro e mais rápido do que passar mensagens.
- Há menos controle fino do que em C: escalonamento e coleta de lixo ficam a cargo do runtime, o que pode pesar em sistemas de tempo real ou com memória muito restrita.

O paradigma imperativo com threads (C) dá controle total sobre memória e escalonamento, ao custo de uma sincronização manual e propensa a erros. O orientado a objetos (Java) organiza o estado em objetos e embute a trava no monitor, mas continua baseado em memória compartilhada — embora bibliotecas como `java.util.concurrent.BlockingQueue` aproximem o modelo de Go.

### Resumo da Análise Comparativa

- **Sintaxe:** em Go o buffer, o bloqueio e o término são expressos com `make(chan T, N)`, `canal <- x`, `range canal` e `close`, em 67 linhas de código, contra 134 em Java e 173 em C, que precisam de mutex, variáveis de condição, flags e laços `while` escritos à mão.
- **Semântica:** comunicação por canais (CSP) em vez de memória compartilhada. O bloqueio em "cheio" e "vazio" faz parte da semântica do canal, a direção do canal é verificada pelo compilador, e o envio *acontece antes* do recebimento. O escopo é léxico e a avaliação é estrita, como em C e Java.
- **Gerenciamento de Memória:** coleta de lixo automática, com análise de escape, e goroutines com pilha inicial de 2 KB escalonadas pelo runtime (GMP). Java também tem coletor de lixo, mas usa threads do sistema. C exige `malloc`/`free` e a destruição manual do mutex e das variáveis de condição — verificado sem vazamentos com Valgrind.
- **Trade-offs:** Go dá um código menor, mais seguro e mais escalável para o produtor-consumidor, mas ainda permite deadlocks e vazamento de goroutines, esconde uma trava interna no canal e oferece menos controle de baixo nível do que C.

## Log de Uso de Inteligência Artificial (IA)

O grupo utilizou ferramentas de IA como apoio em algumas etapas do trabalho, conforme o item 2.4 do enunciado. O quadro resume esses usos e destaca as decisões, revisões e verificações realizadas pelo grupo:

| Parte do trabalho        | Uso da IA como apoio                                                                                             | Decidido / verificado pelo grupo                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Organização do seminário | —                                                                                                                | Divisão da apresentação em três tópicos, um por integrante                                            |
| Pesquisa (`Docs/`)       | Relatórios de pesquisa sobre produtor-consumidor e concorrência em Go (Gemini, Deep Research)                    | Definição dos três tópicos e do que cada um deveria cobrir; leitura e revisão do material             |
| Roteiro dos slides       | Sugestões para organizar os tópicos e a sequência da apresentação (ChatGPT)                                     | Definição dos tópicos, divisão entre integrantes e revisão do roteiro pelo grupo                       |
| Slides (`.pptx`)         | Apoio à estruturação e à ordenação do conteúdo dos slides (ChatGPT)                                               | Montagem e ajustes finais da apresentação, além da conferência do conteúdo pelo grupo                 |
| Programas (Go, C, Java)  | Apoio pontual para compreender exemplos, esclarecer dúvidas sobre a sintaxe de Go e investigar erros na solução do produtor-consumidor (Claude) | Análise das sugestões, ajustes no código, execução dos programas e verificação dos resultados          |
| Site do seminário        | HTML/CSS/JavaScript, animações e visualizações (Claude)                                                          | Conteúdo das cenas e revisão da página publicada                                                      |
| Testes e verificação     | —                                                                                                                | Execução nos ambientes online, variação de parâmetros e conferência das fontes                        |

- **O que foi pedido à IA:** 
  1. **Pesquisa sobre o tema** (Gemini, Deep Research) — levantamento sobre o problema produtor-consumidor, concorrência em Go, modelo CSP, goroutines, canais e a comparação com threads e mutex em C e Java, a partir dos três tópicos definidos pelo grupo. O resultado está na pasta `Docs/`.
  2. **Estruturação dos slides** (ChatGPT) — apoio para organizar os tópicos e definir uma sequência clara para a apresentação. A seleção final e a adaptação da estrutura foram feitas pelo grupo.
  3. **Aprendizado da sintaxe de Go** (Claude) — como nenhum integrante tinha contato prévio com a linguagem, a IA foi consultada para compreender exemplos, esclarecer dúvidas de sintaxe e entender como goroutines e canais são utilizados na solução do problema produtor-consumidor.
  4. **Dúvidas e revisão do código** (Claude) — apoio pontual para interpretar erros e avaliar possíveis correções durante o desenvolvimento das versões em Go, C e Java. O grupo analisou as sugestões, executou os programas e conferiu os resultados para compreender o comportamento da solução.
  5. **Site do seminário** (Claude) — apoio no desenvolvimento das páginas, estilos, animações e visualizações do site.
- **Qual IA foi utilizada:** Google Gemini (Deep Research), para apoiar a pesquisa; OpenAI ChatGPT, para a estruturação dos slides; Anthropic Claude, para esclarecer dúvidas sobre a linguagem, apoiar a análise de erros no código e auxiliar no desenvolvimento do site.
- **O que foi aproveitado:** os relatórios de pesquisa da pasta `Docs/`, sugestões para organizar a sequência da apresentação, explicações e exemplos que ajudaram o grupo a compreender a sintaxe de Go e o uso de goroutines e canais, além do código do site. As sugestões relacionadas ao código foram avaliadas e conferidas por meio de testes.
- **O que foi reescrito/entendido pelo grupo:** **Organização e recorte.** O grupo definiu os três tópicos de pesquisa, dividiu a apresentação entre os integrantes e revisou a estrutura da apresentação. Entre os cuidados de integridade técnica mantidos ao longo do trabalho estão: não afirmar que canais eliminam toda condição de corrida ou deadlock, não usar números de memória ou desempenho sem fonte verificável, apresentar os detalhes do runtime como implementação atual e não como regra da linguagem, e conferir autores, citações e referências. **Aprendizado e revisão do código.** Como o grupo não tinha contato prévio com Go, utilizou a IA para esclarecer dúvidas de sintaxe, compreender exemplos e entender como goroutines e canais são aplicados ao problema produtor-consumidor. Também houve consultas pontuais para interpretar erros e avaliar possíveis ajustes. O grupo analisou as sugestões e executou os programas nos ambientes online (Go Playground e OneCompiler), variando o tamanho do buffer e o número de consumidores e removendo `close(canal)` para observar o cenário de deadlock registrado em `codigo/saida_go_deadlock.txt`. **Revisões aplicadas ao material.** Antes da entrega, o grupo conferiu algumas afirmações técnicas e corrigiu problemas de consistência. A frase sobre compartilhar memória por meio da comunicação foi conferida na documentação de Go; a afirmação de que canais eliminam condições de corrida e deadlocks foi ajustada para reconhecer que ainda podem ocorrer erros de concorrência; e as versões do programa presentes nos slides, no site e no arquivo entregue foram comparadas para manter a demonstração coerente. As fontes usadas na verificação foram a documentação oficial de Go (`go.dev/ref/mem`, `go.dev/doc/effective_go`), o código-fonte do runtime (`runtime/stack.go`, `runtime/chan.go`) e o livro *Sistemas Operacionais Modernos*, de Tanenbaum e Bos.
