/**
 * KES - LOGIQUE RESPONSABLE D'EXPLOITATION
 */

let state = { interventions: [], users: [], logs: [] };

window.onload = async () => {
    // Vérification de sécurité rapide
    const user = JSON.parse(sessionStorage.getItem('kes_user') || '{}');
    if (user.role !== 'manager') {
        alert("Accès refusé. Espace réservé au Responsable.");
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('admin-name').innerText = user.nom;
    await refreshData();
};

async function refreshData() {
    console.log("Mise à jour des données...");
    const data = await API.call('getAllData');
    
    if (data.error) {
        console.error("Erreur de récupération:", data.error);
        return;
    }

    state = data;
    renderKPIs();
    renderInterventions();
}

function renderKPIs() {
    document.getElementById('kpi-todo').innerText = state.interventions.filter(i => i.statut === 'A_FAIRE').length;
    document.getElementById('kpi-doing').innerText = state.interventions.filter(i => i.statut === 'EN_COURS').length;
    document.getElementById('kpi-done').innerText = state.interventions.filter(i => i.statut === 'TERMINE').length;
    document.getElementById('kpi-urgent').innerText = state.interventions.filter(i => i.priorite === 'URGENTE').length;
}

function renderInterventions() {
    const tbody = document.getElementById('table-interventions');
    if (!tbody) return;

    if (state.interventions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucune intervention enregistrée.</td></tr>';
        return;
    }

    tbody.innerHTML = state.interventions.map(int => `
        <tr>
            <td>#${int.intervention_id ? int.intervention_id.slice(-4) : '---'}</td>
            <td><span class="prio-${int.priorite}">${int.priorite}</span></td>
            <td><span class="badge ${int.statut}">${int.statut}</span></td>
            <td><strong>${int.client}</strong><br><small>${int.adresse}</small></td>
            <td>${int.assigne_user_id || '<em>Non assigné</em>'}</td>
            <td>${int.derniere_modif ? new Date(int.derniere_modif).toLocaleDateString() : '---'}</td>
            <td>
                <button onclick="alert('Description : ${int.description || 'Pas de détail'}')" title="Voir détails">👁️</button>
            </td>
        </tr>
    `).join('');
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById('view-' + viewId).classList.add('active');
    event.target.classList.add('active');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function saveIntervention() {
    const btn = event.target;
    btn.innerText = "Envoi...";
    btn.disabled = true;

    const data = {
        titre: document.getElementById('int-titre').value,
        client: document.getElementById('int-client').value,
        adresse: document.getElementById('int-adresse').value,
        description: document.getElementById('int-desc').value,
        priorite: document.getElementById('int-prio').value,
        assigne_id: document.getElementById('int-assign').value
    };

    const res = await API.call('createIntervention', data);
    
    if (res.success) {
        closeModal('modal-inter');
        await refreshData();
        // Reset formulaire
        document.querySelectorAll('#modal-inter input, #modal-inter textarea').forEach(i => i.value = "");
    } else {
        alert("Erreur lors de la création");
    }
    
    btn.innerText = "Enregistrer";
    btn.disabled = false;
}

function logout() {
    sessionStorage.clear();
    localStorage.removeItem('kes_user');
    window.location.href = 'login.html';
}
