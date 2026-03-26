const crypto = require('crypto');

console.log('=== СЕКРЕТЫ ДЛЯ VERCEL ===');
console.log('');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('');
console.log('SESSION_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('');
console.log('=== СКОПИРУЙ ЭТИ ЗНАЧЕНИЯ В VERCEL ENVIRONMENT VARIABLES ===');

