const jwt = require('jsonwebtoken');

// JWT Secret del servidor Supabase (debe coincidir con el configurado en el servidor)
const JWT_SECRET = '5d45f7c084893e2c3b6f2825ad9dfb2e2a1f4656786c144b89cafd3bz2bf679a';

// Generar ANON_KEY
const anonPayload = {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 año de expiración
};

const anonKey = jwt.sign(anonPayload, JWT_SECRET, { algorithm: 'HS256' });

// Generar SERVICE_ROLE_KEY
const servicePayload = {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 año de expiración
};

const serviceKey = jwt.sign(servicePayload, JWT_SECRET, { algorithm: 'HS256' });

console.log('=== TOKENS GENERADOS ===');
console.log('');
console.log('SUPABASE_ANON_KEY=');
console.log(anonKey);
console.log('');
console.log('SUPABASE_SERVICE_ROLE_KEY=');
console.log(serviceKey);
console.log('');
console.log('=== VERIFICACIÓN ===');

// Verificar que los tokens son válidos
try {
    const decodedAnon = jwt.verify(anonKey, JWT_SECRET);
    console.log('✅ ANON_KEY válido:', decodedAnon.role);
} catch (error) {
    console.log('❌ ANON_KEY inválido:', error.message);
}

try {
    const decodedService = jwt.verify(serviceKey, JWT_SECRET);
    console.log('✅ SERVICE_ROLE_KEY válido:', decodedService.role);
} catch (error) {
    console.log('❌ SERVICE_ROLE_KEY inválido:', error.message);
}

console.log('');
console.log('=== INSTRUCCIONES ===');
console.log('1. Actualiza tu archivo .env con los nuevos tokens');
console.log('2. Actualiza tu archivo ~/.cursor/mcp.json con los nuevos tokens');
console.log('3. Reinicia el servidor MCP'); 