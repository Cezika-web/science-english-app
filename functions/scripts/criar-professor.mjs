/**
 * Cria o login de um professor e gera o link para ele definir a própria senha.
 * Nenhuma senha passa por aqui — quem escolhe é o professor.
 *
 *   node functions/scripts/criar-professor.mjs <email> <escolaId>
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const [, , email, escolaId] = process.argv;
if (!email || !escolaId) {
  console.error('uso: node functions/scripts/criar-professor.mjs <email> <escolaId>');
  process.exit(1);
}

const CAMINHO_SA = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!CAMINHO_SA) {
  console.error('Defina GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(CAMINHO_SA, 'utf8'))) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  const escolaSnap = await db.doc(`schools/${escolaId}`).get();
  if (!escolaSnap.exists) throw new Error(`Escola "${escolaId}" não existe.`);
  const escola = escolaSnap.data();

  if (escola.ownerEmail !== email) {
    throw new Error(
      `A escola "${escola.name}" está registrada para ${escola.ownerEmail}, não ${email}.`
    );
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`login já existia: ${email}`);
  } catch {
    // Senha aleatória descartável só para criar a conta — o professor
    // define a dele pelo link abaixo e esta nunca é usada nem exibida.
    const descartavel = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}Aa1!`;
    user = await auth.createUser({
      email,
      password: descartavel,
      displayName: escola.teacherName || escola.name,
      emailVerified: false,
    });
    console.log(`login criado: ${email}`);
  }

  const link = await auth.generatePasswordResetLink(email);

  console.log(`\nescola : ${escola.name}`);
  console.log(`uid    : ${user.uid}`);
  console.log('\n── Envie este link para o professor definir a senha dele ──\n');
  console.log(link);
  console.log('\n(o link expira; se vencer, rode este script de novo)');
}

main().catch((e) => { console.error('erro:', e.message); process.exit(1); });
