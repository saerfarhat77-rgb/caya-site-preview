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
    if (escolha.pts) partes.push(p.pedras || ct(escolha.pts));
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
      else itens.push({ chave, id: p.id, nome: p.nome, detalhe: rotulo(p, e), preco: v.preco, foto: v.fotos[0], qtd: 1 });
      salvar();
    },
    remover(chave) { itens = itens.filter((i) => i.chave !== chave); salvar(); },
    ouvir(f) { ouvintes.push(f); f(itens); },
  };

  function linkWhatsApp(texto) {
    return 'https://wa.me/' + C.contato.whatsapp + '?text=' + encodeURIComponent(texto);
  }
  function pedidoWhatsApp() {
    const linhas = itens.map((i) => `• ${i.nome} (${i.detalhe}) ×${i.qtd} — ${brl(i.preco * i.qtd)}`);
    return linkWhatsApp('Olá! Quero fechar este pedido:\n' + linhas.join('\n') + '\nTotal: ' + brl(sacola.total()));
  }

  window.Caya = { C, brl, ct, nomeBanda, corBanda, peca, variacao, rotulo, aPartirDe,
                  lerEndereco, gravarEndereco, sacola, linkWhatsApp, pedidoWhatsApp,
                  padraoCom, definirOuro, ouroPreferido: () => ouroPref, aoMudarOuro: (f) => ouvintesOuro.push(f) };
})();
