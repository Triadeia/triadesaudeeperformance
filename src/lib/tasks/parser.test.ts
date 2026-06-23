import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseCommand } from "./parser";

test("create intent extrai título, responsável e prazo", () => {
  const result = parseCommand("Crie uma tarefa para João revisar o dashboard até sexta");
  assert.equal(result.intent, "create");
  if (result.intent !== "create") return;
  assert.equal(result.data.assignee, "João");
  assert.match(result.data.title, /revisar/i);
  assert.ok(result.data.due, "deve extrair prazo");
});

test("create intent reconhece urgência", () => {
  const result = parseCommand("Criar tarefa urgente para Carol publicar painel");
  assert.equal(result.intent, "create");
  if (result.intent !== "create") return;
  assert.equal(result.data.priority, "Urgente");
  assert.equal(result.data.assignee, "Carol");
});

test("filter intent reconhece bloqueadas", () => {
  const result = parseCommand("Mostre tarefas bloqueadas");
  assert.equal(result.intent, "filter");
  if (result.intent !== "filter") return;
  assert.deepEqual(result.data.status, ["Bloqueada"]);
});

test("filter intent combina prioridade e responsável", () => {
  const result = parseCommand("Filtrar tarefas urgentes para Nilton");
  assert.equal(result.intent, "filter");
  if (result.intent !== "filter") return;
  assert.deepEqual(result.data.priority, ["Urgente"]);
  assert.deepEqual(result.data.assignee, ["Nilton"]);
});

test("status-change reconhece ordinal e status alvo", () => {
  const result = parseCommand("Marque a primeira como concluída");
  assert.equal(result.intent, "status-change");
  if (result.intent !== "status-change") return;
  assert.equal(result.data.index, 0);
  assert.equal(result.data.status, "Concluída");
});

test("summarize intent é reconhecido", () => {
  const result = parseCommand("Resumir tarefas");
  assert.equal(result.intent, "summarize");
});

test("comando vazio cai em unknown", () => {
  const result = parseCommand("   ");
  assert.equal(result.intent, "unknown");
});

test("comando irreconhecível devolve mensagem de ajuda", () => {
  const result = parseCommand("xyz123");
  assert.equal(result.intent, "unknown");
  assert.match(result.response, /Comando não reconhecido/i);
});

test("parse de data em formato dia/mês", () => {
  const result = parseCommand("Crie tarefa para Will entregar relatório dia 24/12");
  assert.equal(result.intent, "create");
  if (result.intent !== "create") return;
  assert.ok(result.data.due, "deve extrair prazo");
  const due = new Date(result.data.due!);
  assert.equal(due.getMonth(), 11); // dezembro
  assert.equal(due.getDate(), 24);
});

test("parse de data hoje", () => {
  const result = parseCommand("Crie tarefa para revisar hoje");
  assert.equal(result.intent, "create");
  if (result.intent !== "create") return;
  assert.ok(result.data.due, "deve extrair prazo");
  const due = new Date(result.data.due!);
  const today = new Date();
  assert.equal(due.getDate(), today.getDate());
  assert.equal(due.getMonth(), today.getMonth());
});
