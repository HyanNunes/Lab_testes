const authView = document.getElementById("auth-view");
const tasksView = document.getElementById("tasks-view");
const accountMenu = document.getElementById("account-menu");
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authMessage = document.getElementById("auth-message");
const tasksMessage = document.getElementById("tasks-message");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const taskCount = document.getElementById("task-count");

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  if (response.status === 204) {
    return null;
  }
  const responseText = await response.text();
  let result = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Resposta inválida do servidor (HTTP ${response.status}). ` +
        "Confirme se o backend está em execução e se a página foi aberta pela aplicação."
      );
    }
  }

  if (!response.ok) {
    throw new Error(result?.error || `Não foi possível concluir a operação (HTTP ${response.status}).`);
  }
  if (result === null) {
    throw new Error("O servidor retornou uma resposta vazia. Confirme se o backend está em execução.");
  }
  return result;
}

function showAuthMessage(message, isError = true) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
  authMessage.classList.toggle("success", !isError);
}

function showTasksMessage(message, isError = true) {
  tasksMessage.textContent = message;
  tasksMessage.classList.toggle("error", isError);
  tasksMessage.classList.toggle("success", !isError);
}

function selectAuthTab(tab) {
  const showLogin = tab === "login";
  loginForm.classList.toggle("hidden", !showLogin);
  registerForm.classList.toggle("hidden", showLogin);
  loginTab.classList.toggle("active", showLogin);
  registerTab.classList.toggle("active", !showLogin);
  loginTab.setAttribute("aria-selected", String(showLogin));
  registerTab.setAttribute("aria-selected", String(!showLogin));
  showAuthMessage("");
}

function showTasks(user) {
  authView.classList.add("hidden");
  tasksView.classList.remove("hidden");
  document.getElementById("welcome-message").textContent = `Olá, ${user.name}!`;
  document.getElementById("account-name").textContent = user.name;
  showTasksMessage("");
  return loadTasks();
}

function showAuthView(message, isError = false) {
  tasksView.classList.add("hidden");
  authView.classList.remove("hidden");
  accountMenu.open = false;
  taskList.replaceChildren();
  document.getElementById("task-form").reset();
  loginForm.reset();
  registerForm.reset();
  selectAuthTab("login");
  showAuthMessage(message, isError);
}

async function loadTasks() {
  const tasks = await api("/api/tasks");
  taskList.replaceChildren(...tasks.map(createTaskItem));
  emptyState.classList.toggle("hidden", tasks.length > 0);
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}`;
}

function createTaskItem(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Concluir ${task.title}`);
  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    try {
      await api(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: checkbox.checked })
      });
      await loadTasks();
      showTasksMessage("");
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      checkbox.disabled = false;
      showTasksMessage(error.message);
    }
  });

  const content = document.createElement("div");
  content.className = "task-content";
  const title = document.createElement("h3");
  title.textContent = task.title;
  content.append(title);
  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    content.append(description);
  }

  const removeButton = document.createElement("button");
  removeButton.className = "button delete-button";
  removeButton.type = "button";
  removeButton.textContent = "Excluir";
  removeButton.setAttribute("aria-label", `Excluir ${task.title}`);
  removeButton.addEventListener("click", async () => {
    removeButton.disabled = true;
    try {
      await api(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
      await loadTasks();
      showTasksMessage("");
    } catch (error) {
      removeButton.disabled = false;
      showTasksMessage(error.message);
    }
  });

  item.append(checkbox, content, removeButton);
  return item;
}

loginTab.addEventListener("click", () => selectAuthTab("login"));
registerTab.addEventListener("click", () => selectAuthTab("register"));
document.getElementById("tasks-nav").addEventListener("click", () => {
  document.getElementById("task-list-title").scrollIntoView({ behavior: "smooth" });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  try {
    const user = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    await showTasks(user);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  try {
    const user = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData))
    });
    await showTasks(user);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

document.getElementById("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const task = Object.fromEntries(formData);
  task.title = task.title.trim();
  task.description = task.description.trim();

  try {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task)
    });
    form.reset();
    await loadTasks();
    showTasksMessage("");
  } catch (error) {
    showTasksMessage(error.message);
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    showAuthView("Você saiu da sua conta.");
  } catch (error) {
    showTasksMessage(error.message);
  }
});

document.getElementById("delete-account-button").addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Excluir sua conta removerá permanentemente todas as suas tarefas. Deseja continuar?"
  );
  if (!confirmed) {
    return;
  }

  try {
    await api("/api/auth/account", { method: "DELETE" });
    showAuthView("Sua conta e suas tarefas foram excluídas.");
  } catch (error) {
    showTasksMessage(error.message);
  }
});

async function initialize() {
  try {
    const user = await api("/api/auth/me");
    await showTasks(user);
  } catch (error) {
    if (error.message !== "Não autenticado.") {
      showAuthMessage(error.message);
    }
  }
}

initialize();
