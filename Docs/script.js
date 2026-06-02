const btn_bold = document.getElementById("btn-bold");
const btn_italic = document.getElementById("btn-italic");
const btn_under = document.getElementById("btn-under");

const inp_color = document.getElementById("inp-color");
const inp_font = document.getElementById("inp-font");

const page = document.getElementById("page");
const tree = document.getElementById("tree");
const treeMain = document.getElementById("0");
const addMainChild = document.getElementById("addchild@0");

let savedRange = null;

const documents = {
    "1": "Start editing"
};

let currentActiveNodeId = "1";

function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0);
    }
}

page.addEventListener('keyup', saveSelection);
page.addEventListener('mouseup', saveSelection);

inp_font.addEventListener('change', () => {
    if (savedRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }

    document.execCommand('fontName', false, inp_font.value);
    
    page.focus(); 
});

function rgbToHex(rgb) {
    const result = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!result) {
        return rgb;
    }
    return "#" +
        ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[3], 10).toString(16)).slice(-2);
}

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const parentElement = selection.anchorNode.parentElement;

    if (parentElement && page.contains(parentElement)) {
        const computedStyle = window.getComputedStyle(parentElement);
        
        const currentFont = computedStyle.fontFamily.replace(/['"]/g, '');
        const currentColor = computedStyle.color; // Obtiene el rgb

        inp_font.value = currentFont;
        inp_color.value = rgbToHex(currentColor); 
    }
});

btn_bold.addEventListener("click", applicate_bold);
btn_italic.addEventListener("click", applicate_italic);
btn_under.addEventListener("click", applicate_under);
inp_color.addEventListener("change", applicate_color);

function applicate_bold() {
    document.execCommand("bold");
}

function applicate_italic() {
    document.execCommand("italic");
}

function applicate_under() {
    document.execCommand("underline");
}

function applicate_color() {
    document.execCommand("foreColor", false, inp_color.value);
}

function updateButtonStates() {

    const formats = [
        { name: 'bold', btn: btn_bold },
        { name: 'italic', btn: btn_italic },
        { name: 'underline', btn: btn_under}
    ];

    formats.forEach(f => {

        if (document.queryCommandState(f.name)) {
            f.btn.classList.add('active');
        } else {
            f.btn.classList.remove('active');
        }
    });
}

page.addEventListener('keyup', updateButtonStates);
page.addEventListener('mouseup', updateButtonStates);

let nodeIdCounter = 2; 
tree.addEventListener('click', (event) => {
    const target = event.target;

    if (target.classList.contains('btn-add')) {
        const currentNode = target.closest('.tree-node');
        const childrenContainer = currentNode.querySelector('.tree-children');
        
        const newNodeId = String(nodeIdCounter);

        documents[newNodeId] = `Currently editing document ${newNodeId}`;

        const newNode = document.createElement('div');
        newNode.classList.add('tree-node');
        newNode.setAttribute('data-id', newNodeId);

        newNode.innerHTML = `
            <div class="treeitem">
                <span class="node-text">Subitem ${newNodeId}</span>
                <button class="btn-add">+</button>
            </div>
            <div class="tree-children"></div>
        `;

        childrenContainer.appendChild(newNode);
        nodeIdCounter++;
        
        switchDocument(newNodeId);
    }
    
    else if (target.classList.contains('node-text') || target.classList.contains('treeitem')) {
        const currentNode = target.closest('.tree-node');
        const nodeId = currentNode.getAttribute('data-id');
        switchDocument(nodeId);
    }
});

function switchDocument(nodeId) {
    documents[currentActiveNodeId] = page.innerHTML;

    currentActiveNodeId = nodeId;

    page.innerHTML = documents[nodeId] || "";

    document.querySelectorAll('.treeitem').forEach(item => item.classList.remove('selected-node'));
    const activeNode = document.querySelector(`[data-id="${nodeId}"] > .treeitem`);
    if (activeNode) activeNode.classList.add('selected-node');

    updateButtonStates();
}

page.addEventListener('input', () => {
    if (currentActiveNodeId) {
        documents[currentActiveNodeId] = page.innerHTML;
    }
});

tree.addEventListener('dblclick', (event) => {
    const target = event.target;

    if (target.classList.contains('node-text')) {
        const currentText = target.innerText;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.classList.add('edit-node-input');
        target.replaceWith(input);
        input.focus();
        input.select();
        const saveName = () => {
            const newName = input.value.trim() || currentText;
            
            const newSpan = document.createElement('span');
            newSpan.classList.add('node-text');
            newSpan.innerText = newName;
            
            input.replaceWith(newSpan);
        };

        input.addEventListener('blur', saveName); 
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveName();
            }
            if (e.key === 'Escape') {
                input.value = currentText;
                saveName();
            }
        });
    }
});