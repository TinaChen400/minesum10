import React, { useMemo, useRef } from "react";
import styles from "./MineSum10Board.module.css";

const MineSum10Board = ({
  board,
  disabled,
  onCellPointerDown,
  onPointerUp,
}) => {
  const boardRef = useRef(null);
  const pointerActiveRef = useRef(false);

  const cellLookup = useMemo(() => {
    const map = new Map();
    board.forEach((row) => {
      row.forEach((cell) => {
        map.set(cell.id, cell);
      });
    });
    return map;
  }, [board]);

  const resolveCellIdFromNode = (node) => {
    let el = node;
    while (el && el !== boardRef.current) {
      if (el.dataset && el.dataset.cellId) {
        return el.dataset.cellId;
      }
      el = el.parentElement;
    }
    return null;
  };

  const getCellFromEvent = (event) => {
    const hovered =
      typeof document !== "undefined"
        ? document.elementFromPoint(event.clientX, event.clientY)
        : event.target;
    const cellId = resolveCellIdFromNode(hovered);
    return cellId ? cellLookup.get(cellId) : null;
  };

  const resetPointerState = () => {
    pointerActiveRef.current = false;
  };

  const handlePointerDown = (cell) => (event) => {
    if (
      disabled ||
      cell.state === "cleared" ||
      cell.state === "covered" ||
      cell.state === "void"
    ) {
      return;
    }
    event.preventDefault();
    pointerActiveRef.current = true;
    if (onCellPointerDown) {
      onCellPointerDown(cell, event);
    }
  };

  const handlePointerUp = (event) => {
    if (disabled) {
      return;
    }
    const endCell = pointerActiveRef.current ? getCellFromEvent(event) : null;
    if (onPointerUp) {
      onPointerUp(endCell, event);
    }
    resetPointerState();
    if (
      boardRef.current &&
      boardRef.current.hasPointerCapture &&
      boardRef.current.hasPointerCapture(event.pointerId)
    ) {
      boardRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerCancel = (event) => {
    resetPointerState();
    if (onPointerUp) {
      onPointerUp(null, event);
    }
  };

  const handleGridPointerDownCapture = (event) => {
    if (disabled) {
      return;
    }
    if (boardRef.current && boardRef.current.setPointerCapture) {
      boardRef.current.setPointerCapture(event.pointerId);
    }
  };

  const getCellNumberClass = (value) => {
    const key = `n${value}`;
    return styles[key] || "";
  };

  const getCellClasses = (cell) => {
    const classes = [styles.cell];
    if (cell.state && styles[cell.state]) {
      classes.push(styles[cell.state]);
    }
    if (cell.state !== "cleared" && cell.state !== "covered") {
      classes.push(getCellNumberClass(cell.value));
    }
    return classes.join(" ");
  };

  const renderCellContent = (cell) => {
    if (
      cell.state === "cleared" ||
      cell.state === "covered" ||
      cell.state === "void"
    ) {
      return "";
    }
    return cell.value;
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.grid} ${disabled ? styles.disabled : ""}`}
        ref={boardRef}
        onPointerDownCapture={handleGridPointerDownCapture}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {board.map((row) =>
          row.map((cell) => (
            <div
              key={cell.id}
              data-cell-id={cell.id}
              className={getCellClasses(cell)}
              onPointerDown={handlePointerDown(cell)}
            >
              <span className={styles.value}>{renderCellContent(cell)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MineSum10Board;
