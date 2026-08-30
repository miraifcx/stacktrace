import React, { useEffect, useRef } from "react";

export function AsciiSpotlightBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initGrid();
    };

    window.addEventListener("resize", handleResize);

    // Grid data structures
    const fontSize = 11;
    const stepX = 14; // Tight horizontal spacing like VS Code's homepage
    const stepY = 16; // Tight vertical spacing

    interface DigitCell {
      baseX: number;
      baseY: number;
      char: string;
      columnIdx: number;
      rowIdx: number;
    }

    interface ColumnData {
      offsetY: number;
      speed: number;
      shiftTimer: number;
      shiftInterval: number;
    }

    let cells: DigitCell[] = [];
    let columns: ColumnData[] = [];
    let colsCount = 0;
    let rowsCount = 0;

    const initGrid = () => {
      cells = [];
      columns = [];

      colsCount = Math.ceil(width / stepX) + 2;
      rowsCount = Math.ceil(height / stepY) + 2;

      // Initialize columns with independent speed and shift timers
      for (let c = 0; c < colsCount; c++) {
        columns.push({
          offsetY: Math.random() * 100,
          speed: 0.15 + Math.random() * 0.45, // Column shifting speed
          shiftTimer: 0,
          shiftInterval: Math.floor(20 + Math.random() * 60), // Frames between digit shift updates
        });
      }

      // Initialize dense binary grid
      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < colsCount; c++) {
          const isSpace = Math.random() < 0.12;
          const char = isSpace ? " " : Math.random() < 0.5 ? "0" : "1";

          cells.push({
            baseX: c * stepX,
            baseY: r * stepY,
            char,
            columnIdx: c,
            rowIdx: r,
          });
        }
      }
    };

    initGrid();

    let frameCount = 0;

    const render = () => {
      frameCount++;

      // Check theme
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#08080a" : "#f4f4f7";
      ctx.fillRect(0, 0, width, height);

      // Column shift logic & random digit flips ("alive")
      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        col.offsetY += col.speed;
        if (col.offsetY >= stepY) {
          col.offsetY %= stepY;
        }

        col.shiftTimer++;
        if (col.shiftTimer >= col.shiftInterval) {
          col.shiftTimer = 0;
          // Shift digits in column occasionally
          const randRow = Math.floor(Math.random() * rowsCount);
          const cellIdx = randRow * colsCount + c;
          if (cells[cellIdx] && cells[cellIdx].char !== " ") {
            cells[cellIdx].char = cells[cellIdx].char === "0" ? "1" : "0";
          }
        }
      }

      // Sporadic global digit flips for live matrix feel
      if (frameCount % 3 === 0) {
        const flipIdx = Math.floor(Math.random() * cells.length);
        if (cells[flipIdx] && cells[flipIdx].char !== " ") {
          cells[flipIdx].char = Math.random() < 0.5 ? "0" : "1";
        }
      }

      ctx.font = `${fontSize}px UiMonospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = isDark ? "rgba(161, 161, 170, 0.16)" : "rgba(100, 116, 139, 0.22)";

      // Render binary grid cells
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.char === " ") continue;

        const col = columns[cell.columnIdx];
        const currentY = cell.baseY + (col ? col.offsetY : 0);

        ctx.fillText(cell.char, cell.baseX, currentY);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
