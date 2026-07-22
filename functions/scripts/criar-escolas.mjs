/**
 * Cria as escolas e marca cada aluno existente com a sua.
 * Roda uma vez, com a service account:
 *   node functions/scripts/criar-escolas.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const CAMINHO_SA = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!CAMINHO_SA) {
  console.error('Defina GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON da service account.');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(CAMINHO_SA, 'utf8'))) });
const db = getFirestore();

const ESCOLAS = {
  'science-english': {
    name: 'Science English',
    teacherName: 'César',
    ownerEmail: 'cmo.sep@gmail.com',
    theme: { accent: '#16A34A', accentDark: '#064E3B' },
    plan: { modules: ['posaula', 'atividades'], creditosPosaula: null, creditosAtividade: null },
  },
  'ingles-in-particular': {
    name: 'Inglês in Particular',
    teacherName: 'Alcir Mandacaró',
    ownerEmail: null, // preencher com o e-mail de login do professor
    whatsapp: '5515981426993',
    theme: { accent: '#1B4F9C', accentDark: '#14396F' },
    plan: {
      modules: ['posaula', 'atividades'],
      trial: true,
      trialAte: '2026-09-20', // 60 dias a partir de 22/07/2026
    },
  },
};

const ESCOLA_PADRAO = 'science-english';

async function main() {
  for (const [id, dados] of Object.entries(ESCOLAS)) {
    await db.doc(`schools/${id}`).set(
      { ...dados, atualizadoEm: FieldValue.serverTimestamp() },
      { merge: true }
    );
    console.log(`escola gravada: ${id} (${dados.name})`);
  }

  const alunos = await db.collection('students').get();
  let marcados = 0;
  let jaTinham = 0;

  const lote = db.batch();
  alunos.forEach((d) => {
    if (d.data().schoolId) { jaTinham++; return; }
    lote.update(d.ref, { schoolId: ESCOLA_PADRAO });
    marcados++;
  });
  if (marcados) await lote.commit();

  console.log(`\nalunos: ${alunos.size} no total`);
  console.log(`  ${marcados} marcados como "${ESCOLA_PADRAO}"`);
  console.log(`  ${jaTinham} já tinham escola (não mexi)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
