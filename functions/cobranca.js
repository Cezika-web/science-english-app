// Aviso de mensalidade atrasada dentro do app do aluno.
//
// Só chega em quem o professor ligou a chave (`avisarAtraso` no cadastro de
// mensalidade) E está de fato com parcela vencida e não paga. O atraso começa
// no dia SEGUINTE ao vencimento: vence dia 15, fica atrasado dia 16, e o aviso
// aparece com três dias completos de atraso — dia 19.
//
// O aluno não pode ler o financeiro da escola, então o resultado é gravado no
// documento dele (`students/{uid}.avisoCobranca`), que ele já lê no login.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

const REGION = 'southamerica-east1';
const TIME_ZONE = 'America/Sao_Paulo';
const DIAS_PARA_AVISAR = 3;

function hojeLocal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone:TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit',
  }).format(new Date());
}

function diaDoMes(mes, dia) {
  const [ano, numero] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, numero, 0)).getUTCDate();
  return `${mes}-${String(Math.min(ultimo, Math.max(1, Number(dia) || 1))).padStart(2, '0')}`;
}

// As mesmas etapas que o painel calcula: mensal tem uma, quinzenal tem duas e
// anual só cobra no mês escolhido.
function etapasDoMes(perfil, mes) {
  const total = Number(perfil.monthlyCents || 0);
  if (perfil.cycle === 'annual') {
    const inicio = perfil.annualMonth || '';
    const cobra = Boolean(inicio) && mes.slice(5, 7) === inicio.slice(5, 7) && mes >= inicio.slice(0, 7);
    return [{ part:0, etapa:'Anual', valor:cobra ? Number(perfil.annualCents || 0) : 0,
      venceEm:diaDoMes(mes, perfil.dueDay || 10) }];
  }
  if (perfil.cycle !== 'biweekly') {
    return [{ part:0, etapa:'Mensalidade', valor:total, venceEm:diaDoMes(mes, perfil.dueDay || 1) }];
  }
  const metade = Math.round(total / 2);
  return [
    { part:1, etapa:'1ª quinzena', valor:metade, venceEm:diaDoMes(mes, perfil.dueDay || 5) },
    { part:2, etapa:'2ª quinzena', valor:total - metade, venceEm:diaDoMes(mes, perfil.dueDay2 || 20) },
  ];
}

function diasDeAtraso(venceEm, hoje) {
  const vencimento = new Date(`${venceEm}T00:00:00Z`).getTime();
  const agora = new Date(`${hoje}T00:00:00Z`).getTime();
  return Math.floor((agora - vencimento) / 86400000) - 1;
}

function pendenciaDoPerfil(perfil, uid, pagos, hoje, minimoDias = DIAS_PARA_AVISAR) {
  const mes = hoje.slice(0, 7);
  let pendencia = null;
  for (const item of etapasDoMes(perfil, mes)) {
    if (!(item.valor > 0)) continue;
    const recebido = pagos.filter(tx => tx.studentUid === uid
      && String(tx.referenceMonth || String(tx.date || '').slice(0, 7)) === mes
      && (item.part === 0 || Number(tx.referencePart || 0) === item.part))
      .reduce((soma, tx) => soma + Number(tx.amountCents || 0), 0);
    if (recebido >= item.valor) continue;
    const dias = diasDeAtraso(item.venceEm, hoje);
    if (dias < minimoDias) continue;
    if (!pendencia || dias > pendencia.dias) {
      pendencia = {
        chave:`${mes}:${item.part}`, mes, part:item.part, dias,
        valorCentavos:item.valor - recebido, etapa:item.etapa, venceEm:item.venceEm,
      };
    }
  }
  return pendencia;
}

export function createCobrancaFunctions({ db, adminEmails = [] }) {
  async function atualizarAvisos() {
    const hoje = hojeLocal(), mes = hoje.slice(0, 7);
    const escolas = await db.collection('schools').get();

    for (const escola of escolas.docs) {
      const [perfis, lancamentos] = await Promise.all([
        escola.ref.collection('financeStudents').get(),
        escola.ref.collection('financeTransactions').get(),
      ]);
      const pagos = lancamentos.docs.map(item => item.data()).filter(tx =>
        tx.type === 'income' && tx.category === 'tuition' && !tx.planned && !tx.virtual);

      for (const perfilDoc of perfis.docs) {
        const perfil = perfilDoc.data();
        const uid = perfil.studentUid;
        if (!uid) continue;
        const alunoRef = db.doc(`students/${uid}`);

        // Chave desligada, cobrança inativa ou ex-aluno: nada chega no app, e um
        // aviso que tenha sobrado de antes é apagado.
        if (perfil.active === false || perfil.avisarAtraso !== true) {
          await alunoRef.set({ avisoCobranca:FieldValue.delete() }, { merge:true }).catch(() => {});
          continue;
        }

        const pendencia = pendenciaDoPerfil(perfil, uid, pagos, hoje);
        try {
          if (!pendencia) {
            await alunoRef.set({ avisoCobranca:FieldValue.delete() }, { merge:true });
            continue;
          }
          const alunoSnap = await alunoRef.get();
          const aluno = alunoSnap.exists ? alunoSnap.data() : {};
          const anterior = aluno.avisoCobranca || {};
          // O mesmo aviso não reaparece todo dia depois que o aluno confirmou.
          if (anterior.chave === pendencia.chave && (anterior.enviadoEm || anterior.atualizadoEm)) continue;
          const avisoId = alunoRef.collection('cobrancas').doc().id;
          await alunoRef.set({
            avisoCobranca:{
              ativo:true, ...pendencia, avisoId, origem:'automatica', entrega:'na-abertura-do-app',
              enviadoEm:FieldValue.serverTimestamp(), atualizadoEm:FieldValue.serverTimestamp(),
            },
          }, { merge:true });
        } catch (error) {
          console.error(`Aviso de cobrança falhou para ${uid}:`, error.message);
        }
      }
    }
  }

  const avisarAtrasoNoApp = onSchedule(
    { region:REGION, schedule:'0 6 * * *', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    atualizarAvisos
  );

  const enviarCobrancaManual = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const email = request.auth?.token?.email || '';
      if (!email) throw new HttpsError('unauthenticated', 'Entre no painel para cobrar.');
      if (!adminEmails.includes(email)) throw new HttpsError('permission-denied', 'Somente o administrador pode enviar cobranças.');
      const uid = String(request.data?.uid || '').trim();
      const escolaId = String(request.data?.escolaId || '').trim();
      if (!uid || !escolaId) throw new HttpsError('invalid-argument', 'Faltou o aluno ou a escola.');

      const perfilRef = db.doc(`schools/${escolaId}/financeStudents/${uid}`);
      const [perfilSnap, lancamentos, alunoSnap] = await Promise.all([
        perfilRef.get(),
        db.collection(`schools/${escolaId}/financeTransactions`).get(),
        db.doc(`students/${uid}`).get(),
      ]);
      if (!perfilSnap.exists || !alunoSnap.exists) throw new HttpsError('not-found', 'Aluno financeiro não encontrado.');
      const perfil = perfilSnap.data();
      if (perfil.active === false) throw new HttpsError('failed-precondition', 'A cobrança deste aluno está desativada.');
      const pagos = lancamentos.docs.map(item => item.data()).filter(tx =>
        tx.type === 'income' && tx.category === 'tuition' && !tx.planned && !tx.virtual);
      const pendencia = pendenciaDoPerfil(perfil, uid, pagos, hojeLocal());
      if (!pendencia) throw new HttpsError('failed-precondition', `A cobrança fica disponível após ${DIAS_PARA_AVISAR} dias de atraso.`);

      const aluno = alunoSnap.data();
      const avisoRef = alunoSnap.ref.collection('cobrancas').doc();
      const aviso = {
        ativo:true, ...pendencia, avisoId:avisoRef.id, origem:'manual', entrega:'na-abertura-do-app',
        enviadoPor:email, enviadoEm:FieldValue.serverTimestamp(), atualizadoEm:FieldValue.serverTimestamp(),
      };
      const batch = db.batch();
      batch.set(alunoSnap.ref, { avisoCobranca:aviso }, { merge:true });
      batch.set(avisoRef, { ...aviso, escolaId, uid });
      await batch.commit();
      return { ok:true, entrega:'na-abertura-do-app', avisoId:avisoRef.id };
    }
  );

  return { avisarAtrasoNoApp, enviarCobrancaManual };
}

export const cobrancaInternals = Object.freeze({ etapasDoMes, diasDeAtraso, diaDoMes, pendenciaDoPerfil });
