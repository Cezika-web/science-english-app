# CZK English App — Guia de Instalação

## Estrutura do projeto

```
czk-app/
├── index.html          ← App do aluno (PWA)
├── manifest.json       ← Configuração PWA
├── sw.js               ← Service worker (offline + push)
├── icons/              ← Ícones do app (você vai gerar)
├── admin/
│   └── index.html      ← Painel do César
├── functions/
│   └── index.js        ← Firebase Cloud Function (webhook)
└── .github/workflows/
    └── notify.yml      ← GitHub Actions (detecta novo pós-aula)
```

---

## Passo 1 — Criar projeto no Firebase

1. Acesse https://console.firebase.google.com
2. Clique **"Adicionar projeto"** → nome: `czk-english`
3. Ative **Google Analytics** (opcional)

### Ativar serviços:
- **Authentication** → Sign-in method → **E-mail/senha** → Ativar
- **Firestore Database** → Criar banco → modo **Produção** → região `southamerica-east1` (São Paulo)
- **Cloud Messaging** → já vem ativado

---

## Passo 2 — Pegar as credenciais

1. Firebase Console → ⚙️ Configurações do projeto → **Seus aplicativos** → Adicionar app web
2. Copie o objeto `firebaseConfig` e substitua em:
   - `index.html` (linha com `SUA_API_KEY`)
   - `admin/index.html` (mesma coisa)

3. Para a **VAPID Key** (push notifications):
   - Firebase Console → Cloud Messaging → aba **Web Push certificates**
   - Clique **Gerar par de chaves** → copie a chave pública
   - Cole em `index.html` onde está `SUA_VAPID_KEY`

---

## Passo 3 — Hospedar o app

### Opção A: GitHub Pages (mais simples)
1. Crie um repositório: `czk-english-app` no GitHub
2. Faça upload de todos os arquivos da pasta `czk-app/` (exceto `functions/`)
3. GitHub → Settings → Pages → Branch: `main` → Salvar
4. URL do app: `https://SEU_USUARIO.github.io/czk-english-app/`

### Opção B: Firebase Hosting (recomendado para domínio próprio)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy --only hosting
```

---

## Passo 4 — Deploy da Cloud Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Após o deploy, copie a URL da função (aparece no terminal) — vai ser algo como:
`https://southamerica-east1-czk-english.cloudfunctions.net/notifyStudent`

---

## Passo 5 — Configurar GitHub Actions

No repositório de pós-aulas (`Czk-post-classes`):

1. Vá em **Settings → Secrets and variables → Actions**
2. Adicione dois secrets:
   - `FIREBASE_FUNCTION_URL` = URL da função acima
   - `NOTIFY_SECRET` = uma senha qualquer, ex: `czk2026secreto`

3. Configure o mesmo segredo no Firebase:
```bash
firebase functions:config:set notify.secret="czk2026secreto"
firebase deploy --only functions
```

---

## Passo 6 — Gerar os ícones

Você precisa de dois ícones PNG na pasta `icons/`:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

Você pode criar no **Canva** com o logo CZK e exportar nesses tamanhos.

---

## Passo 7 — Cadastrar os alunos

1. Acesse `https://seu-app.github.io/admin/`
2. Faça login com seu e-mail/senha (você precisará criar sua conta admin primeiro pelo Firebase Console → Authentication → Adicionar usuário)
3. Aba **Novo aluno** → preencha nome, e-mail, senha inicial, nível e URL do Notion
4. O aluno recebe o e-mail e a senha de você → entra no app e muda a senha se quiser

---

## Padrão de nome dos arquivos de pós-aula

Para a notificação automática funcionar, os arquivos HTML devem seguir o padrão:

```
pos-aula-{slug-do-aluno}-DD-MM-YYYY.html
```

Exemplos:
- `pos-aula-mateus-richter-20-06-2026.html`
- `pos-aula-lorena-20-06-2026.html`

O "slug" que você coloca no nome do arquivo deve corresponder ao campo `slug` que você salva no Firestore ao cadastrar o aluno.

**Para adicionar o campo slug ao cadastro**: ao criar o aluno no painel admin, o slug é gerado automaticamente (nome em minúsculas com hífens). Ex: "Mateus Richter" → `mateus-richter`.

---

## Fluxo completo após a configuração

1. Você faz a aula → gera o pós-aula com `/posaula`
2. Faz upload do HTML para o GitHub Pages de pós-aulas
3. GitHub Actions detecta o arquivo novo → chama a Firebase Function
4. A Function identifica o aluno pelo nome do arquivo
5. Salva o pós-aula no Firestore do aluno
6. Envia push notification pro celular do aluno
7. Aluno toca na notificação → abre o app → lê o pós-aula
8. App registra "lido" no Firestore
9. Você vê no painel admin quem leu e quem não leu ✅

