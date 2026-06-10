const fs = require('fs');
const path = require('path');

const loginDir = path.join('app', 'auth', 'login');
const regDir = path.join('app', 'auth', 'registro');

fs.mkdirSync(loginDir, { recursive: true });
fs.mkdirSync(regDir, { recursive: true });

const loginCode = fs.readFileSync('app/auth/page.tsx', 'utf8')
  .replace('navigate.push("/dashboard")', 'navigate.push("/app")');

fs.writeFileSync(path.join(loginDir, 'page.tsx'), loginCode);

const regCode = loginCode
  .replace(/Login/g, 'Register')
  .replace('signInWithPassword', 'signUp')
  .replace('Entrar', 'Criar Conta')
  .replace('Não tem uma conta?', 'Já tem uma conta?')
  .replace('/auth/registro', '/auth/login')
  .replace('Cadastre-se grátis', 'Fazer login')
  .replace('ao fazer login', 'ao criar conta');

fs.writeFileSync(path.join(regDir, 'page.tsx'), regCode);
fs.unlinkSync('app/auth/page.tsx');

console.log("Auth routes restored successfully.");
