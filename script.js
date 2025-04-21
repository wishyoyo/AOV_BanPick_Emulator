// 遊戲狀態管理
const gameState = {
    // 原始階段定義
    phaseDefinitions: [
        { phase: 1, team: 'blue', action: 'ban', positions: [1] },
        { phase: 2, team: 'red', action: 'ban', positions: [1] },
        { phase: 3, team: 'blue', action: 'ban', positions: [2] },
        { phase: 4, team: 'red', action: 'ban', positions: [2] },
        { phase: 5, team: 'blue', action: 'pick', positions: [1] },
        { phase: 6, team: 'red', action: 'pick', positions: [1, 2] },
        { phase: 7, team: 'blue', action: 'pick', positions: [2, 3] },
        { phase: 8, team: 'red', action: 'pick', positions: [3] },
        { phase: 9, team: 'red', action: 'ban', positions: [3] },
        { phase: 10, team: 'blue', action: 'ban', positions: [3] },
        { phase: 11, team: 'red', action: 'ban', positions: [4] },
        { phase: 12, team: 'blue', action: 'ban', positions: [4] },
        { phase: 13, team: 'red', action: 'pick', positions: [4] },
        { phase: 14, team: 'blue', action: 'pick', positions: [4, 5] },
        { phase: 15, team: 'red', action: 'pick', positions: [5] }
    ],
    
    // 當前遊戲狀態
    phase: 1,
    phases: [],
    bans: { blue: [], red: [] },
    picks: { blue: [], red: [] },
    availableHeroes: [],
    history: [],
    
    // 初始化階段
    initPhases() {
        this.phases = JSON.parse(JSON.stringify(this.phaseDefinitions));
    }
};

// DOM 元素
const heroGrid = document.querySelector('.hero-grid');
const blueBansList = document.querySelector('.blue-bans .banned-list');
const redBansList = document.querySelector('.red-bans .banned-list');
const phaseText = document.getElementById('phase-text');
const filterButtons = document.querySelectorAll('.filter-btn');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-btn');

// 初始化遊戲
async function init() {
    try {
        // 載入英雄數據
        const response = await fetch('heroes.json');
        const data = await response.json();
        gameState.availableHeroes = data;
        
        // 初始化階段
        gameState.initPhases();
        
        // 設置事件監聽器
        setupEventListeners();
        
        // 初始渲染
        renderAllHeroes();
        updatePhasePrompt();
        
        // 預設點擊"全部"分類
        document.querySelector('.filter-btn[data-role="all"]').click();
    } catch (error) {
        console.error('初始化失敗:', error);
    }
}

// 設置所有事件監聽器
function setupEventListeners() {
    // 英雄點擊事件
    heroGrid.addEventListener('click', handleHeroClick);
    
    // 分類篩選按鈕
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterHeroes(button.dataset.role);
        });
    });
    
    // 回上一動按鈕
    undoBtn.addEventListener('click', undoLastAction);
    
    // 重新開始按鈕
    resetBtn.addEventListener('click', resetGame);
}

// 處理英雄點擊
function handleHeroClick(event) {
    const heroElement = event.target.closest('.hero-icon');
    if (!heroElement || heroElement.classList.contains('banned')) return;
    
    const heroId = parseInt(heroElement.dataset.id);
    const hero = gameState.availableHeroes.find(h => h.id === heroId);
    if (!hero) return;
    
    // 保存當前狀態到歷史
    saveGameState();
    
    // 根據當前階段處理選擇
    const currentPhase = getCurrentPhase();
    
    if (currentPhase.action === 'ban') {
        // 處理禁用
        gameState.bans[currentPhase.team].push(hero);
        updateBansDisplay();
    } else {
        // 處理選擇
        const position = currentPhase.positions[0];
        const playerElement = document.querySelector(`.${currentPhase.team}-team .player[data-position="${position}"]`);
        
        playerElement.innerHTML = `
            <strong>${hero.name}</strong>
            <img src="heroes/${hero.image}" alt="${hero.name}" class="picked-hero">
        `;
        
        gameState.picks[currentPhase.team].push(hero);
    }
    
    // 標記英雄為已使用
    markHeroAsUsed(heroId);
    
    // 進入下一階段
    advancePhase();
    
    // 保持當前篩選
    const activeFilter = document.querySelector('.filter-btn.active').dataset.role;
    filterHeroes(activeFilter);
}

// 保存當前遊戲狀態
function saveGameState() {
    gameState.history.push({
        phase: gameState.phase,
        bans: {
            blue: [...gameState.bans.blue],
            red: [...gameState.bans.red]
        },
        picks: {
            blue: [...gameState.picks.blue],
            red: [...gameState.picks.red]
        },
        // 保存當前的 positions 狀態
        positions: [...getCurrentPhase().positions]
    });
}

// 渲染所有英雄
function renderAllHeroes() {
    heroGrid.innerHTML = '';
    gameState.availableHeroes.forEach(hero => {
        const heroElement = document.createElement('div');
        heroElement.className = 'hero-icon';
        heroElement.dataset.id = hero.id;
        
        const img = document.createElement('img');
        img.src = `heroes/${hero.image}`;
        img.alt = hero.name;
        img.title = hero.name;
        
        heroElement.appendChild(img);
        heroGrid.appendChild(heroElement);
    });
}

// 篩選英雄
function filterHeroes(role) {
    let filteredHeroes;
    
    if (role === 'all') {
        filteredHeroes = gameState.availableHeroes.filter(hero => 
            !isHeroUsed(hero.id)
        );
    } else {
        filteredHeroes = gameState.availableHeroes.filter(hero => 
            hero.occupation.includes(role) && !isHeroUsed(hero.id)
        );
    }
    
    renderFilteredHeroes(filteredHeroes);
}

// 渲染篩選後的英雄
function renderFilteredHeroes(heroes) {
    heroGrid.innerHTML = '';
    heroes.forEach(hero => {
        const heroElement = document.createElement('div');
        heroElement.className = `hero-icon ${isHeroUsed(hero.id) ? 'banned' : ''}`;
        heroElement.dataset.id = hero.id;
        
        const img = document.createElement('img');
        img.src = `heroes/${hero.image}`;
        img.alt = hero.name;
        img.title = hero.name;
        
        heroElement.appendChild(img);
        heroGrid.appendChild(heroElement);
    });
}

// 更新禁用顯示
function updateBansDisplay() {
    blueBansList.innerHTML = '';
    redBansList.innerHTML = '';
    
    gameState.bans.blue.forEach(hero => {
        blueBansList.appendChild(createBanElement(hero));
    });
    
    gameState.bans.red.forEach(hero => {
        redBansList.appendChild(createBanElement(hero));
    });
}

// 創建禁用元素
function createBanElement(hero) {
    const div = document.createElement('div');
    div.className = 'banned-hero';
    
    const img = document.createElement('img');
    img.src = `heroes/${hero.image}`;
    img.alt = hero.name;
    img.title = hero.name;
    img.className = 'hero-icon banned';
    
    div.appendChild(img);
    return div;
}

// 標記英雄為已使用
function markHeroAsUsed(heroId) {
    const heroElements = document.querySelectorAll('.hero-icon');
    heroElements.forEach(el => {
        if (parseInt(el.dataset.id) === heroId) {
            el.classList.add('banned');
        }
    });
}

// 檢查英雄是否已被使用
function isHeroUsed(heroId) {
    return [...gameState.bans.blue, ...gameState.bans.red, 
            ...gameState.picks.blue, ...gameState.picks.red]
        .some(hero => hero.id === heroId);
}

// 獲取當前階段
function getCurrentPhase() {
    return gameState.phases.find(p => p.phase === gameState.phase);
}

// 進入下一階段
function advancePhase() {
    const currentPhase = getCurrentPhase();
    
    // 檢查是否還有位置需要操作
    if (currentPhase.positions.length > 1) {
        currentPhase.positions.shift();
    } else {
        gameState.phase++;
    }
    
    updatePhasePrompt();
}

// 更新階段提示
function updatePhasePrompt() {
    const currentPhase = getCurrentPhase();
    if (!currentPhase) {
        phaseText.textContent = 'Ban/Pick 流程已完成！';
        return;
    }
    
    const teamName = currentPhase.team === 'blue' ? '藍方' : '紅方';
    const action = currentPhase.action === 'ban' ? '禁用' : '選擇';
    const positions = currentPhase.positions.join('、');
    
    phaseText.textContent = `階段 ${currentPhase.phase}/15: ${teamName} ${positions}樓 ${action}英雄`;
}

// 回上一動功能 (完全修正版)
function undoLastAction() {
    if (gameState.history.length === 0) {
        alert('沒有可以返回的操作了！');
        return;
    }
    
    // 從歷史記錄獲取完整狀態
    const prevState = gameState.history.pop();
    
    // 完全重置遊戲狀態
    gameState.phase = prevState.phase;
    gameState.bans = prevState.bans;
    gameState.picks = prevState.picks;
    
    // 關鍵修正：完全重建階段定義
    gameState.initPhases();
    
    // 恢復階段的 positions 狀態
    const currentPhase = getCurrentPhase();
    if (prevState.positions) {
        currentPhase.positions = prevState.positions;
    }
    
    // 重新渲染界面
    updateBansDisplay();
    renderAllPlayers();
    updatePhasePrompt();
    
    // 刷新英雄顯示
    const activeFilter = document.querySelector('.filter-btn.active').dataset.role;
    filterHeroes(activeFilter);
}

// 重新渲染所有玩家選擇
function renderAllPlayers() {
    // 清空所有玩家選擇
    document.querySelectorAll('.player').forEach(el => {
        const position = el.dataset.position;
        const team = el.parentElement.classList.contains('blue-team') ? '藍方' : '紅方';
        el.innerHTML = `${team}${position}樓`;
    });
    
    // 重新渲染已選擇的英雄
    ['blue', 'red'].forEach(team => {
        gameState.picks[team].forEach((hero, index) => {
            const position = index + 1;
            const playerElement = document.querySelector(`.${team}-team .player[data-position="${position}"]`);
            playerElement.innerHTML = `
                <strong>${hero.name}</strong>
                <img src="heroes/${hero.image}" alt="${hero.name}" class="picked-hero">
            `;
        });
    });
}

// 重置遊戲 (完全修正版)
function resetGame() {
    if (!confirm('確定要重新開始嗎？所有進度將會遺失！')) return;
    
    // 完全重置遊戲狀態
    gameState.initPhases();
    gameState.phase = 1;
    gameState.bans = { blue: [], red: [] };
    gameState.picks = { blue: [], red: [] };
    gameState.history = [];
    
    // 重置界面
    updateBansDisplay();
    renderAllPlayers();
    document.querySelectorAll('.hero-icon').forEach(el => el.classList.remove('banned'));
    updatePhasePrompt();
    
    // 重置篩選器
    document.querySelector('.filter-btn[data-role="all"]').click();
}

// 初始化遊戲
init();