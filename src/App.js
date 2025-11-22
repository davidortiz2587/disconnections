import React, { useState } from "react";
import "./App.css";
import wordBank from "./word_bank.json";
import Popup from "./Popup";

const ROWS_PER_GAME = 4;
const MAX_MISTAKES = 3;

/**
 * Simple seeded RNG (Mulberry32)
 */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle with a provided RNG function.
 */
function shuffleWithRng(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get "today" in America/New_York and compute a game number + seed.
 * Game #1 = launch day (set below). Each day after increments by 1.
 */
function getGameInfo() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year").value);
  const month = Number(parts.find((p) => p.type === "month").value);
  const day = Number(parts.find((p) => p.type === "day").value);

  const estToday = new Date(year, month - 1, day);

  // Launch date = Game #1 (month is 0-based, so 10 = November)
  const launchDate = new Date(2025, 10, 21);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((estToday - launchDate) / oneDayMs);

  const baseGameNumber = 1;
  const gameNumber = baseGameNumber + Math.max(diffDays, 0);
  const seed = gameNumber;

  return { gameNumber, seed };
}

function buildRows(seed) {
  const rng = mulberry32(seed);

  const allGames = [...wordBank.games];
  const shuffledGames = shuffleWithRng(allGames, rng);
  const selected = shuffledGames.slice(0, ROWS_PER_GAME);

  return selected.map((g) => {
    const cards = shuffleWithRng(
      [
        { text: g.word1, isImposter: false },
        { text: g.word2, isImposter: false },
        { text: g.word3, isImposter: false },
        { text: g.word4, isImposter: false },
        { text: g.imposter, isImposter: true }
      ],
      rng
    );

    return {
      category: g.category,
      cards,
      solved: false,
      selectedIndex: null,
      wrongIndices: []
    };
  });
}

function App() {
  const { gameNumber, seed } = getGameInfo();

  const [rows, setRows] = useState(() => buildRows(seed));
  const [mistakesLeft, setMistakesLeft] = useState(MAX_MISTAKES);
  const [message, setMessage] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [finishedAllRows, setFinishedAllRows] = useState(false);
  const [currentCategory, setCurrentCategory] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupDetails, setPopupDetails] = useState("");

  const [showMenu, setShowMenu] = useState(false);

  const activeRowIndex = rows.findIndex((r) => !r.solved);

  // Hearts for lives
  const renderLives = () => {
    const hearts = [];
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const full = i < mistakesLeft;
      hearts.push(
        <span
          key={i}
          className={`life-icon ${full ? "life-full" : "life-empty"}`}
        >
          {full ? "♥" : "♡"}
        </span>
      );
    }
    return hearts;
  };

  const handleCardClick = (rowIndex, cardIndex) => {
    if (gameOver || finishedAllRows) return;
    if (rowIndex !== activeRowIndex) return;

    setRows((prevRows) => {
      const newRows = prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row;

        const card = row.cards[cardIndex];

        if (row.selectedIndex !== null || row.wrongIndices.includes(cardIndex)) {
          return row;
        }

        if (card.isImposter) {
          const updatedRow = {
            ...row,
            solved: true,
            selectedIndex: cardIndex
          };

          setCurrentCategory(row.category);

          const tempRows = prevRows.map((r, i2) =>
            i2 === rowIndex ? updatedRow : r
          );
          const allSolved = tempRows.every((r) => r.solved);

          if (allSolved) {
            setFinishedAllRows(true);

            const totalClicks = tempRows.reduce(
              (acc, r) => acc + 1 + r.wrongIndices.length,
              0
            );

            let details = `It took you ${totalClicks} clicks.`;
            if (totalClicks === ROWS_PER_GAME) {
              details += "\nPerfect Game!";
            }

            setPopupMessage("You found all the imposters!");
            setPopupDetails(details);
            setShowPopup(true);
            setCurrentCategory("");
          } else {
            setMessage("Nice! Move on to the next row.");
          }

          return updatedRow;
        } else {
          const updatedWrongIndices = [...row.wrongIndices, cardIndex];
          const updatedRow = {
            ...row,
            wrongIndices: updatedWrongIndices
          };

          const newMistakes = mistakesLeft - 1;
          setMistakesLeft(newMistakes);

          if (newMistakes <= 0) {
            setGameOver(true);

            const correctRows = prevRows.filter((r) => r.solved).length;
            const lostCategory = row.category;

            setPopupMessage("Game over");
            setPopupDetails(
              `You got ${correctRows} rows correct.\nThe category was: ${lostCategory}`
            );

            setShowPopup(true);
            setCurrentCategory("");
          } else {
            setMessage("Nope. Try a different option in this row.");
          }

          return updatedRow;
        }
      });

      return newRows;
    });
  };

  const handleShowInstructions = () => {
    setShowMenu(false);

    const instructions = `Disconnections is a word game. Each row hides a category (like "Things you can roast" or "Types of vehicles") and shows five words.

Your job: tap the one word that DOESN'T belong in that hidden category – the imposter.

Example row:
Dog • Cat • Car • Horse • Bird

The secret category is "Animals", so "Car" is the imposter.

You only get ${MAX_MISTAKES} lives. Each wrong guess costs one heart. When you run out of lives, the game ends.`;

    setPopupMessage("How to play");
    setPopupDetails(instructions);
    setShowPopup(true);
  };

  const handleShowAbout = () => {
    setShowMenu(false);

    const about = `Disconnections is a simple "odd one out" guessing game inspired by daily word and logic games.

Each day at midnight (US Eastern Time), a new set of rows and categories appears. Game #1 is the first day, and the number increases by 1 each day.`;

    setPopupMessage("About Disconnections");
    setPopupDetails(about);
    setShowPopup(true);
  };

  return (
    <div className="app-root">
      <main className="game-container">
        <div className="content-wrap">
          {/* HEADER: title + menu + subtitle */}
          <header className="header">
            <div className="header-top">
              <h1 className="game-title">Disconnections</h1>

              <button
                className="menu-button"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label="Game menu"
              >
                ⋮
              </button>

              {showMenu && (
                <div className="dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={handleShowInstructions}
                  >
                    <span className="dropdown-icon">?</span>
                    <span className="dropdown-label">How to play</span>
                  </button>
                  <button className="dropdown-item" onClick={handleShowAbout}>
                    <span className="dropdown-icon">i</span>
                    <span className="dropdown-label">About</span>
                  </button>
                </div>
              )}
            </div>

            <div className="subtitle">
              Find the odd one out in each row.
            </div>
          </header>

          {/* BOARD: category banner + rows */}
          <div className="board">
            {currentCategory && (
              <div className="category-banner" key={currentCategory}>
                <h2 className="category-banner-title">
                  {"Category: " + currentCategory}
                </h2>
              </div>
            )}

            <div className="rows-container">
              {rows.map((row, rowIndex) => {
                const isActive =
                  rowIndex === activeRowIndex &&
                  !gameOver &&
                  !finishedAllRows;
                const isFuture =
                  !row.solved &&
                  rowIndex > activeRowIndex &&
                  !finishedAllRows;

                return (
                  <section key={rowIndex} className="row-block">
                    <div className="cards-row">
                      {row.cards.map((card, cardIndex) => {
                        const isSelected = row.selectedIndex === cardIndex;
                        const isWrong = row.wrongIndices.includes(cardIndex);

                        const disabled =
                          gameOver ||
                          finishedAllRows ||
                          row.solved ||
                          !isActive;

                        const showText = !isFuture;

                        let cardClass = "card";
                        if (isSelected) cardClass += " correct";
                        else if (isWrong) cardClass += " wrong";
                        if (disabled) cardClass += " disabled";
                        if (isFuture) cardClass += " future";

                        return (
                          <button
                            key={cardIndex}
                            className={cardClass}
                            onClick={() => handleCardClick(rowIndex, cardIndex)}
                          >
                            {showText ? card.text : ""}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* FOOTER ROW: Game #  |  Message  |  Lives */}
          <footer className="footer-bar">
            <div className="game-number">Game #{gameNumber}</div>

            <div className="footer-message">{message}</div>

            <div className="lives-row">
              <span className="lives-label">Lives:</span>
              {renderLives()}
            </div>
          </footer>
        </div>
      </main>

      {showPopup && (
        <Popup
          message={popupMessage}
          details={popupDetails}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

export default App;
