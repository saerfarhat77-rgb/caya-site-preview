/* Logica comum aos prototipos: variacoes, precos, sacola, endereco da escolha. */
(function () {
  const C = window.CAYA;
  /* enderecos das paginas: em teste/ (desenvolvimento e previa) ou com nome limpo (site oficial) */
  const SCRIPT = document.currentScript.src;
  const RAIZ = new URL('..', SCRIPT).href;
  const DEV = /\/teste\/comum\.js/.test(SCRIPT);
  const PAGINAS = { inicio: ['teste/papel/index.html', ''], peca: ['teste/v2-peca/index.html', 'peca/'],
                    linha: ['teste/v2-linha/index.html', 'colecao/'], info: ['teste/v2-info/index.html', 'ajuda/'],
                    medidor: ['teste/v2-medidor/index.html', 'medir-aro/'], obrigado: ['teste/v2-obrigado/index.html', 'obrigado/'],
                    conta: ['teste/v2-conta/index.html', 'conta/'], painel: ['teste/v2-painel/index.html', 'painel/'] };
  const pagina = (n) => RAIZ + PAGINAS[n][DEV ? 0 : 1];
  const naPagina = (n) => location.href.split(/[?#]/)[0].replace(/index\.html$/, '') === pagina(n).replace(/index\.html$/, '');
  const brl = (n) => 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
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
    contarSacola();
  }
  /* avisa o servidor da sacola (aviso "colocou na sacola" / "desistiu" para a Caya) */
  let visitante = null;
  try { visitante = localStorage.getItem('caya-visitante'); if (!visitante) { visitante = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('caya-visitante', visitante); } } catch (_) {}
  let timerSacola = null;
  const retratoSacola = () => JSON.stringify(itens.map((i) => [i.chave, i.qtd]));
  function contarSacola(espera) {
    if (!contaAtiva() || !visitante) return;
    clearTimeout(timerSacola);
    timerSacola = setTimeout(() => {
      const r = retratoSacola();
      servidor('evento', { visitante, itens: itensServidor() })
        .then(() => { try { localStorage.setItem('caya-sacola-enviada', r); } catch (_) {} }).catch(() => {});
    }, espera == null ? 300 : espera);
  }
  /* sacola que ja estava no navegador (ou que nao chegou ao servidor): manda ao abrir a pagina */
  setTimeout(() => { let ult = null; try { ult = localStorage.getItem('caya-sacola-enviada'); } catch (_) {}
    if (itens.length && ult !== retratoSacola()) contarSacola(0); }, 1200);
  const sacola = {
    itens: () => itens,
    total: () => itens.reduce((s, i) => s + i.preco * i.qtd, 0),
    quantidade: () => itens.reduce((s, i) => s + i.qtd, 0),
    adicionar(p, e) {
      const v = variacao(p, e);
      const chave = p.id + '|' + JSON.stringify(e);
      const ja = itens.find((i) => i.chave === chave);
      if (ja) { ja.qtd += 1; if (aroMedido()) aplicarAroMedido(aroMedido()); }
      else itens.push({ chave, id: p.id, escolha: Object.assign({}, e), nome: p.nome, detalhe: rotulo(p, e), preco: v.preco, foto: v.fotos[0], qtd: 1,
                        aros: p.aros || 0, medidas: aroMedido() ? Array(p.aros || 0).fill(aroMedido()) : [] });
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
  function aroMedido() { try { return localStorage.getItem('caya-aro-medido'); } catch (_) { return null; } }
  /* depois de medir: preenche os aros que ainda estao vazios na sacola */
  function aplicarAroMedido(m) {
    itens.forEach((i) => { const n = (i.aros || 0) * i.qtd; i.medidas = i.medidas || [];
      for (let k = 0; k < n; k++) if (!i.medidas[k]) i.medidas[k] = m; });
    salvar();
  }
  sacola.aplicarAroMedido = aplicarAroMedido;
  const textoAro = (m) => (m && m !== 'ajuda' ? 'aro ' + m : 'aro a confirmar');

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
  /* conta de cliente (Supabase): login, desconto da primeira compra e cashback. Sem C.conta, nada disso aparece. */
  const contaAtiva = () => !!(C.conta && C.conta.url && C.conta.chave);
  let sbPromessa = null;
  function sb() {
    if (!contaAtiva()) return Promise.resolve(null);
    if (!sbPromessa) sbPromessa = new Promise((ok, falha) => {
      const criar = () => ok(window.supabase.createClient(C.conta.url, C.conta.chave, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } }));
      if (window.supabase) return criar();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
      s.onload = criar; s.onerror = () => falha(new Error('Não foi possível carregar a conta.'));
      document.head.append(s);
    });
    return sbPromessa;
  }
  async function sessao() { const c = await sb(); if (!c) return null; const { data } = await c.auth.getSession(); return data.session; }
  const escolhaDe = (i) => i.escolha || JSON.parse(i.chave.slice(i.chave.indexOf('|') + 1));
  async function servidor(nome, corpo) {
    const s = await sessao();
    const r = await fetch(C.conta.url + '/functions/v1/' + nome, {
      method: 'POST', keepalive: nome === 'evento',
      headers: { 'Content-Type': 'application/json', apikey: C.conta.chave, Authorization: 'Bearer ' + (s ? s.access_token : C.conta.chave) },
      body: JSON.stringify(corpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erro || 'Falha no servidor.');
    return d;
  }
  /* visita: uma por pagina aberta (painel da Caya). Sem cookies; origem = 1a pagina da sessao. */
  function contarVisita() {
    if (!contaAtiva() || !visitante) return;
    const nomePag = Object.keys(PAGINAS).find((n) => naPagina(n));
    const tipo = { inicio: 'inicio', peca: 'peca', linha: 'colecao', info: 'ajuda', medidor: 'medir-aro', obrigado: 'obrigado', conta: 'conta' }[nomePag];
    if (!tipo) return;
    let sessao = null, ref = '', utm = {};
    try {
      sessao = sessionStorage.getItem('caya-sessao');
      if (!sessao) {
        sessao = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('caya-sessao', sessao);
        const q = new URLSearchParams(location.search);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { if (q.get(k)) utm[k] = q.get(k); });
        sessionStorage.setItem('caya-chegada', JSON.stringify({ ref: document.referrer, utm }));
      }
      const ch = JSON.parse(sessionStorage.getItem('caya-chegada') || '{}');
      ref = ch.ref || ''; utm = ch.utm || {};
    } catch (_) {}
    const q = new URLSearchParams(location.search);
    let fuso = ''; try { fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (_) {}
    servidor('evento', { tipo: 'visita', visitante, sessao: sessao || visitante, pagina: tipo, peca: q.get('peca'), colecao: q.get('linha'),
                         ref, utm, fuso }).catch(() => {});
  }
  setTimeout(contarVisita, 300);
  const itensServidor = () => itens.map((i) => ({ id: i.id, escolha: escolhaDe(i), qtd: i.qtd, medidas: i.medidas || [] }));
  /* valores do pedido como o servidor calcula (desconto da 1a compra, cashback disponivel) */
  function previa(usarCashback) { return servidor('checkout', { itens: itensServidor(), usarCashback: !!usarCashback, previa: true }); }

  async function pagar(raiz, usarCashback) {
    if (contaAtiva()) {
      const d = await servidor('checkout', { itens: itensServidor(), usarCashback: !!usarCashback, voltar: pagina('obrigado'), visitante });
      const resumo = itens.map((i) => ({ nome: i.nome, detalhe: i.detalhe, qtd: i.qtd, preco: i.preco, aros: i.aros, medidas: i.medidas }));
      try { localStorage.setItem('caya-ultimo-pedido', JSON.stringify({ pedido: d.pedido, itens: resumo, total: d.total / 100,
        desconto: d.desconto / 100, cashback: d.cashback / 100 })); } catch (_) {}
      location.href = d.url;
      return;
    }
    const pedido = 'CAYA-' + new Date().toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const resumo = itens.map((i) => ({ nome: i.nome, detalhe: i.detalhe, qtd: i.qtd, preco: i.preco, aros: i.aros, medidas: i.medidas }));
    try { localStorage.setItem('caya-ultimo-pedido', JSON.stringify({ pedido, itens: resumo, total: sacola.total() })); } catch (_) {}
    const r = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: handlePag(),
        order_nsu: pedido,
        redirect_url: pagina('obrigado'),
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
                  padraoCom, definirOuro, pagar, pagina, naPagina, contaAtiva, sb, sessao, servidor, previa, pagamentoAtivo, ouroPreferido: () => ouroPref, aoMudarOuro: (f) => ouvintesOuro.push(f) };
})();
