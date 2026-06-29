# Science English App - Setup

Guia de configuracao do PWA Science English.

## Requisitos

- Firebase project
- GitHub Pages habilitado para este repositorio
- GitHub Actions habilitado
- Secret `FIREBASE_SERVICE_ACCOUNT` configurado no repositorio

## Estrutura

```text
.
├── index.html
├── admin/
│   └── index.html
├── manifest.json
├── sw.js
├── icons/
├── .github/
│   ├── workflows/notify.yml
│   └── scripts/notify_student.py
├── README.md
├── NOTIFICATIONS.md
├── CHANGELOG.md
└── VERSION
```

## Firebase

Ative no Firebase:

- Authentication com e-mail/senha
- Firestore Database
- Cloud Messaging
- Web Push certificates

Copie as credenciais web do Firebase para:

- `index.html`
- `admin/index.html`
- `sw.js`
- `firebase-messaging-sw.js`

Copie a VAPID key para `index.html`.

## GitHub Secret

O workflow usa este secret:

```text
FIREBASE_SERVICE_ACCOUNT
```

O valor deve ser o JSON completo de uma service account com permissao para:

- Firestore
- Firebase Cloud Messaging

O workflow atual e:

```text
.github/workflows/notify.yml
```

## Hospedagem

O app roda em GitHub Pages:

```text
https://cezika-web.github.io/science-english-app/
```

Deploy e feito ao enviar mudancas para `main`; o GitHub Pages publica a nova versao automaticamente.

## Cadastro de Alunos

1. Acesse `/admin/`.
2. Entre com a conta admin do Firebase Authentication.
3. Cadastre nome, e-mail, senha inicial, nivel e link do Notion.
4. O painel cria o aluno e salva o perfil em `students/{uid}`.

## PWA e Notificacoes

O alvo e PWA no Android e no iPhone.

Android:

1. O aluno instala o PWA pelo navegador.
2. Abre o app instalado.
3. Toca em **Ativar notificacoes** na tela de login.
4. O token FCM web fica guardado no aparelho e e salvo no Firestore depois do login.

iPhone:

1. O aluno precisa usar iOS 16.4+.
2. No Safari, usa **Compartilhar -> Adicionar a Tela de Inicio**.
3. Abre o app pela Tela de Inicio.
4. Toca em **Ativar notificacoes** na tela de login.
5. O token FCM web fica guardado no aparelho e e salvo no Firestore depois do login.

Detalhes em [`NOTIFICATIONS.md`](NOTIFICATIONS.md).

## Padrao dos Arquivos de Pos-Aula

Arquivos que disparam notificacao devem seguir:

```text
pos-aula-{slug-do-aluno}-DD-MM-YYYY.html
```

Exemplos:

```text
pos-aula-mateus-richter-20-06-2026.html
pos-aula-lorena-20-06-2026.html
```

O `slug` precisa bater com o campo `slug` do aluno no Firestore.

## Fluxo Completo

1. Um arquivo `pos-aula-*.html` entra no repositorio.
2. GitHub Actions executa `notify.yml`.
3. O script `notify_student.py` identifica o aluno pelo slug.
4. O script cria/atualiza o pos-aula em `students/{uid}/posaulas/{postId}`.
5. O script envia push pelo Firebase Cloud Messaging.
6. O aluno toca na notificacao.
7. O app abre em `/?post=<postId>`.
8. O reader abre o pos-aula.
9. O app registra `readAt`.

## Disparo Manual

No GitHub:

1. Abra **Actions**.
2. Escolha **Notify student - new pos-aula**.
3. Clique **Run workflow**.
4. Informe o arquivo:

```text
pos-aula-mateus-richter-20-06-2026.html
```

## Validacao Local

```bash
python3 -m py_compile .github/scripts/notify_student.py
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/notify.yml'); puts 'yaml ok'"
perl -0ne 'print $1 if /<script type=\"module\">([\s\S]*?)<\/script>/' index.html | node --check --input-type=module
node --check sw.js
python3 -m json.tool manifest.json >/dev/null
```
