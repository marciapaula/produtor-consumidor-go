/* Cena 00 — abertura.

   O vídeo tem duas vidas: enquanto o visitante não rola, ele toca em
   loop (a cena precisa chegar viva); assim que a rolagem começa, o
   tempo do vídeo passa a ser controlado por ela. A rolagem vira o
   produtor — é o scroll que enche e esvazia o canal.

   Foi para isso que o arquivo foi codificado com todos os 192 quadros
   como keyframe: buscar qualquer instante custa o mesmo.

   Duas armadilhas do ScrollTrigger estão evitadas aqui de propósito:

   1. Tudo pende de um único gatilho. Um segundo gatilho sobre o mesmo
      elemento não funcionaria, porque um elemento fixado pelo pin não
      se move com a rolagem e seu progresso ficaria travado em zero.

   2. O pin é criado de forma síncrona, junto com os gatilhos das
      demais cenas. Se esperasse os metadados do vídeo, o espaçador do
      pin entraria no layout depois que as outras cenas já tivessem
      calculado suas posições, e todas elas disparariam quase uma tela
      inteira antes da hora — animando fora do campo de visão. A
      duração do vídeo é lida no momento do uso, não na montagem. */

const LIMIAR = 0.002;

export function iniciarAbertura() {
  const cena = document.getElementById("cena-00");
  const video = cena.querySelector(".cena-video");
  const texto = cena.querySelector(".cena-abertura");
  const indicio = cena.querySelector(".indicio");

  const tocar = () => video.play().catch(() => {});

  // Em repouso o loop é obrigatório, mas várias coisas o interrompem
  // sem aviso: o pin reposiciona a cena no DOM (o que pausa mídia no
  // Chrome) e a política de autoplay pode recusar. Em vez de tratar
  // cada causa, a reprodução se recupera sozinha de qualquer pausa
  // não intencional.
  let controladoPelaRolagem = false;

  // A retomada só vale com a cena em campo. Fora dele o navegador
  // suspende o vídeo de propósito, para poupar recursos: insistir ali
  // criaria um ciclo infinito de pausa e retomada que satura o event
  // loop e congela a rolagem da página inteira.
  let emCampo = true;

  new IntersectionObserver(
    ([entrada]) => { emCampo = entrada.isIntersecting; },
    { threshold: 0.05 }
  ).observe(video);

  video.addEventListener("pause", () => {
    if (!controladoPelaRolagem && emCampo) tocar();
  });

  tocar();

  // A política de autoplay pode recusar em silêncio; a primeira
  // interação do visitante libera.
  const naPrimeiraInteracao = () => {
    tocar();
    document.removeEventListener("pointerdown", naPrimeiraInteracao);
    document.removeEventListener("keydown", naPrimeiraInteracao);
  };

  document.addEventListener("pointerdown", naPrimeiraInteracao);
  document.addEventListener("keydown", naPrimeiraInteracao);

  const alvo = { t: 0 };

  const linha = gsap.timeline({
    scrollTrigger: {
      trigger: cena,
      start: "top top",
      end: "+=130%",
      pin: true,
      scrub: 0.5,
      // Sem isto, um scroll rápido (comum no toque, num flick) pode
      // mostrar um salto de um frame antes do pin prender.
      anticipatePin: 1,
      onUpdate: (self) => {
        controladoPelaRolagem = self.progress > LIMIAR;

        if (controladoPelaRolagem) {
          if (!video.paused) video.pause();
        } else if (video.paused) {
          tocar();
        }
      },
    },
  });

  linha
    .to(alvo, {
      t: 1,
      duration: 1,
      ease: "none",
      // Só assume o comando quando a reprodução em loop já parou e a
      // duração real já é conhecida.
      onUpdate: () => {
        if (video.paused && video.duration) {
          video.currentTime = alvo.t * video.duration;
        }
      },
    }, 0)
    // A tipografia se despede na primeira metade, deixando o resto da
    // rolagem só para o vídeo.
    .to([texto, indicio], {
      opacity: 0,
      y: -48,
      duration: 0.55,
      ease: "none",
    }, 0);
}
