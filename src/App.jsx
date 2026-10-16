import { useState, useEffect } from 'react';
import './App.css';

// Segédfüggvény a HTML entitások (pl. &quot;) dekódolására, amit az API ad vissza
const decodeHTML = (html) => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

function App() {
  // Az alkalmazás állapotai
  const [gameState, setGameState] = useState('setup'); // setup, playing, gameOver, leaderboard
  const [difficulty, setDifficulty] = useState('easy');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  // Ranglista betöltése a böngésző memóriájából induláskor
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('triviaLeaderboard')) || [];
    setLeaderboard(saved);
  }, []);

  // A 10 másodperces időzítő logikája
  useEffect(() => {
    if (gameState !== 'playing' || selectedAnswer) return;
    
    if (timeLeft === 0) {
      handleAnswer(null); // Lejárt az idő = helytelen válasz
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, selectedAnswer]);

  // Játék indítása és API lekérés
  const startGame = async () => {
    setGameState('loading');
    try {
      const res = await fetch(`https://opentdb.com/api.php?amount=5&difficulty=${difficulty}&type=multiple`);
      const data = await res.json();
      
      // Válaszok összekeverése, hogy a helyes válasz ne mindig ugyanott legyen
      const formattedQuestions = data.results.map((q) => {
        const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
        return { ...q, answers };
      });
      
      setQuestions(formattedQuestions);
      setCurrentIndex(0);
      setScore(0);
      setTimeLeft(10);
      setSelectedAnswer(null);
      setGameState('playing');
    } catch (error) {
      console.error("Hiba a kérdések letöltésekor", error);
      setGameState('setup');
    }
  };

  // Válasz gomb megnyomása
  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === questions[currentIndex].correct_answer;
    if (isCorrect) setScore((prev) => prev + 1);

    // 2 másodperc szünet, hogy a játékos láthassa a zöld/piros színt
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setTimeLeft(10);
      } else {
        setGameState('gameOver');
      }
    }, 2000);
  };

  // Eredmény mentése
  const saveScore = () => {
    if (!playerName.trim()) return;
    const newEntry = { name: playerName, score, total: questions.length };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score) // Csökkenő sorrendbe rendezés
      .slice(0, 5); // Csak a Top 5-öt tartjuk meg
    
    setLeaderboard(updated);
    localStorage.setItem('triviaLeaderboard', JSON.stringify(updated));
    setGameState('leaderboard');
  };

  // Vizuális logika a gombok színezéséhez (zöld ha jó, piros ha rossz)
  const getButtonClass = (answer) => {
    if (!selectedAnswer) return 'btn-answer';
    const isCorrect = answer === questions[currentIndex].correct_answer;
    if (isCorrect) return 'btn-answer correct';
    if (answer === selectedAnswer && !isCorrect) return 'btn-answer wrong';
    return 'btn-answer disabled';
  };

  // UI (Felhasználói felület) renderelése
  return (
    <div className="container fade-in">
      <h1>🎮 Trivia Battle</h1>

      {gameState === 'setup' && (
        <div className="card">
          <h2>Válassz nehézséget!</h2>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Könnyű (Easy)</option>
            <option value="medium">Közepes (Medium)</option>
            <option value="hard">Nehéz (Hard)</option>
          </select>
          <button onClick={startGame} className="btn-primary">Játék Indítása</button>
          <button onClick={() => setGameState('leaderboard')} className="btn-secondary">Ranglista</button>
        </div>
      )}

      {gameState === 'loading' && <p>Kérdések betöltése...</p>}

      {gameState === 'playing' && questions.length > 0 && (
        <div className="card">
          <div className="header-info">
            <span>Kérdés: {currentIndex + 1} / {questions.length}</span>
            <span>Pont: {score}</span>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
          </div>
          <p className="timer">Hátralévő idő: {timeLeft}s</p>

          <h2 className="question">{decodeHTML(questions[currentIndex].question)}</h2>
          
          <div className="answers-grid">
            {questions[currentIndex].answers.map((ans, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(ans)}
                className={getButtonClass(ans)}
                disabled={selectedAnswer !== null}
              >
                {decodeHTML(ans)}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="card fade-in">
          <h2>Játék Vége!</h2>
          <p>Eredményed: <strong>{score} / {questions.length}</strong> helyes válasz.</p>
          <input
            type="text"
            placeholder="Írd be a neved..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <button onClick={saveScore} className="btn-primary">Mentés és Ranglista</button>
          <button onClick={() => setGameState('setup')} className="btn-secondary">Új játék</button>
        </div>
      )}

      {gameState === 'leaderboard' && (
        <div className="card fade-in">
          <h2>🏆 Top 5 Ranglista</h2>
          {leaderboard.length === 0 ? (
            <p>Még nincs elmentett eredmény.</p>
          ) : (
            <ul className="leaderboard-list">
              {leaderboard.map((entry, i) => (
                <li key={i}>
                  <strong>{entry.name}</strong> - {entry.score}/{entry.total}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setGameState('setup')} className="btn-primary">Vissza a főmenübe</button>
        </div>
      )}
    </div>
  );
}

export default App;