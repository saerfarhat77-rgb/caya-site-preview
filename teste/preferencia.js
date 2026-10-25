/* Pergunta da primeira visita: ouro branco ou amarelo. A escolha vira o padrao de
   todas as pecas (Caya.definirOuro) e pode ser trocada pelo botao "Ouro" do topo.
   Precisa de comum.js antes. Uso: Caya.montarPreferencia() */
(function () {
  const COR = {
    branco: 'linear-gradient(135deg,#F4F4F2,#C9C9C6)',
    amarelo: 'linear-gradient(135deg,#F1D88F,#C9A24E)',
  };
  const NOME = { branco: 'Ouro branco', amarelo: 'Ouro amarelo' };
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

  Caya.montarPreferencia = function () {
    /* botao no topo, antes da sacola */
    const sacolaBtn = document.getElementById('abrir-sacola');
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ouro-pref';
    sacolaBtn.before(botao);
    const medir = document.createElement('a');
    medir.className = 'medir-aro';
    medir.href = Caya.pagina('medidor');
    medir.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="4"/></svg><span>Medir aro</span>';
    medir.setAttribute('aria-label', 'Medir o aro do seu anel');
    if (!Caya.naPagina('medidor')) botao.before(medir);
    if (Caya.contaAtiva()) {
      const conta = document.createElement('a');
      conta.className = 'conta-btn';
      conta.href = Caya.pagina('conta');
      conta.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>';
      conta.setAttribute('aria-label', 'Sua conta');
      conta.title = 'Sua conta';
      sacolaBtn.before(conta);
    }

    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="pref" id="pref" aria-labelledby="pref-t">
        <button type="button" class="x pref-x" aria-label="Fechar">${X}</button>
        <h2 id="pref-t" tabindex="-1" autofocus>Qual ouro você prefere?</h2>
        <p>As peças vão abrir nessa cor. Você pode trocar quando quiser, no topo da página.</p>
        <div class="pref-opcoes">
          ${['branco', 'amarelo'].map((v) => `
            <button type="button" data-v="${v}"><i style="background:${COR[v]}"></i><span>${NOME[v]}</span></button>`).join('')}
        </div>
      </dialog>`);
    const dlg = document.getElementById('pref');

    function atualizarBotao() {
      const v = Caya.ouroPreferido() || 'branco';
      botao.innerHTML = `<i style="background:${COR[v]}"></i><span>Ouro</span>`;
      botao.setAttribute('aria-label', `Preferência de ouro: ${NOME[v].toLowerCase()}. Trocar`);
      dlg.querySelectorAll('.pref-opcoes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    }
    function fechar() {
      if (dlg.open) dlg.close();
      try { sessionStorage.setItem('caya-ouro-perguntado', '1'); } catch (_) {}
    }
    dlg.querySelectorAll('.pref-opcoes button').forEach((b) => {
      b.onclick = () => { Caya.definirOuro(b.dataset.v); atualizarBotao(); fechar(); };
    });
    dlg.querySelector('.pref-x').onclick = fechar;
    dlg.addEventListener('cancel', fechar);
    dlg.addEventListener('click', (ev) => { if (ev.target === dlg) fechar(); });
    botao.onclick = () => dlg.showModal();
    atualizarBotao();

    /* pergunta so quem ainda nao escolheu (e nao fechou o quadro nesta visita) */
    let jaPerguntado = false;
    try { jaPerguntado = !!sessionStorage.getItem('caya-ouro-perguntado'); } catch (_) {}
    if (!Caya.ouroPreferido() && !jaPerguntado && !Caya.naPagina('medidor') && !Caya.naPagina('conta')) setTimeout(() => { if (!dlg.open) dlg.showModal(); }, 700);
  };
})();
