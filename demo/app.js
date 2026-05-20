const apiKeyInput = document.querySelector("#apiKey");
const modelSelect = document.querySelector("#model");
const promptInput = document.querySelector("#prompt");
const promptsEl = document.querySelector("#prompts");
const resultEl = document.querySelector("#result");
const runButton = document.querySelector("#run");
const clearButton = document.querySelector("#clear");

function setResult(value) {
  resultEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed.");
  }
  return body;
}

async function init() {
  const [config, promptData] = await Promise.all([
    getJson("/api/config"),
    getJson("/api/prompts"),
  ]);

  apiKeyInput.value = config.defaultApiKey || "";
  modelSelect.innerHTML = config.models
    .map((model) => `<option value="${model.id}">${model.label}</option>`)
    .join("");

  promptInput.value = promptData.prompts[0] || "";
  promptsEl.innerHTML = "";
  for (const prompt of promptData.prompts) {
    const button = document.createElement("button");
    button.className = "prompt";
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      promptInput.value = prompt;
      promptInput.focus();
    });
    promptsEl.append(button);
  }
}

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  setResult("Running...");
  try {
    setResult(
      await getJson("/api/chat", {
        body: JSON.stringify({
          apiKey: apiKeyInput.value.trim(),
          model: modelSelect.value,
          prompt: promptInput.value.trim(),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error));
  } finally {
    runButton.disabled = false;
  }
});

clearButton.addEventListener("click", () => {
  promptInput.value = "";
  setResult("Ready.");
});

init().catch((error) => setResult(error instanceof Error ? error.message : String(error)));
