# Presença ao vivo e material de estudo

O documento `students/{uid}/posaulas/{postId}` pode conter `attendanceStatus`
(`absent` ou `present`), `attendanceSource` (`html` ou `manual`) e
`attendanceUpdatedAt` (correção do professor). O documento continua sendo material
de estudo mesmo com ausência. Não existe vínculo entre presença e `readAt`, uso
da IA, gravação ou conclusão de atividades.

## Precedência e importação

1. Correção manual do documento prevalece sobre a importação. Um estado explícito
   antigo sem origem também é protegido como manual.
2. Sem correção manual, `.github/scripts/notify_student.py` lê somente
   `<meta name="czk-attendance" content="absent">` ou `content="present"` no
   `<head>`. Valores desconhecidos, vazios e marcadores duplicados interrompem a
   importação. Não se deduz ausência por nome, texto livre ou falta de talk time.
3. HTML sem marcador mantém a presença já salva; registros sem estado continuam
   seguindo a inferência legada por pós-aula e agenda.

A importação usa máscara de campos e condição de versão (`updateTime`). Preserva
campos de estudo, `readAt`, a data original de publicação e campos desconhecidos.
Uma correção concorrente faz a importação reler o documento antes de tentar
novamente. Ausência efetiva apaga `talkTime` e `studentTalkPct` antigos. Reimportar
continua usando o fluxo de notificações já existente; o script de correção abaixo
nunca dispara notificações nem cria documentos.

## Cálculos e leitores

`functions/attendance.js` contém o cálculo compartilhado pelo aluno, admin e
servidor da EurekIA. Uma data é contada uma vez, mesmo com agenda e pós-aula.
Ausência explícita entra no denominador e não no numerador; prevalece sobre a
inferência antiga e `attendancePresentDates`, e não vira `excused` por feriado ou
exceção. Uma ausência confirmada permite começar a contagem mesmo antes da
primeira presença. Agenda, histórico de grades, reposições e baseline permanecem
ativos; o baseline continua responsável pelos totais até sua data `through`.
Datas de timestamps são interpretadas em `America/Sao_Paulo`.

`adesao.js` recebe os mesmos pontos de presença, incluindo `excused` nas
exceções legadas. O material ausente continua entrando no estudo medido, mas não
soma duração de aula ao vivo. Os leitores de fala ignoram ausência antes de olhar
HTML ou cache, preservando a diferença entre medição de 0% e medição inexistente.

O card mostra `✕ Não compareceu` e mantém a ação de leitura. No admin, abra o
detalhe do aluno e altere **Presença na aula** junto ao pós-aula individual. A
correção salva somente presença/origem/data e remove medição oral ao marcar falta.
As regras atuais já permitem essa atualização somente a quem administra o aluno;
o aluno só pode atualizar `readAt` no pós-aula. Nenhuma abertura de permissões foi
necessária.

O contexto de material da IA informa a ausência, proíbe atribuir falas e desempenho
dos colegas e mantém o conteúdo disponível para estudo, atividades e desafio.
Na rota de perguntas de estudo, o servidor calcula a presença diretamente dos
registros atuais e a distingue dos resumos semanais enviados pelo aparelho.

## Correção de 13/11/2026

`tools/correct_joao_attendance.py` verifica projeto, UID/slug do João, documento,
arquivo, data e gravação. Faz backup privado em `backup-dados/` (ignorado pelo Git),
e só aplica com `--apply`. Atualiza `attendanceStatus: absent`, origem manual e
data da correção, removendo medição oral. Confere que nenhum outro campo, perfil
ou documento do Pedro mudou. Se o documento não existe, não cria nem notifica.

```sh
python tools/correct_joao_attendance.py       # conferir, sem gravar
python tools/correct_joao_attendance.py --apply
```

Requer `GOOGLE_APPLICATION_CREDENTIALS` autorizado no projeto `scienceenglish`,
`google-auth` e `requests`. Nunca versionar credenciais ou backups de alunos.

## Verificação e implantação

```sh
cd functions
npm ci
npm run test:attendance
node scripts/test_assistente_contexto.mjs
node scripts/test_adesao.mjs
cd ..
firebase emulators:exec --project demo-attendance --only firestore "node functions/scripts/test_attendance_rules.mjs"
```

Os testes de regras exigem Java 21 e Firebase CLI. Usam somente o projeto de
emulação e recusam execução sem `FIRESTORE_EMULATOR_HOST`.

Publicar o frontend/admin e o importador exige incorporar a alteração em `main`
(GitHub Pages/Actions). Publicar o contexto novo da IA exige implantar
`functions:perguntarAssistente` e os consumidores de `conteudoDaPosAula`
(atividades/desafio). O cache do PWA passa a `v85`. As regras não mudaram.
Atualizar o documento no Firestore é uma operação separada dessas implantações:
o app antigo ainda pode mostrar sua inferência antiga até receber o código novo.
