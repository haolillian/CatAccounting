// Cat Island - script.js
(function(){
  // --- Config ---
  const STORAGE_KEYS = {EXPENSES:'cat_island_expenses', PLAYER:'cat_island_player'};
  const BUDGET = 1000; // 可修改預設預算
  const BASE_EXP = 5;
  const NOTE_BONUS = 2;

  // --- Default player ---
  const defaultPlayer = {
    level:1,
    currentExp:0,
    expToNextLevel:100,
    coins:0
  };

  // --- State ---
  let expenses = [];
  let player = loadPlayer();

  // --- Elements ---
  const el = id => document.getElementById(id);
  const expenseForm = el('expense-form');
  const amountInput = el('amount');
  const categoryInput = el('category');
  const noteInput = el('note');
  const expenseList = el('expense-list');
  const playerLevel = el('player-level');
  const playerCoins = el('player-coins');
  const currentExpEl = el('current-exp');
  const expNextEl = el('exp-next');
  const expFill = el('exp-fill');
  const catImage = el('cat-image');
  const catMood = el('cat-mood');
  const todaySpentEl = el('today-spent');
  const totalSpentEl = el('total-spent');
  const budgetEl = el('budget');
  const levelupMsg = el('levelup-msg');
  const topCat = el('top-cat');
  const clearBtn = el('clear-data');

  // --- Init ---
  budgetEl.textContent = BUDGET;
  expenses = loadExpenses();
  renderAll();

  // --- Events ---
  expenseForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const amount = parseFloat(amountInput.value);
    if(!amount || amount <= 0) return alert('請輸入正確的金額');
    const category = categoryInput.value;
    const note = noteInput.value.trim();
    addExpense({amount, category, note});
    expenseForm.reset();
  });

  clearBtn.addEventListener('click', ()=>{
    if(!confirm('確認要重設所有資料嗎？(localStorage 會被清除)')) return;
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.PLAYER);
    expenses = [];
    player = {...defaultPlayer};
    renderAll();
  });

  // --- Functions ---
  function loadExpenses(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return raw ? JSON.parse(raw) : [];
    }catch(e){return []}
  }

  function saveExpenses(){
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }

  function loadPlayer(){
    try{
      const raw = localStorage.getItem(STORAGE_KEYS.PLAYER);
      return raw ? JSON.parse(raw) : {...defaultPlayer};
    }catch(e){return {...defaultPlayer}}
  }

  function savePlayer(){
    localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(player));
  }

  function addExpense({amount, category, note}){
    const item = {id:Date.now(), amount, category, note, date:new Date().toISOString()};
    expenses.unshift(item);
    saveExpenses();

    // update player
    const expGain = BASE_EXP + (note ? NOTE_BONUS : 0);
    player.currentExp += expGain;
    player.coins += 1;
    // handle level up(s)
    while(player.currentExp >= player.expToNextLevel){
      player.currentExp -= player.expToNextLevel;
      player.level += 1;
      player.expToNextLevel = Math.round(player.expToNextLevel * 1.5);
      showLevelUp();
    }
    savePlayer();

    renderAll();
  }

  function showLevelUp(){
    levelupMsg.textContent = `🎉 貓咪升級了！`;
    setTimeout(()=>{ levelupMsg.textContent = ''; }, 2500);
  }

  function getTotalSpent(){
    return expenses.reduce((s,it)=>s+Number(it.amount),0);
  }

  function getTodaySpent(){
    const today = new Date().toISOString().slice(0,10);
    return expenses.reduce((s,it)=>{ return s + (it.date.slice(0,10)===today ? Number(it.amount) : 0); },0);
  }

  function determineMood(total){
    if(total / BUDGET < 0.5) return {m:'開心', emoji:'😺'};
    if(total / BUDGET <= 1) return {m:'普通 / 擔心', emoji:'😿'};
    return {m:'生氣', emoji:'😾'};
  }

  function renderAll(){
    // player
    playerLevel.textContent = player.level;
    playerCoins.textContent = player.coins;
    currentExpEl.textContent = player.currentExp;
    expNextEl.textContent = player.expToNextLevel;
    const fillPct = Math.min(100, Math.round((player.currentExp / player.expToNextLevel) * 100));
    expFill.style.width = fillPct + '%';

    // spending
    const total = getTotalSpent();
    const today = getTodaySpent();
    totalSpentEl.textContent = total.toFixed(2);
    todaySpentEl.textContent = today.toFixed(2);

    // mood & cat image
    const mood = determineMood(total);
    catMood.textContent = mood.m;
    catImage.textContent = mood.emoji;
    topCat.textContent = mood.emoji;

    // render list
    expenseList.innerHTML = '';
    if(expenses.length === 0){
      const li = document.createElement('li');
      li.textContent = '目前沒有支出，快新增一筆吧～';
      li.style.color = '#888';
      expenseList.appendChild(li);
    }else{
      expenses.forEach(it=>{
        const li = document.createElement('li');
        li.className = 'expense-item';
        const meta = document.createElement('div');
        meta.className = 'expense-meta';
        const cat = document.createElement('div');
        cat.className = 'expense-cat';
        cat.textContent = it.category;
        const note = document.createElement('div');
        note.className = 'expense-note';
        note.textContent = it.note || new Date(it.date).toLocaleString();
        meta.appendChild(cat);
        meta.appendChild(note);

        const right = document.createElement('div');
        right.className = 'expense-right';
        const amount = document.createElement('div');
        amount.className = 'expense-amount';
        amount.textContent = '-' + Number(it.amount).toFixed(2);
        right.appendChild(amount);

        li.appendChild(meta);
        li.appendChild(right);
        expenseList.appendChild(li);
      });
    }
  }

})();
