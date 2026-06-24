import { strict as assert } from "node:assert";
import { beforeEach, test } from "node:test";
import { STORAGE_KEY } from "./schema";
import { tasksRepository } from "./storage";

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

const localStorage = new MemoryStorage();

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
});

test("tasksRepository cria, edita e apaga tarefa no localStorage", () => {
  const created = tasksRepository.addTask({
    title: "Validar exclusão",
    status: "A Fazer",
    priority: "Alta",
  });

  assert.ok(localStorage.getItem(STORAGE_KEY)?.includes("Validar exclusão"));

  const updated = tasksRepository.updateTask(created.id, {
    title: "Validar exclusão atualizada",
    status: "Concluída",
  });

  assert.equal(updated?.title, "Validar exclusão atualizada");
  assert.equal(updated?.status, "Concluída");

  const deleted = tasksRepository.deleteTask(created.id);
  assert.equal(deleted, true);
  assert.equal(tasksRepository.getTask(created.id), null);
  assert.equal(localStorage.getItem(STORAGE_KEY)?.includes("Validar exclusão atualizada"), false);
});

test("deleteTask retorna false quando id não existe", () => {
  assert.equal(tasksRepository.deleteTask("task-inexistente"), false);
});
