/* Gaveta da sacola, igual em todas as paginas. Precisa de comum.js antes.
   Uso: Caya.montarSacola('../../')  (prefixo ate a raiz do site, p/ as fotos) */
(function () {
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  /* medidas brasileiras de aro mais usadas em joalheria */
  const MEDIDAS = Array.from({ length: 23 }, (_, k) => String(k + 8));

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
          <p class="falta-aro" id="falta-aro" hidden>Informe a medida do aro para finalizar.</p>
          <a class="fechar-pedido" id="fechar-pedido" href="#" target="_blank" rel="noopener">Finalizar com uma especialista</a>
          <p>Uma especialista Caya conclui o seu pedido com você: confirma os detalhes da peça, a medida e a entrega, e envia o pagamento.</p>
        </footer>
      </aside>`);
    const gaveta = $('#sacola'), veu = $('#veu'), abrir = $('#abrir-sacola');
    function abrirSacola() { gaveta.dataset.aberta = veu.dataset.aberta = 'true'; abrir.setAttribute('aria-expanded', 'true'); $('#fechar-sacola').focus(); }
    function fechar() { gaveta.dataset.aberta = veu.dataset.aberta = 'false'; abrir.setAttribute('aria-expanded', 'false'); abrir.focus(); }
    abrir.onclick = abrirSacola; $('#fechar-sacola').onclick = fechar; veu.onclick = fechar;
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && gaveta.dataset.aberta === 'true') fechar(); });

    function campoAro(i, n, total) {
      const atual = (i.medidas || [])[n] || '';
      const rotulo = total > 1 ? `Aro ${n + 1}` : 'Aro';
      return `<label class="aro"><span>${rotulo}</span>
        <select data-n="${n}" aria-label="${rotulo} de ${i.nome}">
          <option value=""${atual ? '' : ' selected'} disabled>Escolha a medida</option>
          ${MEDIDAS.map((m) => `<option value="${m}"${atual === m ? ' selected' : ''}>${m}</option>`).join('')}
          <option value="ajuda"${atual === 'ajuda' ? ' selected' : ''}>Não sei a medida</option>
        </select></label>`;
    }

    sacola.ouvir((its) => {
      $('#qtd').textContent = sacola.quantidade();
      $('#total').textContent = brl(sacola.total());
      const falta = sacola.faltaAro();
      const fp = $('#fechar-pedido');
      fp.href = its.length && !falta ? pedidoWhatsApp() : '#';
      fp.setAttribute('aria-disabled', String(!its.length || falta));
      $('#falta-aro').hidden = !(its.length && falta);
      const l = $('#lista'); l.innerHTML = '';
      if (!its.length) { l.innerHTML = '<p class="vazia">Sua sacola está vazia.</p>'; return; }
      its.forEach((i) => {
        const n = sacola.camposAro(i);
        const d = document.createElement('div'); d.className = 'item';
        d.innerHTML = `<img src="${raiz}${i.foto}" alt=""><div><b>${i.nome}</b><small>${i.detalhe}${i.qtd > 1 ? ' · ×' + i.qtd : ''}</small><button class="rm" type="button">Remover</button></div><span class="mono">${brl(i.preco * i.qtd)}</span>
          ${n ? `<div class="aros">${Array.from({ length: n }, (_, k) => campoAro(i, k, n)).join('')}</div>` : ''}`;
        d.querySelector('.rm').onclick = () => sacola.remover(i.chave);
        d.querySelectorAll('select').forEach((s) => { s.onchange = () => sacola.definirAro(i.chave, +s.dataset.n, s.value); });
        l.append(d);
      });
      const ajuda = its.some((i) => (i.medidas || []).includes('ajuda'));
      if (ajuda) l.insertAdjacentHTML('beforeend', '<p class="dica-aro">Sem problema: a especialista Caya ajuda você a descobrir a medida antes da produção.</p>');
    });
    Caya.abrirSacola = abrirSacola;
  };
})();
