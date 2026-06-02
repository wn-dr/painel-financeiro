let dados = JSON.parse(localStorage.getItem('dados')) || [];
let chartCartao, chartCategoria;

const cartoes = ['Nubank','PicPay','Next','Inter','C6','Mercado Pago','Pix','Dinheiro','Outros'];
const categorias = ['Alimentação','Assinatura','Compras','Consulta','Dentista','Eletrônico','Empréstimo','Exame','Faculdade/Pós','Farmácia','Imposto','Juros','Internet','Internet Móvel','Investimentos','Manutenção','Pagamento','Parcela Casa','Pets','Pix mensal','Plano de saúde','Plano odontológico','Reserva de emergência','Roupas','Salão/Barbearia','Saúde pessoal','Supermercado','Transporte','Transporte público'];
const nomesMeses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const anosD = [2026, 2027, 2028, 2029, 2030];

const configCores = { 
    'Nubank': '#8b5cf6', 'Inter': '#f97316', 'C6': '#1e293b', 'Next': '#22c55e', 
    'PicPay': '#10b981', 'Mercado Pago': '#3b82f6', 'Pix': '#06b6d4', 
    'Dinheiro': '#475569', 'Outros': '#94a3b8' 
};

function preencher(id, lista, label){ 
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = `<option value="">${label}</option>`; 
    lista.forEach(i => el.innerHTML += `<option value="${i}">${i}</option>`); 
}

function atualizarFiltroResponsavel() {
    const respsUnicos = [...new Set(dados.map(d => d.responsavel))].filter(r => r && r !== 'N/A').sort();
    preencher('f_responsavel', respsUnicos, 'QUEM?');
}

function mostrarSugestoes() {
    const input = document.getElementById('responsavel');
    const container = document.getElementById('sugestoesResponsavel');
    const termo = input.value.toLowerCase();
    
    const respsUnicos = [...new Set(dados.map(d => d.responsavel))].filter(r => r && r !== 'N/A');
    
    container.innerHTML = '';
    respsUnicos.forEach(nome => {
        if (nome.toLowerCase().includes(termo)) {
            const btn = document.createElement('button');
            btn.className = "text-[9px] font-black px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-tighter";
            btn.innerText = nome;
            btn.onclick = () => {
                input.value = nome;
                container.innerHTML = '';
            };
            container.appendChild(btn);
        }
    });
}

preencher('cartao', cartoes, 'MÉTODO');
preencher('f_cartao', cartoes, 'MÉTODO');
preencher('categoria', categorias, 'CATEGORIA');
preencher('f_categoria', categorias, 'CATEGORIA');

[document.getElementById('mes_cal'), document.getElementById('f_mes')].forEach(el => {
    el.innerHTML = `<option value="">MÊS</option>`;
    nomesMeses.forEach((m, idx) => el.innerHTML += `<option value="${(idx+1).toString().padStart(2,'0')}">${m}</option>`);
});

[document.getElementById('ano_cal'), document.getElementById('f_ano')].forEach(el => {
    el.innerHTML = `<option value="">ANO</option>`;
    anosD.forEach(a => el.innerHTML += `<option value="${a}">${a}</option>`);
});

const pA = document.getElementById('parcelaAtual');
const pT = document.getElementById('parcelasTotal');
for(let i = 1; i <= 12; i++){
    pA.innerHTML += `<option value="${i}">${i}ª</option>`;
    pT.innerHTML += `<option value="${i}">${i}x</option>`;
}
pT.value = "1";

const inputValor = document.getElementById('valor');
inputValor.oninput = e => { 
    let v = e.target.value.replace(/\D/g, ''); 
    if (!v) { e.target.value = ''; return; } 
    e.target.value = (parseFloat(v)/100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); 
};

function adicionar(){
    const vMes = document.getElementById('mes_cal').value; 
    const vAno = document.getElementById('ano_cal').value; 
    const vCartao = document.getElementById('cartao').value;
    const desc = document.getElementById('descricao').value.trim();
    const resp = document.getElementById('responsavel').value.trim() || 'N/A';
    const valorNum = parseFloat(inputValor.value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    const idEdicao = document.getElementById('editandoId').value;
    const gId = document.getElementById('grupoId').value;

    if(!desc || !valorNum || !vMes || !vAno || !vCartao) return alert('Preencha os campos obrigatórios!');

    if(idEdicao) {
        if(gId && confirm("Esta compra faz parte de um parcelamento. Deseja aplicar as alterações a TODAS as parcelas deste grupo?")) {
            dados = dados.filter(d => d.grupoId !== gId);
        } else {
            dados = dados.filter(d => d.id != idEdicao);
        }
    }

    const novoGrupoId = Date.now().toString();

    if(document.getElementById('mensal').checked){
        dados.push({ responsavel: resp, mes: `${vAno}-${vMes}`, cartao: vCartao, categoria: document.getElementById('categoria').value || 'Geral', descricao: desc.toUpperCase(), parcela: 'Fixo', valor: valorNum, id: Date.now(), grupoId: novoGrupoId });
    } else {
        const atual = parseInt(pA.value);
        const total = parseInt(pT.value);
        if (atual > total) return alert('A parcela atual não pode ser maior que o total!');

        for(let i = atual; i <= total; i++) {
            let saltoMes = i - atual;
            let dR = new Date(parseInt(vAno), (parseInt(vMes)-1) + saltoMes, 1);
            dados.push({ 
                responsavel: resp, 
                mes: `${dR.getFullYear()}-${(dR.getMonth()+1).toString().padStart(2,'0')}`, 
                cartao: vCartao, 
                categoria: document.getElementById('categoria').value || 'Geral', 
                descricao: desc.toUpperCase(), 
                parcela: total > 1 ? `${i}/${total}` : 'À vista', 
                valor: valorNum, 
                id: Date.now() + i,
                grupoId: total > 1 ? novoGrupoId : null
            });
        }
    }
    localStorage.setItem('dados', JSON.stringify(dados)); 
    atualizarFiltroResponsavel();
    render();
    limparCamposLancamento(false);
    document.getElementById('editandoId').value = "";
    document.getElementById('grupoId').value = "";
    document.getElementById('descricao').focus();
}

function editar(id) {
    const item = dados.find(d => d.id == id);
    if(!item) return;

    const [ano, mes] = item.mes.split('-');
    document.getElementById('editandoId').value = item.id;
    document.getElementById('grupoId').value = item.grupoId || "";
    document.getElementById('descricao').value = item.descricao;
    document.getElementById('valor').value = item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('mes_cal').value = mes;
    document.getElementById('ano_cal').value = ano;
    document.getElementById('responsavel').value = item.responsavel;
    document.getElementById('cartao').value = item.cartao;
    document.getElementById('categoria').value = item.categoria;
    
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

function obterDadosFiltrados() {
    return dados.filter(d => {
        const [ano, mes] = d.mes.split('-');
        return d.descricao.toLowerCase().includes(document.getElementById('f_busca').value.toLowerCase()) &&
               (!document.getElementById('f_responsavel').value || d.responsavel === document.getElementById('f_responsavel').value) &&
               (!document.getElementById('f_categoria').value || d.categoria === document.getElementById('f_categoria').value) &&
               (!document.getElementById('f_cartao').value || d.cartao === document.getElementById('f_cartao').value) &&
               (!document.getElementById('f_mes').value || mes === document.getElementById('f_mes').value) &&
               (!document.getElementById('f_ano').value || ano === document.getElementById('f_ano').value);
    }).sort((a,b) => a.mes.localeCompare(b.mes));
}

function render(){
    const filtrados = obterDadosFiltrados();
    const tab = document.getElementById('tabela');
    tab.innerHTML = '';
    let tf = 0, tx = 0;

    filtrados.forEach(d => {
        tf += d.valor;
        if(d.parcela === 'Fixo') tx += d.valor;
        const [ano, mes] = d.mes.split('-');
        tab.innerHTML += `
            <tr onclick="editar(${d.id})" class="group hover:bg-indigo-500/[0.03] transition-all cursor-pointer btn-press">
                <td class="py-6 px-8 font-mono text-[10px] opacity-40 uppercase">${nomesMeses[parseInt(mes)-1]} / ${ano}</td>
                <td class="py-6 px-8">
                    <span class="inline-block px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-wider" style="background:${configCores[d.cartao] || '#64748b'}">
                        ${d.cartao}
                    </span>
                </td>
                <td class="py-6 px-8">
                    <div class="flex flex-col">
                        <span class="font-bold text-[14px] text-slate-700 dark:text-slate-200 uppercase tracking-tight">${d.descricao}</span>
                        <span class="text-[9px] opacity-40 font-black uppercase tracking-[0.1em] mt-0.5">${d.responsavel} • ${d.categoria} • ${d.parcela}</span>
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

function renderCharts(lista){
    let catMap = {}, cartMap = {};
    lista.forEach(d => {
        catMap[d.categoria] = (catMap[d.categoria] || 0) + d.valor;
        cartMap[d.cartao] = (cartMap[d.cartao] || 0) + d.valor;
    });

    const leg = document.getElementById('legendaCartao');
    leg.innerHTML = '';
    Object.keys(cartMap).forEach(c => {
        leg.innerHTML += `
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" style="background:${configCores[c] || '#ccc'}"></div>
                <span class="uppercase tracking-tighter opacity-70">${c}</span>
            </div>
        `;
    });

    const cfg = { cutout: '75%', maintainAspectRatio: false, plugins: { legend: { display: false } } };
    if(chartCartao) chartCartao.destroy();
    chartCartao = new Chart(document.getElementById('graficoCartao'), { type: 'doughnut', data: { datasets: [{ data: Object.values(cartMap), backgroundColor: Object.keys(cartMap).map(c => configCores[c] || '#ccc'), borderWidth: 0 }] }, options: cfg });
    if(chartCategoria) chartCategoria.destroy();
    chartCategoria = new Chart(document.getElementById('graficoCategoria'), { type: 'doughnut', data: { datasets: [{ data: Object.values(catMap), backgroundColor: Object.keys(catMap).map((_, i) => `hsl(${i * 45}, 70%, 60%)`), borderWidth: 0 }] }, options: cfg });
}

function remover(id){ 
    const item = dados.find(d => d.id == id);
    if(!item) return;
    
    let msg = 'Excluir este lançamento?';
    if(item.grupoId) msg = 'Esta compra é parcelada. Deseja excluir TODAS as parcelas deste grupo?';

    if(confirm(msg)){ 
        if(item.grupoId) {
            dados = dados.filter(d => d.grupoId !== item.grupoId);
        } else {
            dados = dados.filter(d => d.id !== id); 
        }
        localStorage.setItem('dados', JSON.stringify(dados)); 
        render(); 
    } 
}

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

function limparFiltros() {
    document.getElementById('f_busca').value = '';
    document.getElementById('f_responsavel').value = '';
    document.getElementById('f_categoria').value = '';
    document.getElementById('f_cartao').value = '';
    document.getElementById('f_mes').value = '';
    document.getElementById('f_ano').value = '';
    render();
}

function resetarGeral() {
    if(confirm('ATENÇÃO: Isso apagará TODOS os lançamentos salvos permanentemente. Deseja continuar?')) {
        localStorage.clear();
        location.reload();
    }
}

function toggleDarkMode(){ document.documentElement.classList.toggle('dark'); }

function exportarExcel() {
    const filtrados = obterDadosFiltrados();
    if (filtrados.length === 0) return alert('Não há dados para exportar.');
    
    const ws = XLSX.utils.json_to_sheet(filtrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Filtrados");
    XLSX.writeFile(wb, "Financeiro_WanderTech_Filtrado.xlsx");
}

function enviarWhatsAppResponsavel() {
    const filtrados = obterDadosFiltrados();
    if (filtrados.length === 0) return alert('Não há dados filtrados para compartilhar.');

    const respFiltro = document.getElementById('f_responsavel').value;
    const titulo = respFiltro ? `RELATÓRIO - ${respFiltro.toUpperCase()}` : 'RELATÓRIO FINANCEIRO';
    
    let mensagem = `${titulo}\n\n`;
    let total = 0;

    filtrados.forEach((i, index) => { 
        total += i.valor; 
        const valorFormatado = i.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        const [ano, mes] = i.mes.split('-');
        const mesNome = nomesMeses[parseInt(mes)-1];

        mensagem += `${index + 1}. ${i.descricao}\n`;
        mensagem += `Data: ${mesNome}/${ano}\n`;
        mensagem += `Método: ${i.cartao}\n`;
        mensagem += `Categoria: ${i.categoria}\n`;
        mensagem += `Parcela: ${i.parcela}\n`;
        mensagem += `Valor: R$ ${valorFormatado}\n\n`;
    });

    mensagem += `TOTAL FILTRADO: R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    const linkFinal = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(linkFinal);
}

atualizarFiltroResponsavel();
render();
