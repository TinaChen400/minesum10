import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import MineSum10Board from "../components/MineSum10Board";
import styles from "./MineSum10Page.module.css";

const BOARD_SIZE = 9;
const CENTER_INDEX = Math.floor(BOARD_SIZE / 2);
const cellKey = (r, c) => `${r}-${c}`;

const createCell = (r, c, state = "covered") => ({
  id: `${r}-${c}`,
  r,
  c,
  value: state === "void" ? null : Math.floor(Math.random() * 9) + 1,
  state,
});

const getCenterRingCoords = () => {
  const coords = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      coords.push({ r: CENTER_INDEX + dr, c: CENTER_INDEX + dc });
    }
  }
  return coords;
};

const INITIAL_CENTER_RING_SET = new Set(
  getCenterRingCoords().map((cell) => cellKey(cell.r, cell.c))
);

const createBoard = () =>
  Array.from({ length: BOARD_SIZE }, (_, r) =>
    Array.from({ length: BOARD_SIZE }, (_, c) => {
      const key = cellKey(r, c);
      let state = "covered";
      if (r === CENTER_INDEX && c === CENTER_INDEX) {
        state = "void";
      } else if (INITIAL_CENTER_RING_SET.has(key)) {
        state = "revealed";
      }
      return createCell(r, c, state);
    })
  );

const revertSelecting = (board) =>
  board.map((row) =>
    row.map((cell) =>
      cell.state === "selecting" ? { ...cell, state: "revealed" } : cell
    )
  );

const markCellsState = (board, cells, nextState) => {
  if (!cells.length) {
    return board;
  }
  const keys = new Set(cells.map((cell) => cellKey(cell.r, cell.c)));
  return board.map((row) =>
    row.map((cell) => {
      const shouldUpdate = keys.has(cellKey(cell.r, cell.c));
      if (!shouldUpdate) {
        return cell;
      }
      if (cell.state === nextState) {
        return cell;
      }
      return { ...cell, state: nextState };
    })
  );
};

const inBounds = (r, c) => r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE;

const uniqueCells = (cells) => {
  const seen = new Set();
  return cells.filter((cell) => {
    const key = cellKey(cell.r, cell.c);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const crossCells = (pivot) => {
  const offsets = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  return offsets
    .map(([dr, dc]) => ({ r: pivot.r + dr, c: pivot.c + dc }))
    .filter((cell) => inBounds(cell.r, cell.c));
};

const squareCells = (pivot) => {
  const result = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const r = pivot.r + dr;
      const c = pivot.c + dc;
      if (inBounds(r, c)) {
        result.push({ r, c });
      }
    }
  }
  return result;
};

const applyExplosionClear = (board, selection) => {
  if (!selection.length) {
    return board;
  }
  const pathLength = selection.length;
  const pivot = selection[selection.length - 1];
  let bonus = [];
  if (pathLength >= 5) {
    bonus = squareCells(pivot);
  } else if (pathLength >= 3) {
    bonus = crossCells(pivot);
  }
  const targets = uniqueCells([...selection, ...bonus]);
  const keys = new Set(targets.map((cell) => cellKey(cell.r, cell.c)));

  return board.map((row) =>
    row.map((cell) => {
      if (keys.has(cellKey(cell.r, cell.c))) {
        if (cell.state === "cleared") {
          return cell;
        }
        return { ...cell, state: "cleared" };
      }
      return cell;
    })
  );
};

const revealCoveredCells = (board, targets) => {
  if (!targets.length) {
    return board;
  }
  const keys = new Set(targets.map((cell) => cellKey(cell.r, cell.c)));
  return board.map((row) =>
    row.map((cell) => {
      if (keys.has(cellKey(cell.r, cell.c)) && cell.state === "covered") {
        return { ...cell, state: "revealed" };
      }
      return cell;
    })
  );
};

const getRevealTargets = (pathLength, pivot) => {
  if (!pivot) {
    return [];
  }
  if (pathLength >= 5) {
    return squareCells(pivot);
  }
  return crossCells(pivot);
};

const hasPlayablePairs = (board) => {
  const neededCounts = new Map();
  for (const row of board) {
    for (const cell of row) {
      if (cell.state !== "revealed") {
        continue;
      }
      const complement = 10 - cell.value;
      if (neededCounts.get(cell.value)) {
        return true;
      }
      neededCounts.set(complement, (neededCounts.get(complement) || 0) + 1);
    }
  }
  return false;
};

const MineSum10Page = () => {
  const [board, setBoard] = useState(() => createBoard());
  const [selection, setSelection] = useState([]);
  const [currentSum, setCurrentSum] = useState(0);
  const [sumExpression, setSumExpression] = useState("--");
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState("playing");
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const successTimeoutRef = useRef(null);
  const startCellRef = useRef(null);

  const boardLocked = status === "failed" || status === "completed" || isResolving;
  const totalPlayableCells = BOARD_SIZE * BOARD_SIZE - 1;
  const openedCount = useMemo(
    () =>
      board
        .flat()
        .filter((cell) => cell.state !== "covered" && cell.state !== "void")
        .length,
    [board]
  );
  const openedPercent = Math.floor((openedCount / totalPlayableCells) * 100);
  const defeatMessage = `You have defeated ${openedPercent}% of users.`;
  const hasPairsAvailable = useMemo(() => hasPlayablePairs(board), [board]);

  const clearSuccessTimeout = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearSuccessTimeout();
  }, [clearSuccessTimeout]);

  useEffect(() => {
    if (
      !isPointerActive &&
      !isResolving &&
      status === "playing" &&
      !hasPairsAvailable
    ) {
      setStatus("completed");
    }
  }, [hasPairsAvailable, isPointerActive, isResolving, status]);

  const resetSelectionState = useCallback(() => {
    startCellRef.current = null;
    setBoard((prev) => revertSelecting(prev));
    setSelection([]);
    setCurrentSum(0);
    setSumExpression("--");
  }, []);

  const handleMistake = useCallback(() => {
    setMistakes((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setStatus("failed");
      }
      return next;
    });
  }, []);

  const handleCellPointerDown = useCallback(
    (cell) => {
      if (boardLocked || cell.state !== "revealed") {
        return;
      }
      clearSuccessTimeout();
      setBoard((prev) => revertSelecting(prev));
      const entry = { r: cell.r, c: cell.c, value: cell.value };
      setSelection([entry]);
      setCurrentSum(0);
      setSumExpression("--");
      setBoard((prev) => markCellsState(prev, [entry], "selecting"));
      setIsPointerActive(true);
      startCellRef.current = entry;
    },
    [boardLocked, clearSuccessTimeout]
  );

  const resolveSuccess = useCallback(
    (path) => {
      setIsResolving(true);
      setBoard((prev) => markCellsState(prev, path, "success"));
      successTimeoutRef.current = setTimeout(() => {
        setBoard((prev) => {
          const clearedBoard = applyExplosionClear(prev, path);
          const pivot = path[path.length - 1];
          const revealTargets = getRevealTargets(path.length, pivot);
          return revealCoveredCells(clearedBoard, revealTargets);
        });
        setSelection([]);
        setCurrentSum(0);
        setIsResolving(false);
      }, 120);
    },
    []
  );

  const handlePointerUp = useCallback(
    (endCell) => {
      if (!isPointerActive) {
        return;
      }
      setIsPointerActive(false);
      const start = startCellRef.current;
      startCellRef.current = null;
      if (!start) {
        setCurrentSum(0);
        return;
      }

      if (
        !endCell ||
        endCell.state !== "revealed" ||
        (endCell.r === start.r && endCell.c === start.c)
      ) {
        resetSelectionState();
        return;
      }

      const endEntry = { r: endCell.r, c: endCell.c, value: endCell.value };
      const path = [start, endEntry];
      setBoard((prev) => markCellsState(prev, [endEntry], "selecting"));
      setSelection(path);
      const newSum = start.value + endEntry.value;
      setCurrentSum(newSum);
      setSumExpression(`${start.value} + ${endCell.value} = ${newSum}`);

      if (newSum === 10) {
        resolveSuccess(path);
      } else {
        setBoard((prev) => markCellsState(prev, path, "revealed"));
        setSelection([]);
        setCurrentSum(0);
        handleMistake();
      }
    },
    [handleMistake, isPointerActive, resetSelectionState, resolveSuccess]
  );

  const handleRestart = useCallback(() => {
    clearSuccessTimeout();
    startCellRef.current = null;
    setBoard(createBoard());
    setSelection([]);
    setCurrentSum(0);
    setSumExpression("--");
    setMistakes(0);
    setStatus("playing");
    setIsPointerActive(false);
    setIsResolving(false);
  }, [clearSuccessTimeout]);

  const sumHighlight = selection.length === 2 && currentSum === 10;

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={`${styles.sum} ${sumHighlight ? styles.sumSuccess : ""}`}>
            {`SUM: ${sumExpression}`}
            {sumHighlight ? " \u2713" : ""}
          </div>
          <div className={styles.openedBlock}>
            <div className={styles.openedLabel}>{`Opened: ${openedCount}/${totalPlayableCells}`}</div>
          </div>
        </header>
        {status === "completed" && (
          <div className={styles.defeatMessage}>{defeatMessage}</div>
        )}

        <MineSum10Board
          board={board}
          disabled={boardLocked}
          onCellPointerDown={handleCellPointerDown}
          onPointerUp={handlePointerUp}
        />

        <div className={styles.footer}>
          <button type="button" className={styles.restartButton} onClick={handleRestart}>
            Restart
          </button>
        </div>
      </div>

      {status === "failed" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>System Overload</h2>
            <p>You exploded. Restart to try again.</p>
            <button type="button" onClick={handleRestart} className={styles.restartButton}>
              Restart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MineSum10Page;
