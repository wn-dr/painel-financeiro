let dados = JSON.parse(localStorage.getItem('dados')) || [];
let chart;

const responsaveis = ['Amor', 'Wandernilson', 'Gabriel', 'Isabelle', 'Jean', 'Jeiciane', 'Luiz', 'Lukas', 'Mãe', 'Matteus G', 'Pai', 'Thaynara', 'Wilber', 'Ynaiara'];
const cartoes = ['Nubank','PicPay','Next','Inter','C6','Mercado Pago'];
const categorias = ['Alimentação','Assinatura','Compras','Consulta','Dentista','Eletrônico','Empréstimo','Exame','Faculdade/Pós','Farmácia','Imposto','Internet','Internet Móvel','Investimentos','Manutenção','Pagamento','Parcela Casa','Pets','Pix mensal','Plano de saúde','Plano odontológico','Reserva de emergência','Roupas','Salão/Barbearia','Saúde pessoal','Supermercado','Transporte','Transporte público'];
const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const anosDisponiveis = [2025, 2026, 2027, 2028, 2029, 2030];

function setupCalendario(idMes, idAno, labelMes, labelAno) {
    const selMes = document.getElementById(idMes);
    const selAno = document.getElementById(idAno);
    selMes.innerHTML = `<option value="" selected>${labelMes}</option>`;
    nomesMeses.forEach((m, idx) => { selMes.innerHTML += `<option value="${(idx+1).toString().padStart(2,'0')}">${m}</option>`; });
    selAno.innerHTML = `<option value="" selected>${labelAno}</option>`;
    anosDisponiveis.forEach(a => { selAno.innerHTML += `<option value="${a}">${a}</option>`; });
}

function preencher(id, lista, label){
    const el = document.getElementById(id);
    el.innerHTML = `<option value="">${label}</option>`;
    lista.forEach(i => el.innerHTML += `<option value="${i}">${i}</option>`);
}

preencher('responsavel', responsaveis, 'Responsável');
preencher('cartao', cartoes, 'Cartão');
preencher('categoria', categorias, 'Categoria');
preencher('filtroCartao', cartoes, 'Cartão');
preencher('filtroCategoria', categorias, 'Categoria');
preencher('filtroResponsavel', responsaveis, 'Responsável');

setupCalendario('mes_cal', 'ano_cal', 'Mês', 'Ano');
setupCalendario('filtroMes_cal', 'filtroAno_cal', 'Mês', 'Ano');

for(let i=1;i<=12;i++){
    parcelaAtual.innerHTML += `<option value="${i}">${i}ª</option>`;
    parcelasTotal.innerHTML += `<option value="${i}">${i}x</option>`;
}

const inputValor = document.getElementById('valor');
inputValor.oninput = e => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') { e.target.value = ''; return; }
    let floatValue = parseFloat(value) / 100;
    e.target.value = floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseValor(v){
    return parseFloat(v.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

function adicionar(){
    const vMes = document.getElementById('mes_cal').value;
    const vAno = document.getElementById('ano_cal').value;
    if(!descricao.value || !inputValor.value || !vMes || !vAno) return alert('Campos obrigatórios vazios!');
    
    const valorNum = parseValor(inputValor.value);
    const respons = responsavel.value || 'N/A';
    const cart = cartao.value || 'N/A';
    const cat = categoria.value || 'Geral';
    const desc = descricao.value;

    if(mensal.checked){
        dados.push({ responsavel: respons, mes: `${vAno}-${vMes}`, cartao: cart, categoria: cat, descricao: desc, parcela: 'Fixo', valor: valorNum, id: Date.now() });
    } else {
        const pAtual = parseInt(parcelaAtual.value) || 1;
        const pTotal = parseInt(parcelasTotal.value) || 1;
        let startMonth = parseInt(vMes);
        let startYear = parseInt(vAno);
        
        for(let i = pAtual; i <= pTotal; i++) {
            let dataRef = new Date(startYear, (startMonth - 1) + (i - pAtual), 1);
            let mesFormat = `${dataRef.getFullYear()}-${(dataRef.getMonth()+1).toString().padStart(2,'0')}`;
            dados.push({ 
                responsavel: respons, 
                mes: mesFormat, 
                cartao: cart, 
                categoria: cat, 
                descricao: pTotal > 1 ? `${desc} (${i}/${pTotal})` : desc, 
                parcela: pTotal > 1 ? `${i}/${pTotal}` : 'À vista', 
                valor: valorNum, 
                id: Date.now() + i 
            });
        }
    }
    localStorage.setItem('dados', JSON.stringify(dados));
    descricao.value = ''; inputValor.value = ''; render();
}

function render(){
    const fMes = document.getElementById('filtroMes_cal').value;
    const fAno = document.getElementById('filtroAno_cal').value;
    const lista = dados.filter(d => {
        let matchData = true;
        if(fAno && fMes) matchData = (d.mes === `${fAno}-${fMes}`);
        else if(fAno) matchData = d.mes.startsWith(fAno);
        else if(fMes) matchData = d.mes.endsWith(fMes);
        return (!filtroNome.value || d.descricao.toLowerCase().includes(filtroNome.value.toLowerCase())) && matchData &&
        (!filtroCartao.value || d.cartao === filtroCartao.value) && (!filtroCategoria.value || d.categoria === filtroCategoria.value) && (!filtroResponsavel.value || d.responsavel === filtroResponsavel.value);
    });

    tabela.innerHTML='';
    let totalF=0, totalG=0;
    dados.forEach(d=> totalG+=d.valor);

    lista.sort((a,b) => a.mes.localeCompare(b.mes)).forEach((d)=>{
        totalF+=d.valor;
        const [ano, mes] = d.mes.split('-');
        tabela.innerHTML+=`
        <tr class="hover:bg-white/20 transition-colors">
            <td class="p-5 text-[9px] font-bold text-slate-400">${nomesMeses[parseInt(mes)-1]} ${ano}</td>
            <td class="p-5">
                <div class="flex flex-wrap gap-1">
                    <span class="px-2 py-0.5 rounded-md text-[8px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">${d.categoria}</span>
                    <span class="px-2 py-0.5 rounded-md text-[8px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/10">${d.cartao}</span>
                </div>
            </td>
            <td class="p-5">
                <div class="font-bold text-slate-800 dark:text-slate-200">${d.descricao}</div>
                <div class="text-[8px] opacity-50 uppercase">${d.responsavel} • ${d.parcela}</div>
            </td>
            <td class="p-5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">R$ ${d.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            <td class="p-5 text-center">
                <button onclick="remover(${d.id})" class="text-slate-300 hover:text-red-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </td>
        </tr>`;
    });
    totalFiltrado.innerText='R$ '+totalF.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    totalGeral.innerText='R$ '+totalG.toLocaleString('pt-BR', {minimumFractionDigits: 2});
    renderChart(lista);
}

function renderChart(lista){
    let cat={};
    lista.forEach(d=> cat[d.categoria]=(cat[d.categoria]||0)+d.valor);
    if(chart) chart.destroy();
    chart=new Chart(grafico,{
        type:'doughnut',
        data:{
            labels:Object.keys(cat),
            datasets:[{ data:Object.values(cat), backgroundColor:['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#ef4444'], borderWidth:0 }]
        },
        options: { plugins: { legend: { display: false } }, cutout: '80%', maintainAspectRatio: false }
    });
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    render();
}
if(localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');

function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finanças");
    XLSX.writeFile(wb, "Financas_Glass.xlsx");
}

function remover(id){ if(confirm('Excluir este item?')){ dados = dados.filter(d => d.id !== id); localStorage.setItem('dados', JSON.stringify(dados)); render(); } }
function resetar(){ if(confirm('Tudo será apagado. Continuar?')){ localStorage.removeItem('dados'); dados=[]; render(); } }
render();
