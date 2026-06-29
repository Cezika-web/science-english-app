# Sistema de notificações

O requisito principal é: quando uma notificação for enviada, o celular deve receber pelo app instalado.

## O que este repositório faz agora

- O app web/PWA registra o service worker `sw.js`.
- O token FCM web é salvo em `students/{uid}.fcmToken`.
- O workflow `.github/workflows/notify.yml` envia a notificação pelo Firebase Cloud Messaging.
- A notificação abre o app em `/?post=<id-do-pos-aula>`, e o app abre o pós-aula no reader para registrar leitura.
- O workflow também pode ser disparado manualmente em GitHub Actions com o nome do arquivo HTML.

## Ponto crítico para PWA no celular

O alvo deste projeto é PWA no Android e no iPhone.

O app pede a ativação de notificações quando abre instalado como PWA. O prompt nativo precisa partir de um toque do usuário, por regra dos navegadores/sistemas. Por isso o app mostra um cartão de ativação na tela de login quando o PWA instalado é aberto. Se o aluno ativar antes de entrar, o token fica guardado no aparelho e é vinculado ao perfil após o login.

## Android PWA

No Android:

1. O navegador mostra o banner de instalação quando o PWA está elegível.
2. Depois de instalado, o app abre em modo standalone.
3. O app mostra o cartão **Ativar notificações** na tela de login.
4. O toque em **Ativar** abre a permissão nativa.
5. O token FCM web é salvo em `students/{uid}.fcmToken` e no array `students/{uid}.fcmTokens`.

## iPhone PWA

No iPhone:

1. O aluno precisa usar iOS 16.4+ e adicionar o site à Tela de Início.
2. Depois de aberto pela Tela de Início, o app roda como PWA standalone.
3. O app mostra o cartão **Ativar notificações** na tela de login.
4. O toque em **Ativar** abre a permissão nativa.
5. O token FCM web é salvo em `students/{uid}.fcmToken` e no array `students/{uid}.fcmTokens`.

## Payload enviado

O script `.github/scripts/notify_student.py` envia payload de dados para PWA/Web Push. O service worker `sw.js` exibe a notificação no celular:

- `message.data.postId`: identifica o pós-aula.
- `message.data.url`: URL do app com `?post=<id>`.
- `message.data.title` e `message.data.body`: texto da notificação.
- `message.webpush`: configura notificação para PWA/Web Push.

## Disparo manual

No GitHub:

1. Abra **Actions**.
2. Escolha **Notify student - new pós-aula**.
3. Clique **Run workflow**.
4. Informe o arquivo, por exemplo:

```text
pos-aula-mateus-richter-20-06-2026.html
```

O arquivo precisa seguir o padrão:

```text
pos-aula-{slug-do-aluno}-DD-MM-YYYY.html
```

O `slug` precisa ser igual ao campo `slug` do aluno no Firestore.
