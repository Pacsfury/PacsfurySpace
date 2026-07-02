import { getDoc, saveDoc } from "./db.js";

// ── DOM refs ─────────────────────────────────────────────────────────────────

const btn_bold   = document.getElementById("btn-bold");
const btn_italic = document.getElementById("btn-italic");
const btn_under  = document.getElementById("btn-under");
const btn_font   = document.getElementById("btn-font");
const btn_save   = document.getElementById("btn-save");
const btn_back   = document.getElementById("btn-back");
const inp_color  = document.getElementById("inp-color");
const inp_font   = document.getElementById("inp-font");
const page       = document.getElementById("page");
const tree       = document.getElementById("tree");
const docTitle   = document.getElementById("doc-title");
const saveState  = document.getElementById("save-state")

// ── State ─────────────────────────────────────────────────────────────────────

const docId = new URLSearchParams(location.search).get("id");
const pages = {};             // nodeId -> innerHTML
let currentActiveNodeId = "1";
let savedRange = null;
let nodeIdCounter = 2;
let autoSaveTimer = null;
let currentDoc = null;

// ── Load document from IndexedDB ──────────────────────────────────────────────

async function loadDoc() {
    if (!docId) { location.href = "menu.html"; return; }

    currentDoc = await getDoc(docId);
    if (!currentDoc) { location.href = "menu.html"; return; }

    docTitle.textContent = currentDoc.title;
    document.title = `${currentDoc.title} — PacsfuySpace`;

    if (currentDoc.pages) {
        Object.assign(pages, currentDoc.pages);
    } else {
        pages["1"] = currentDoc.content ?? "";
    }

    if (currentDoc.tree) {
        restoreTree(currentDoc.tree);
    }

    if (currentDoc.nodeIdCounter) nodeIdCounter = currentDoc.nodeIdCounter;

    page.innerHTML = pages["1"] ?? "";
    document.querySelector('[data-id="1"] > .treeitem')?.classList.add("selected-node");
}

// ── Save document to IndexedDB ────────────────────────────────────────────────

function collectState() {
    pages[currentActiveNodeId] = page.innerHTML;
    return {
        ...currentDoc,
        pages,
        content:       pages["1"] ?? "",   // for card preview
        tree:          serializeTree(),
        nodeIdCounter,
        updatedAt:     Date.now()
    };
}

async function saveNow() {
    const state = collectState();
    await saveDoc(state);
    currentDoc = state;
    flashSave();
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveNow, 1500);
}

function flashSave() {
    btn_save.textContent = "✓";
    saveState.textContent = "Saved";
    setTimeout(() => {
      btn_save.textContent = "💾";
      saveState.textContent = "Save";
    }, 1500);
}

// ── Tree serialization ────────────────────────────────────────────────────────

function serializeTree() {
    function nodeToObj(el) {
        return {
            id:       el.dataset.id,
            label:    el.querySelector(":scope > .treeitem > .node-text")?.innerText ?? "",
            children: [...el.querySelectorAll(":scope > .tree-children > .tree-node")].map(nodeToObj)
        };
    }
    return [...tree.querySelectorAll(":scope > .tree-node")].map(nodeToObj);
}

function restoreTree(nodes) {
    const root = tree.querySelector(".tree-node[data-id='1']");
    if (!root) return;

    if (nodes[0]?.label) {
        const span = root.querySelector(":scope > .treeitem > .node-text");
        if (span) span.innerText = nodes[0].label;
    }

    function addChildren(parentEl, children) {
        const container = parentEl.querySelector(".tree-children");
        children.forEach(child => {
            const node = createTreeNode(child.id, child.label);
            container.appendChild(node);
            if (child.children?.length) addChildren(node, child.children);
        });
    }

    if (nodes[0]?.children) addChildren(root, nodes[0].children);
}

function createTreeNode(id, label) {
    const node = document.createElement("div");
    node.classList.add("tree-node");
    node.dataset.id = id;
    node.innerHTML = `
        <div class="treeitem">
            <span class="node-text">${label}</span>
            <button class="btn-add">+</button>
        </div>
        <div class="tree-children"></div>`;
    return node;
}

// ── Selection helpers ─────────────────────────────────────────────────────────

function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
}

function rgbToHex(rgb) {
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return rgb;
    return "#" + [m[1], m[2], m[3]].map(n => ("0" + parseInt(n).toString(16)).slice(-2)).join("");
}

// ── Formatting commands ───────────────────────────────────────────────────────

btn_bold.addEventListener("click",   () => document.execCommand("bold"));
btn_italic.addEventListener("click", () => document.execCommand("italic"));
btn_under.addEventListener("click",  () => document.execCommand("underline"));
inp_color.addEventListener("change", () => document.execCommand("foreColor", false, inp_color.value));

function applyFont() {
    restoreSelection();
    document.execCommand("fontName", false, inp_font.value);
    page.focus();
}

btn_font.addEventListener("mousedown", (e) => { e.preventDefault(); saveSelection(); });
btn_font.addEventListener("click", applyFont);
inp_font.addEventListener("keydown", ({ key }) => { if (key === "Enter") applyFont(); });

btn_save.addEventListener("click", saveNow);
btn_back.addEventListener("click", async () => {
    await saveNow();
    location.href = "menu.html";
});

// ── Toolbar state sync ────────────────────────────────────────────────────────

function updateButtonStates() {
    [["bold", btn_bold], ["italic", btn_italic], ["underline", btn_under]].forEach(([cmd, btn]) =>
        btn.classList.toggle("active", document.queryCommandState(cmd))
    );
}

function updateInputStates() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const el = sel.anchorNode?.parentElement;
    if (!el || !page.contains(el)) return;
    inp_color.value = rgbToHex(window.getComputedStyle(el).color);
}

["keyup", "mouseup"].forEach(evt => {
    page.addEventListener(evt, saveSelection);
    page.addEventListener(evt, updateButtonStates);
});

document.addEventListener("selectionchange", updateInputStates);

// ── Document switching (tree nodes) ──────────────────────────────────────────

page.addEventListener("input", () => {
    pages[currentActiveNodeId] = page.innerHTML;
    scheduleAutoSave();
});

function switchDocument(nodeId) {
    pages[currentActiveNodeId] = page.innerHTML;
    currentActiveNodeId = nodeId;
    page.innerHTML = pages[nodeId] ?? "";

    document.querySelectorAll(".treeitem").forEach(el => el.classList.remove("selected-node"));
    document.querySelector(`[data-id="${nodeId}"] > .treeitem`)?.classList.add("selected-node");

    updateButtonStates();
}

// ── Tree interactions ─────────────────────────────────────────────────────────

tree.addEventListener("click", ({ target }) => {
    if (target.classList.contains("btn-add")) {
        const id = String(nodeIdCounter++);
        pages[id] = "";

        const node = createTreeNode(id, `Subitem ${id}`);
        target.closest(".tree-node").querySelector(".tree-children").appendChild(node);
        switchDocument(id);
        scheduleAutoSave();
        return;
    }

    const node = target.closest(".tree-node");
    if (node && (target.classList.contains("node-text") || target.classList.contains("treeitem"))) {
        switchDocument(node.dataset.id);
    }
});

tree.addEventListener("dblclick", ({ target }) => {
    if (!target.classList.contains("node-text")) return;

    const original = target.innerText;
    const input = Object.assign(document.createElement("input"), {
        type: "text", value: original, className: "edit-node-input"
    });

    target.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
        const span = document.createElement("span");
        span.classList.add("node-text");
        span.innerText = input.value.trim() || original;
        input.replaceWith(span);
        scheduleAutoSave();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", ({ key }) => {
        if (key === "Enter")  commit();
        if (key === "Escape") { input.value = original; commit(); }
    });
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadDoc();