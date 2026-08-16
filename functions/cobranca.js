// Aviso de mensalidade atrasada dentro do app do aluno.
//
// Só chega em quem o professor ligou a chave (`avisarAtraso` no cadastro de
// mensalidade) E está de fato com parcela vencida e não paga. O atraso começa
// no dia SEGUINTE ao vencimento: vence dia 15, fica atrasado dia 16, e o aviso
// aparece cinco dias depois disso — dia 21.
//
// O aluno não pode ler o financeiro da escola, então o resultado é gravado no
// documento dele (`students/{uid}.avisoCobranca`), que ele já lê no login.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';

const REGION = 'southamerica-east1';
const TIME_ZONE = 'America/Sao_Paulo';
const DIAS_PARA_AVISAR = 5;

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

export function createCobrancaFunctions({ db }) {
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

        let pendencia = null;
        for (const item of etapasDoMes(perfil, mes)) {
          if (!(item.valor > 0)) continue;
          const recebido = pagos.filter(tx => tx.studentUid === uid
            && String(tx.referenceMonth || String(tx.date || '').slice(0, 7)) === mes
            && (item.part === 0 || Number(tx.referencePart || 0) === item.part))
            .reduce((soma, tx) => soma + Number(tx.amountCents || 0), 0);
          if (recebido >= item.valor) continue;              // quitado: nunca avisa
          const dias = diasDeAtraso(item.venceEm, hoje);
          if (dias < DIAS_PARA_AVISAR) continue;             // em dia ou atraso curto
          if (!pendencia || dias > pendencia.dias) {
            pendencia = { dias, valorCentavos:item.valor - recebido, etapa:item.etapa, venceEm:item.venceEm };
          }
        }

        await alunoRef.set({
          avisoCobranca:pendencia
            ? { ativo:true, mes, ...pendencia, atualizadoEm:FieldValue.serverTimestamp() }
            : FieldValue.delete(),
        }, { merge:true }).catch(error =>
          console.error(`Aviso de cobrança falhou para ${uid}:`, error.message));
      }
    }
  }

  const avisarAtrasoNoApp = onSchedule(
    { region:REGION, schedule:'0 6 * * *', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    atualizarAvisos
  );

  return { avisarAtrasoNoApp };
}

export const cobrancaInternals = Object.freeze({ etapasDoMes, diasDeAtraso, diaDoMes });
