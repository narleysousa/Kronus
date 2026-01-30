<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

---

**⚠️ Site em branco ou erro "Failed to load module script" / MIME type no GitHub Pages?**

A tela que mostra **Filial (Branch)** e **/ (raiz)** é a opção **"Deploy from a branch"**. Para o Kronus rodar, é preciso usar **GitHub Actions**:

1. Em **Settings → Pages**, na seção **Build and deployment**, no **primeiro** menu (Source/Fonte) — **acima** da parte que mostra Filial e pasta — escolha **GitHub Actions** (não "Deploy from a branch").
2. Salve. Depois faça um push na `main` (ou rode o workflow em Actions) para publicar o build.

Guia detalhado: [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md)

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1tsqC6I--5OVgsXF3-TgW1XIT7rAWcI5A

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the Gemini API key in `.env.local`:
   - `VITE_GEMINI_API_KEY=your_key`
3. (Opcional) Controlar o sync com Firestore:
   - `VITE_FIRESTORE_ENABLED=true` (padrão é `true`)
4. Para verificação obrigatória de e-mail, habilite **Email/Password** no Firebase Auth e desative o Anonymous Auth.
5. Run the app:
   `npm run dev`

## GitHub Pages (publicar o app na web)

1. No repositório no GitHub: **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**, escolha **GitHub Actions** (não use "Deploy from a branch").
3. A cada push na branch `main`, o workflow faz o build e publica a pasta `dist` em:
   **https://narleysousa.github.io/Kronus/**

**Se o site ficar em branco ou mostrar erro de MIME type / 404 (index.tsx ou index.css):**  
A origem do Pages está errada. O GitHub está servindo o **código-fonte** (onde `.tsx` é enviado com MIME type errado). Corrija assim:

1. No repositório: **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**, selecione **GitHub Actions** (não "Deploy from a branch").
3. Salve e faça um novo push na `main`; o workflow publicará a pasta **dist** (build com `.js`), e o site volta a carregar.
