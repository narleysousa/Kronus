# Firebase e e-mail no Kronus

## Visão geral

O Kronus agora **usa Firebase Authentication com Email/Password** e **exige e‑mail verificado** para acessar a plataforma.  
Os dados do app continuam no **Firestore** (coleção `kronus`, documento `appData`), mas o acesso ao Firestore é liberado **somente** para usuários com `email_verified = true`.

---

## O que configurar no Firebase Console

1. **Authentication → Sign-in method**
   - **Habilite Email/Password**.
   - **Desative Anonymous** (não é mais usado).

2. **Authentication → Templates → Email verification**
   - Personalize o template de verificação, se quiser.
   - Garanta que o domínio do app esteja autorizado em **Authentication → Settings → Authorized domains**.

3. **Firestore Rules**
   - As regras exigem `request.auth.token.email_verified == true`.
   - Arquivo: `firestore.rules`.

---

## Fluxo de verificação de e‑mail

1. Usuário se cadastra no app.
2. O Firebase envia o e‑mail de verificação automaticamente.
3. O usuário **precisa clicar no link** do e‑mail.
4. Só depois disso o acesso ao app é liberado.

---

## Onde ficam os usuários?

| Lugar | O que contém |
|------|-------------|
| **Authentication → Users** | Contas Firebase (email verificado) |
| **Firestore → kronus/appData → users** | Dados do usuário do app (nome, CPF, PIN, etc.) |

---

## Observações

- O login do app usa **E-mail + PIN**.
- O Firebase usa Email/Password internamente (a senha é derivada do PIN).
- Se o e‑mail não for verificado, o usuário não consegue usar a plataforma nem acessar o Firestore.
