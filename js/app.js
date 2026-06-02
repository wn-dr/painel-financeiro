let supabaseUrl = '';
let supabaseKey = '';

// Se os placeholders não forem substituídos ou estiver rodando localmente, usamos fallbacks
if (supabaseUrl.startsWith('__') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname) {
    supabaseUrl = 'https://fuiecdxrkwrlgmunfcyy.supabase.co';
    supabaseKey = 'sb_publishable_OdPlzvmWxEv4bNi7mXpyLw_ADEc_5hj';
}

const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let sessionUser = null;
let listResponsaveis = [];
let listCategorias = [];
let listCartoes = [];
let dados = [];
let chartCartao, chartCategoria;
let isLoginMode = true;

const nomesMeses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const anosD = [2026, 2027, 2028, 2029, 2030];

// Inicialização dos Calendários e Parcelas nos inputs estáticos
function inicializarEstruturaEstatica() {
    [document.getElementById('mes_cal'), document.getElementById('f_mes')].forEach(el => {
        if(!el) return;
        el.innerHTML = `<option value="">MÊS</option>`;
        nomesMeses.forEach((m, idx) => el.innerHTML += `<option value="${(idx+1).toString().padStart(2,'0')}">${m}</option>`);
    });

    [document.getElementById('ano_cal'), document.getElementById('f_ano')].forEach(el => {
        if(!el) return;
        el.innerHTML = `<option value="">ANO</option>`;
        anosD.forEach(a => el.innerHTML += `<option value="${a}">${a}</option>`);
    });

    const pA = document.getElementById('parcelaAtual');
    const pT = document.getElementById('parcelasTotal');
    if (pA && pT) {
        pA.innerHTML = '';
        pT.innerHTML = '';
        for(let i = 1; i <= 12; i++){
            pA.innerHTML += `<option value="${i}">${i}ª</option>`;
            pT.innerHTML += `<option value="${i}">${i}x</option>`;
        }
        pT.value = "1";
    }

    const inputValor = document.getElementById('valor');
    if (inputValor) {
        inputValor.oninput = e => { 
            let v = e.target.value.replace(/\D/g, ''); 
            if (!v) { e.target.value = ''; return; } 
            e.target.value = (parseFloat(v)/100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
        };
    }
}

// Preenchimento de Selects
function preencherSelect(id, lista, valueKey, labelKey, label, addOption = false){ 
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = `<option value="">${label}</option>`; 
    lista.forEach(i => el.innerHTML += `<option value="${i[valueKey]}">${i[labelKey]}</option>`); 
    if (addOption) {
        el.innerHTML += `<option value="ADD_NEW" class="text-indigo-500 font-bold">+ ADICIONAR NOVO...</option>`;
    }
}

// Configurações do Supabase para adicionar novo item nos dropdowns
function configurarEventosCriacao() {
    document.getElementById('cartao').onchange = async (e) => {
        if (e.target.value === 'ADD_NEW') {
            const nome = prompt('Digite o nome do novo cartão/método de pagamento:');
            if (nome && nome.trim()) {
                const cor = prompt('Digite a cor hexadecimal do cartão (ex: #8b5cf6):', '#64748b');
                const { data, error } = await supabase.from('cartoes').insert({
                    user_id: sessionUser.id,
                    nome: nome.trim(),
                    cor: cor || '#64748b'
                }).select();
                if (!error && data && data.length > 0) {
                    await carregarConfiguracoes();
                    document.getElementById('cartao').value = data[0].id;
                } else {
                    alert('Erro ao cadastrar cartão: ' + (error?.message || 'Erro desconhecido'));
                    document.getElementById('cartao').value = '';
                }
            } else {
                document.getElementById('cartao').value = '';
            }
        }
    };

    document.getElementById('categoria').onchange = async (e) => {
        if (e.target.value === 'ADD_NEW') {
            const nome = prompt('Digite o nome da nova categoria:');
            if (nome && nome.trim()) {
                const { data, error } = await supabase.from('categorias').insert({
                    user_id: sessionUser.id,
                    nome: nome.trim()
                }).select();
                if (!error && data && data.length > 0) {
                    await carregarConfiguracoes();
                    document.getElementById('categoria').value = data[0].id;
                } else {
                    alert('Erro ao cadastrar categoria: ' + (error?.message || 'Erro desconhecido'));
                    document.getElementById('categoria').value = '';
                }
            } else {
                document.getElementById('categoria').value = '';
            }
        }
    };
}

// Carregar Configurações (Responsáveis, Categorias e Cartões)
async function carregarConfiguracoes() {
    let { data: resps } = await supabase.from('responsaveis').select('*').order('nome');
    listResponsaveis = resps || [];
    
    let { data: cats } = await supabase.from('categorias').select('*').order('nome');
    listCategorias = cats || [];
    
    let { data: cards } = await supabase.from('cartoes').select('*').order('nome');
    listCartoes = cards || [];

    preencherSelect('responsavel', listResponsaveis, 'id', 'nome', 'RESPONSÁVEL');
    preencherSelect('cartao', listCartoes, 'id', 'nome', 'MÉTODO', true);
    preencherSelect('categoria', listCategorias, 'id', 'nome', 'CATEGORIA', true);
    
    // Filtros no menu
    const respsUnicos = [...listResponsaveis].sort((a,b) => a.nome.localeCompare(b.nome));
    preencherSelect('f_responsavel', respsUnicos, 'id', 'nome', 'QUEM?');
    preencherSelect('f_cartao', listCartoes, 'id', 'nome', 'MÉTODO');
    preencherSelect('f_categoria', listCategorias, 'id', 'nome', 'CATEGORIA');
}

// Sugestões de Responsáveis (Autocomplete)
function mostrarSugestoes() {
    const input = document.getElementById('responsavel');
    const container = document.getElementById('sugestoesResponsavel');
    const termo = input.value.toLowerCase();
    
    container.innerHTML = '';
    listResponsaveis.forEach(item => {
        if (item.nome.toLowerCase().includes(termo)) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = "text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-tighter";
            btn.innerText = item.nome;
            btn.onclick = () => {
                input.value = item.nome;
                container.innerHTML = '';
            };
            container.appendChild(btn);
        }
    });
}

// Carregar Dados dos Lançamentos do Supabase
async function carregarDados() {
    const { data, error } = await supabase
        .from('lancamentos')
        .select('*, responsaveis(nome), cartoes(nome, cor), categorias(nome)');
    
    if (error) {
        console.error('Erro ao carregar lançamentos:', error);
        dados = [];
    } else {
        dados = data || [];
    }
    render();
}

// Obter Dados Filtrados localmente
function obterDadosFiltrados() {
    return dados.filter(d => {
        const [ano, mes] = d.mes.split('-');
        const catId = d.categoria_id ? d.categoria_id.toString() : '';
        const cardId = d.cartao_id ? d.cartao_id.toString() : '';
        
        return d.descricao.toLowerCase().includes(document.getElementById('f_busca').value.toLowerCase()) &&
               (!document.getElementById('f_responsavel').value || d.responsavel_id == document.getElementById('f_responsavel').value) &&
               (!document.getElementById('f_categoria').value || catId === document.getElementById('f_categoria').value) &&
               (!document.getElementById('f_cartao').value || cardId === document.getElementById('f_cartao').value) &&
               (!document.getElementById('f_mes').value || mes === document.getElementById('f_mes').value) &&
               (!document.getElementById('f_ano').value || ano === document.getElementById('f_ano').value);
    }).sort((a,b) => a.mes.localeCompare(b.mes));
}

// Renderizar Tabela e Totais
function render(){
    const filtrados = obterDadosFiltrados();
    const tab = document.getElementById('tabela');
    if (!tab) return;
    tab.innerHTML = '';
    let tf = 0, tx = 0;

    filtrados.forEach(d => {
        tf += d.valor;
        if(d.parcela === 'Fixo') tx += d.valor;
        const [ano, mes] = d.mes.split('-');
        
        const cartaoNome = d.cartoes ? d.cartoes.nome : 'Outros';
        const cartaoCor = d.cartoes ? d.cartoes.cor : '#64748b';
        const responsavelNome = d.responsaveis ? d.responsaveis.nome : 'N/A';
        const categoriaNome = d.categorias ? d.categorias.nome : 'Geral';

        tab.innerHTML += `
            <tr onclick="editar(${d.id})" class="group hover:bg-indigo-500/[0.03] transition-all cursor-pointer btn-press">
                <td class="py-6 px-8 font-mono text-[10px] opacity-40 uppercase">${nomesMeses[parseInt(mes)-1]} / ${ano}</td>
                <td class="py-6 px-8">
                    <span class="inline-block px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-wider" style="background:${cartaoCor}">
                        ${cartaoNome}
                    </span>
                </td>
                <td class="py-6 px-8">
                    <div class="flex flex-col">
                        <span class="font-bold text-[14px] text-slate-700 dark:text-slate-200 uppercase tracking-tight">${d.descricao}</span>
                        <span class="text-[9px] opacity-40 font-black uppercase tracking-[0.1em] mt-0.5">${responsavelNome} • ${categoriaNome} • ${d.parcela}</span>
                    </div>
                </td>
                <td class="py-6 px-8 text-right">
                    <div class="flex flex-col items-end">
                        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[16px]">R$ ${d.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <button onclick="event.stopPropagation(); remover(${d.id})" class="text-red-400 opacity-0 group-hover:opacity-100 text-[9px] font-black uppercase mt-1 tracking-widest hover:text-red-600 transition-all">Remover</button>
                    </div>
                </td>
            </tr>
        `;
    });

    document.getElementById('totalFiltrado').innerText = 'R$ ' + tf.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('totalFixos').innerText = 'R$ ' + tx.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    renderCharts(filtrados);
}

// Renderizar Gráficos
function renderCharts(lista){
    let catMap = {}, cartMap = {}, cartColorsMap = {};
    lista.forEach(d => {
        const catNome = d.categorias ? d.categorias.nome : 'Geral';
        const cartNome = d.cartoes ? d.cartoes.nome : 'Outros';
        const cartCor = d.cartoes ? d.cartoes.cor : '#64748b';

        catMap[catNome] = (catMap[catNome] || 0) + d.valor;
        cartMap[cartNome] = (cartMap[cartNome] || 0) + d.valor;
        cartColorsMap[cartNome] = cartCor;
    });

    const leg = document.getElementById('legendaCartao');
    if (leg) {
        leg.innerHTML = '';
        Object.keys(cartMap).forEach(c => {
            leg.innerHTML += `
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" style="background:${cartColorsMap[c] || '#ccc'}"></div>
                    <span class="uppercase tracking-tighter opacity-70">${c}</span>
                </div>
            `;
        });
    }

    const cfg = { cutout: '75%', maintainAspectRatio: false, plugins: { legend: { display: false } } };
    
    const canvasCartao = document.getElementById('graficoCartao');
    if (canvasCartao) {
        if(chartCartao) chartCartao.destroy();
        chartCartao = new Chart(canvasCartao, { type: 'doughnut', data: { datasets: [{ data: Object.values(cartMap), backgroundColor: Object.keys(cartMap).map(c => cartColorsMap[c] || '#ccc'), borderWidth: 0 }] }, options: cfg });
    }
    
    const canvasCategoria = document.getElementById('graficoCategoria');
    if (canvasCategoria) {
        if(chartCategoria) chartCategoria.destroy();
        chartCategoria = new Chart(canvasCategoria, { type: 'doughnut', data: { datasets: [{ data: Object.values(catMap), backgroundColor: Object.keys(catMap).map((_, i) => `hsl(${i * 45}, 70%, 60%)`), borderWidth: 0 }] }, options: cfg });
    }
}

// Adicionar / Editar Lançamento
async function adicionar(){
    const vMes = document.getElementById('mes_cal').value; 
    const vAno = document.getElementById('ano_cal').value; 
    const vCartao = document.getElementById('cartao').value;
    const desc = document.getElementById('descricao').value.trim();
    const respName = document.getElementById('responsavel').value.trim();
    const valorInput = document.getElementById('valor').value;
    const valorNum = parseFloat(valorInput.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    const idEdicao = document.getElementById('editandoId').value;
    const gId = document.getElementById('grupoId').value;

    if(!desc || !valorNum || !vMes || !vAno || !vCartao) return alert('Preencha os campos obrigatórios!');

    // 1. Resolver o responsavel_id (se não existir, cria um novo dinamicamente)
    let responsavel_id = null;
    if (respName) {
        let respObj = listResponsaveis.find(r => r.nome.toLowerCase() === respName.toLowerCase());
        if (respObj) {
            responsavel_id = respObj.id;
        } else {
            const { data, error } = await supabase.from('responsaveis').insert({
                user_id: sessionUser.id,
                nome: respName
            }).select();
            if (!error && data && data.length > 0) {
                responsavel_id = data[0].id;
                await carregarConfiguracoes();
            } else {
                console.error('Erro ao cadastrar responsável:', error);
            }
        }
    }

    const cartao_id = parseInt(vCartao) || null;
    const categoria_id = parseInt(document.getElementById('categoria').value) || null;

    // 2. Se for edição, limpa os antigos antes de reinserir
    if(idEdicao) {
        if(gId && confirm("Esta compra faz parte de um parcelamento. Deseja aplicar as alterações a TODAS as parcelas deste grupo?")) {
            await supabase.from('lancamentos').delete().eq('grupo_id', gId);
        } else {
            await supabase.from('lancamentos').delete().eq('id', idEdicao);
        }
    }

    const gpId = gId || Date.now().toString();
    const rowsToInsert = [];

    if(document.getElementById('mensal').checked){
        rowsToInsert.push({ 
            user_id: sessionUser.id,
            responsavel_id, 
            mes: `${vAno}-${vMes}`, 
            cartao_id, 
            categoria_id, 
            descricao: desc.toUpperCase(), 
            parcela: 'Fixo', 
            valor: valorNum,
            grupo_id: gpId
        });
    } else {
        const pA = document.getElementById('parcelaAtual');
        const pT = document.getElementById('parcelasTotal');
        const atual = parseInt(pA.value);
        const total = parseInt(pT.value);
        if (atual > total) return alert('A parcela atual não pode ser maior que o total!');

        for(let i = atual; i <= total; i++) {
            let saltoMes = i - atual;
            let dR = new Date(parseInt(vAno), (parseInt(vMes)-1) + saltoMes, 1);
            rowsToInsert.push({ 
                user_id: sessionUser.id,
                responsavel_id, 
                mes: `${dR.getFullYear()}-${(dR.getMonth()+1).toString().padStart(2,'0')}`, 
                cartao_id, 
                categoria_id, 
                descricao: desc.toUpperCase(), 
                parcela: total > 1 ? `${i}/${total}` : 'À vista', 
                valor: valorNum, 
                grupo_id: total > 1 ? gpId : null
            });
        }
    }

    const { error } = await supabase.from('lancamentos').insert(rowsToInsert);
    if (error) {
        alert('Erro ao salvar no banco de dados: ' + error.message);
    } else {
        await carregarDados();
        limparCamposLancamento(false);
        document.getElementById('editandoId').value = "";
        document.getElementById('grupoId').value = "";
        document.getElementById('descricao').focus();
    }
}

// Editar Lançamento no Form
function editar(id) {
    const item = dados.find(d => d.id == id);
    if(!item) return;

    const [ano, mes] = item.mes.split('-');
    document.getElementById('editandoId').value = item.id;
    document.getElementById('grupoId').value = item.grupo_id || "";
    document.getElementById('descricao').value = item.descricao;
    document.getElementById('valor').value = item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('mes_cal').value = mes;
    document.getElementById('ano_cal').value = ano;
    document.getElementById('responsavel').value = item.responsaveis ? item.responsaveis.nome : '';
    
    document.getElementById('cartao').value = item.cartao_id || '';
    document.getElementById('categoria').value = item.categoria_id || '';
    
    if(item.parcela === 'Fixo') {
        document.getElementById('mensal').checked = true;
    } else {
        document.getElementById('mensal').checked = false;
        const partes = item.parcela.split('/');
        document.getElementById('parcelaAtual').value = partes[0] || "1";
        document.getElementById('parcelasTotal').value = partes[1] || "1";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Remover Lançamento
async function remover(id){ 
    const item = dados.find(d => d.id == id);
    if(!item) return;
    
    let msg = 'Excluir este lançamento?';
    if(item.grupo_id) msg = 'Esta compra é parcelada. Deseja excluir TODAS as parcelas deste grupo?';

    if(confirm(msg)){ 
        let error = null;
        if(item.grupo_id) {
            const { error: err } = await supabase.from('lancamentos').delete().eq('grupo_id', item.grupo_id);
            error = err;
        } else {
            const { error: err } = await supabase.from('lancamentos').delete().eq('id', id); 
            error = err;
        }

        if (error) {
            alert('Erro ao excluir do banco: ' + error.message);
        } else {
            await carregarDados(); 
        }
    } 
}

// Limpar Campos
function limparCamposLancamento(completo = false) {
    document.getElementById('editandoId').value = '';
    document.getElementById('grupoId').value = '';
    document.getElementById('descricao').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('responsavel').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('mensal').checked = false;
    document.getElementById('parcelaAtual').value = "1";
    document.getElementById('parcelasTotal').value = "1";
    document.getElementById('sugestoesResponsavel').innerHTML = '';
    if(completo) {
        document.getElementById('mes_cal').value = '';
        document.getElementById('ano_cal').value = '';
        document.getElementById('cartao').value = '';
    }
}

// Limpar Filtros
function limparFiltros() {
    document.getElementById('f_busca').value = '';
    document.getElementById('f_responsavel').value = '';
    document.getElementById('f_categoria').value = '';
    document.getElementById('f_cartao').value = '';
    document.getElementById('f_mes').value = '';
    document.getElementById('f_ano').value = '';
    render();
}

// Reset Geral (Deleta tudo do Usuário no Supabase)
async function resetarGeral() {
    if(confirm('ATENÇÃO: Isso apagará TODOS os seus lançamentos salvos permanentemente no Supabase. Deseja continuar?')) {
        const { error } = await supabase.from('lancamentos').delete().eq('user_id', sessionUser.id);
        if (error) {
            alert('Erro ao limpar lançamentos: ' + error.message);
        } else {
            await carregarDados();
        }
    }
}

// Modo Escuro
function toggleDarkMode(){ 
    document.documentElement.classList.toggle('dark'); 
}

// Exportar para Excel
function exportarExcel() {
    const filtrados = obterDadosFiltrados();
    if (filtrados.length === 0) return alert('Não há dados para exportar.');
    
    // Mapear dados para formato tabular do Excel
    const dadosExcel = filtrados.map(d => ({
        Data: d.mes,
        Descrição: d.descricao,
        Valor: d.valor,
        Responsável: d.responsaveis ? d.responsaveis.nome : 'N/A',
        Cartão: d.cartoes ? d.cartoes.nome : 'Outros',
        Categoria: d.categorias ? d.categorias.nome : 'Geral',
        Parcela: d.parcela
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finanças");
    XLSX.writeFile(wb, "Financeiro_WanderTech_Filtrado.xlsx");
}

// Enviar via WhatsApp
function enviarWhatsAppResponsavel() {
    const filtrados = obterDadosFiltrados();
    if (filtrados.length === 0) return alert('Não há dados filtrados para compartilhar.');

    const respSelect = document.getElementById('f_responsavel');
    const respFiltro = respSelect.options[respSelect.selectedIndex]?.text;
    const titulo = respFiltro && respFiltro !== 'QUEM?' ? `RELATÓRIO - ${respFiltro.toUpperCase()}` : 'RELATÓRIO FINANCEIRO';
    
    let mensagem = `${titulo}\n\n`;
    let total = 0;

    filtrados.forEach((i, index) => { 
        total += i.valor; 
        const valorFormatado = i.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        const [ano, mes] = i.mes.split('-');
        const mesNome = nomesMeses[parseInt(mes)-1];
        const cartaoNome = i.cartoes ? i.cartoes.nome : 'Outros';
        const categoriaNome = i.categorias ? i.categorias.nome : 'Geral';
        const responsavelNome = i.responsaveis ? i.responsaveis.nome : 'N/A';

        mensagem += `${index + 1}. ${i.descricao}\n`;
        mensagem += `Data: ${mesNome}/${ano}\n`;
        mensagem += `Método: ${cartaoNome}\n`;
        mensagem += `Categoria: ${categoriaNome}\n`;
        mensagem += `Parcela: ${i.parcela}\n`;
        mensagem += `Responsável: ${responsavelNome}\n`;
        mensagem += `Valor: R$ ${valorFormatado}\n\n`;
    });

    mensagem += `TOTAL FILTRADO: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    const linkFinal = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(linkFinal);
}

// Lógica de Autenticação no Frontend
async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const messageEl = document.getElementById('auth-message');
    const btn = document.getElementById('auth-btn');

    messageEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerText = isLoginMode ? 'Entrando...' : 'Cadastrando...';

    let result;
    if (isLoginMode) {
        result = await supabase.auth.signInWithPassword({ email, password });
    } else {
        result = await supabase.auth.signUp({ email, password });
    }

    const { data, error } = result;

    btn.disabled = false;
    btn.innerText = isLoginMode ? 'Entrar' : 'Cadastrar';

    if (error) {
        messageEl.innerText = error.message;
        messageEl.classList.remove('hidden');
    } else {
        if (!isLoginMode) {
            alert('Cadastro realizado com sucesso! Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de entrada.');
            isLoginMode = true;
            updateAuthUI();
        }
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthUI();
}

function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btn = document.getElementById('auth-btn');
    const toggleLink = document.getElementById('auth-toggle-link');
    const msg = document.getElementById('auth-message');

    msg.classList.add('hidden');

    if (isLoginMode) {
        title.innerText = 'Login';
        subtitle.innerText = 'Acesse sua conta Wander Tech+';
        btn.innerText = 'Entrar';
        toggleLink.innerText = 'Não tem uma conta? Cadastre-se';
    } else {
        title.innerText = 'Cadastro';
        subtitle.innerText = 'Crie sua conta Wander Tech+';
        btn.innerText = 'Cadastrar';
        toggleLink.innerText = 'Já tem uma conta? Faça login';
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// Controle de Telas
function showAuth() {
    document.getElementById('auth-container').classList.remove('auth-hidden');
    document.getElementById('app-container').classList.add('auth-hidden');
    limparCamposLancamento(true);
}

async function showApp() {
    document.getElementById('auth-container').classList.add('auth-hidden');
    document.getElementById('app-container').classList.remove('auth-hidden');
    document.getElementById('user-email-display').innerText = sessionUser.email;
    
    inicializarEstruturaEstatica();
    configurarEventosCriacao();
    
    await carregarConfiguracoes();
    await carregarDados();
}

// Inicializar Verificação de Sessão
async function init() {
    // Escuta mudanças de auth do Supabase
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            sessionUser = session.user;
            showApp();
        } else {
            sessionUser = null;
            showAuth();
        }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        sessionUser = session.user;
        showApp();
    } else {
        showAuth();
    }
}

window.onload = init;
window.mostrarSugestoes = mostrarSugestoes;
