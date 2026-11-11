# Progresso: automação de atendimento

## Etapa 00: preparar o projeto e o acesso

- **Cópia local:** `C:\App-Fluxo-Tarefas-V1` (reutilizada, sem novo clone)
- **URL de origem (remote `origin`):** https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1.git
- **Node:** v24.22.0 (o projeto exige >= 22.13.0); npm 11.19.1
- **Instalar dependências:** `npm install`
- **Abrir o app:** `npm run dev` (interface http://127.0.0.1:5173, API http://127.0.0.1:3001/api)
- **Build:** `npm run build` → concluído com sucesso (vite, `dist/`)
- **Dados locais:** SQLite em `server/dados` preservado (ignorado pelo git)

## Pendências

- **GitHub Copilot cloud agent:** não verificado. Sem GitHub CLI e sem login na conta neste computador, não dá para confirmar plano pago do Copilot nem acesso às Actions.
- **Credenciais:** o secret `COPILOT_AGENT_TOKEN` (Actions) ainda não existe e deve ficar separado de qualquer credencial local do backend. Nenhum valor foi registrado aqui.
- **Remoto próprio:** o `origin` ainda aponta para o repositório do professor; a decisão de usar um repositório novo segue em aberto.
