# Fazer o Kronus rodar no GitHub Pages

O site só funciona quando o GitHub Pages publica o **build** (pasta `dist`), não o código-fonte. Para isso, a origem do deploy precisa ser **GitHub Actions**.

## Passo a passo

### 1. Abrir as configurações do Pages

No repositório **Kronus** no GitHub:

- Clique em **Settings** (Configurações)
- No menu da esquerda, clique em **Pages** (dentro de "Code and automation")

### 2. Trocar a origem do deploy

Na seção **Build and deployment**:

- No topo, você vê **Source** (ou **Fonte**). Hoje deve estar em algo como **"Deploy from a branch"** / **"Implantar a partir de um branch"**.
- Clique nesse menu e escolha **"GitHub Actions"** (ou **"Ações do GitHub"**).

Assim que você escolher **GitHub Actions**, o bloco **Branch** (Filial) com "main" e "/ (raiz)" deixa de ser usado. O site passa a ser publicado pelo workflow que faz o build do projeto.

### 3. Salvar

- Clique em **Save** (Salvar) se o botão estiver habilitado.

### 4. Disparar o deploy

- Faça um **push** na branch **main** (qualquer commit).
- Ou vá em **Actions**, abra o workflow **"Deploy to GitHub Pages"** e rode **"Run workflow"** na branch **main**.

### 5. Conferir

- Em **Actions**, confira se o workflow **"Deploy to GitHub Pages"** terminou em verde.
- Acesse: **https://narleysousa.github.io/Kronus/**

---

**Resumo:** Em **Settings → Pages**, em **Source** use **GitHub Actions** (não "Deploy from a branch"). Depois, um push na `main` publica o build e o site passa a rodar nesse endereço.
