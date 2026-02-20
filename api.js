const GAS_URL = "https://script.google.com/macros/s/AKfycbxqla1t8kTx-06zoR7q0gTDJ_89ifgS2x9PKPymypFQJfFFizML_jlapTnBMLbpJs0E/exec";

const API = {
    async call(action, data = {}) {
        const user = JSON.parse(localStorage.getItem('kes_user') || sessionStorage.getItem('kes_user') || '{}');
        const payload = { 
            action, 
            ...data, 
            auth: { user_id: user.id || 'system', role: user.role || 'guest' } 
        };
        
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (e) {
            console.error("Erreur API:", e);
            return { error: "Connexion impossible" };
        }
    }
};