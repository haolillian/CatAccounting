// Cat Island - script.js
(function(){
  // --- Config ---
  const STORAGE_KEYS = {EXPENSES:'cat_island_expenses', PLAYER:'cat_island_player'};
  const OWNED_KEY = 'cat_island_owned_breeds';
  const CURRENT_BREED_KEY = 'cat_island_current_breed';
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

  // --- Breeds & Shop ---
  // default breeds (id, display name, price in coins)
  const BREEDS = [
    {id:'sphynx', name:'無毛貓', price:0},
    {id:'persian', name:'波斯貓', price:15},
    {id:'ragdoll', name:'布偶貓', price:20},
    {id:'siamese', name:'暹羅貓', price:10},
    {id:'mainecoon', name:'緬因貓', price:30},
    {id:'british', name:'英短', price:25}
  ];

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
  const dateInput = el('date-input');
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
  const shopListEl = el('shop-list');
  const monthInput = el('month-input');
  const pieCanvas = document.getElementById('pie-chart');
  const monthlyTotalEl = el('monthly-total');

  // --- Init ---
  if(budgetEl) budgetEl.textContent = BUDGET;
  const budgetInput = el('budget-input');
  const setBudgetBtn = el('set-budget');
  expenses = loadExpenses();
  let manifestData = null;

  // load manifest to discover breeds/images
  function loadManifest(){
    return fetch('assets/manifest.json').then(r=>{
      if(!r.ok) throw new Error('manifest not found');
      return r.json();
    }).then(json=>{
      manifestData = json;
      // build BREEDS list from manifest if available
      const names = Object.keys(manifestData.breeds || {});
      if(names.length>0){
        // assign prices: first free, others incremental
        const prices = [0,10,15,20,25,30,40,50];
        const arr = names.map((n,i)=>({id:n, name: manifestData.breeds[n].displayName || n, price: prices[i] || 50}));
        // override BREEDS
        window.BREEDS_RUNTIME = arr;
      }
    }).catch(err=>{
      console.warn('manifest load failed', err);
    });
  }
  // start loading manifest (async)
  loadManifest().finally(()=>{
    // after manifest attempt, initialize owned/current
    ownedBreeds = loadOwnedBreeds();
    currentBreed = loadCurrentBreed();
    renderAll();
  });
  // load owned breeds and current breed
  let ownedBreeds = loadOwnedBreeds();
  let currentBreed = loadCurrentBreed();
  // set default date input to today
  if(dateInput) dateInput.value = new Date().toISOString().slice(0,10);
  // set month input to this month
  if(monthInput) monthInput.value = new Date().toISOString().slice(0,7);
  renderAll();

  // month change updates report
  if(monthInput){
    monthInput.addEventListener('change', ()=> renderMonthlyReport());
  }

  // top nav buttons
  const navShop = el('nav-shop');
  const navReport = el('nav-report');
  const navHome = el('nav-home');
  if(navShop) navShop.addEventListener('click', ()=> showPage('shop'));
  if(navReport) navReport.addEventListener('click', ()=> showPage('report'));
  if(navHome) navHome.addEventListener('click', ()=> showPage('home'));

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

  // --- Owned breeds helpers ---
  function loadOwnedBreeds(){
    try{ const raw = localStorage.getItem(OWNED_KEY); return raw ? JSON.parse(raw) : [getAvailableBreeds()[0].id]; }catch(e){ return [getAvailableBreeds()[0].id]; }
  }
  function saveOwnedBreeds(list){ localStorage.setItem(OWNED_KEY, JSON.stringify(list)); }
  function loadCurrentBreed(){ try{ const raw = localStorage.getItem(CURRENT_BREED_KEY); return raw || getAvailableBreeds()[0].id; }catch(e){ return getAvailableBreeds()[0].id; } }
  function saveCurrentBreed(id){ localStorage.setItem(CURRENT_BREED_KEY, id); }

  // helper: get available breeds (manifest-driven if present)
  function getAvailableBreeds(){
    return window.BREEDS_RUNTIME || BREEDS;
  }

  // --- Events ---
  expenseForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const amount = parseFloat(amountInput.value);
    if(!amount || amount <= 0) return alert('請輸入正確的金額');
    const category = categoryInput.value;
    const note = noteInput.value.trim();
    // read date from dateInput
    const dateVal = dateInput && dateInput.value ? dateInput.value : null;
    addExpense({amount, category, note, dateVal});
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

  function addExpense({amount, category, note, dateVal}){
    // dateVal is YYYY-MM-DD or null
    let isoDate = new Date().toISOString();
    if(dateVal){
      const d = new Date(dateVal + 'T00:00:00');
      isoDate = d.toISOString();
    }
    const item = {id:Date.now(), amount, category, note, date:isoDate};
    expenses.unshift(item);
    saveExpenses();

    // update player (EXP & coins)
    const expGain = BASE_EXP + (note ? NOTE_BONUS : 0);
    player.currentExp += expGain;
    player.coins += 1;

    // handle level up(s)
    let leveled = false;
    while(player.currentExp >= player.expToNextLevel){
      player.currentExp -= player.expToNextLevel;
      player.level = (player.level || 1) + 1;
      player.expToNextLevel = Math.round(player.expToNextLevel * 1.5);
      leveled = true;
    }
    savePlayer();
    if(leveled) showLevelUp();

    // update mood & dialogue
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

  // monthly totals by category for a given YYYY-MM string
  function getMonthlyTotals(month){
    const totals = {};
    let totalAll = 0;
    expenses.forEach(it=>{
      if(it.date.slice(0,7) === month){
        totals[it.category] = (totals[it.category]||0) + Number(it.amount);
        totalAll += Number(it.amount);
      }
    });
    return {totals, totalAll};
  }

  function determineMood(total, budget){
    const b = (typeof budget === 'number' && budget > 0) ? budget : BUDGET;
    const ratio = b > 0 ? (total / b) : 0;
    // mapping per request: 0-20% happy, 20-40% relaxed, 41-60% confused, 61-80% surprised, 81-100% sad, >100% angry
    if(ratio <= 0.2) return {m:'開心', key:'happy'};
    if(ratio <= 0.4) return {m:'放鬆', key:'relaxed'};
    if(ratio <= 0.6) return {m:'疑惑', key:'confused'};
    if(ratio <= 0.8) return {m:'驚訝', key:'surprised'};
    if(ratio <= 1.0) return {m:'難過', key:'sad'};
    return {m:'生氣', key:'angry'};
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
    // choose appearance based on current breed and mood
  const appearance = getCatAppearance(loadCurrentBreed(), mood.key);
    // render main cat image using safer DOM operations
    if(catImage){
      catImage.innerHTML = '';
      const img = document.createElement('img');
      img.src = appearance.img;
      img.alt = 'cat';
      catImage.appendChild(img);
    }
    // render accessory at top
    if(topCat){
      topCat.innerHTML = '';
      if(appearance.accessory){
        const acc = document.createElement('img');
        acc.src = appearance.accessory;
        acc.alt = 'accessory';
        topCat.appendChild(acc);
      }
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

    // render shop and report after list
    renderShop();
    renderMonthlyReport();
  }

  // --- Shop UI ---
  function renderShop(){
    if(!shopListEl) return;
    shopListEl.innerHTML = '';
    const owned = loadOwnedBreeds();
    const current = loadCurrentBreed();
    const list = getAvailableBreeds();
    list.forEach(b=>{
      const row = document.createElement('div'); row.className='shop-item';
      const left = document.createElement('div'); left.className='breed-left';
      const thumb = document.createElement('img'); thumb.className = 'breed-thumb';
      thumb.alt = b.name;
      // resolve thumbnail from manifest or fallback
      thumb.src = getBreedThumbnail(b.id);
      const nameEl = document.createElement('div'); nameEl.className='breed-name'; nameEl.textContent = b.name;
      left.appendChild(thumb);
      left.appendChild(nameEl);
      const right = document.createElement('div'); right.className='breed-actions';
      if(owned.includes(b.id)){
        const sel = document.createElement('button'); sel.textContent = current===b.id ? '使用中' : '選擇'; sel.className='btn-edit';
        sel.disabled = (current===b.id);
        sel.addEventListener('click', ()=>{ saveCurrentBreed(b.id); showDialogue(`已切換為 ${b.name}！`,1500); renderAll(); });
        right.appendChild(sel);
      } else {
        const buy = document.createElement('button'); buy.textContent = `購買 ${b.price} 🪙`; buy.className='btn-edit';
        buy.addEventListener('click', ()=>{
          if(player.coins < b.price) return alert('Coins 不足');
          if(!confirm(`使用 ${b.price} coins 購買 ${b.name}？`)) return;
          player.coins -= b.price; savePlayer();
          const newOwned = loadOwnedBreeds(); newOwned.push(b.id); saveOwnedBreeds(newOwned);
          saveCurrentBreed(b.id);
          showDialogue(`購買成功！已取得 ${b.name}`,2000);
          renderAll();
        });
        right.appendChild(buy);
      }
      row.appendChild(left); row.appendChild(right); shopListEl.appendChild(row);
    });
  }

  // helper: return a thumbnail path for a breed id (prefer manifest happy image)
  function getBreedThumbnail(breedId){
    if(manifestData && manifestData.breeds && manifestData.breeds[breedId]){
      const imgs = manifestData.breeds[breedId].images || {};
      // prefer 'happy' otherwise first available
      if(imgs.happy) return imgs.happy;
      const first = Object.values(imgs)[0];
      if(first) return first;
    }
    // fallback naming pattern
    return `assets/${breedId}_happy.svg`;
  }

  // --- Monthly report & Pie chart ---
  function renderMonthlyReport(){
    if(!monthInput) return;
    const month = monthInput.value || new Date().toISOString().slice(0,7);
    const {totals, totalAll} = getMonthlyTotals(month);
    if(monthlyTotalEl) monthlyTotalEl.textContent = totalAll.toFixed(2);
    drawPieChart(pieCanvas, totals);
  }

  function drawPieChart(canvas, data){
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const entries = Object.entries(data);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(entries.length===0) return;
    const total = entries.reduce((s,[k,v])=>s+v,0);
    let start = 0;
    const colors = ['#FFB6D9','#FFD27A','#BFE9FF','#C3FFD8','#E6CCFF','#FFD6B0'];
    entries.forEach(([k,v],i)=>{
      const slice = v/total;
      const end = start + slice;
      const cx = canvas.width/2; const cy = canvas.height/2; const r = Math.min(cx,cy)-10;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start*2*Math.PI,end*2*Math.PI); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      // label
      const mid = (start+end)/2;
      const lx = cx + Math.cos(mid*2*Math.PI)*(r*0.6);
      const ly = cy + Math.sin(mid*2*Math.PI)*(r*0.6);
      ctx.fillStyle = '#333'; ctx.font = '12px sans-serif'; ctx.fillText(k, lx-10, ly);
      start = end;
    });
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
      if(arguments[4]){
        const d = new Date(arguments[4] + 'T00:00:00');
        expenses[idx].date = d.toISOString();
      }
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
    // mood here contains key (happy, relaxed, confused, surprised, sad, angry)
    const key = mood.key || mood;
    const suggestions = {
      happy: '今天花得漂亮，但別忘了存一點零用錢喵～',
      relaxed: '花得還不錯，保留一些備用金會更安心喵。',
      confused: '這筆開銷有點疑惑喵，建議檢查是否必要。',
      surprised: '意外開銷出現了，建議下個月調整預算喵。',
      sad: '已接近預算下限，請小心控制花費喵。',
      angry: '超過預算了！暫停購買，省點錢給我買零食吧～'
    };
    if(amount > 500) return '哇，大筆開銷…我有點擔心喵。' + '\n' + (suggestions[key]||'');
    if(player.level >= 5) return '高級玩家，還是要控制花費喵！' + '\n' + (suggestions[key]||'');
    return suggestions[key] || '謝謝主人～我好開心喵！';
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
  // get image path by breedId and moodKey
  function getCatAppearance(breedId, moodKey){
    // prefer manifest data when available
    let img = '';
    if(manifestData && manifestData.breeds && manifestData.breeds[breedId]){
      const imgs = manifestData.breeds[breedId].images || {};
      img = imgs[moodKey] || Object.values(imgs)[0] || '';
    }
    // fallback to conventional path
    if(!img){ img = `assets/${breedId}_${moodKey}.svg`; }

    // accessory by player level (load player from saved state)
    const lvl = player.level || 1;
    let accessory = '';
    if(lvl >= 8) accessory = 'assets/accessory_sunglasses.svg';
    else if(lvl >=5) accessory = 'assets/accessory_bow.svg';
    else if(lvl >=3) accessory = 'assets/accessory_cap.svg';

    return {img, accessory};
  }

  // Simple single-page navigation: show only panels for a named page
  function showPage(name){
    const panels = document.querySelectorAll('.panel');
    panels.forEach(p=>{
      const pd = p.getAttribute('data-page');
      if(!pd){
        // panels without data-page are considered part of "home"
        p.classList.toggle('hidden', name !== 'home');
      } else {
        p.classList.toggle('hidden', pd !== name);
      }
    });
    // update hash for deep-link
    try{ history.replaceState(null, '', name==='home' ? location.pathname : `#${name}`); }catch(e){}
  }

  // on load: wire back buttons and initial route
  function initRouting(){
    document.querySelectorAll('.btn-back').forEach(b=> b.addEventListener('click', ()=> showPage('home')));
    // initial route from hash
    const h = location.hash.replace('#','');
    if(h==='shop' || h==='report') showPage(h); else showPage('home');
  }
  // attach and run immediately
  document.addEventListener('DOMContentLoaded', initRouting);
  initRouting();

})();
