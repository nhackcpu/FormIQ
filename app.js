const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const toast = (message) => {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("show"), 2300);
};

const readStored = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
  if (product.foundationUrl) {
    try {
      const videoUrl = new URL(product.foundationUrl);
      if (videoUrl.protocol !== "https:" && videoUrl.protocol !== "http:") {
        $("#upload-error").textContent = "Use an http or https link for the foundation videos.";
        return;
      }
      product.foundationUrl = videoUrl.href;
    } catch (error) {
      $("#upload-error").textContent = "Enter a valid link to the foundation videos.";
      return;
    }
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error);
    toast("This browser couldn't save your changes.");
    return false;
  }
};

const formatPrice = (amount) => new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
}).format(amount);

const catalog = [
  { title: "Room Sentinel", price: 29, category: "electronics", description: "Build a visible, privacy-first camera that detects motion and signals an entry.", level: "Start from fundamentals", buildTime: "Multi-week, guided milestones", symbol: "◉", learning: ["Learn how motion sensors detect a changing scene and what affects their range", "Connect a camera and sensor to a clear, local entry alert", "Design around visible use, consent, and no cloud recording by default"], includes: ["Compact camera module and motion sensor", "Controller and status light", "Local alert component", "QR code to foundational video lessons", "Staged build and testing guide"] },
  { title: "Maglev Control Lab", price: 39, category: "robotics", description: "Make a magnetic puck hover by sensing its position and correcting its height.", level: "Start from fundamentals", buildTime: "Multi-week, guided milestones", symbol: "◌", learning: ["Explore magnetic fields and the forces that make levitation possible", "Measure position with a sensor and build a feedback loop", "Tune feedback control to keep the puck steadily floating"], includes: ["Current-limited electromagnet module", "Magnet puck and position sensor", "Controller and levitation frame", "QR code to foundational video lessons", "Staged tuning and build guide"] },
  { title: "Hydraulic Arm", price: 25, category: "mechanical", description: "Build a tabletop arm that uses fluid pressure to pick up and move objects.", level: "Start from fundamentals", buildTime: "Multi-week, guided milestones", symbol: "⌁", learning: ["Learn how pressure and force move through a confined fluid", "Use fluid-powered actuators to move a mechanical linkage", "Explore leverage and joint geometry through a working arm"], includes: ["Tabletop arm frame and gripper", "Syringes, tubing, and fittings", "Small test objects", "QR code to foundational video lessons", "Staged assembly and experiment guide"] },
];
const storedProducts = readStored("formiq-products", catalog);
const customProducts = Array.isArray(storedProducts)
  ? storedProducts.filter((item) => item.custom).map((item) => ({
    ...item,
    buildTime: /multi-week|flexible/i.test(item.buildTime || "") ? item.buildTime : "Multi-week, self-paced",
  }))
  : [];
let products = [...catalog, ...customProducts];
if (JSON.stringify(storedProducts) !== JSON.stringify(products)) saveStored("formiq-products", products);
let cart = readStored("formiq-cart", []);
let activeEmail = "";
let imageData = "";
let activeFilter = "all";
let selectedProduct = "";

function renderAddedProducts() {
  const grid = $("#product-grid");
  $$(".product-card[data-custom='true']", grid).forEach((card) => card.remove());
  products.filter((item) => item.custom).forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.category = product.category;
    card.dataset.custom = "true";
    const imageStyle = product.image ? ` style="background-image:linear-gradient(#1b241866,#1b241866),url('${product.image}');background-size:cover;background-position:center"` : "";
    card.innerHTML = `<button class="product-visual visual-pendulum" type="button" data-product-details="${escapeHTML(product.title)}" aria-label="View ${escapeHTML(product.title)} kit details"${imageStyle}>
      <span class="product-tag">${escapeHTML(product.category.toUpperCase())}<i>↗</i></span>
      ${product.image ? "" : `<span class="custom-kit-symbol">${escapeHTML(product.symbol || "✳")}</span>`}
      <span class="visual-caption">FORMIQ COMMUNITY BUILD</span></button>
      <div class="product-meta"><div><h3>${escapeHTML(product.title)}</h3><p>${escapeHTML(product.description)}</p></div><span class="product-price">${formatPrice(product.price)}</span></div>
      <div class="product-bottom"><span>MULTI-WEEK <i>·</i> STARTS FROM ZERO</span><button class="card-details" type="button" data-product-details="${escapeHTML(product.title)}">Details <span>↗</span></button></div>
      <button class="add-button" data-product="${escapeHTML(product.title)}" data-price="${product.price}" aria-label="Add ${escapeHTML(product.title)} to cart">Add to cart <span>＋</span></button>`;
    grid.appendChild(card);
  });
  const allFilter = $('.filter-chip[data-filter="all"]');
  if (allFilter) allFilter.innerHTML = `All projects <span>${String(products.length).padStart(2, "0")}</span>`;
  bindAddButtons();
  bindDetailButtons();
  applyProductControls();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function bindAddButtons() {
  $$(".add-button").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const { product, price } = button.dataset;
      addToCart(product, Number(price));
    });
  });
}

function addToCart(title, price) {
  const updatedCart = [...cart];
  const line = updatedCart.find((item) => item.title === title);
  if (line) line.quantity += 1;
  else updatedCart.push({ title, price, quantity: 1 });
  if (saveStored("formiq-cart", updatedCart)) {
    cart = updatedCart;
    updateCart();
    toast(`${title} added to your build list.`);
  }
}

function bindDetailButtons() {
  $$("[data-product-details]").forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => openKitDetails(button.dataset.productDetails));
  });
}

function openKitDetails(title) {
  const product = products.find((item) => item.title === title);
  if (!product) {
    toast("Kit details aren't available for this listing yet.");
    return;
  }
  selectedProduct = title;
  $("#detail-category").textContent = product.category;
  $("#kit-modal-title").textContent = product.title;
  $("#kit-modal-description").textContent = product.description;
  $("#detail-time").textContent = product.buildTime || "Self-paced";
  $("#detail-level").textContent = product.level || "All levels";
  $("#detail-price").textContent = formatPrice(product.price);
  renderDetailList("#detail-learning", product.learning, "See the kit description for project learning goals.");
  renderDetailList("#detail-includes", product.includes, "Kit contents will be listed with this project.");
  const foundationLink = $("#foundation-video-link");
  foundationLink.classList.add("hidden");
  foundationLink.removeAttribute("href");
  if (product.foundationUrl) {
    try {
      const videoUrl = new URL(product.foundationUrl);
      if (videoUrl.protocol === "https:" || videoUrl.protocol === "http:") {
        foundationLink.href = videoUrl.href;
        foundationLink.classList.remove("hidden");
      }
    } catch (error) {
      console.error(`Invalid foundation video link for ${product.title}.`, error);
    }
  }
  setModal("kit-modal", true);
}

function renderDetailList(selector, items, fallback) {
  const list = $(selector);
  list.replaceChildren();
  (items && items.length ? items : [fallback]).forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.appendChild(row);
  });
}

function applyProductControls() {
  const query = $("#kit-search").value.trim().toLowerCase();
  const sortBy = $("#kit-sort").value;
  const grid = $("#product-grid");
  const cards = $$(".product-card", grid);
  const matching = [];
  cards.forEach((card) => {
    const title = $("h3", card).textContent;
    const product = products.find((item) => item.title === title);
    const searchable = [
      title,
      card.dataset.category,
      product?.description,
      product?.level,
      product?.buildTime,
      ...(product?.learning || []),
      ...(product?.includes || []),
    ].join(" ").toLowerCase();
    const matches = (activeFilter === "all" || card.dataset.category === activeFilter) && (!query || searchable.includes(query));
    card.classList.toggle("hidden", !matches);
    if (matches) matching.push(card);
  });
  matching.sort((first, second) => {
    const firstItem = products.find((item) => item.title === $("h3", first).textContent);
    const secondItem = products.find((item) => item.title === $("h3", second).textContent);
    if (sortBy === "price-low") return firstItem.price - secondItem.price;
    if (sortBy === "price-high") return secondItem.price - firstItem.price;
    if (sortBy === "title") return firstItem.title.localeCompare(secondItem.title);
    return products.indexOf(firstItem) - products.indexOf(secondItem);
  });
  matching.forEach((card) => grid.appendChild(card));
  $("#results-summary").textContent = `${matching.length} ${matching.length === 1 ? "project" : "projects"}`;
  $("#no-results").classList.toggle("hidden", matching.length > 0);
  $("#clear-search").classList.toggle("hidden", !query);
}

function updateCart() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  $("#cart-count").textContent = count;
  $("#drawer-count").textContent = `(${count})`;
  $("#cart-items").innerHTML = "";
  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "cart-line";
    row.innerHTML = `<span class="cart-thumb">⌁</span><div><h3>${escapeHTML(item.title)}</h3><p>QTY ${item.quantity}</p><button class="remove-item" data-index="${index}">Remove</button></div><span class="cart-line-price">${formatPrice(item.price * item.quantity)}</span>`;
    $("#cart-items").appendChild(row);
  });
  $$(".remove-item").forEach((button) => button.addEventListener("click", () => {
    cart.splice(Number(button.dataset.index), 1);
    if (saveStored("formiq-cart", cart)) updateCart();
  }));
  $("#cart-empty").classList.toggle("hidden", cart.length > 0);
  $("#cart-summary").classList.toggle("hidden", cart.length === 0);
  $("#cart-subtotal").textContent = formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

function setModal(id, open) {
  const modal = $(`#${id}`);
  modal.classList.toggle("hidden", !open);
  document.body.classList.toggle("modal-open", open);
  if (open) {
    const input = $("input:not([type=file])", modal);
    if (input) setTimeout(() => input.focus(), 50);
  }
}

function setPortalTab(tabName) {
  $$(".portal-tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  $("#panel-my-kits").classList.toggle("hidden", tabName !== "my-kits");
  $("#panel-project-chat").classList.toggle("hidden", tabName !== "project-chat");
  if (tabName === "project-chat") renderChat();
}

function openPortal(email) {
  activeEmail = email;
  $("#portal-email").textContent = email;
  $("#storefront").classList.add("hidden");
  $("#portal").classList.remove("hidden");
  setPortalTab("my-kits");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCart() {
  $("#cart-drawer").classList.add("open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
  $("#drawer-scrim").classList.remove("hidden");
}

function closeCart() {
  if ($("#cart-drawer").classList.contains("open")) $("#cart-open").focus();
  $("#cart-drawer").classList.remove("open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
  $("#drawer-scrim").classList.add("hidden");
}

function selectedKit() {
  return $("#chat-kit-select").value;
}

function renderChat() {
  const kit = selectedKit();
  $("#chat-kit-title").innerHTML = `${escapeHTML(kit)} <span>↗</span>`;
  $("#chat-context-kit").textContent = kit;
  const savedChats = readStored("formiq-chats", {});
  const messages = savedChats[kit] || [];
  const container = $("#chat-messages");
  container.innerHTML = "";
  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.innerHTML = `<strong>Every good build starts with a question.</strong><br>Ask one about ${escapeHTML(kit)}.`;
    container.appendChild(empty);
    return;
  }
  messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `chat-message${message.mine ? " mine" : ""}`;
    bubble.textContent = message.text;
    const stamp = document.createElement("small");
    stamp.textContent = message.mine ? "YOU · JUST NOW" : "FORMIQ LABS · BUILD GUIDE";
    bubble.appendChild(stamp);
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

function addChatMessage(text) {
  const kit = selectedKit();
  const chats = readStored("formiq-chats", {});
  chats[kit] = [...(chats[kit] || []), { text, mine: true }];
  if (!saveStored("formiq-chats", chats)) return;
  renderChat();
  const input = $("#chat-input");
  input.value = "";
  window.setTimeout(() => {
    const updated = readStored("formiq-chats", {});
    updated[kit] = [...(updated[kit] || []), { text: "Thanks for sharing that. Try changing one variable at a time, then compare what your build does. What are you noticing?", mine: false }];
    if (saveStored("formiq-chats", updated)) renderChat();
  }, 650);
}

$("#menu-toggle").addEventListener("click", () => {
  const isOpen = $("#main-nav").classList.toggle("open");
  $("#menu-toggle").textContent = isOpen ? "×" : "☰";
  $("#menu-toggle").setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  $("#menu-toggle").setAttribute("aria-expanded", String(isOpen));
});
$$(".main-nav a").forEach((link) => link.addEventListener("click", () => {
  $("#main-nav").classList.remove("open");
  $("#menu-toggle").textContent = "☰";
  $("#menu-toggle").setAttribute("aria-label", "Open navigation");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}));
$("#login-open").addEventListener("click", () => setModal("login-modal", true));
$("#upload-open").addEventListener("click", () => setModal("upload-modal", true));
$$("[data-close]").forEach((button) => button.addEventListener("click", () => setModal(button.dataset.close, false)));
$$(".overlay").forEach((overlay) => overlay.addEventListener("click", (event) => {
  if (event.target === overlay) setModal(overlay.id, false);
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $$(".overlay:not(.hidden)").forEach((overlay) => setModal(overlay.id, false));
    closeCart();
  }
});

$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  openPortal($("#login-email").value.trim());
  setModal("login-modal", false);
});
$("#portal-exit").addEventListener("click", () => {
  $("#portal").classList.add("hidden");
  $("#storefront").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});
$("#portal-browse").addEventListener("click", () => {
  $("#portal-exit").click();
  $("#kits").scrollIntoView({ behavior: "smooth" });
});
$$(".portal-tab").forEach((button) => button.addEventListener("click", () => setPortalTab(button.dataset.tab)));
$("#open-build-chat").addEventListener("click", () => {
  $("#chat-kit-select").value = "Room Sentinel";
  setPortalTab("project-chat");
});
$("#change-kit").addEventListener("click", () => {
  $("#chat-kit-select").value = "Maglev Control Lab";
  setPortalTab("project-chat");
});
$("#chat-kit-select").addEventListener("change", renderChat);
$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("#chat-input").value.trim();
  if (text) addChatMessage(text);
});

$("#cart-open").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
$("#drawer-scrim").addEventListener("click", closeCart);
$("#cart-explore").addEventListener("click", closeCart);
$("#checkout-button").addEventListener("click", () => toast("Demo checkout only — connect a payment provider to sell."));

$$(".filter-chip").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  $$(".filter-chip").forEach((chip) => {
    const active = chip === button;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
  applyProductControls();
}));
$("#kit-search").addEventListener("input", applyProductControls);
$("#clear-search").addEventListener("click", () => {
  $("#kit-search").value = "";
  $("#kit-search").focus();
  applyProductControls();
});
$("#kit-sort").addEventListener("change", applyProductControls);
$("#clear-filters").addEventListener("click", () => {
  $("#kit-search").value = "";
  $("#kit-sort").value = "featured";
  activeFilter = "all";
  $$(".filter-chip").forEach((chip) => {
    const active = chip.dataset.filter === "all";
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
  applyProductControls();
});
$("#detail-add").addEventListener("click", () => {
  const product = products.find((item) => item.title === selectedProduct);
  if (!product) return;
  addToCart(product.title, product.price);
  setModal("kit-modal", false);
});

$("#kit-image").addEventListener("change", (event) => {
  const file = event.target.files[0];
  $("#upload-error").textContent = "";
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    event.target.value = "";
    $("#upload-error").textContent = "Choose a PNG, JPEG, or WebP image.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    event.target.value = "";
    $("#upload-error").textContent = "Images must be 2 MB or smaller in this preview.";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    imageData = String(reader.result);
    $("#preview-image").src = imageData;
    $("#preview-name").textContent = file.name;
    $("#upload-preview").classList.remove("hidden");
  });
  reader.addEventListener("error", () => {
    $("#upload-error").textContent = "The selected image couldn't be read.";
    imageData = "";
  });
  reader.readAsDataURL(file);
});
$("#clear-image").addEventListener("click", () => {
  imageData = "";
  $("#kit-image").value = "";
  $("#upload-preview").classList.add("hidden");
});
$("#upload-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const product = {
    title: String(form.get("title")).trim(),
    category: String(form.get("category")),
    price: Number(form.get("price")),
    level: String(form.get("level")),
    description: String(form.get("description")).trim(),
    learning: String(form.get("learning")).split("\n").map((item) => item.trim()).filter(Boolean),
    includes: String(form.get("includes")).split("\n").map((item) => item.trim()).filter(Boolean),
    buildTime: String(form.get("buildTime")).trim() || "Self-paced",
    foundationUrl: String(form.get("foundationUrl")).trim(),
    image: imageData,
    custom: true,
    symbol: "✳",
  };
  if (!product.title || !product.description || !Number.isFinite(product.price) || product.price < 1) {
    $("#upload-error").textContent = "Enter a kit name, description, and valid price.";
    return;
  }
  if (product.price > 40) {
    $("#upload-error").textContent = "Keep kit prices at £40 or less to stay student-friendly.";
    return;
  }
  if (products.some((item) => item.title.toLowerCase() === product.title.toLowerCase())) {
    $("#upload-error").textContent = "A kit with that name is already on the shelf.";
    return;
  }
  const updatedProducts = [...products.filter((item) => !item.custom), ...products.filter((item) => item.custom), product];
  if (!saveStored("formiq-products", updatedProducts)) return;
  products = updatedProducts;
  renderAddedProducts();
  setModal("upload-modal", false);
  event.currentTarget.reset();
  imageData = "";
  $("#upload-preview").classList.add("hidden");
  $("#upload-error").textContent = "";
  toast(`${product.title} is now on your demo shelf.`);
  $("#kits").scrollIntoView({ behavior: "smooth" });
});

bindAddButtons();
updateCart();
renderAddedProducts();
