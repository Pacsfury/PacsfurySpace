const btn_bold  = document.getElementById("btn-bold");
const btn_italic = document.getElementById("btn-italic");
const btn_under  = document.getElementById("btn-under");
const inp_color  = document.getElementById("inp-color");
const inp_font   = document.getElementById("inp-font");
const page = document.getElementById("page");
const tree = document.getElementById("tree");

const documents = { "1": "Start editing" };
let currentActiveNodeId = "1";
let savedRange = null;
let nodeIdCounter = 2;

// ── Selection helpers ────────────────────────────────────────────────────────

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

// ── Formatting commands ──────────────────────────────────────────────────────

btn_bold.addEventListener("click",  () => document.execCommand("bold"));
btn_italic.addEventListener("click", () => document.execCommand("italic"));
btn_under.addEventListener("click",  () => document.execCommand("underline"));
inp_color.addEventListener("change", () => document.execCommand("foreColor", false, inp_color.value));

const btn_font = document.getElementById("btn-font");

function applyFont() {
    restoreSelection();
    document.execCommand("fontName", false, inp_font.value);
    page.focus();
}

btn_font.addEventListener("click", applyFont);
inp_font.addEventListener("keydown", ({ key }) => { if (key === "Enter") applyFont(); });

// ── Toolbar state sync ───────────────────────────────────────────────────────

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
    const style = window.getComputedStyle(el);
    if (sel.isCollapsed) inp_font.value = style.fontFamily.replace(/['"]/g, "");
    inp_color.value = rgbToHex(style.color);
}

["keyup", "mouseup"].forEach(evt => {
    page.addEventListener(evt, saveSelection);
    page.addEventListener(evt, updateButtonStates);
});

document.addEventListener("selectionchange", updateInputStates);

// ── Document persistence ─────────────────────────────────────────────────────

page.addEventListener("input", () => {
    documents[currentActiveNodeId] = page.innerHTML;
});

function switchDocument(nodeId) {
    documents[currentActiveNodeId] = page.innerHTML;
    currentActiveNodeId = nodeId;
    page.innerHTML = documents[nodeId] ?? "";

    document.querySelectorAll(".treeitem").forEach(el => el.classList.remove("selected-node"));
    document.querySelector(`[data-id="${nodeId}"] > .treeitem`)?.classList.add("selected-node");

    updateButtonStates();
}

// ── Tree interactions ────────────────────────────────────────────────────────

tree.addEventListener("click", ({ target }) => {
    if (target.classList.contains("btn-add")) {
        const id = String(nodeIdCounter++);
        documents[id] = `Currently editing document ${id}`;

        const node = document.createElement("div");
        node.classList.add("tree-node");
        node.dataset.id = id;
        node.innerHTML = `
            <div class="treeitem">
                <span class="node-text">Subitem ${id}</span>
                <button class="btn-add">+</button>
            </div>
            <div class="tree-children"></div>`;

        target.closest(".tree-node").querySelector(".tree-children").appendChild(node);
        switchDocument(id);
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
        type: "text",
        value: original,
        className: "edit-node-input"
    });

    target.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
        const span = document.createElement("span");
        span.classList.add("node-text");
        span.innerText = input.value.trim() || original;
        input.replaceWith(span);
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", ({ key }) => {
        if (key === "Enter")  commit();
        if (key === "Escape") { input.value = original; commit(); }
    });
});