/* Banner do topo: fotos que trocam devagar, legenda com link e indicadores.
   Uso: Caya.montarBanner(elemento, raiz, slides)  slides = [{img, nome, link}] */
(function () {
  const PAUSA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const TEMPO = 6000;

  Caya.montarBanner = function (box, raiz, slides) {
    /* slide com imgOuro {branco, amarelo}: segue a preferencia de ouro da cliente */
    const ouro = () => (Caya.ouroPreferido && Caya.ouroPreferido()) || 'branco';
    const nomeImg = (s) => (s.imgOuro ? s.imgOuro[ouro()] || s.imgOuro.branco : s.img);
    box.innerHTML = `
      <div class="banner-fotos" aria-roledescription="carrossel" aria-label="Destaques">
        ${slides.map((s, i) => `
          <a class="banner-slide${i === 0 ? ' ativo' : ''}" href="${s.link}" aria-hidden="${i !== 0}" tabindex="${i === 0 ? 0 : -1}">
            <picture>
              <source media="(max-width:760px)" srcset="${raiz}assets/banner/${nomeImg(s)}-16x9.webp">
              <img src="${raiz}assets/banner/${nomeImg(s)}-largo.webp" alt="${s.nome}" width="2400" height="1029" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
            </picture>
          </a>`).join('')}
      </div>
      <div class="banner-legenda">
        <a class="banner-nome" href="${slides[0].link}"><span>${slides[0].nome}</span><span class="ver">Ver</span></a>
        <div class="banner-controles">
          <div class="banner-marcas">${slides.map((s, i) => `<button type="button" aria-label="Foto ${i + 1}: ${s.nome}" aria-current="${i === 0}"><i></i></button>`).join('')}</div>
          <button type="button" class="banner-pausa" aria-label="Pausar">${PAUSA}</button>
        </div>
      </div>`;

    const fotos = [...box.querySelectorAll('.banner-slide')];
    if (Caya.aoMudarOuro) Caya.aoMudarOuro(() => {
      slides.forEach((s, i) => {
        if (!s.imgOuro) return;
        const n = nomeImg(s), f = fotos[i];
        f.querySelector('source').srcset = `${raiz}assets/banner/${n}-16x9.webp`;
        f.querySelector('img').src = `${raiz}assets/banner/${n}-largo.webp`;
      });
    });
    const marcas = [...box.querySelectorAll('.banner-marcas button')];
    const nome = box.querySelector('.banner-nome');
    const pausa = box.querySelector('.banner-pausa');
    const reduz = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let atual = 0, timer = null, parado = reduz;

    function ir(i) {
      atual = (i + slides.length) % slides.length;
      fotos.forEach((f, k) => { f.classList.toggle('ativo', k === atual); f.setAttribute('aria-hidden', String(k !== atual)); f.tabIndex = k === atual ? 0 : -1; });
      marcas.forEach((m, k) => m.setAttribute('aria-current', String(k === atual)));
      nome.href = slides[atual].link;
      nome.querySelector('span').textContent = slides[atual].nome;
      const prox = fotos[(atual + 1) % fotos.length].querySelector('img');
      prox.loading = 'eager';
      box.style.setProperty('--tempo', TEMPO + 'ms');
      box.classList.remove('rodando'); void box.offsetWidth; if (!parado) box.classList.add('rodando');
    }
    function tocar() { clearInterval(timer); if (!parado) timer = setInterval(() => ir(atual + 1), TEMPO); }
    marcas.forEach((m, k) => m.onclick = () => { ir(k); tocar(); });
    pausa.onclick = () => {
      parado = !parado;
      pausa.innerHTML = parado ? PLAY : PAUSA;
      pausa.setAttribute('aria-label', parado ? 'Tocar' : 'Pausar');
      ir(atual); tocar();
    };
    if (reduz) { pausa.innerHTML = PLAY; pausa.setAttribute('aria-label', 'Tocar'); }
    /* nao troca enquanto o mouse esta em cima ou a aba esta escondida */
    box.addEventListener('mouseenter', () => clearInterval(timer));
    box.addEventListener('mouseleave', tocar);
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(timer) : tocar());
    ir(0); tocar();
  };
})();
