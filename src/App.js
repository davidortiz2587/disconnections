import React, { useState } from "react";
import "./App.css";
import wordBank from "./word_bank.json";


const ROWS_PER_GAME = 4;
const MAX_MISTAKES = 3;


function shuffle(array) {
 const arr = [...array];
 for (let i = arr.length - 1; i > 0; i--) {
   const j = Math.floor(Math.random() * (i + 1));
   [arr[i], arr[j]] = [arr[j], arr[i]];
 }
 return arr;
}


function buildRows() {
 const allGames = [...wordBank.games];
 const shuffledGames = shuffle(allGames);
 const selected = shuffledGames.slice(0, ROWS_PER_GAME);


 return selected.map((g) => {
   const cards = shuffle([
     { text: g.word1, isImposter: false },
     { text: g.word2, isImposter: false },
     { text: g.word3, isImposter: false },
     { text: g.word4, isImposter: false },
     { text: g.imposter, isImposter: true }
   ]);


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
 const [rows, setRows] = useState(buildRows);
 const [mistakesLeft, setMistakesLeft] = useState(MAX_MISTAKES);
 const [message, setMessage] = useState("");
 const [gameOver, setGameOver] = useState(false);
 const [finishedAllRows, setFinishedAllRows] = useState(false);
 const [currentCategory, setCurrentCategory] = useState(""); // NEW


 const activeRowIndex = rows.findIndex((r) => !r.solved);


 const renderMistakeDots = () => {
   const dots = [];
   for (let i = 0; i < MAX_MISTAKES; i++) {
     dots.push(
       <span key={i} className="mistake-dot">
         {i < mistakesLeft ? "●" : "○"}
       </span>
     );
   }
   return dots;
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


         // UPDATE CATEGORY DISPLAY
         setCurrentCategory(row.category);


         const tempRows = prevRows.map((r, i2) =>
           i2 === rowIndex ? updatedRow : r
         );
         const allSolved = tempRows.every((r) => r.solved);


         if (allSolved) {
           setFinishedAllRows(true);
           setMessage("You found all the imposters!");
           setCurrentCategory(""); // clear category
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
           setMessage("Game over. No mistakes left.");
           setCurrentCategory(""); // clear category
         } else {
           setMessage("Nope. Try a different option in this row.");
         }


         return updatedRow;
       }
     });


     return newRows;
   });
 };


 const handleRestart = () => {
   setRows(buildRows());
   setMistakesLeft(MAX_MISTAKES);
   setMessage("");
   setGameOver(false);
   setFinishedAllRows(false);
   setCurrentCategory(""); // reset category
 };


 return (
   <div className="app-root">
     <main className="game-container">
       <h1 className="game-title">Imposter</h1>
       <div className="subtitle">Find the odd one out in each row.</div>


       {/* CATEGORY BOX (TOP) */}
       {currentCategory && (
         <div style={{
           background: '#f9df6d',
           padding: '1rem',
           borderRadius: '8px',
           marginBottom: '0.5rem',
           textAlign: 'center'
         }}>
           <h2 style={{
             fontSize: '1.1rem',
             fontWeight: '700',
             color: '#000',
             margin: 0,
             textTransform: 'uppercase',
             letterSpacing: '0.05em'
           }}>
             {"Category: " + currentCategory}
           </h2>
         </div>
       )}


       <div className="rows-container">
         {rows.map((row, rowIndex) => {
           const isActive =
             rowIndex === activeRowIndex && !gameOver && !finishedAllRows;
           const isFuture =
             !row.solved && rowIndex > activeRowIndex && !finishedAllRows;


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


       <div className="status">
         <div className="mistake-dots">{renderMistakeDots()}</div>
         <div className="message">{message}</div>
       </div>


       {(gameOver || finishedAllRows) && (
         <button className="secondary-btn" onClick={handleRestart}>
           Play Again
         </button>
       )}
     </main>
   </div>
 );
}


export default App;




