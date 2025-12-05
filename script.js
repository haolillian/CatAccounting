// Cat Island - script.js
(function(){
  // --- Config ---
  const STORAGE_KEYS = {EXPENSES:'cat_island_expenses', PLAYER:'cat_island_player'};
  const BUDGET_KEY = 'cat_island_budget';
  const BASE_EXP = 5;
  const NOTE_BONUS = 2;

  // budget helper
  function loadBudget(){
    try{
      const raw = localStorage.getItem(BUDGET_KEY);
      return raw ? Number(raw) : 1000;
    }catch(e){
      return 1000;
    }
  }
  function saveBudget(val){
    localStorage.setItem(BUDGET_KEY, String(val));
    BUDGET = Number(val);
    if(budgetEl) budgetEl.textContent = BUDGET;
    renderAll();
  }
  let BUDGET = loadBudget(); // 可修改預設預算

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
  if(budgetEl) budgetEl.textContent = BUDGET;
  const budgetInput = el('budget-input');
  const setBudgetBtn = el('set-budget');
  expenses = loadExpenses();
  renderAll();

  // budget events
  if(setBudgetBtn){
    setBudgetBtn.addEventListener('click', ()=>{
      const v = Number(budgetInput.value);
      if(!v || v <= 0){
        return alert('請輸入正確的預算（數字，大於 0）');
      }
      saveBudget(v);
      budgetInput.value = '';
    });
  }

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

    // show small dialogue based on expense amount and mood
    const total = getTotalSpent();
    const mood = determineMood(total, BUDGET);
    const shortMsg = generateDialogueOnExpense(amount, mood, player);
    showDialogue(shortMsg, 3000);

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

  function determineMood(total, budget){
    const b = (typeof budget === 'number' && budget > 0) ? budget : BUDGET;
    if(total / b < 0.5) return {m:'開心', emoji:'😺'};
    if(total / b <= 1) return {m:'普通 / 擔心', emoji:'😿'};
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

    // mood & cat appearance (use editable BUDGET)
    const mood = determineMood(total, BUDGET);
    catMood.textContent = mood.m;
    // choose appearance based on level and mood
    const appearance = getCatAppearance(player, mood);
    // render main cat image
    if(catImage){
      catImage.innerHTML = `<img src="${appearance.img}" alt="cat" />`;
    }
    // render accessory at top
    if(topCat){
      topCat.innerHTML = appearance.accessory ? `<img src="${appearance.accessory}" alt="accessory" />` : '';
    }

    // render list (with edit/delete)
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

        // actions
        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = '編輯';
        editBtn.addEventListener('click', ()=> editExpense(it.id));
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-delete';
        delBtn.textContent = '刪除';
        delBtn.addEventListener('click', ()=> deleteExpense(it.id));
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        right.appendChild(amount);
        right.appendChild(actions);

        li.appendChild(meta);
        li.appendChild(right);
        expenseList.appendChild(li);
      });
    }
  }

  // delete expense
  function deleteExpense(id){
    if(!confirm('確定要刪除此筆支出嗎？')) return;
    expenses = expenses.filter(it => it.id !== id);
    saveExpenses();
    renderAll();
    showDialogue('已刪除支出～', 2000);
  }

  // start inline edit
  function editExpense(id){
    const idx = expenses.findIndex(it=>it.id===id);
    if(idx === -1) return;
    // render list with inputs for this id
    renderListEditing(id);
  }

  function saveEditedExpense(id, newAmount, newCategory, newNote){
    const idx = expenses.findIndex(it=>it.id===id);
    if(idx === -1) return;
    expenses[idx].amount = Number(newAmount);
    expenses[idx].category = newCategory;
    expenses[idx].note = newNote;
    saveExpenses();
    renderAll();
    showDialogue('已更新支出', 1800);
  }

  function cancelEdit(){ renderAll(); }

  function showDialogue(text, duration=2500){
    const cd = document.getElementById('cat-dialogue');
    if(!cd) return;
    cd.textContent = text;
    if(duration>0){
      setTimeout(()=>{ cd.textContent=''; }, duration);
    }
  }

  function generateDialogueOnExpense(amount, mood, player){
    // richer dialogue based on amount and mood/level
    if(amount > 500) return '哇，大筆開銷…我有點擔心喵。';
    if(mood.m === '生氣') return '超過預算了！不要再亂花啦～';
    if(player.level >= 5) return '高級玩家，還是要控制花費喵！';
    return '謝謝主人～我好開心喵！';
  }

  function renderListEditing(editId){
    expenseList.innerHTML = '';
    expenses.forEach(it=>{
      const li = document.createElement('li');
      li.className = 'expense-item';
      if(it.id === editId){
        const meta = document.createElement('div');
        meta.className = 'expense-meta';
        const catSelect = document.createElement('select');
        ['食品','交通','娛樂','其他'].forEach(opt=>{
          const o = document.createElement('option'); o.value = opt; o.textContent = opt; if(opt===it.category) o.selected=true; catSelect.appendChild(o);
        });
        const noteInput = document.createElement('input'); noteInput.className='edit-input'; noteInput.value = it.note;
        meta.appendChild(catSelect);
        meta.appendChild(noteInput);

        const right = document.createElement('div');
        const amtInput = document.createElement('input'); amtInput.className='edit-input'; amtInput.type='number'; amtInput.value = it.amount; amtInput.step='0.01';
        const saveBtn = document.createElement('button'); saveBtn.className='btn-edit'; saveBtn.textContent='儲存';
        saveBtn.addEventListener('click', ()=> saveEditedExpense(it.id, amtInput.value, catSelect.value, noteInput.value));
        const cancelBtn = document.createElement('button'); cancelBtn.className='btn-delete'; cancelBtn.textContent='取消'; cancelBtn.addEventListener('click', cancelEdit);
        right.appendChild(amtInput);
        right.appendChild(saveBtn);
        right.appendChild(cancelBtn);

        li.appendChild(meta);
        li.appendChild(right);
      } else {
        const meta = document.createElement('div'); meta.className='expense-meta';
        const cat = document.createElement('div'); cat.className='expense-cat'; cat.textContent=it.category;
        const note = document.createElement('div'); note.className='expense-note'; note.textContent = it.note || new Date(it.date).toLocaleString();
        meta.appendChild(cat); meta.appendChild(note);
        const right = document.createElement('div'); right.className='expense-right'; const amount = document.createElement('div'); amount.className='expense-amount'; amount.textContent='-'+Number(it.amount).toFixed(2);
        const actions = document.createElement('div'); actions.className='item-actions'; const editBtn = document.createElement('button'); editBtn.className='btn-edit'; editBtn.textContent='編輯'; editBtn.addEventListener('click', ()=> editExpense(it.id)); const delBtn=document.createElement('button'); delBtn.className='btn-delete'; delBtn.textContent='刪除'; delBtn.addEventListener('click', ()=> deleteExpense(it.id)); actions.appendChild(editBtn); actions.appendChild(delBtn);
        right.appendChild(amount); right.appendChild(actions);
        li.appendChild(meta); li.appendChild(right);
      }
      expenseList.appendChild(li);
    });
  }

  // Appearance based on level & mood
  function getCatAppearance(player, mood){
    // choose image by mood and accessory by level
    const assets = 'assets/';
    let img = assets + 'cat_happy.svg';
    if(mood.m === '生氣') img = assets + 'cat_angry.svg';
    if(mood.m === '普通 / 擔心') img = assets + 'cat_worried.svg';

    const lvl = player.level || 1;
    let accessory = '';
    if(lvl >= 8) accessory = assets + 'accessory_sunglasses.svg';
    else if(lvl >=5) accessory = assets + 'accessory_bow.svg';
    else if(lvl >=3) accessory = assets + 'accessory_cap.svg';

    return {img, accessory};
  }

})();
