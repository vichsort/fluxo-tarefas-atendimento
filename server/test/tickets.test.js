import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { criarApp } from "../src/app.js";

let base, servidor;
const chamar = async (metodo, caminho, corpo) => {
  const r = await fetch(base + caminho, { method: metodo, headers: { "content-type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, dados: r.status === 204 ? null : await r.json() };
};

before(async () => {
  ({ servidor } = criarApp());
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test("há um ticket de exemplo com mensagens na primeira criação do banco", async () => {
  const { dados } = await chamar("GET", "/api/tickets");
  assert.ok(dados.tickets.length >= 1);
  const d = (await chamar("GET", `/api/tickets/${dados.tickets[0].id}`)).dados;
  assert.ok(d.messages.length >= 1);
});

test("abrir ticket cria a primeira mensagem e deriva o título", async () => {
  const r = await chamar("POST", "/api/tickets", { message: "  Não consigo entrar na minha conta  \ndetalhe" });
  assert.equal(r.status, 201);
  assert.equal(r.dados.ticket.title, "Não consigo entrar na minha conta");
  assert.equal(r.dados.ticket.status, "open");
  assert.deepEqual(r.dados.messages.map((m) => m.role), ["user"]);
  assert.equal((await chamar("POST", "/api/tickets", { message: "   " })).status, 400);
});

test("mensagens entram em ordem; ticket encerrado recusa e reabre", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { message: "Primeira" })).dados;
  await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Segunda" });
  const d = (await chamar("GET", `/api/tickets/${ticket.id}`)).dados;
  assert.deepEqual(d.messages.map((m) => m.content), ["Primeira", "Segunda"]);
  await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "closed" });
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "x" })).status, 400);
  assert.equal((await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "outro" })).status, 400);
  await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "open" });
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { content: "Terceira" })).status, 201);
});

test("excluir ticket remove a conversa", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { message: "Apagar" })).dados;
  assert.equal((await chamar("DELETE", `/api/tickets/${ticket.id}`)).status, 200);
  assert.equal((await chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
});
