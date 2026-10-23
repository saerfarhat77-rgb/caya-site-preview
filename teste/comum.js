/* Logica comum aos prototipos: variacoes, precos, sacola, endereco da escolha. */
(function () {
  const C = window.CAYA;
  const brl = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
  const nomeBanda = (id) => (C.bandas.find((b) => b.id === id) || {}).nome || id;
  const corBanda = (id) => (C.bandas.find((b) => b.id === id) || {}).cor;
  const ct = (pts) => (pts / 100).toFixed(2).replace('.', ',') + ' ct';

  function peca(id) { return C.pecas.find((p) => p.id === id); }

  function variacao(p, escolha) {
    return p.variacoes.find((v) => Object.keys(p.eixos).every((k) => v[k] === escolha[k])) || p.variacoes[0];
  }

  function rotulo(p, escolha) {
    const partes = [];
    if (escolha.pts) partes.push(p.pedras || ct(escolha.pts) + (p.pedras_rotulo ? ' ' + p.pedras_rotulo : ''));
    if (escolha.banda) partes.push('banda ' + nomeBanda(escolha.banda).toLowerCase());
    if (escolha.ouro) partes.push('ouro ' + escolha.ouro);
    return partes.join(' · ');
  }

  function aPartirDe(p) { return Math.min(...p.variacoes.map((v) => v.preco)); }

  /* ouro preferido da cliente: vira o padrao de toda peca que tem escolha de ouro */
  const CHAVE_OURO = 'caya-ouro';
  let ouroPref = null;
  try { ouroPref = localStorage.getItem(CHAVE_OURO); } catch (_) {}
  const ouvintesOuro = [];
  function padraoCom(p) {
    const e = Object.assign({}, p.padrao);
    if (p.eixos.ouro && ouroPref && p.eixos.ouro.includes(ouroPref)) e.ouro = ouroPref;
    return e;
  }
  function definirOuro(v) {
    ouroPref = v;
    try { localStorage.setItem(CHAVE_OURO, v); } catch (_) {}
    ouvintesOuro.forEach((f) => f(v));
  }

  /* escolha <-> endereco: ?peca=caya-colors&pts=30&banda=rosa */
  function lerEndereco() {
    const q = new URLSearchParams(location.search);
    const p = q.get('peca') && peca(q.get('peca'));
    if (!p) return null;
    const e = padraoCom(p);
    for (const k of Object.keys(p.eixos)) {
      const v = q.get(k);
      if (v != null) e[k] = k === 'pts' ? Number(v) : v;
    }
    return { p, e };
  }
  function gravarEndereco(p, e) {
    const q = new URLSearchParams({ peca: p.id });
    for (const k of Object.keys(p.eixos)) q.set(k, e[k]);
    history.replaceState(null, '', '?' + q.toString() + '#' + p.colecao);
  }

  /* sacola: guardada so neste navegador, sem quebrar se o storage falhar */
  const CHAVE = 'caya-sacola';
  let itens = [];
  try { itens = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (_) { itens = []; }
  const ouvintes = [];
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (_) {}
    ouvintes.forEach((f) => f(itens));
  }
  const sacola = {
    itens: () => itens,
    total: () => itens.reduce((s, i) => s + i.preco * i.qtd, 0),
    quantidade: () => itens.reduce((s, i) => s + i.qtd, 0),
    adicionar(p, e) {
      const v = variacao(p, e);
      const chave = p.id + '|' + JSON.stringify(e);
      const ja = itens.find((i) => i.chave === chave);
      if (ja) ja.qtd += 1;
      else itens.push({ chave, id: p.id, nome: p.nome, detalhe: rotulo(p, e), preco: v.preco, foto: v.fotos[0], qtd: 1,
                        aros: p.aros || 0, medidas: [] });
      salvar();
    },
    remover(chave) { itens = itens.filter((i) => i.chave !== chave); salvar(); },
    /* medida do aro: um campo por anel (par = 2 por unidade) */
    camposAro: (i) => (i.aros || 0) * i.qtd,
    definirAro(chave, n, valor) {
      const i = itens.find((x) => x.chave === chave);
      if (!i) return;
      i.medidas = i.medidas || [];
      i.medidas[n] = valor;
      salvar();
    },
    faltaAro: () => itens.some((i) => {
      for (let n = 0; n < (i.aros || 0) * i.qtd; n++) if (!(i.medidas || [])[n]) return true;
      return false;
    }),
    ouvir(f) { ouvintes.push(f); f(itens); },
  };
  const textoAro = (m) => (m === 'ajuda' ? 'preciso de ajuda com a medida' : 'aro ' + m);

  function linkWhatsApp(texto) {
    return 'https://wa.me/' + C.contato.whatsapp + '?text=' + encodeURIComponent(texto);
  }
  function pedidoWhatsApp() {
    const linhas = itens.map((i) => {
      const n = (i.aros || 0) * i.qtd;
      const aros = n ? ' — ' + Array.from({ length: n }, (_, k) => textoAro((i.medidas || [])[k])).join(', ') : '';
      return `• ${i.nome}${i.detalhe ? ' (' + i.detalhe + ')' : ''} ×${i.qtd} — ${brl(i.preco * i.qtd)}${aros}`;
    });
    return linkWhatsApp('Olá! Gostaria de finalizar meu pedido Caya:\n' + linhas.join('\n') + '\nTotal: ' + brl(sacola.total()));
  }

  /* pagamento: checkout da InfinitePay (Pix ou cartao em ate 12x). O preco sai do catalogo;
     a especialista confere cada pedido antes da producao. */
  const handlePag = () => C.infinitepay || (C.contato && C.contato.infinitepay) || '';
  const pagamentoAtivo = () => !!handlePag();
  function descricaoItem(i) {
    const n = (i.aros || 0) * i.qtd;
    const aros = n ? ' · ' + Array.from({ length: n }, (_, k) => textoAro((i.medidas || [])[k])).join(', ') : '';
    return (i.nome + (i.detalhe ? ' (' + i.detalhe + ')' : '') + aros).slice(0, 250);
  }
  async function pagar(raiz) {
    const pedido = 'CAYA-' + new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const base = location.href.replace(/\/teste\/.*$/, '/');
    const resumo = itens.map((i) => ({ nome: i.nome, detalhe: i.detalhe, qtd: i.qtd, preco: i.preco, aros: i.aros, medidas: i.medidas }));
    try { localStorage.setItem('caya-ultimo-pedido', JSON.stringify({ pedido, itens: resumo, total: sacola.total() })); } catch (_) {}
    const r = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: handlePag(),
        order_nsu: pedido,
        redirect_url: base + 'teste/v2-obrigado/index.html',
        items: itens.map((i) => ({ quantity: i.qtd, price: Math.round(i.preco * 100), description: descricaoItem(i) })),
      }),
    });
    const d = await r.json().catch(() => ({}));
    const url = d.url || d.link || d.checkout_url || (d.data && (d.data.url || d.data.link));
    if (!r.ok || !url) throw new Error(d.message || 'Não foi possível abrir o pagamento.');
    location.href = url;
  }

  window.Caya = { C, brl, ct, nomeBanda, corBanda, peca, variacao, rotulo, aPartirDe,
                  lerEndereco, gravarEndereco, sacola, linkWhatsApp, pedidoWhatsApp,
                  padraoCom, definirOuro, pagar, pagamentoAtivo, ouroPreferido: () => ouroPref, aoMudarOuro: (f) => ouvintesOuro.push(f) };
})();
