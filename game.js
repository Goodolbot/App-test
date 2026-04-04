'use strict';

const IMAGES = [
  // Ritratto ufficiale 2017
  'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
  // Ritratto ufficiale 2025 (headshot)
  'https://upload.wikimedia.org/wikipedia/commons/f/f7/Donald_Trump_official_portrait,_2025_(headshot).jpg',
  // Ritratto ufficiale 2025 (completo)
  'https://upload.wikimedia.org/wikipedia/commons/1/19/January_2025_Official_Presidential_Portrait_of_Donald_J._Trump.jpg',
  // Gage Skidmore – Phoenix 2016
  'https://upload.wikimedia.org/wikipedia/commons/a/ae/Donald_Trump_(29347022846).jpg',
  // Arrivo a Davos 2018
  'https://upload.wikimedia.org/wikipedia/commons/b/be/President_Trump_Arrives_in_Davos_(28111267609).jpg',
  // Ritratto 2017 (cropped)
  'https://upload.wikimedia.org/wikipedia/commons/5/53/Donald_Trump_official_portrait_(cropped).jpg',
  // CPAC 2017
  'https://upload.wikimedia.org/wikipedia/commons/a/ad/President_Trump_at_CPAC_2017_February_24,_2017_(cropped).jpg',
  // Firma Tax Cuts 2017
  'https://upload.wikimedia.org/wikipedia/commons/3/36/Donald_Trump_signs_the_Tax_Cuts_and_Jobs_Act_of_2017_DSC_2269.jpg',
];

// State
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matchedPairs = 0;
let timerInterval = null;
let seconds = 0;
let gameStarted = false;

// DOM
const grid = document.getElementById('grid');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const pairsEl = document.getElementById('pairs');
const overlay = document.getElementById('overlay');
const winMovesEl = document.getElementById('win-moves');
const winTimeEl = document.getElementById('win-time');

document.getElementById('newGameBtn').addEventListener('click', startGame);
document.getElementById('winNewGameBtn').addEventListener('click', () => {
  overlay.classList.remove('visible');
  startGame();
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function startTimer() {
  clearInterval(timerInterval);
  seconds = 0;
  timerEl.textContent = '0:00';
  timerInterval = setInterval(() => {
    seconds++;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}

function resetState() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  moves = 0;
  matchedPairs = 0;
  gameStarted = false;
  movesEl.textContent = '0';
  pairsEl.textContent = '0/8';
  clearInterval(timerInterval);
  timerEl.textContent = '0:00';
}

function createCard(imgSrc) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.img = imgSrc;

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-back"></div>
      <div class="card-front">
        <img src="${imgSrc}" alt="Trump" loading="eager">
      </div>
    </div>
  `;

  card.addEventListener('click', onCardClick);
  return card;
}

function onCardClick(e) {
  const card = e.currentTarget;

  if (lockBoard) return;
  if (card === firstCard) return;
  if (card.classList.contains('matched')) return;

  // Start timer on first click
  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  card.classList.add('flipped');

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard = true;

  moves++;
  movesEl.textContent = moves;

  checkMatch();
}

function checkMatch() {
  const isMatch = firstCard.dataset.img === secondCard.dataset.img;

  if (isMatch) {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    matchedPairs++;
    pairsEl.textContent = `${matchedPairs}/8`;
    resetSelection();
    if (matchedPairs === 8) {
      setTimeout(showWin, 500);
    }
  } else {
    firstCard.classList.add('wrong');
    secondCard.classList.add('wrong');
    setTimeout(() => {
      firstCard.classList.remove('flipped', 'wrong');
      secondCard.classList.remove('flipped', 'wrong');
      resetSelection();
    }, 1000);
  }
}

function resetSelection() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function showWin() {
  clearInterval(timerInterval);
  winMovesEl.textContent = `${moves} mosse`;
  winTimeEl.textContent = `Tempo: ${formatTime(seconds)}`;
  overlay.classList.add('visible');
}

function startGame() {
  resetState();
  grid.innerHTML = '';

  const deck = shuffle([...IMAGES, ...IMAGES]);
  deck.forEach(img => grid.appendChild(createCard(img)));
}

// Start on load
startGame();
