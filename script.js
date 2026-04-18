const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionsBtn = document.getElementById("clearSelections");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const rtlToggle = document.getElementById("rtlToggle");

const STORAGE_KEY = "loreal_selected_products";
const RTL_KEY = "loreal_rtl_enabled";
const RESPONSE_KEY = "loreal_last_response_id";

/* Paste your deployed Worker URL here later */
const WORKER_URL = "https://loreal-project-2.hunterdermody1.workers.dev";

let allProducts = [];
let selectedProductIds = [];
let lastResponseId = localStorage.getItem(RESPONSE_KEY) || null;

productsContainer.innerHTML = `
  <div class="placeholder-message">
    Choose a category or use search to browse products.
  </div>
`;

chatWindow.innerHTML = `
  <div class="message assistant">
    Select products, generate a routine, then ask follow-up questions here.
  </div>
`;

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProductIds));
}

function loadSelections() {
  const saved = localStorage.getItem(STORAGE_KEY);
  selectedProductIds = saved ? JSON.parse(saved) : [];
}

function saveDirection(isRTL) {
  localStorage.setItem(RTL_KEY, JSON.stringify(isRTL));
}

function loadDirection() {
  const saved = localStorage.getItem(RTL_KEY);
  const isRTL = saved ? JSON.parse(saved) : false;
  applyDirection(isRTL);
}

function applyDirection(isRTL) {
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
  rtlToggle.textContent = isRTL ? "Disable RTL" : "Enable RTL";
}

function getSelectedProducts() {
  return allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );
}

function isSelected(productId) {
  return selectedProductIds.includes(productId);
}

function toggleSelectedProduct(productId) {
  if (isSelected(productId)) {
    selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  } else {
    selectedProductIds.push(productId);
  }

  saveSelections();
  renderProducts();
  renderSelectedProducts();
}

function removeSelectedProduct(productId) {
  selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  saveSelections();
  renderProducts();
  renderSelectedProducts();
}

function clearSelections() {
  selectedProductIds = [];
  lastResponseId = null;
  localStorage.removeItem(RESPONSE_KEY);
  saveSelections();
  renderProducts();
  renderSelectedProducts();
  appendMessage(
    "assistant",
    "Selections cleared. Pick new products to build another routine.",
  );
}

function getFilteredProducts() {
  const selectedCategory = categoryFilter.value.trim().toLowerCase();
  const searchTerm = productSearch.value.trim().toLowerCase();

  return allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;

    const searchableText = [
      product.name,
      product.brand,
      product.category,
      product.description,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();

  if (!filteredProducts.length) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        No products match your current filters.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = filteredProducts
    .map((product) => {
      const selected = isSelected(product.id);

      return `
        <article class="product-card ${selected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" />
          
          <div class="product-meta">
            <div class="product-info">
              <h3>${product.name}</h3>
              <p>${product.brand}</p>
            </div>
            <span class="category-tag">${product.category}</span>
          </div>

          <div class="card-actions">
            <span class="select-state">${selected ? "Selected" : "Click to Select"}</span>
            <button
              type="button"
              class="details-btn"
              data-details-id="${product.id}"
              aria-expanded="false"
            >
              Details
            </button>
          </div>

          <div class="product-description" id="desc-${product.id}">
            ${product.description}
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const productId = Number(card.dataset.id);
      toggleSelectedProduct(productId);
    });
  });

  document.querySelectorAll(".details-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const productId = button.dataset.detailsId;
      const description = document.getElementById(`desc-${productId}`);
      const isOpen = description.classList.contains("open");

      description.classList.toggle("open");
      button.setAttribute("aria-expanded", String(!isOpen));
      button.textContent = isOpen ? "Details" : "Hide Details";
    });
  });
}

function renderSelectedProducts() {
  const selectedProducts = getSelectedProducts();

  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = `
      <div class="empty-state">
        No products selected yet.
      </div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-chip">
          <span>${product.brand} — ${product.name}</span>
          <button
            type="button"
            class="remove-chip-btn"
            data-remove-id="${product.id}"
            aria-label="Remove ${product.name}"
          >
            ×
          </button>
        </div>
      `,
    )
    .join("");

  document.querySelectorAll(".remove-chip-btn").forEach((button) => {
    button.addEventListener("click", () => {
      removeSelectedProduct(Number(button.dataset.removeId));
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatAssistantText(text) {
  const safeText = escapeHtml(text);

  const withLinks = safeText.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return withLinks.replace(/\n/g, "<br>");
}

function appendMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  if (role === "assistant") {
    message.innerHTML = formatAssistantText(text);
  } else {
    message.textContent = text;
  }

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendToWorker(payload) {
  if (WORKER_URL === "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE") {
    throw new Error(
      "Paste your deployed Cloudflare Worker URL into script.js first.",
    );
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

async function generateRoutine() {
  const selectedProducts = getSelectedProducts();

  if (!selectedProducts.length) {
    appendMessage(
      "assistant",
      "Please select at least one product before generating a routine.",
    );
    return;
  }

  generateRoutineBtn.disabled = true;
  generateRoutineBtn.textContent = "Generating...";

  appendMessage("assistant", "Building your personalized routine...");

  try {
    const data = await sendToWorker({
      action: "routine",
      selectedProducts,
    });

    lastResponseId = data.responseId || null;

    if (lastResponseId) {
      localStorage.setItem(RESPONSE_KEY, lastResponseId);
    }

    appendMessage("assistant", data.text);
  } catch (error) {
    appendMessage("assistant", `Error: ${error.message}`);
  } finally {
    generateRoutineBtn.disabled = false;
    generateRoutineBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine`;
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const message = userInput.value.trim();

  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";

  if (!lastResponseId) {
    appendMessage(
      "assistant",
      "Generate a routine first so I have context for your follow-up questions.",
    );
    return;
  }

  try {
    const data = await sendToWorker({
      action: "chat",
      userMessage: message,
      previousResponseId: lastResponseId,
    });

    lastResponseId = data.responseId || lastResponseId;

    if (lastResponseId) {
      localStorage.setItem(RESPONSE_KEY, lastResponseId);
    }

    appendMessage("assistant", data.text);
  } catch (error) {
    appendMessage("assistant", `Error: ${error.message}`);
  }
}

rtlToggle.addEventListener("click", () => {
  const isRTL = document.documentElement.dir !== "rtl";
  applyDirection(isRTL);
  saveDirection(isRTL);
});

categoryFilter.addEventListener("change", renderProducts);
productSearch.addEventListener("input", renderProducts);
clearSelectionsBtn.addEventListener("click", clearSelections);
generateRoutineBtn.addEventListener("click", generateRoutine);
chatForm.addEventListener("submit", handleChatSubmit);

async function init() {
  try {
    allProducts = await loadProducts();
    loadSelections();
    loadDirection();
    renderProducts();
    renderSelectedProducts();
  } catch (error) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        Could not load products. Check products.json.
      </div>
    `;
  }
}

init();
