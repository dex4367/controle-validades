// Script personalizado para build no Vercel que ignora verificações TypeScript
console.log('🚀 Iniciando build personalizado para Vercel');
console.log('⏩ Pulando verificação TypeScript e executando diretamente vite build');

// Usando CommonJS pois esse script será executado no Node.js diretamente
const { execSync } = require('child_process');

try {
  // Executar diretamente o vite build sem passar pelo TypeScript
  console.log('📦 Executando vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Build concluído com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro durante o build:', error);
  process.exit(1);
} 