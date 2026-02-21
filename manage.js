/**
 * KES MANAGER - VERSION COMPLÈTE
 * Gestion entreprise, techniciens, interventions, géolocalisation
 */

let state = { interventions: [], users: [], companyProfile: null };
let map = null;
let techMarkers = {};

window.onload = async () => {
    const user = JSON.parse(localStorage.getItem('kes_user') || '{}');
    if (user.role !== 'manager') {
        alert("Accès refusé. Espace réservé au Responsable.");
        window.location.href = 'login.html';
        return;
    }
    
    await refreshData();
    updateManagerInfo();
    loadCompanyProfile();
};

function updateManagerInfo() {
    const user = JSON.parse(localStorage.getItem('kes_user') || '{}');
    const company = JSON.parse(localStorage.getItem('company_profile') || '{}');
    
    const infoText = `Connecté en tant que <strong>${user.name || 'Manager'}</strong>` + 
                     (company.name ? ` - <strong>${company.name}</strong>` : '');
    
    document.getElementById('manager-info').innerHTML = infoText;
    
    // Afficher le logo si disponible
    if (company.logo) {
        const logoHeader = document.getElementById('company-logo-header');
        logoHeader.src = company.logo;
        logoHeader.style.display = 'block';
    }
}

async function refreshData() {
    console.log("Mise à jour des données...");
    
    const bonsHistory = JSON.parse(localStorage.getItem('bons_history') || '[]');
    const users = JSON.parse(localStorage.getItem('kes_users') || '[]');
    const interventions = JSON.parse(localStorage.getItem('manager_interventions') || '[]');
    
    state.interventions = [...bonsHistory, ...interventions];
    state.users = users;
    
    renderKPIs();
    renderInterventions();
    updateTechnicianSelect();
}

function renderKPIs() {
    const total = state.interventions.length;
    const techs = state.users.filter(u => u.role === 'tech').length;
    
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-encours').innerText = state.interventions.filter(i => i.status === 'EN_COURS').length;
    document.getElementById('stat-terminees').innerText = state.interventions.filter(i => i.status === 'TERMINE' || i.bonNumber).length;
    document.getElementById('stat-techs').innerText = techs;
}

function renderInterventions() {
    const tbody = document.getElementById('recent-table');
    const allTbody = document.getElementById('all-interventions-table');
    
    if (state.interventions.length === 0) {
        const emptyRow = '<tr><td colspan="5" style="text-align:center; color: #888;">Aucune intervention</td></tr>';
        if (tbody) tbody.innerHTML = emptyRow;
        if (allTbody) allTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: #888;">Aucune intervention</td></tr>';
        return;
    }
    
    const recentRows = state.interventions.slice(0, 10).map(bon => `
        <tr>
            <td>${bon.bonNumber || bon.id || '---'}</td>
            <td>${bon.clientName || bon.client || 'N/A'}</td>
            <td>${bon.arrivalDate || bon.date || 'N/A'}</td>
            <td>${bon.assignedTo || bon.companyProfile?.technicianName || 'N/A'}</td>
            <td><span class="badge ${bon.status || 'TERMINE'}">${bon.status || 'Terminé'}</span></td>
        </tr>
    `).join('');
    
    const allRows = state.interventions.map(bon => {
        const statusClass = bon.status || 'TERMINE';
        const statusText = bon.status === 'EN_COURS' ? 'En cours' : 
                          bon.status === 'ANNULE' ? 'Annulé' : 
                          bon.status === 'A_FAIRE' ? 'À faire' : 'Terminé';
        
        return `
        <tr>
            <td>${bon.bonNumber || bon.id || '---'}</td>
            <td>${bon.clientName || bon.client || 'N/A'}</td>
            <td>${bon.clientAddress || bon.address || 'N/A'}</td>
            <td>${bon.arrivalDate || bon.date || 'N/A'}</td>
            <td>${bon.assignedTo || bon.companyProfile?.technicianName || 'N/A'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                <button onclick="viewIntervention('${bon.bonNumber || bon.id}')" style="background: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Voir</button>
            </td>
        </tr>
    `}).join('');
    
    if (tbody) tbody.innerHTML = recentRows;
    if (allTbody) allTbody.innerHTML = allRows;
}

function renderTechniciens() {
    const container = document.getElementById('techs-grid');
    if (!container) return;
    
    const techs = state.users.filter(u => u.role === 'tech');
    
    if (techs.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; padding: 40px; grid-column: 1/-1;">Aucun technicien</div>';
        return;
    }
    
    container.innerHTML = techs.map((tech, index) => {
        const techInterventions = state.interventions.filter(i => 
            i.assignedTo === tech.name || i.companyProfile?.technicianName === tech.name
        );
        const enCours = techInterventions.filter(i => i.status === 'EN_COURS').length;
        const terminees = techInterventions.filter(i => i.status === 'TERMINE' || i.bonNumber).length;
        
        const gpsStatus = tech.lastGPS ? '🟢 Actif' : '🔴 Hors ligne';
        
        // Affichage photo ou avatar
        const photoHTML = tech.photo ? 
            `<img src="${tech.photo}" alt="${tech.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid var(--electric-blue); box-shadow: var(--glow-blue);">` :
            `<div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--electric-blue), var(--vivid-purple)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: white; border: 3px solid var(--glass-border); box-shadow: var(--glow-blue);">
                ${tech.firstName ? tech.firstName.charAt(0).toUpperCase() : '👷'}
            </div>`;
        
        return `
            <div class="tech-card-new" style="background: linear-gradient(135deg, rgba(26, 26, 40, 0.6) 0%, rgba(18, 18, 26, 0.8) 100%); 
                 backdrop-filter: blur(25px); 
                 padding: 24px; 
                 border-radius: 20px; 
                 border: 1px solid var(--glass-border); 
                 cursor: pointer; 
                 transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                 position: relative;
                 overflow: hidden;
                 box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);" 
                 onclick="openTechDetails('${tech.id}')"
                 onmouseover="this.style.transform='translateY(-8px) scale(1.02)'; this.style.borderColor='rgba(0, 212, 255, 0.5)'; this.style.boxShadow='var(--glow-blue), 0 16px 48px rgba(0, 0, 0, 0.8)';"
                 onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.borderColor='var(--glass-border)'; this.style.boxShadow='0 8px 32px rgba(0, 0, 0, 0.6)';">
                
                <!-- Gradient border top -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--electric-blue) 0%, var(--vivid-purple) 50%, var(--cyber-lime) 100%); background-size: 200% 100%; animation: gradientShift 3s linear infinite;"></div>
                
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px;">
                    ${photoHTML}
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 5px 0; color: white; font-size: 1.1rem; font-weight: 700;">${tech.name}</h3>
                        <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 0.85rem; display: flex; align-items: center; gap: 5px;">
                            📧 ${tech.email}
                        </p>
                        <p style="margin: 3px 0 0 0; color: rgba(255, 255, 255, 0.5); font-size: 0.85rem; display: flex; align-items: center; gap: 5px;">
                            📱 ${tech.phone || 'N/A'}
                        </p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                    <div style="background: rgba(255, 193, 7, 0.1); padding: 12px; border-radius: 12px; text-align: center; border: 1px solid rgba(255, 193, 7, 0.2);">
                        <p style="margin: 0; color: #ffc107; font-size: 1.8em; font-weight: 900; font-family: var(--font-display);">${enCours}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(255, 255, 255, 0.5); font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.5px;">En cours</p>
                    </div>
                    <div style="background: rgba(57, 255, 20, 0.1); padding: 12px; border-radius: 12px; text-align: center; border: 1px solid rgba(57, 255, 20, 0.2);">
                        <p style="margin: 0; color: var(--cyber-lime); font-size: 1.8em; font-weight: 900; font-family: var(--font-display);">${terminees}</p>
                        <p style="margin: 5px 0 0 0; color: rgba(255, 255, 255, 0.5); font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.5px;">Terminées</p>
                    </div>
                </div>
                
                <div style="padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                    <p style="margin: 0; color: rgba(255, 255, 255, 0.5); font-size: 0.85em; display: flex; align-items: center; gap: 8px;">
                        📍 <span style="color: ${tech.lastGPS ? 'var(--cyber-lime)' : '#ef4444'};">${gpsStatus}</span>
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

function openTechDetails(techId) {
    const tech = state.users.find(u => u.id == techId);
    if (!tech) return;
    
    document.getElementById('tech-detail-name').innerText = tech.name;
    document.getElementById('tech-detail-email').innerText = tech.email;
    document.getElementById('tech-detail-phone').innerText = tech.phone;
    
    const techInterventions = state.interventions.filter(i => 
        i.assignedTo === tech.name || i.companyProfile?.technicianName === tech.name
    );
    
    const planningHTML = techInterventions.length === 0 ? 
        '<p style="color: #888; text-align: center; padding: 20px;">Aucune intervention assignée</p>' :
        techInterventions.map(inter => {
            const statusColors = {
                'A_FAIRE': '#ffc107',
                'EN_COURS': '#17a2b8',
                'TERMINE': '#28a745',
                'ANNULE': '#dc3545'
            };
            const statusText = {
                'A_FAIRE': 'À faire',
                'EN_COURS': 'En cours',
                'TERMINE': 'Terminé',
                'ANNULE': 'Annulé'
            };
            const status = inter.status || 'TERMINE';
            
            return `
                <div style="background: #333; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${statusColors[status]};">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong>${inter.client || inter.clientName}</strong>
                        <span style="background: ${statusColors[status]}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8em;">${statusText[status]}</span>
                    </div>
                    <p style="margin: 5px 0; color: #aaa; font-size: 0.9em;">📍 ${inter.address || inter.clientAddress}</p>
                    <p style="margin: 5px 0; color: #aaa; font-size: 0.9em;">📅 ${inter.date || inter.arrivalDate} ${inter.time || inter.arrivalTime || ''}</p>
                    ${inter.description ? `<p style="margin: 10px 0 0 0; color: #ccc; font-size: 0.85em;">${inter.description}</p>` : ''}
                </div>
            `;
        }).join('');
    
    document.getElementById('tech-planning').innerHTML = planningHTML;
    document.getElementById('modal-tech-details').style.display = 'flex';
}

function initMap() {
    if (map) return; // Carte déjà initialisée
    
    map = L.map('map').setView([48.8566, 2.3522], 6); // Centré sur Paris
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    updateTechMarkersOnMap();
}

function updateTechMarkersOnMap() {
    if (!map) return;
    
    // Supprimer les anciens markers
    Object.values(techMarkers).forEach(marker => map.removeLayer(marker));
    techMarkers = {};
    
    const techs = state.users.filter(u => u.role === 'tech');
    
    techs.forEach(tech => {
        // Simuler une position GPS (en production, viendrait de l'app mobile)
        const lat = 48.8566 + (Math.random() - 0.5) * 2;
        const lng = 2.3522 + (Math.random() - 0.5) * 3;
        
        const interventionsEnCours = state.interventions.filter(i => 
            (i.assignedTo === tech.name || i.companyProfile?.technicianName === tech.name) && 
            i.status === 'EN_COURS'
        ).length;
        
        const icon = L.divIcon({
            className: 'tech-marker',
            html: `<div style="background: ${interventionsEnCours > 0 ? '#ffc107' : '#28a745'}; 
                          color: white; 
                          padding: 8px 12px; 
                          border-radius: 20px; 
                          font-weight: bold; 
                          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                          white-space: nowrap;">
                    👷 ${tech.name}
                   </div>`,
            iconSize: [100, 40]
        });
        
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; color: #007bff;">${tech.name}</h3>
                <p style="margin: 5px 0;"><strong>📧</strong> ${tech.email}</p>
                <p style="margin: 5px 0;"><strong>📱</strong> ${tech.phone}</p>
                <p style="margin: 10px 0 5px 0; padding-top: 10px; border-top: 1px solid #ddd;">
                    <strong>Interventions en cours:</strong> ${interventionsEnCours}
                </p>
                <button onclick="openTechDetails('${tech.id}')" 
                        style="width: 100%; margin-top: 10px; padding: 8px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Voir le planning
                </button>
            </div>
        `);
        
        techMarkers[tech.id] = marker;
    });
}

function renderStats() {
    const total = state.interventions.length;
    const terminees = state.interventions.filter(i => i.status === 'TERMINE' || i.bonNumber).length;
    const completion = total > 0 ? Math.round((terminees / total) * 100) : 0;
    const avgPerDay = total > 0 ? (total / 30).toFixed(1) : 0;
    
    const now = new Date();
    const thisMonth = state.interventions.filter(b => {
        const bonDate = new Date(b.createdAt || b.date);
        return bonDate.getMonth() === now.getMonth() && bonDate.getFullYear() === now.getFullYear();
    }).length;
    
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = state.interventions.filter(b => {
        const bonDate = new Date(b.createdAt || b.date);
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
    
    const titles = {
        'dashboard': 'Tableau de bord',
        'societe': 'Ma Société',
        'interventions': 'Gestion des Interventions',
        'techniciens': 'Équipe & Techniciens',
        'carte': 'Carte des Techniciens',
        'stats': 'Statistiques'
    };
    
    document.getElementById('page-title').innerText = titles[viewId] || '';
    
    if (viewId === 'techniciens') renderTechniciens();
    if (viewId === 'stats') renderStats();
    if (viewId === 'carte') {
        setTimeout(() => {
            initMap();
            map.invalidateSize();
            updateTechMarkersOnMap();
        }, 100);
    }
}

// ========== GESTION PROFIL ENTREPRISE ==========

function loadCompanyProfile() {
    const profile = JSON.parse(localStorage.getItem('company_profile') || '{}');
    
    if (profile.name) {
        document.getElementById('company-name').value = profile.name;
        document.getElementById('company-siret').value = profile.siret || '';
        document.getElementById('company-address').value = profile.address || '';
        document.getElementById('company-postal').value = profile.postal || '';
        document.getElementById('company-city').value = profile.city || '';
        
        if (profile.logo) {
            document.getElementById('logo-preview').src = profile.logo;
            document.getElementById('logo-preview').style.display = 'block';
            document.getElementById('logo-placeholder').style.display = 'none';
            document.getElementById('remove-logo-btn').style.display = 'block';
        }
    }
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert('⚠️ Le logo ne doit pas dépasser 2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 300;
            
            if (width > height && width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            } else if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const logoData = canvas.toDataURL('image/jpeg', 0.8);
            
            document.getElementById('logo-preview').src = logoData;
            document.getElementById('logo-preview').style.display = 'block';
            document.getElementById('logo-placeholder').style.display = 'none';
            document.getElementById('remove-logo-btn').style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    document.getElementById('logo-preview').src = '';
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-placeholder').style.display = 'block';
    document.getElementById('remove-logo-btn').style.display = 'none';
    document.getElementById('logo-upload').value = '';
}

function saveCompanyProfile() {
    const name = document.getElementById('company-name').value.trim();
    const siret = document.getElementById('company-siret').value.trim();
    const address = document.getElementById('company-address').value.trim();
    const postal = document.getElementById('company-postal').value.trim();
    const city = document.getElementById('company-city').value.trim();
    const logo = document.getElementById('logo-preview').src;
    
    if (!name || !siret || !address || !postal || !city) {
        alert('⚠️ Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    if (siret.length !== 14 || !/^\d+$/.test(siret)) {
        alert('⚠️ Le SIRET doit contenir 14 chiffres');
        return;
    }
    
    if (postal.length !== 5 || !/^\d+$/.test(postal)) {
        alert('⚠️ Le code postal doit contenir 5 chiffres');
        return;
    }
    
    const profile = { name, siret, address, postal, city, logo: logo || null };
    localStorage.setItem('company_profile', JSON.stringify(profile));
    
    alert('✅ Profil de l\'entreprise enregistré avec succès !');
    updateManagerInfo();
}

// ========== GESTION INTERVENTIONS ==========

function updateTechnicianSelect() {
    const select = document.getElementById('inter-tech');
    if (!select) return;
    
    const techs = state.users.filter(u => u.role === 'tech');
    
    select.innerHTML = '<option value="">Sélectionner un technicien</option>' +
        techs.map(tech => `<option value="${tech.id}">${tech.name}</option>`).join('');
}

function openCreateIntervention() {
    updateTechnicianSelect();
    document.getElementById('inter-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('modal-create-intervention').style.display = 'flex';
}

function createIntervention() {
    const client = document.getElementById('inter-client').value.trim();
    const address = document.getElementById('inter-address').value.trim();
    const description = document.getElementById('inter-description').value.trim();
    const date = document.getElementById('inter-date').value;
    const time = document.getElementById('inter-time').value;
    const techId = document.getElementById('inter-tech').value;
    
    if (!client || !address || !description || !date || !time || !techId) {
        alert('⚠️ Veuillez remplir tous les champs');
        return;
    }
    
    const tech = state.users.find(u => u.id == techId);
    if (!tech) {
        alert('❌ Technicien introuvable');
        return;
    }
    
    const intervention = {
        id: 'INT-' + Date.now(),
        client,
        address,
        description,
        date,
        time,
        assignedTo: tech.name,
        assignedToId: tech.id,
        status: 'A_FAIRE',
        createdAt: new Date().toISOString(),
        createdBy: JSON.parse(localStorage.getItem('kes_user') || '{}').name
    };
    
    const interventions = JSON.parse(localStorage.getItem('manager_interventions') || '[]');
    interventions.push(intervention);
    localStorage.setItem('manager_interventions', JSON.stringify(interventions));
    
    // Synchroniser avec le technicien (localStorage partagé)
    const techKey = `tech_interventions_${tech.id}`;
    const techInterventions = JSON.parse(localStorage.getItem(techKey) || '[]');
    techInterventions.push(intervention);
    localStorage.setItem(techKey, JSON.stringify(techInterventions));
    
    alert(`✅ Intervention créée et assignée à ${tech.name} !`);
    
    closeModal('modal-create-intervention');
    
    // Reset formulaire
    document.getElementById('inter-client').value = '';
    document.getElementById('inter-address').value = '';
    document.getElementById('inter-description').value = '';
    document.getElementById('inter-time').value = '';
    document.getElementById('inter-tech').value = '';
    
    refreshData();
}

function viewIntervention(id) {
    const inter = state.interventions.find(i => i.bonNumber === id || i.id === id);
    if (!inter) {
        alert('Intervention introuvable');
        return;
    }
    
    const details = `
📋 BON N° ${inter.bonNumber || inter.id}

👤 Client: ${inter.clientName || inter.client}
📍 Adresse: ${inter.clientAddress || inter.address}
📅 Date: ${inter.arrivalDate || inter.date}
🕐 Heure: ${inter.arrivalTime || inter.time || 'N/A'}

👷 Technicien: ${inter.assignedTo || inter.companyProfile?.technicianName || 'N/A'}

📝 Description:
${inter.description || inter.interventions?.join('\n') || 'N/A'}

💬 Observations:
${inter.observations || 'N/A'}
    `.trim();
    
    alert(details);
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        sessionStorage.removeItem('kes_authenticated');
        localStorage.removeItem('kes_user');
        window.location.href = 'login.html';
    }
}

// Auto-refresh toutes les 30 secondes
setInterval(refreshData, 30000);

// ========== GESTION AJOUT TECHNICIEN ==========

let currentTechPhoto = null;

function openAddTechnicianModal() {
    // Réinitialiser le formulaire
    document.getElementById('tech-firstname').value = '';
    document.getElementById('tech-lastname').value = '';
    document.getElementById('tech-email').value = '';
    document.getElementById('tech-phone').value = '';
    document.getElementById('tech-password').value = '';
    currentTechPhoto = null;
    
    // Réinitialiser la photo
    document.getElementById('tech-photo-img').style.display = 'none';
    document.getElementById('tech-photo-placeholder').style.display = 'block';
    
    document.getElementById('modal-add-technician').style.display = 'flex';
}

function handleTechPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('⚠️ La photo ne doit pas dépasser 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxSize = 400;
            
            if (width > height && width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            } else if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentTechPhoto = canvas.toDataURL('image/jpeg', 0.85);
            
            document.getElementById('tech-photo-img').src = currentTechPhoto;
            document.getElementById('tech-photo-img').style.display = 'block';
            document.getElementById('tech-photo-placeholder').style.display = 'none';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function formatPhoneNumber(input) {
    // Auto-format le numéro de téléphone
    let value = input.value.replace(/\D/g, '');
    if (value.length > 10) value = value.slice(0, 10);
    
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 2 === 0) formatted += ' ';
        formatted += value[i];
    }
    input.value = formatted;
}

// Auto-format téléphone en temps réel
document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('tech-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => formatPhoneNumber(e.target));
    }
});

function saveTechnician() {
    const firstname = document.getElementById('tech-firstname').value.trim();
    const lastname = document.getElementById('tech-lastname').value.trim();
    const email = document.getElementById('tech-email').value.trim();
    const phone = document.getElementById('tech-phone').value.trim();
    const password = document.getElementById('tech-password').value.trim();
    
    // Validation
    if (!firstname || !lastname || !email || !phone || !password) {
        showNotification('⚠️ Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('⚠️ Email invalide', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('⚠️ Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }
    
    // Créer le technicien
    const users = JSON.parse(localStorage.getItem('kes_users') || '[]');
    
    if (users.find(u => u.email === email)) {
        showNotification('❌ Cet email est déjà utilisé', 'error');
        return;
    }
    
    const newTech = {
        id: Date.now(),
        name: `${firstname} ${lastname}`,
        firstName: firstname,
        lastName: lastname,
        email,
        phone: phone.replace(/\s/g, ''),
        role: 'tech',
        password,
        photo: currentTechPhoto,
        createdAt: new Date().toISOString(),
        addedBy: JSON.parse(localStorage.getItem('kes_user') || '{}').name
    };
    
    users.push(newTech);
    localStorage.setItem('kes_users', JSON.stringify(users));
    
    // Ajouter à l'état local
    state.users.push(newTech);
    
    // Fermer le modal
    closeModal('modal-add-technician');
    
    // Afficher notification de succès
    showNotification('✅ Technicien ajouté avec succès !', 'success');
    
    // Rafraîchir l'affichage
    renderTechniciens();
    renderKPIs();
    updateTechnicianSelect();
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('success-notification');
    const textEl = document.getElementById('notification-text');
    
    textEl.textContent = message;
    
    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))';
        notification.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        notification.style.boxShadow = '0 0 40px rgba(239, 68, 68, 0.6), 0 8px 32px rgba(0, 0, 0, 0.6)';
    } else {
        notification.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(0, 212, 255, 0.95))';
        notification.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        notification.style.boxShadow = '0 0 40px rgba(16, 185, 129, 0.6), 0 8px 32px rgba(0, 0, 0, 0.6)';
    }
    
    notification.className = 'show';
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.className = 'hide';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, 4000);
}
