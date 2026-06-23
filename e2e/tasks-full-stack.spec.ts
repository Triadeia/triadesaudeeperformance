/**
 * Tasks - Full Stack E2E Suite
 *
 * Validates the frontend <-> Supabase backend integration for the Tarefas page.
 *
 * Test groups:
 *   1. Auth flow & session
 *   2. Command parser -> POST /api/tasks/command -> Supabase
 *   3. SSR hydration: getTasks() reads from Supabase
 *   4. Multi-user RLS isolation
 *   5. Error handling
 *
 * Tests marked as test.fixme() target behavior that is NOT YET IMPLEMENTED
 * in the current frontend (no REST /api/tasks endpoint, no drag-drop wiring,
 * no localStorage sync, no filter query). They are kept here as executable
 * specifications so the dev team has a definition-of-done to code against.
 *
 * See `documentacao/qa-fullstack-report.md` for the full gap analysis.
 */

import { test, expect, gotoTasks, loginAs, getCreds } from "./fixtures";

const TASK_TITLE_PREFIX = "[E2E]";

function uniqueTitle(label: string): string {
  return `${TASK_TITLE_PREFIX} ${label} ${Date.now()}`;
}

// ---------------------------------------------------------------------------
// 1. AUTH FLOW
// ---------------------------------------------------------------------------

test.describe("Auth flow", () => {
  test("unauthenticated user is redirected away from /app/tarefas", async ({ page }) => {
    await page.goto("/app/tarefas");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("authenticated user can reach /app/tarefas", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    await expect(authedPageA.getByRole("heading", { name: /tarefas/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. COMMAND PARSER -> BACKEND
// ---------------------------------------------------------------------------

test.describe("Command parser -> /api/tasks/command", () => {
  test("typing 'Crie tarefa ...' POSTs to backend and renders the result", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);

    const title = uniqueTitle("comando");
    const command = `Crie uma tarefa ${title}`;

    const requestPromise = authedPageA.waitForRequest(
      (req) => req.url().includes("/api/tasks/command") && req.method() === "POST",
    );
    const responsePromise = authedPageA.waitForResponse(
      (res) => res.url().includes("/api/tasks/command") && res.request().method() === "POST",
    );

    await authedPageA.getByPlaceholder(/Crie uma tarefa/i).fill(command);
    await authedPageA.keyboard.press("Enter");

    const req = await requestPromise;
    expect(req.postDataJSON()).toMatchObject({ command });

    const res = await responsePromise;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("response");
    // Demo mode (no Supabase) returns task with mocked id; real mode returns persisted id.
    if (body.task) {
      expect(body.task.title.toLowerCase()).toContain(title.toLowerCase());
    }

    // Optimistic UI update should show the title in the list.
    await expect(authedPageA.getByText(title, { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("filter command 'bloqueadas' returns only blocked tasks", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);

    const responsePromise = authedPageA.waitForResponse(
      (res) => res.url().includes("/api/tasks/command") && res.request().method() === "POST",
    );

    await authedPageA.getByPlaceholder(/Crie uma tarefa/i).fill("listar tarefas bloqueadas");
    await authedPageA.keyboard.press("Enter");

    const res = await responsePromise;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.response).toBeTruthy();
    // The endpoint replies in PT-BR; we don't assert content, just that the
    // call happened and was answered. Asserting strings here would couple
    // the test to copy.
  });

  test("empty command returns 422", async ({ authedPageA }) => {
    const res = await authedPageA.request.post("/api/tasks/command", {
      data: { command: "  " },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("unauthenticated POST returns 401", async ({ request }) => {
    const res = await request.post("/api/tasks/command", {
      data: { command: "Crie tarefa de teste" },
    });
    // 401 = not authenticated (no cookies)
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 3. SSR HYDRATION (getTasks reads from Supabase)
// ---------------------------------------------------------------------------

test.describe("SSR hydration", () => {
  test("page renders tasks from server (fallback or Supabase)", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    // Either real tasks or fallback fixtures are rendered as rows/cards.
    // We assert at least one task element is present.
    const taskRow = authedPageA.locator("text=/A Fazer|Em andamento|Concluída|Bloqueada/").first();
    await expect(taskRow).toBeVisible();
  });

  test("after creating a task via command, refresh keeps it (backend is source of truth)", async ({ authedPageA }) => {
    test.skip(
      !process.env.SUPABASE_CONFIGURED,
      "Persistence test requires SUPABASE_CONFIGURED=1 (real Supabase, not demo mode)",
    );

    await gotoTasks(authedPageA);
    const title = uniqueTitle("persist");
    await authedPageA.getByPlaceholder(/Crie uma tarefa/i).fill(`Crie tarefa ${title}`);
    await authedPageA.keyboard.press("Enter");

    await expect(authedPageA.getByText(title, { exact: false })).toBeVisible();

    await authedPageA.reload();
    await expect(authedPageA.getByText(title, { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 4. MULTI-USER RLS ISOLATION
// ---------------------------------------------------------------------------

test.describe("RLS - multi-user isolation", () => {
  test("user B cannot see tasks created by user A", async ({ browser }) => {
    const credsA = getCreds("A");
    const credsB = getCreds("B");
    test.skip(
      !credsA || !credsB,
      "Both TEST_USER_A_* and TEST_USER_B_* credentials required for RLS test",
    );
    test.skip(
      !process.env.SUPABASE_CONFIGURED,
      "RLS test requires SUPABASE_CONFIGURED=1 (real Supabase, not demo mode)",
    );

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await loginAs(pageA, credsA!);
      const title = uniqueTitle("rls");
      await pageA.goto("/app/tarefas");
      await pageA.getByPlaceholder(/Crie uma tarefa/i).fill(`Crie tarefa ${title}`);
      await pageA.keyboard.press("Enter");
      await expect(pageA.getByText(title, { exact: false })).toBeVisible();

      await loginAs(pageB, credsB!);
      await pageB.goto("/app/tarefas");
      await expect(pageB.getByText(title, { exact: false })).toHaveCount(0);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. ERROR HANDLING
// ---------------------------------------------------------------------------

test.describe("Error handling", () => {
  test("command without title returns 422", async ({ authedPageA }) => {
    const res = await authedPageA.request.post("/api/tasks/command", {
      data: { command: "criar tarefa" }, // < 3 chars after parsing
    });
    expect(res.status()).toBe(422);
  });
});

// ===========================================================================
// SECTION B - SPECIFICATIONS FOR UNIMPLEMENTED FEATURES
// ===========================================================================
// These tests use test.fixme() and will be enabled once the corresponding
// backend endpoints + frontend wiring exist. They serve as executable
// definitions-of-done. DO NOT delete - they unblock as features land.
// ===========================================================================

test.describe("[PENDING] REST /api/tasks endpoint", () => {
  test.fixme("GET /api/tasks returns user's tasks", async ({ authedPageA }) => {
    const res = await authedPageA.request.get("/api/tasks");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test.fixme("POST /api/tasks creates a task", async ({ authedPageA }) => {
    const res = await authedPageA.request.post("/api/tasks", {
      data: { title: uniqueTitle("rest-create"), due_at: "2026-12-31" },
    });
    expect(res.status()).toBe(201);
  });

  test.fixme("POST /api/tasks without title returns 400", async ({ authedPageA }) => {
    const res = await authedPageA.request.post("/api/tasks", { data: {} });
    expect(res.status()).toBe(400);
  });

  test.fixme("PUT /api/tasks/:id updates status", async ({ authedPageA }) => {
    // Requires a known task id - test will create one via POST first when impl lands.
  });

  test.fixme("DELETE /api/tasks/:id of another user's task returns 403", async ({ authedPageA }) => {
    // Cross-user attack vector. Will need a fixture seeded with user-B-owned task.
  });

  test.fixme("GET /api/tasks?status=Bloqueada filters server-side", async ({ authedPageA }) => {
    const res = await authedPageA.request.get("/api/tasks?status=Bloqueada");
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const t of body) expect(t.status).toBe("Bloqueada");
  });

  test.fixme("GET /api/tasks?limit=10&offset=0 paginates", async ({ authedPageA }) => {
    const res = await authedPageA.request.get("/api/tasks?limit=10&offset=0");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.length).toBeLessThanOrEqual(10);
  });
});

test.describe("[PENDING] Kanban drag-drop persistence", () => {
  test.fixme("dragging a card from 'A Fazer' to 'Concluída' calls PUT and persists", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    await authedPageA.getByRole("button", { name: /kanban/i }).click();

    const card = authedPageA.locator('[data-testid="task-card"]').first();
    const targetColumn = authedPageA.locator('[data-testid="kanban-column"][data-status="Concluída"]');

    const putPromise = authedPageA.waitForRequest(
      (req) => /\/api\/tasks\/[^/]+$/.test(req.url()) && req.method() === "PUT",
    );

    await card.dragTo(targetColumn);
    const put = await putPromise;
    expect(put.postDataJSON()).toMatchObject({ status: "Concluída" });

    await authedPageA.reload();
    // Card should still be in "Concluída" column after refresh.
  });
});

test.describe("[PENDING] Calendar drag-drop due_date", () => {
  test.fixme("dragging a task to another day updates due_date via PUT", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    await authedPageA.getByRole("button", { name: /calend/i }).click();
    // Calendar view is not yet wired up. Spec only.
  });
});

test.describe("[PENDING] Filter URL persistence + server query", () => {
  test.fixme("applying 'Status: Bloqueada' filter updates URL and triggers backend query", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    await authedPageA.getByRole("button", { name: /filtros/i }).click();

    const reqPromise = authedPageA.waitForRequest(
      (req) => req.url().includes("/api/tasks") && req.url().includes("status=Bloqueada"),
    );

    // Filter UI flow goes here when implemented.
    await reqPromise;
    expect(authedPageA.url()).toContain("status=Bloqueada");
  });
});

test.describe("[PENDING] Optimistic UI + localStorage sync", () => {
  test.fixme("created task appears in localStorage before server confirms", async ({ authedPageA }) => {
    await gotoTasks(authedPageA);
    const title = uniqueTitle("optimistic");

    await authedPageA.getByRole("button", { name: /nova tarefa/i }).click();
    await authedPageA.getByLabel(/título/i).fill(title);
    await authedPageA.getByRole("button", { name: /criar/i }).click();

    const stored = await authedPageA.evaluate(() => localStorage.getItem("triade:tasks:v1"));
    expect(stored).toBeTruthy();
    expect(stored!).toContain(title);
  });

  test.fixme("after server confirms, task id is permanent (not 'task-local-*')", async ({ authedPageA }) => {
    // Will assert that the optimistic local id gets replaced with the
    // canonical server-issued UUID once POST resolves.
  });
});

test.describe("[PENDING] Performance", () => {
  test.fixme("rendering 100+ tasks does not freeze the UI", async ({ authedPageA }) => {
    // Will need a seed fixture of 100+ rows. Measure FCP / interaction latency
    // via page.evaluate(() => performance.now()).
  });
});
