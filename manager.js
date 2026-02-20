/**
 * KES - LOGIQUE RESPONSABLE D'EXPLOITATION
 */
let state = { interventions: [], users: [], logs: [] };

window.onload = async () => {
    // Vérification de sécurité rapide
    const user = JSON.parse(localStorage.getItem('kes_user') || '{}');
    if (user.role !== 'manager') {
        alert("Accès refusé. Espace réservé au Responsable.");
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('manager-name').innerText = user.name || 'Manager';
    await refreshData();
};

async function refreshData() {
    console.log("Mise à jour des données...");
    
    // Récupérer les interventions depuis localStorage
    const bonsHistory = JSON.parse(localStorage.getItem('bons_history') || '[]');
    const users = JSON.parse(localStorage.getItem('kes_users') || '[]');
    
    state.interventions = bonsHistory;
    state.users = users;
    
    renderKPIs();
    renderInterventions();
}

function renderKPIs() {
    const total = state.interventions.length;
    const techs = state.users.filter(u => u.role === 'tech').length;
    
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-encours').innerText = Math.floor(total * 0.3);
    document.getElementById('stat-terminees').innerText = Math.floor(total * 0.7);
    document.getElementById('stat-techs').innerText = techs;
}

function renderInterventions() {
    const tbody = document.getElementById('recent-table');
    const allTbody = document.getElementById('all-interventions-table');
    
    if (state.interventions.length === 0) {
        const emptyRow = '<tr><td colspan="5" style="text-align:center; color: #888;">Aucune intervention</td></tr>';
        if (tbody) tbody.innerHTML = emptyRow;
        if (allTbody) allTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #888;">Aucune intervention</td></tr>';
        return;
    }
    
    const recentRows = state.interventions.slice(0, 10).map(bon => `
        <tr>
            <td>${bon.bonNumber || '---'}</td>
            <td>${bon.clientName || 'N/A'}</td>
            <td>${bon.arrivalDate || 'N/A'}</td>
            <td>${bon.companyProfile?.technicianName || 'N/A'}</td>
            <td><span class="badge TERMINE">Terminé</span></td>
        </tr>
    `).join('');
    
    const allRows = state.interventions.map(bon => `
        <tr>
            <td>${bon.bonNumber || '---'}</td>
            <td>${bon.clientName || 'N/A'}</td>
            <td>${bon.clientAddress || 'N/A'}</td>
            <td>${bon.arrivalDate || 'N/A'}</td>
            <td>${bon.companyProfile?.technicianName || 'N/A'}</td>
            <td>
                <button onclick="viewBon('${bon.bonNumber}')" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Voir</button>
            </td>
        </tr>
    `).join('');
    
    if (tbody) tbody.innerHTML = recentRows;
    if (allTbody) allTbody.innerHTML = allRows;
}

function renderTechniciens() {
    const tbody = document.getElementById('techs-table');
    if (!tbody) return;
    
    const techs = state.users.filter(u => u.role === 'tech');
    
    if (techs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #888;">Aucun technicien</td></tr>';
        return;
    }
    
    tbody.innerHTML = techs.map(tech => {
        const techBons = state.interventions.filter(b => b.companyProfile?.technicianName === tech.name).length;
        return `
            <tr>
                <td>${tech.name}</td>
                <td>${tech.email}</td>
                <td>${tech.phone}</td>
                <td>${techBons}</td>
                <td><span class="badge TERMINE">Actif</span></td>
            </tr>
        `;
    }).join('');
}

function renderStats() {
    const total = state.interventions.length;
    const completion = total > 0 ? 100 : 0;
    const avgPerDay = total > 0 ? (total / 30).toFixed(1) : 0;
    
    const now = new Date();
    const thisMonth = state.interventions.filter(b => {
        const bonDate = new Date(b.createdAt);
        return bonDate.getMonth() === now.getMonth() && bonDate.getFullYear() === now.getFullYear();
    }).length;
    
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = state.interventions.filter(b => {
        const bonDate = new Date(b.createdAt);
        return bonDate >= oneWeekAgo;
    }).length;
    
    document.getElementById('stat-completion').innerText = completion + '%';
    document.getElementById('stat-avg').innerText = avgPerDay;
    document.getElementById('stat-month').innerText = thisMonth;
    document.getElementById('stat-week').innerText = thisWeek;
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    event.target.classList.add('active');
    
    document.getElementById('page-title').innerText = 
        viewId === 'dashboard' ? 'Tableau de bord' :
        viewId === 'interventions' ? 'Interventions' :
        viewId === 'techniciens' ? 'Techniciens' :
        viewId === 'stats' ? 'Statistiques' : '';
    
    if (viewId === 'techniciens') renderTechniciens();
    if (viewId === 'stats') renderStats();
}

function viewBon(bonNumber) {
    const bon = state.interventions.find(b => b.bonNumber === bonNumber);
    if (!bon) {
        alert('Bon introuvable');
        return;
    }
    
    alert(`BON N° ${bon.bonNumber}\n\nClient: ${bon.clientName}\nAdresse: ${bon.clientAddress}\nDate: ${bon.arrivalDate}\nHeure: ${bon.arrivalTime}\n\nInterventions:\n${bon.interventions?.join('\n') || 'Aucune'}\n\nObservations:\n${bon.observations || 'Aucune'}`);
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        sessionStorage.removeItem('kes_authenticated');
        localStorage.removeItem('kes_user');
        window.location.href = 'login.html';
    }
}

// Rafraîchir les données toutes les 30 secondes
setInterval(refreshData, 30000);
