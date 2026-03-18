const MAX_ROWS = 8;
const MAX_COLS = 8;

export type TableInsertCallback = (rows: number, cols: number) => void;

export function createTablePicker(
  anchorBtn: HTMLElement,
  onInsert: TableInsertCallback
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "table-picker-wrapper";

  // Move button into wrapper, insert wrapper where button was
  anchorBtn.parentElement!.insertBefore(wrapper, anchorBtn);
  wrapper.appendChild(anchorBtn);

  const picker = document.createElement("div");
  picker.className = "table-picker hidden";

  const grid = document.createElement("div");
  grid.className = "table-picker-grid";

  const label = document.createElement("div");
  label.className = "table-picker-label";
  label.textContent = "テーブル挿入";

  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < MAX_COLS; c++) {
      const cell = document.createElement("div");
      cell.className = "table-picker-cell";
      cell.dataset.row = String(r + 1);
      cell.dataset.col = String(c + 1);

      cell.addEventListener("mouseenter", () => {
        highlightCells(grid, r + 1, c + 1);
        label.textContent = `${r + 1} × ${c + 1}`;
      });

      cell.addEventListener("click", (e) => {
        e.stopPropagation();
        onInsert(r + 1, c + 1);
        picker.classList.add("hidden");
      });

      grid.appendChild(cell);
    }
  }

  picker.appendChild(grid);
  picker.appendChild(label);
  wrapper.appendChild(picker);

  anchorBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    picker.classList.toggle("hidden");
    if (!picker.classList.contains("hidden")) {
      highlightCells(grid, 0, 0);
      label.textContent = "テーブル挿入";
    }
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target as Node)) {
      picker.classList.add("hidden");
    }
  });

  return picker;
}

function highlightCells(grid: HTMLElement, rows: number, cols: number) {
  const cells = grid.querySelectorAll(".table-picker-cell");
  cells.forEach((cell) => {
    const el = cell as HTMLElement;
    const r = parseInt(el.dataset.row!);
    const c = parseInt(el.dataset.col!);
    el.classList.toggle("highlighted", r <= rows && c <= cols);
  });
}
