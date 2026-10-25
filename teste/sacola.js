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
          <div class="frete"><span>Frete</span><span>Grátis</span></div>
          <div class="beneficios" id="beneficios" hidden></div>
          <div class="tot"><span>Total</span><span class="mono" id="total">R$ 0</span></div>
          <p class="parcela" id="parcela"></p>
          <button type="button" class="pagar" id="pagar" hidden>Pagar agora · até 10x sem juros</button>
          <p class="erro-pag" id="erro-pag" hidden></p>
          <a class="fechar-pedido" id="fechar-pedido" href="#" target="_blank" rel="noopener">Finalizar com uma especialista</a>
          <p id="nota-fim">Uma especialista Caya conclui o seu pedido com você: confirma os detalhes da peça, a medida e a entrega, e envia o pagamento.</p>
        </footer>
      </aside>`);
    const gaveta = $('#sacola'), veu = $('#veu'), abrir = $('#abrir-sacola');
    let usarCashback = true, pedidoPrevia = 0;   /* conta: usar o cashback disponivel e ordem das previas */
    function abrirSacola() { gaveta.dataset.aberta = veu.dataset.aberta = 'true'; abrir.setAttribute('aria-expanded', 'true'); $('#fechar-sacola').focus(); }
    function fechar() { gaveta.dataset.aberta = veu.dataset.aberta = 'false'; abrir.setAttribute('aria-expanded', 'false'); abrir.focus(); }
    abrir.onclick = abrirSacola; $('#fechar-sacola').onclick = fechar; veu.onclick = fechar;
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && gaveta.dataset.aberta === 'true') fechar(); });

    function campoAro(i, n, total) {
      let medido = null; try { medido = localStorage.getItem('caya-aro-medido'); } catch (_) {}
      const atual = (i.medidas || [])[n] || '';
      const rotulo = total > 1 ? `Aro ${n + 1}` : 'Aro';
      return `<label class="aro"><span>${rotulo}</span>
        <select data-n="${n}" aria-label="${rotulo} de ${i.nome}">
          <option value=""${atual ? '' : ' selected'}>--</option>
          ${MEDIDAS.map((m) => `<option value="${m}"${atual === m ? ' selected' : ''}>${m}${m === medido ? ' (medido)' : ''}</option>`).join('')}
        </select>${!atual && medido ? `<button type="button" class="usar-medido" data-n="${n}">Usar ${medido}</button>` : ''}</label>`;
    }

    sacola.ouvir((its) => {
      $('#qtd').textContent = sacola.quantidade();
      mostrarTotal(sacola.total());
      if (Caya.contaAtiva()) atualizarBeneficios();
      const falta = false;
      const fp = $('#fechar-pedido');
      fp.href = its.length && !falta ? pedidoWhatsApp() : '#';
      fp.setAttribute('aria-disabled', String(!its.length || falta));
      const pg = $('#pagar');
      pg.hidden = !Caya.pagamentoAtivo();
      pg.disabled = !its.length || falta;
      fp.classList.toggle('secundario', Caya.pagamentoAtivo());
      if (Caya.pagamentoAtivo()) $('#nota-fim').textContent = 'Pagamento seguro pela InfinitePay. Prefere ajuda antes? Uma especialista Caya conclui o pedido com você.';
      const l = $('#lista'); l.innerHTML = '';
      if (!its.length) { l.innerHTML = '<p class="vazia">Sua sacola está vazia.</p>'; return; }
      its.forEach((i) => {
        const n = sacola.camposAro(i);
        const d = document.createElement('div'); d.className = 'item';
        d.innerHTML = `<img src="${raiz}${i.foto}" alt=""><div><b>${i.nome}</b><small>${i.detalhe}${i.qtd > 1 ? ' · ×' + i.qtd : ''}</small><button class="rm" type="button">Remover</button></div><span class="mono">${brl(i.preco * i.qtd)}</span>
          ${n ? `<div class="aros">${Array.from({ length: n }, (_, k) => campoAro(i, k, n)).join('')}<a class="link-medir" href="${Caya.pagina('medidor')}?item=${encodeURIComponent(i.chave)}">Medir</a></div>` : ''}`;
        d.querySelector('.rm').onclick = () => sacola.remover(i.chave);
        d.querySelectorAll('select').forEach((s) => { s.onchange = () => sacola.definirAro(i.chave, +s.dataset.n, s.value); });
        d.querySelectorAll('.usar-medido').forEach((b) => { b.onclick = () => { let m = null; try { m = localStorage.getItem('caya-aro-medido'); } catch (_) {} if (m) sacola.definirAro(i.chave, +b.dataset.n, m); }; });
        l.append(d);
      });
    });
    function mostrarTotal(v) {
      $('#total').textContent = brl(v);
      $('#parcela').textContent = v ? 'ou 10x de ' + brl(Math.ceil(v / 10 * 100) / 100) + ' sem juros' : '';
    }
    /* conta ligada: desconto da primeira compra e cashback, calculados pelo servidor */
    async function atualizarBeneficios() {
      const bx = $('#beneficios'), n = ++pedidoPrevia;
      if (!sacola.itens().length) { bx.hidden = true; return; }
      let s = null; try { s = await Caya.sessao(); } catch (_) {}
      if (!s) {
        bx.hidden = false;
        bx.innerHTML = `<a class="entrar-oferta" href="${Caya.pagina('conta')}?voltar=1"><b>15% off na primeira compra</b><span>Entre ou crie sua conta</span></a>`;
        return;
      }
      let d; try { d = await Caya.previa(usarCashback); } catch (_) { return; }
      if (n !== pedidoPrevia) return;
      const L = [];
      if (d.desconto) L.push(`<div><span>Primeira compra · 15%</span><span class="mono">− ${brl(d.desconto / 100)}</span></div>`);
      if (d.saldo) L.push(`<label class="usar-cb"><input type="checkbox" id="usar-cb"${usarCashback ? ' checked' : ''}><span>Usar cashback <small>${brl(d.saldo / 100)} disponível</small></span><span class="mono">${d.cashback ? '− ' + brl(d.cashback / 100) : ''}</span></label>`);
      L.push(`<p class="ganha">Você ganha ${brl(Math.round(d.total * 0.15) / 100)} de cashback nesta compra.</p>`);
      bx.hidden = false; bx.innerHTML = L.join('');
      const cb = $('#usar-cb'); if (cb) cb.onchange = () => { usarCashback = cb.checked; atualizarBeneficios(); };
      mostrarTotal(d.total / 100);
    }
    Caya.atualizarBeneficios = atualizarBeneficios;
    $('#pagar').onclick = async () => {
      const pg = $('#pagar'), er = $('#erro-pag');
      pg.disabled = true; pg.textContent = 'Abrindo o pagamento…'; er.hidden = true;
      try { await Caya.pagar(raiz, usarCashback); }
      catch (e) { er.hidden = false; er.textContent = 'Não conseguimos abrir o pagamento agora. Tente de novo ou finalize com uma especialista.'; pg.disabled = false; pg.textContent = 'Pagar agora · até 10x sem juros'; }
    };
    Caya.abrirSacola = abrirSacola;
  };
})();
