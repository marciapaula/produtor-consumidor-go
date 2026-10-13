// Problema Produtor-Consumidor em Go (goroutines + canal com buffer)
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
	fmt.Printf("[%5.2fs] %-12s | canal %d/%d | %s\n",
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
			fmt.Println("\n--- FASE 2: rajada de produção, o canal vai encher ---")
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
	fmt.Printf("Produtor-consumidor em Go | canal de %d | %d itens | consumidores: %d\n\n",
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

	fmt.Printf("\nOs %d itens foram produzidos e consumidos.\n", totalItens)
}

// Cenários para a demonstração ao vivo:
//   1. capacidade = 1    -> na fase 2 o produtor espera a cada item.
//   2. capacidade = 10   -> o canal nunca enche e o produtor nunca espera.
//   3. consumidores = 1  -> na rajada o canal fica cheio por mais tempo e o
//      produtor espera várias vezes.
//   4. comentar close(canal) e o registrar logo abaixo dele (sozinho, o
//      registrar anunciaria um fechamento que não aconteceu) -> o laço range
//      nunca termina e o runtime aborta com
//      "fatal error: all goroutines are asleep - deadlock!"