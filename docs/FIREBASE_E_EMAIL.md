# Firebase e e-mail no Kronus

## Por que o Firebase Authentication mostra "Nenhum usuário"?

O Kronus **não usa** Firebase Authentication para os usuários do sistema (Narley, colaboradores, etc.). O login do app é por **CPF + PIN**, e os usuários ficam guardados no **Firestore**, não na aba "Usuários" do Authentication.

- **Authentication > Usuários**: o app usa apenas **login anônimo** (`signInAnonymously`) para ter permissão de ler/escrever no Firestore. Por isso você pode ver usuários anônimos (ou nenhum, se ainda não tiver acessado o app com Firestore ativo), mas **não** os usuários do Kronus.
- **Onde estão os usuários do Kronus**: em **Firestore Database** → coleção `kronus` → documento `appData` → campo **`users`** (array). É nesse documento que ficam usuários, logs de ponto, férias, etc.

### O que fazer no Firebase Console

1. **Firestore**: para ver/editar os usuários do Kronus, abra **Firestore Database** → `kronus` → `appData` e confira o campo `users`.
2. **Authentication**: para o sync com Firestore funcionar, é preciso ter **Anonymous** habilitado em **Authentication** → **Sign-in method** → **Provedores** → ative **Anônimo**.

---

## E-mail de confirmação de cadastro

O envio de e-mail no cadastro é feito pelo **EmailJS** (não pelo Firebase). Se os usuários não estão recebendo e-mail:

1. Crie uma conta em [EmailJS](https://www.emailjs.com/).
2. Crie um **Service** (ex.: Gmail) e um **Template** de e-mail com os parâmetros que o app envia: `to_name`, `to_email`, `cpf`, `position`, `app_name`, `app_url`, `registered_at`.
3. No projeto, crie um arquivo **`.env.local`** na raiz (ao lado de `package.json`) com:

```env
VITE_EMAILJS_SERVICE_ID=seu_service_id
VITE_EMAILJS_TEMPLATE_ID=seu_template_id
VITE_EMAILJS_PUBLIC_KEY=sua_public_key
```

4. Reinicie o servidor (`npm run dev`). Os valores ficam em **EmailJS** → **Account** / **Email Services** / **Email Templates**.

**Observação:** o cadastro no Kronus **não depende** do e-mail. O usuário já fica cadastrado ao enviar o formulário; o e-mail é só uma **confirmação** opcional. Não existe no app o fluxo “finalizar cadastro por link no e-mail”.

---

## Resumo

| Onde procurar | O que é |
|--------------|--------|
| **Firestore** → `kronus` / `appData` → `users` | Usuários do Kronus (CPF, nome, PIN, etc.) |
| **Authentication** → Usuários | Apenas usuários anônimos (acesso ao Firestore); não são os usuários do app |
| **EmailJS** (variáveis no `.env.local`) | Envio do e-mail de confirmação de cadastro |
