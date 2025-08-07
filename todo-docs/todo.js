document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const taskInput = document.getElementById('task-input');
    const dueDateInput = document.getElementById('due-date-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const completedTaskList = document.getElementById('completed-task-list');
    const totalTodayTimeEl = document.getElementById('total-today-time');
    const tabs = document.querySelectorAll('.tab-btn');

    // タスクデータの配列（localStorageから読み込む）
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // イベントリスナーの設定
    addTaskBtn.addEventListener('click', addTask);
    tabs.forEach(tab => tab.addEventListener('click', switchTab));

    // --- データ永続化 ---
    function saveData() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // --- タスク追加機能 ---
    function addTask() {
        const taskName = taskInput.value.trim();
        if (taskName === '') return;

        const task = {
            id: Date.now(),
            name: taskName,
            dueDate: dueDateInput.value,
            timer: null, // interval ID
            elapsedTime: 0,
            isRunning: false,
            isCompleted: false,
            completedAt: null
        };

        tasks.unshift(task); // 先頭に追加
        renderTasks();
        taskInput.value = '';
        dueDateInput.value = '';
    }

    // --- タスク描画機能 ---
    function renderTasks() {
        // 実行中のタイマーを一旦すべてクリア
        tasks.forEach(task => {
            if (task.timer) clearInterval(task.timer);
        });

        taskList.innerHTML = '';
        completedTaskList.innerHTML = '';

        const activeTasks = tasks.filter(t => !t.isCompleted);
        const completedTasks = tasks.filter(t => t.isCompleted);

        activeTasks.forEach((task, index) => {
            taskList.appendChild(createTaskElement(task, index, activeTasks.length));
        });
        completedTasks.forEach(task => {
            completedTaskList.appendChild(createTaskElement(task));
        });
        
        updateTotalTodayTime();
        saveData();
    }

    function createTaskElement(task, index, activeTasksCount) {
        const li = document.createElement('li');
        li.className = `task-item ${task.isRunning ? 'active-task' : ''} ${task.isCompleted ? 'completed-task' : ''}`;
        li.dataset.id = task.id;

        const dueDateStr = task.dueDate ? `期日: ${task.dueDate}` : '';
        const totalTimeStr = task.isCompleted ? `合計時間: ${formatTime(task.elapsedTime)}` : '';

        li.innerHTML = `
            <div class="task-info">
                <div class="task-name" title="${task.name}">${task.name}</div>
                <div class="due-date">${dueDateStr}</div>
            </div>
            <div class="task-controls">
                ${!task.isCompleted ? `
                    <span class="timer-display">${formatTime(task.elapsedTime)}</span>
                    <button class="start-btn">${task.elapsedTime > 0 ? '再開' : '開始'}</button>
                    <button class="pause-btn" ${!task.isRunning ? 'disabled' : ''}>一時停止</button>
                    <button class="stop-btn" ${task.elapsedTime === 0 ? 'disabled' : ''}>完了</button>
                    <div class="order-controls">
                        <button class="up-btn" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="down-btn" ${index === activeTasksCount - 1 ? 'disabled' : ''}>▼</button>
                    </div>
                ` : `
                    <span class="timer-display">${totalTimeStr}</span>
                    <button class="restore-btn">戻す</button>
                `}
            </div>
        `;

        if (!task.isCompleted) {
            const timerDisplay = li.querySelector('.timer-display');
            // タイマーが実行中なら再開する
            if (task.isRunning) {
                startTimer(task, timerDisplay);
            }

            // イベントリスナー（アクティブタスク）
            li.querySelector('.start-btn').addEventListener('click', () => {
                startTimer(task, timerDisplay);
                li.querySelector('.start-btn').textContent = '再開';
                li.querySelector('.start-btn').disabled = true;
                li.querySelector('.pause-btn').disabled = false;
                li.querySelector('.stop-btn').disabled = false;
                li.classList.add('active-task');
            });
            li.querySelector('.pause-btn').addEventListener('click', () => {
                pauseTimer(task);
                li.querySelector('.start-btn').disabled = false;
                li.querySelector('.pause-btn').disabled = true;
                li.classList.remove('active-task');
            });
            li.querySelector('.stop-btn').addEventListener('click', () => completeTask(task));
            li.querySelector('.up-btn').addEventListener('click', () => moveTask(task.id, -1));
            li.querySelector('.down-btn').addEventListener('click', () => moveTask(task.id, 1));
        } else {
            // イベントリスナー（完了済みタスク）
            li.querySelector('.restore-btn').addEventListener('click', () => restoreTask(task));
        }

        return li;
    }

    // --- タイマー機能 ---
    function startTimer(task, timerDisplay) {
        if (task.isRunning) return;
        task.isRunning = true;

        task.timer = setInterval(() => {
            task.elapsedTime++;
            timerDisplay.textContent = formatTime(task.elapsedTime);
            saveData(); // 1秒ごとに保存
        }, 1000);
    }

    function pauseTimer(task) {
        if (!task.isRunning) return;
        task.isRunning = false;
        clearInterval(task.timer);
        task.timer = null;
        saveData();
    }

    function completeTask(task) {
        pauseTimer(task);
        task.isCompleted = true;
        task.completedAt = new Date().toISOString();
        renderTasks();
    }

    function restoreTask(task) {
        task.isCompleted = false;
        task.completedAt = null;
        renderTasks();
    }

    // --- タスク順序変更 ---
    function moveTask(taskId, direction) {
        const activeTasks = tasks.filter(t => !t.isCompleted);
        const taskIndex = activeTasks.findIndex(t => t.id === taskId);
        
        const newIndex = taskIndex + direction;
        if (newIndex < 0 || newIndex >= activeTasks.length) return;

        const originalIndex = tasks.findIndex(t => t.id === taskId);
        const targetOriginalIndex = tasks.findIndex(t => t.id === activeTasks[newIndex].id);

        [tasks[originalIndex], tasks[targetOriginalIndex]] = [tasks[targetOriginalIndex], tasks[originalIndex]];
        renderTasks();
    }

    // --- タブ切り替え ---
    function switchTab(e) {
        tabs.forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.task-list-container').forEach(container => {
            container.style.display = 'none';
        });
        document.getElementById(e.target.dataset.tab).style.display = 'block';
    }

    // --- 時間集計＆フォーマット ---
    function updateTotalTodayTime() {
        const today = new Date().toDateString();
        const totalSeconds = tasks
            .filter(t => t.isCompleted && new Date(t.completedAt).toDateString() === today)
            .reduce((sum, t) => sum + t.elapsedTime, 0);
        totalTodayTimeEl.textContent = formatTime(totalSeconds);
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // 初期描画
    renderTasks();
    // デフォルトでアクティブタブを表示
    document.getElementById('active-tasks').style.display = 'block';
});