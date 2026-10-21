/* Gaveta da sacola, igual em todas as paginas. Precisa de comum.js antes.
   Uso: Caya.montarSacola('../../')  (prefixo ate a raiz do site, p/ as fotos) */
(function () {
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>';

  Caya.montarSacola = function (raiz) {
    const { brl, sacola, pedidoWhatsApp } = Caya;
    const $ = (s, r = document) => r.querySelector(s);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="veu" id="veu"></div>
      <aside class="sacola" id="sacola" aria-label="Sacola" data-aberta="false">
        <header><h2>Sacola</h2><button class="x" id="fechar-sacola" aria-label="Fechar sacola">${X}</button></header>
        <div class="lista" id="lista"></div>
        <footer>
          <div class="tot"><span>Total</span><span class="mono" id="total">R$ 0</span></div>
          <a class="fechar-pedido" id="fechar-pedido" href="#" target="_blank" rel="noopener">Fechar pedido</a>
          <p>Por enquanto o pedido é fechado pelo WhatsApp: você recebe o link de pagamento com Pix ou cartão.</p>
        </footer>
      </aside>`);
    const gaveta = $('#sacola'), veu = $('#veu'), abrir = $('#abrir-sacola');
    function abrirSacola() { gaveta.dataset.aberta = veu.dataset.aberta = 'true'; abrir.setAttribute('aria-expanded', 'true'); $('#fechar-sacola').focus(); }
    function fechar() { gaveta.dataset.aberta = veu.dataset.aberta = 'false'; abrir.setAttribute('aria-expanded', 'false'); abrir.focus(); }
    abrir.onclick = abrirSacola; $('#fechar-sacola').onclick = fechar; veu.onclick = fechar;
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && gaveta.dataset.aberta === 'true') fechar(); });

    sacola.ouvir((its) => {
      $('#qtd').textContent = sacola.quantidade();
      $('#total').textContent = brl(sacola.total());
      const fp = $('#fechar-pedido');
      fp.href = its.length ? pedidoWhatsApp() : '#';
      fp.setAttribute('aria-disabled', String(!its.length));
      const l = $('#lista'); l.innerHTML = '';
      if (!its.length) { l.innerHTML = '<p class="vazia">Sua sacola está vazia.</p>'; return; }
      its.forEach((i) => {
        const d = document.createElement('div'); d.className = 'item';
        d.innerHTML = `<img src="${raiz}${i.foto}" alt=""><div><b>${i.nome}</b><small>${i.detalhe}${i.qtd > 1 ? ' · ×' + i.qtd : ''}</small><button class="rm" type="button">Remover</button></div><span class="mono">${brl(i.preco * i.qtd)}</span>`;
        d.querySelector('.rm').onclick = () => sacola.remover(i.chave);
        l.append(d);
      });
    });
    Caya.abrirSacola = abrirSacola;
  };
})();
