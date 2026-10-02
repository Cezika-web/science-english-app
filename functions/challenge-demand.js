import { randomUUID } from 'node:crypto';

// Jobs and answer keys are server-only. A repeated click joins the existing job.
export function createDemandChallengeService({ db, FieldValue, HttpsError, Anthropic,
  anthropicApiKey, model, schema, loadInput, previousPerformance, prepareQuestions,
  scheduleFor, weekKeyFor, stageFor, publicQuestions, answerKeyRef, registrarUso,
  now = () => new Date() }) {
  async function ensureWeek(weekKey) {
    const ref = db.doc(`challengeWeeks/${weekKey}`);
    const schedule = scheduleFor(weekKey);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) tx.set(ref, { weekKey, title:'Desafio Science English',
        active:true, personalized:true, generationMode:'on-demand',
        startsAt:schedule.startsAt, revealAt:schedule.revealAt, endsAt:schedule.endsAt,
        updatedAt:FieldValue.serverTimestamp() });
    });
  }

  async function prepare(uid, roundId, studentDoc) {
    const current = now(), weekKey = weekKeyFor(current);
    const schedule = scheduleFor(weekKey), stage = stageFor(current, schedule);
    const part = stage.part, round = schedule[`part${part}`];
    if (stage.phase !== 'open' || roundId !== round?.roundId) {
      throw new HttpsError('failed-precondition', 'Esta parte não está aberta para participação.');
    }
    const settings = await db.doc('challengeSettings/auto').get();
    if ((settings.data()?.manualWeeks || []).includes(weekKey)) {
      throw new HttpsError('failed-precondition', 'O professor está preparando as perguntas desta semana.');
    }
    if (!Anthropic || !anthropicApiKey) throw new HttpsError('failed-precondition', 'A preparação das perguntas ainda não está disponível.');
    const ref = studentDoc.ref.collection('challengeRounds').doc(roundId);
    const jobRef = db.doc(`_challengePartGeneration/${roundId}_${uid}`);
    const claim = randomUUID();
    const lease = await db.runTransaction(async tx => {
      const [existing, jobSnap] = await Promise.all([tx.get(ref), tx.get(jobRef)]);
      if (existing.exists) return { ready:true };
      const job = jobSnap.data() || {};
      if (job.status === 'invalid') throw new HttpsError('failed-precondition', 'As perguntas precisam de revisão do professor. Tente novamente mais tarde.');
      if (job.responseText) return { cached:job };
      if (job.status === 'generating' && Number(job.leaseUntil) > current.getTime()) return { busy:true };
      tx.set(jobRef, { uid, roundId, weekKey, part, claim, status:'generating',
        leaseUntil:current.getTime() + 150000, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      return { owner:true };
    });
    if (lease.busy) return { preparing:true, retryAfterMs:1500 };
    if (lease.ready) return { ready:true };
    const started = Date.now();
    let job = lease.cached;
    try {
      if (!job) {
        const [input, previous, otherPart] = await Promise.all([
          loadInput(studentDoc), previousPerformance(uid, weekKey),
          studentDoc.ref.collection('challengeRounds').doc(schedule[`part${part === 1 ? 2 : 1}`].roundId).get(),
        ]);
        const materials = input.posts.length ? input.posts : input.activityMaterials;
        if (!materials.length) throw new HttpsError('failed-precondition', 'Suas perguntas precisam de uma pós-aula ou atividade recente. Fale com o professor.');
        const format = previous && Number(previous.score) >= 500 ? 'escrita' : 'assistido';
        const student = studentDoc.data();
        const client = new Anthropic({ apiKey:anthropicApiKey.value(), maxRetries:0, timeout:45000 });
        const response = await client.messages.create({ model, max_tokens:4000,
          system:[{ type:'text', text:
            'Crie apenas UMA parte de um desafio individual de inglês: exatamente 5 perguntas, 3 focus=weak e 2 focus=strong. ' +
            'Use somente o conteúdo e os padrões dos materiais fornecidos dos últimos 90 dias. Dificuldade exigente relativa ao CEFR, sem ensinar assunto novo. ' +
            (format === 'escrita' ? 'Todas as 5 perguntas têm format=text. ' : 'Use exatamente 3 format=text, 1 format=trueFalse e 1 format=multipleChoice. ') +
            'Text: respostas curtas digitáveis em 45 segundos, options=[], correctOption="". Liste todas as variações válidas em acceptedAnswers, incluindo contrações, formas completas e fragmentos de lacunas. ' +
            'MultipleChoice: 4 alternativas a,b,c,d; trueFalse: só a=True,b=False; correctOption é a letra, acceptedAnswers=[]. ' +
            'hint="" sempre. prompt é uma instrução neutra; context contém a frase literal a traduzir ou completar. Nunca dê pistas gramaticais. ' +
            'Preserve posse, parentesco e referências na resposta correta. Uma resposta inequívoca, expected e explanation breves. ' +
            'Calibre pelos resultados anteriores e ajustes do professor; evite repetir perguntas da outra parte. Não revele weak/strong ao aluno. ' +
            'analysis: até 3 pontos fracos e 3 fortes, breves. Para Amorzinho seja especialmente exigente.' }],
          output_config:{ format:{ type:'json_schema', schema } },
          messages:[{ role:'user', content:JSON.stringify({
            student:student.name || student.firstName, level:student.level || 'A1', weekKey, part,
            materials, corrections:input.corrections, previous,
            avoid:(otherPart.data()?.questions || []).map(q => ({ prompt:q.prompt, context:q.context })),
          }) }],
        });
        job = { responseText:response.content.filter(block => block.type === 'text').map(block => block.text).join(''),
          format, sourceKind:input.posts.length ? 'pós-aulas' : 'atividades recentes',
          sources:materials.map(({ id, title, date }) => ({ id, title, date })),
          stopReason:response.stop_reason || '', generationMs:Date.now() - started };
        // Persist the paid response and its usage before validation/publication.
        // A retry after a save failure reuses this response instead of buying another.
        const batch = db.batch();
        batch.set(jobRef, { ...job, status:'generated', updatedAt:FieldValue.serverTimestamp() }, { merge:true });
        if (registrarUso) registrarUso(batch, { tipo:'desafio', uid, escolaId:student.schoolId || '',
          uso:response.usage || {}, extra:{ weekKey, partes:[part], generationMode:'on-demand', generationMs:job.generationMs } });
        await batch.commit();
      }
      let generated, prepared;
      try {
        if (job.stopReason === 'max_tokens') throw new Error('Resposta incompleta.');
        generated = JSON.parse(job.responseText);
        prepared = prepareQuestions(generated.questions, part, job.format);
      } catch (error) {
        await jobRef.set({ status:'invalid', updatedAt:FieldValue.serverTimestamp() }, { merge:true });
        throw new HttpsError('failed-precondition', 'As perguntas precisam de revisão do professor. Tente novamente mais tarde.');
      }
      const batch = db.batch();
      batch.set(ref, { roundId, weekKey, part, personalized:true, questionCount:5,
        questions:publicQuestions(prepared.questions), opensAt:round.opensAt, closesAt:round.closesAt,
        difficulty:'hard', lookbackDays:90, generationMode:'on-demand', status:'published',
        updatedAt:FieldValue.serverTimestamp() });
      batch.set(answerKeyRef(uid, roundId, true), { uid, roundId, weekKey, part,
        answers:prepared.keys, analysis:generated.analysis, sources:job.sources,
        sourceKind:job.sourceKind, updatedAt:FieldValue.serverTimestamp() });
      batch.set(jobRef, { status:'ready', readyAt:FieldValue.serverTimestamp() }, { merge:true });
      await batch.commit();
      return { ready:true };
    } catch (error) {
      // Keep any paid response: subsequent calls can complete its publication.
      if (!job) await jobRef.set({ status:'failed', leaseUntil:0, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      if (error instanceof HttpsError) throw error;
      console.error('Preparação do desafio:', uid, roundId, error.message);
      throw new HttpsError('unavailable', 'Não conseguimos preparar suas perguntas agora. Tente novamente em instantes.');
    }
  }
  return { ensureWeek, prepare };
}
