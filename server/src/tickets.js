// Tickets de atendimento: cada ticket é uma conversa (mensagens com role user | agent).
// Agentes autônomos responderão pela mesma API, gravando mensagens com role "agent" (ainda não implementado).
import { randomUUID } from "node:crypto";
import { invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";

const STATUS = ["open", "closed"];
const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, role: m.role, content: m.content, createdAt: m.criado_em });
const saidaTicket = (t) => ({ id: t.id, title: t.title, status: t.status, createdAt: t.criado_em, updatedAt: t.atualizado_em });
const tituloDe = (conteudo) => {
  const linha = conteudo.split("\n")[0].trim();
  return linha.length > 60 ? `${linha.slice(0, 57).trimEnd()}…` : linha;
};

export function rotasDeTickets(app, db) {
  const buscar = (id) => {
    const t = db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
    if (!t) throw naoEncontrado("Ticket");
    return t;
  };
  const inserirMensagem = (ticketId, role, content, agora) => {
    const m = { id: randomUUID(), ticket_id: ticketId, role, content, criado_em: agora };
    db.prepare("INSERT INTO ticket_mensagem (id, ticket_id, role, content, criado_em) VALUES (?, ?, ?, ?, ?)")
      .run(m.id, m.ticket_id, m.role, m.content, m.criado_em);
    db.prepare("UPDATE ticket SET atualizado_em = ? WHERE id = ?").run(agora, ticketId);
    return m;
  };

  app.get("/api/tickets", () => ({
    tickets: db.prepare("SELECT * FROM ticket ORDER BY atualizado_em DESC, rowid DESC").all().map(saidaTicket),
  }));

  // Abre um ticket já com a primeira mensagem do usuário; o título nasce dela, salvo `title` explícito.
  app.post("/api/tickets", ({ corpo }) => {
    const content = texto(corpo, "message", { max: 5000 });
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? tituloDe(content);
    const agora = new Date().toISOString();
    const ticket = { id: randomUUID(), title, status: "open", criado_em: agora, atualizado_em: agora };
    const mensagem = transacao(db, () => {
      db.prepare("INSERT INTO ticket (id, title, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?)")
        .run(ticket.id, ticket.title, ticket.status, ticket.criado_em, ticket.atualizado_em);
      return inserirMensagem(ticket.id, "user", content, agora);
    });
    return { ticket: saidaTicket(ticket), messages: [saidaMensagem(mensagem)] };
  });

  app.get("/api/tickets/:id", ({ params }) => {
    const ticket = buscar(params.id);
    const messages = db.prepare("SELECT * FROM ticket_mensagem WHERE ticket_id = ? ORDER BY criado_em, rowid").all(ticket.id).map(saidaMensagem);
    return { ticket: saidaTicket(ticket), messages };
  });

  app.patch("/api/tickets/:id", ({ params, corpo }) => {
    const ticket = buscar(params.id);
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? ticket.title;
    const status = corpo.status ?? ticket.status;
    if (!STATUS.includes(status)) throw invalido("status deve ser open ou closed.");
    db.prepare("UPDATE ticket SET title = ?, status = ? WHERE id = ?").run(title, status, ticket.id);
    return { ticket: saidaTicket(buscar(ticket.id)) };
  });

  app.delete("/api/tickets/:id", ({ params }) => {
    const ticket = buscar(params.id);
    db.prepare("DELETE FROM ticket WHERE id = ?").run(ticket.id); // mensagens caem em cascata
    return { ok: true };
  });

  app.post("/api/tickets/:id/messages", ({ params, corpo }) => {
    const ticket = buscar(params.id);
    if (ticket.status === "closed") throw invalido("Este ticket está encerrado. Reabra para enviar mensagens.");
    const content = texto(corpo, "content", { max: 5000 });
    const mensagem = inserirMensagem(ticket.id, "user", content, new Date().toISOString());
    return { message: saidaMensagem(mensagem) };
  });
}
