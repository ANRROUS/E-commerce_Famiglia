import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDENTIALS_FILE = path.join(__dirname, 'user_credentials.json');

// Inicializar archivo si no existe
if (!fs.existsSync(CREDENTIALS_FILE)) {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({
        identities: [
            {
                alias: 'Administrador',
                email: 'arthuro@gmail.com',
                password: 'arthuro', // En producción esto debería estar encriptado
                role: 'admin'
            }
        ]
    }, null, 2));
}

export const credentialManager = {
    getAllIdentities: () => {
        try {
            const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
            return JSON.parse(data).identities;
        } catch (error) {
            console.error('Error leyendo credenciales:', error);
            return [];
        }
    },

    getIdentityByAlias: (alias) => {
        const identities = credentialManager.getAllIdentities();
        return identities.find(id => id.alias.toLowerCase().includes(alias.toLowerCase()));
    },

    saveIdentity: (alias, email, password, role = 'client') => {
        try {
            const identities = credentialManager.getAllIdentities();

            // Verificar si ya existe
            const existingIndex = identities.findIndex(id => id.email === email);

            const newIdentity = { alias, email, password, role };

            if (existingIndex >= 0) {
                identities[existingIndex] = newIdentity;
            } else {
                identities.push(newIdentity);
            }

            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({ identities }, null, 2));
            return true;
        } catch (error) {
            console.error('Error guardando credencial:', error);
            return false;
        }
    }
};
