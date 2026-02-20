/**
 * FICHIER DE SYNCHRONISATION TECHNICIEN
 * Ce script récupère les ordres du Responsable et les injecte dans ton planning local
 */

const GAS_URL = "TON_URL_SCRIPT_ICI"; // <--- METS TON URL GOOGLE APPS SCRIPT ICI

async function syncFromManager() {
    const user = JSON.parse(localStorage.getItem('kes_user') || '{}');
    
    // Si pas d'ID ou pas un technicien, on ne fait rien
    if (!user.id) return;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'getTechMissions', 
                tech_id: user.id 
            })
        });
        
        const missions = await response.json();

        // On récupère ton planning actuel dans le téléphone (localStorage)
        let localPlanning = JSON.parse(localStorage.getItem('kes_planning_list') || '[]');
        
        let hasNew = false;
        missions.forEach(m => {
            // On vérifie si on n'a pas déjà ajouté cette mission
            const exists = localPlanning.find(lp => lp.sync_id === m.intervention_id);
            
            if (!exists) {
                // On l'ajoute au format de ton code actuel
                localPlanning.push({
                    id: Date.now() + Math.random(),
                    titre: `[ORDRE] ${m.titre}`,
                    date: m.date_creation.split('T')[0], // Format YYYY-MM-DD
                    heure: "08:00",
                    note: `CLIENT: ${m.client}\nADRESSE: ${m.adresse}\nDESC: ${m.description}`,
                    sync_id: m.intervention_id // Pour éviter les doublons
                });
                hasNew = true;
            }
        });

        if (hasNew) {
            localStorage.setItem('kes_planning_list', JSON.stringify(localPlanning));
            // Si on est sur la page planning, on rafraîchit l'affichage
            if (typeof renderPlanning === "function") renderPlanning();
            console.log("Nouvelles missions synchronisées !");
        }
    } catch (e) {
        console.log("Synchro en attente de connexion...");
    }
}

// Vérifie les nouvelles missions toutes les 60 secondes
setInterval(syncFromManager, 60000);
// Premier lancement au chargement
syncFromManager();