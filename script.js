// Помощник для создания меток
function createLabel(text, className) {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = className;
    return div;
}

// Преобразование инфиксных операций
const infixToFunction = { "+": (x,y)=>x+y, "-": (x,y)=>x-y, "*": (x,y)=>x*y, "/": (x,y)=>x/y };

const infixEval = (str, rx) =>
    str.replace(rx, (_m,a,op,b)=>infixToFunction[op](parseFloat(a),parseFloat(b)));

const highPrecedence = s => { const rx=/([\d.]+)([*\/])([\d.]+)/; const s2=infixEval(s,rx); return s2===s?s:highPrecedence(s2); };

// Функции для формул
const isEven=n=>n%2===0;
const sum=a=>a.reduce((x,y)=>x+y,0);
const average=a=>sum(a)/a.length;
const median=a=>{ const s=a.slice().sort((x,y)=>x-y),m=s.length/2-1; return isEven(s.length)?average([s[m],s[m+1]]):s[Math.ceil(m)]; };
const spreadsheetFunctions = {
    sum, average, median,
    even:a=>a.filter(isEven),
    someeven:a=>a.some(isEven),
    everyeven:a=>a.every(isEven),
    firsttwo:a=>a.slice(0,2),
    lasttwo:a=>a.slice(-2),
    has2:a=>a.includes(2),
    increment:a=>a.map(n=>n+1),
    random:([x,y])=>Math.floor(Math.random()*(y-x+1))+x,
    range:a=>range(...a),
    nodupes:a=>[...new Set(a)],
    "":x=>x
};
const applyFunction=str=>{
    const s1=highPrecedence(str), s2=infixEval(s1,/([\d.]+)([+-])([\d.]+)/);
    return s2.replace(/([a-z0-9]*)\(([0-9., ]*)\)(?!.*\()/i,(m,fn,args)=>{
        const f=spreadsheetFunctions[fn.toLowerCase()]; return f?f(args.split(",").map(parseFloat)):m;
    });
};
const range=(a,b)=>Array(b-a+1).fill(a).map((x,i)=>x+i);
const charRange=(s,e)=>range(s.charCodeAt(0),e.charCodeAt(0)).map(c=>String.fromCharCode(c));

const evalFormula=(expr,cells)=>{
    const getVal=id=>{ const el=cells.find(c=>c.id===id); return el?el.textContent:""; };
    const tmp=expr.replace(/([A-J])([1-9][0-9]?):([A-J])([1-9][0-9]?)/gi,(_,c1,n1,c2,n2)=>
        range(parseInt(n1),parseInt(n2)).flatMap(r=>charRange(c1,c2).map(ch=>getVal(ch+r))).join(",")
    );
    const replaced=tmp.replace(/[A-J][1-9][0-9]?/gi,m=>getVal(m));
    const applied=applyFunction(replaced);
    return applied===expr?applied:evalFormula(applied,cells);
};

// Функция дебонсинга
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Уведомления
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Синхронизация высоты строки
function syncRowHeight(row) {
    const cells = document.querySelectorAll(`div[contenteditable][id$="${row}"]`);
    let maxHeight = 40; // Минимальная высота 40px
    cells.forEach(c => {
        c.style.height = "auto";
        const contentHeight = Math.max(c.scrollHeight, 40); // Учитываем минимальную высоту
        if (contentHeight > maxHeight) {
            maxHeight = contentHeight;
        }
    });
    maxHeight = Math.min(maxHeight, 200); // Ограничиваем максимальную высоту
    cells.forEach(c => {
        c.style.height = `${maxHeight}px`;
        console.log(`Устанавливаем высоту ячейки в строке ${row}: ${maxHeight}px`); // Логирование для отладки
    });
}

// Обработка формул
const evaluateCellFormula = (cell) => {
    if (cell.textContent.startsWith("=")) {
        const cells = Array.from(document.querySelectorAll("div[contenteditable]"));
        try {
            const result = evalFormula(cell.textContent.slice(1), cells);
            cell.textContent = result;
            const editor = document.getElementById('cell-editor');
            editor.value = result;
        } catch (error) {
            console.error(`Ошибка при вычислении формулы в ячейке ${cell.id}:`, error);
            cell.textContent = "#ERROR";
        }
    }
};

// При вводе — автоподбор высоты
const debouncedSync = debounce((row) => {
    syncRowHeight(row);
}, 300);

function onInput(e) {
    const el = e.target;
    const row = el.id.match(/[A-J]([0-9]+)/)[1];
    const editor = document.getElementById('cell-editor');
    editor.value = el.textContent;
    debouncedSync(row);
}

// Управление выделением ячеек
let isSelecting = false;
let startCell = null;
let lastActiveCell = null; // Для сохранения активной ячейки

// Стек для отмены действий
const undoStack = [];
const maxUndoSteps = 50;

// Сохранение текущего состояния изменённых ячеек
function saveState(changedCells = null) {
    if (changedCells) {
        undoStack.push(changedCells.map(c => ({
            id: c.id,
            html: c.innerHTML,
            style: {
                fontFamily: c.style.fontFamily || '',
                fontSize: c.style.fontSize || '',
                fontWeight: c.style.fontWeight || '',
                fontStyle: c.style.fontStyle || '',
                textDecoration: c.style.textDecoration || '',
                textAlign: c.style.textAlign || '',
                backgroundColor: c.style.backgroundColor || ''
            }
        })));
    } else {
        const cells = Array.from(document.querySelectorAll('div[contenteditable]')).map(c => ({
            id: c.id,
            html: c.innerHTML,
            style: {
                fontFamily: c.style.fontFamily || '',
                fontSize: c.style.fontSize || '',
                fontWeight: c.style.fontWeight || '',
                fontStyle: c.style.fontStyle || '',
                textDecoration: c.style.textDecoration || '',
                textAlign: c.style.textAlign || '',
                backgroundColor: c.style.backgroundColor || ''
            }
        }));
        undoStack.push(cells);
    }
    if (undoStack.length > maxUndoSteps) {
        undoStack.shift(); // Удаляем старые состояния
    }
}

// Применение состояния из стека
function undo() {
    if (undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const updatedRows = new Set();
    lastState.forEach(({ id, html, style }) => {
        const cell = document.getElementById(id);
        if (cell) {
            cell.innerHTML = html;
            cell.style.fontFamily = style.fontFamily;
            cell.style.fontSize = style.fontSize;
            cell.style.fontWeight = style.fontWeight;
            cell.style.fontStyle = style.fontStyle;
            cell.style.textDecoration = style.textDecoration;
            cell.style.textAlign = style.textAlign;
            cell.style.backgroundColor = style.backgroundColor;
            const row = id.match(/[A-J]([0-9]+)/)[1];
            updatedRows.add(row);
        }
    });
    updatedRows.forEach(row => syncRowHeight(row));
    showNotification("Action canceled");
}

function clearSelection() {
    document.querySelectorAll('div[contenteditable].selected').forEach(c => c.classList.remove('selected'));
}

function selectRange(startId, endId) {
    clearSelection();
    const startCol = startId.match(/([A-J])[0-9]+/)[1];
    const startRow = parseInt(startId.match(/[A-J]([0-9]+)/)[1]);
    const endCol = endId.match(/([A-J])[0-9]+/)[1];
    const endRow = parseInt(endId.match(/[A-J]([0-9]+)/)[1]);

    const colStart = Math.min(startCol.charCodeAt(0), endCol.charCodeAt(0));
    const colEnd = Math.max(startCol.charCodeAt(0), endCol.charCodeAt(0));
    const rowStart = Math.min(startRow, endRow);
    const rowEnd = Math.max(endRow, startRow);

    for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
            const id = String.fromCharCode(c) + r;
            const cell = document.getElementById(id);
            if (cell) cell.classList.add('selected');
        }
    }
}

function selectRow(row) {
    clearSelection();
    const cells = Array.from(document.querySelectorAll('div[contenteditable]'))
        .filter(c => {
            const rowNum = c.id.match(/[A-J](\d+)/)[1];
            return parseInt(rowNum) === parseInt(row);
        });
    cells.forEach(c => c.classList.add('selected'));
}

function selectColumn(col) {
    clearSelection();
    document.querySelectorAll(`div[contenteditable][id^="${col}"]`).forEach(c => c.classList.add('selected'));
}

// Копирование и вставка
function copySelectedCells() {
    const selected = Array.from(document.querySelectorAll('div[contenteditable].selected'));
    if (!selected.length) return;

    const rows = [];
    const rowSet = new Set();
    const colSet = new Set();
    selected.forEach(c => {
        const row = parseInt(c.id.match(/[A-J]([0-9]+)/)[1]);
        const col = c.id.match(/([A-J])[0-9]+/)[1];
        rowSet.add(row);
        colSet.add(col);
    });

    const rowNums = Array.from(rowSet).sort((a, b) => a - b);
    const colLetters = Array.from(colSet).sort();
    rowNums.forEach(row => {
        const rowData = colLetters.map(col => {
            const cell = document.getElementById(col + row);
            if (!cell) return '';
            let value = cell.textContent;
            value = value.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
            return value;
        });
        rows.push(rowData.join('\t'));
    });

    const text = rows.join('\n');
    navigator.clipboard.writeText(text).then(() => {
        showNotification(selected.length === 1 ? "Ячейка скопирована" : "Ячейки скопированы");
    });
}

function pasteToCells(startCellId, clipboardText) {
    saveState();
    const cells = Array.from(document.querySelectorAll('div[contenteditable]'));
    const startCol = startCellId.match(/([A-J])[0-9]+/)[1];
    const startRow = parseInt(startCellId.match(/[A-J]([0-9]+)/)[1]);
    const startColIndex = startCol.charCodeAt(0) - 'A'.charCodeAt(0);

    if (clipboardText.includes('\n') || clipboardText.includes('\t')) {
        showNotification("Вставленный текст содержит переносы строк или табуляцию, это может повлиять на форматирование");
    }

    if (!clipboardText.includes('\t') && !clipboardText.includes('\n')) {
        const cell = document.getElementById(startCellId);
        if (cell) {
            cell.textContent = clipboardText;
            if (clipboardText.startsWith("=")) {
                cell.textContent = evalFormula(clipboardText.slice(1), cells);
            }
            syncRowHeight(startRow);
        }
        return;
    }

    const rows = [];
    let currentRow = '';
    let i = 0;
    while (i < clipboardText.length) {
        if (clipboardText[i] === '\n' && (i === 0 || clipboardText[i - 1] !== '\\')) {
            rows.push(currentRow);
            currentRow = '';
            i++;
        } else if (clipboardText[i] === '\\' && i + 1 < clipboardText.length && (clipboardText[i + 1] === 'n' || clipboardText[i + 1] === 't')) {
            currentRow += clipboardText[i + 1] === 'n' ? '\n' : '\t';
            i += 2;
        } else {
            currentRow += clipboardText[i];
            i++;
        }
    }
    if (currentRow) rows.push(currentRow);

    const parsedRows = rows.map(row => {
        const cells = [];
        let current = '';
        let j = 0;
        while (j < row.length) {
            if (row[j] === '\t' && (j === 0 || row[j - 1] !== '\\')) {
                cells.push(current);
                current = '';
                j++;
            } else if (row[j] === '\\' && j + 1 < row.length && (row[j + 1] === 'n' || row[j + 1] === 't')) {
                current += row[j + 1] === 'n' ? '\n' : '\t';
                j += 2;
            } else {
                current += row[j];
                j++;
            }
        }
        cells.push(current);
        return cells;
    });

    const maxRows = 99;
    const maxCols = 'J'.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    const updatedRows = new Set();

    parsedRows.forEach((rowData, rowIndex) => {
        if (startRow + rowIndex > maxRows) return;
        rowData.forEach((value, colIndex) => {
            const colIndexTotal = startColIndex + colIndex;
            const colLetter = String.fromCharCode('A'.charCodeAt(0) + colIndexTotal);
            if (colLetter > 'J') return;
            const cellId = colLetter + (startRow + rowIndex);
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.textContent = value;
                updatedRows.add(startRow + rowIndex);
                if (value.startsWith("=")) {
                    cell.textContent = evalFormula(value.slice(1), cells);
                }
            }
        });
    });

    updatedRows.forEach(row => syncRowHeight(row));
}

// Форматирование ячеек
function applyFormatting(property, value, toggle = false) {
    const selectedCells = document.querySelectorAll('div[contenteditable].selected, div[contenteditable].active');
    if (selectedCells.length === 0) return;

    saveState(Array.from(selectedCells));

    const updatedRows = new Set();

    selectedCells.forEach(c => {
        if (property === 'backgroundColor') {
            c.style[property] = value;
        } else if (toggle) {
            if (property === 'textDecoration') {
                c.style[property] = c.style[property] === value ? 'none' : value;
            } else {
                c.style[property] = c.style[property] === value ? 'normal' : value;
            }
        } else {
            c.style[property] = value;
        }
        const row = c.id.match(/[A-J]([0-9]+)/)[1];
        updatedRows.add(row);
    });

    updatedRows.forEach(row => syncRowHeight(row));
}

// Инициализация таблицы
window.onload = () => {
    const container = document.getElementById("container");
    if (!container) {
        console.error("Контейнер #container не найден!");
        return;
    }
    console.log("Инициализация таблицы...");
    // Заголовок: пустая + A-J
    const emptyHeader = createLabel("", "header-cell");
    emptyHeader.addEventListener("click", clearSelection);
    container.appendChild(emptyHeader);
    charRange("A", "J").forEach(l => {
        const header = createLabel(l, "header-cell");
        header.addEventListener("click", () => selectColumn(l));
        container.appendChild(header);
    });
    // Ряды с ячейками
    range(1,99).forEach(r => {
        const rowLabel = createLabel(r, "row-label");
        rowLabel.addEventListener("click", () => selectRow(r));
        container.appendChild(rowLabel);
        charRange("A","J").forEach(c => {
            const d = document.createElement("div");
            d.className = "cell";
            const cell = document.createElement("div");
            cell.contentEditable = true;
            cell.id = c + r;
            console.log(`Создаём ячейку: ${cell.id}`); // Логирование для отладки
            cell.addEventListener("input", (e) => {
                saveState([e.target]);
                onInput(e);
            });
            cell.addEventListener("blur", (e) => {
                evaluateCellFormula(e.target);
                // Сохраняем активную ячейку перед снятием выделения
                lastActiveCell = e.target;
                // Снимаем .active
                e.target.classList.remove('active');
                // Снимаем .selected, если выделена только эта ячейка
                const selectedCells = document.querySelectorAll('div[contenteditable].selected');
                if (selectedCells.length === 1 && selectedCells[0] === e.target) {
                    e.target.classList.remove('selected');
                }
                // Если фокус ушёл на элемент панели инструментов, восстанавливаем выделение
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (activeElement && (activeElement.closest('.formatting') || activeElement.id === 'cell-editor')) {
                        if (lastActiveCell) {
                            lastActiveCell.classList.add('active');
                            lastActiveCell.classList.add('selected');
                        }
                    }
                }, 0);
            });
            cell.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    if (e.shiftKey) {
                        // Shift + Enter: добавляем перенос строки
                        e.preventDefault();
                        const sel = window.getSelection();
                        const range = sel.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode('\n'));
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    } else {
                        // Enter: завершаем редактирование
                        e.preventDefault();
                        e.target.blur();
                    }
                } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    // Извлекаем текущие координаты ячейки
                    const col = e.target.id.match(/([A-J])[0-9]+/)[1];
                    const row = parseInt(e.target.id.match(/[A-J]([0-9]+)/)[1]);
                    let newCol = col;
                    let newRow = row;

                    // Определяем новые координаты в зависимости от стрелки
                    if (e.key === "ArrowUp" && row > 1) {
                        newRow = row - 1;
                    } else if (e.key === "ArrowDown" && row < 99) {
                        newRow = row + 1;
                    } else if (e.key === "ArrowLeft" && col !== "A") {
                        newCol = String.fromCharCode(col.charCodeAt(0) - 1);
                    } else if (e.key === "ArrowRight" && col !== "J") {
                        newCol = String.fromCharCode(col.charCodeAt(0) + 1);
                    }

                    // Если координаты изменились, переходим на новую ячейку
                    if (newCol !== col || newRow !== row) {
                        // Сначала вызываем blur, чтобы применить изменения
                        e.target.blur();
                        // Находим новую ячейку
                        const newCellId = `${newCol}${newRow}`;
                        const newCell = document.getElementById(newCellId);
                        if (newCell) {
                            // Снимаем выделение со всех ячеек
                            clearSelection();
                            // Перемещаем фокус и выделяем новую ячейку
                            newCell.focus();
                            newCell.classList.add('active');
                            newCell.classList.add('selected');
                            // Обновляем строку редактирования
                            const editor = document.getElementById('cell-editor');
                            editor.value = newCell.textContent;
                        }
                    }
                }
            });
            cell.addEventListener("mousedown", (e) => {
                // Всегда снимаем выделение со всех ячеек
                clearSelection();
                isSelecting = true;
                startCell = e.target.id;
                // Выделяем только текущую ячейку
                e.target.classList.add('selected');
                document.querySelectorAll('div[contenteditable].active').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const editor = document.getElementById('cell-editor');
                editor.value = e.target.textContent;
            });
            cell.addEventListener("mousemove", (e) => {
                if (isSelecting && startCell) {
                    selectRange(startCell, e.target.id);
                }
            });
            cell.addEventListener("mouseup", () => {
                isSelecting = false;
            });
            cell.addEventListener("focus", () => {
                document.querySelectorAll('div[contenteditable].active').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                const editor = document.getElementById('cell-editor');
                editor.value = cell.textContent;
            });
            d.appendChild(cell);
            container.appendChild(d);
        });
    });

    // Инициализация высоты строк
    console.log("Инициализация высоты строк...");
    range(1, 99).forEach(row => syncRowHeight(row));

    // Проверка видимости ячеек
    const firstCell = document.getElementById("A1");
    if (firstCell) {
        console.log("Ячейка A1 создана, видимость:", window.getComputedStyle(firstCell).display);
        console.log("Размеры ячейки A1:", firstCell.offsetWidth, "x", firstCell.offsetHeight);
    } else {
        console.error("Ячейка A1 не найдена!");
    }

    // Завершение выделения при отпускании мыши на документе
    document.addEventListener("mouseup", () => {
        isSelecting = false;
    });

    // Обработка копирования и отмены
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            copySelectedCells();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }
    });

    // Обработка вставки
    document.addEventListener("paste", (e) => {
        const activeCell = document.querySelector('div[contenteditable].active');
        if (!activeCell) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        pasteToCells(activeCell.id, text);
        const editor = document.getElementById('cell-editor');
        editor.value = activeCell.textContent;
    });

    // Обработка строки редактирования
    const editor = document.getElementById('cell-editor');
    editor.addEventListener('input', () => {
        const activeCell = document.querySelector('div[contenteditable].active');
        if (activeCell) {
            saveState([activeCell]);
            activeCell.textContent = editor.value;
            const row = activeCell.id.match(/[A-J]([0-9]+)/)[1];
            debouncedSync(row);
        }
    });

    // Обработка форматирования
    document.getElementById('undo').addEventListener('mousedown', (e) => {
        e.preventDefault();
        undo();
    });
    document.getElementById('font-family').addEventListener('change', (e) => {
        e.preventDefault();
        applyFormatting('fontFamily', e.target.value);
    });
    document.getElementById('font-size').addEventListener('change', (e) => {
        e.preventDefault();
        const size = Math.min(Math.max(parseInt(e.target.value), 8), 72);
        applyFormatting('fontSize', `${size}px`);
        e.target.value = size;
    });
    document.getElementById('bold').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('fontWeight', 'bold', true);
    });
    document.getElementById('italic').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('fontStyle', 'italic', true);
    });
    document.getElementById('underline').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('textDecoration', 'underline', true);
    });
    document.getElementById('align-left').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('textAlign', 'left');
    });
    document.getElementById('align-center').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('textAlign', 'center');
    });
    document.getElementById('align-right').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('textAlign', 'right');
    });
    document.getElementById('align-justify').addEventListener('mousedown', (e) => {
        e.preventDefault();
        applyFormatting('textAlign', 'justify');
    });
    document.getElementById('background-color').addEventListener('change', (e) => {
        e.preventDefault();
        applyFormatting('backgroundColor', e.target.value);
        document.getElementById('background-color').style.backgroundColor = e.target.value;
    });
    document.getElementById('fill-color').addEventListener('mousedown', (e) => {
        e.preventDefault();
        const colorSelect = document.getElementById('background-color');
        applyFormatting('backgroundColor', colorSelect.value);
    });
};