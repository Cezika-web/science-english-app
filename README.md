# Science English App

PWA da Science English para alunos acessarem pós-aulas, atividades no Notion e receberem notificações no celular. O projeto é estático e roda em GitHub Pages, com Firebase para autenticação, Firestore e Firebase Cloud Messaging.

Versão atual: `v1.0.1`

## Visão Geral

- App do aluno em `index.html`
- Painel admin em `admin/index.html`
- PWA configurado por `manifest.json` e `sw.js`
- Notificações push para PWA no Android e iPhone
- Automação em GitHub Actions para registrar e notificar novos pós-aulas
- Pós-aulas hospedados como arquivos HTML no próprio repositório

## Estrutura

```text
.
├── index.html
├── admin/
│   └── index.html
├── manifest.json
├── sw.js
├── firebase-messaging-sw.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── .github/
│   ├── workflows/
│   │   └── notify.yml
│   └── scripts/
│       └── notify_student.py
├── NOTIFICATIONS.md
├── CHANGELOG.md
├── VERSION
├── SETUP.md
└── pos-aula-*.html
```

## Como Funciona

1. O aluno entra no app com e-mail e senha.
2. O app carrega o perfil em `students/{uid}` no Firestore.
3. O app lista os pós-aulas em `students/{uid}/posaulas`.
4. O aluno instala o PWA no Android ou iPhone.
5. Ao abrir o PWA instalado, o app mostra o botão **Ativar notificações**, inclusive antes do login.
6. Ao tocar em **Ativar**, o app pede permissão nativa, guarda o token no aparelho e salva no perfil do aluno depois do login.

```text
students/{uid}.fcmToken
students/{uid}.fcmTokens
```

7. Quando um novo arquivo `pos-aula-*.html` entra no repositório, o GitHub Actions salva o pós-aula no Firestore e envia a notificação.
8. Ao tocar na notificação, o aluno abre o app em `/?post=<id>` e o pós-aula é aberto no reader.
9. O app registra leitura em `readAt`.

## PWA no Android e iPhone

O foco do projeto é PWA, não app nativo.

No Android, o navegador pode mostrar o prompt de instalação quando o PWA estiver elegível.

No iPhone, o aluno precisa usar iOS 16.4+ e instalar manualmente:

```text
Compartilhar -> Adicionar à Tela de Início
```

Importante: iOS e Android exigem ação do usuário para liberar notificações. Por isso o app não consegue pedir permissão silenciosamente no momento da instalação; ele mostra um botão de ativação assim que abre como PWA instalado.

Mais detalhes em [NOTIFICATIONS.md](NOTIFICATIONS.md).

## Firebase Necessário

Ative no Firebase:

- Authentication com e-mail/senha
- Firestore Database
- Cloud Messaging
- Web Push certificates para obter a VAPID key

As credenciais web ficam em:

- `index.html`
- `admin/index.html`
- `sw.js`
- `firebase-messaging-sw.js`

## GitHub Actions

O workflow de notificação fica em:

```text
.github/workflows/notify.yml
```

Ele precisa do secret:

```text
FIREBASE_SERVICE_ACCOUNT
```

O valor deve ser o JSON completo de uma service account com permissão para Firestore e Firebase Cloud Messaging.

## Padrão dos Arquivos de Pós-Aula

Arquivos que disparam notificação devem seguir:

```text
pos-aula-{slug-do-aluno}-DD-MM-YYYY.html
```

Exemplos:

```text
pos-aula-mateus-richter-20-06-2026.html
pos-aula-lorena-20-06-2026.html
```

O `slug` precisa bater com o campo `slug` do aluno no Firestore.

## Disparo Manual de Notificação

No GitHub:

1. Abra **Actions**.
2. Escolha **Notify student - new pós-aula**.
3. Clique **Run workflow**.
4. Informe o nome do arquivo:

```text
pos-aula-mateus-richter-20-06-2026.html
```

## Painel Admin

O painel fica em:

```text
/admin/
```

Ele permite:

- listar alunos
- ver status de leitura
- cadastrar novos alunos
- cadastrar nível e link do Notion

## Verificações Locais

Este projeto não tem build step. Para checar sintaxe básica:

```bash
python3 -m py_compile .github/scripts/notify_student.py
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/notify.yml'); puts 'yaml ok'"
perl -0ne 'print $1 if /<script type=\"module\">([\s\S]*?)<\/script>/' index.html | node --check --input-type=module
node --check sw.js
python3 -m json.tool manifest.json >/dev/null
```

## Observações Importantes

- PWA no iPhone exige instalação pela Tela de Início.
- Web Push no iPhone exige iOS 16.4+.
- O prompt de permissão de notificação precisa ser acionado por toque do usuário.
- Regras do Firestore devem proteger dados de alunos e permissões do admin.
- `firebase-messaging-sw.js` foi mantido por compatibilidade, mas o app registra `sw.js` como service worker principal.
