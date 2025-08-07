document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    let tasks = [];

    addTaskBtn.addEventListener('click', addTask);

    function addTask() {
        const taskName = taskInput.value.trim();
        if (taskName === '') return;

        const task = {
            id: Date.now(),
            name: taskName,
            timer: null,
            elapsedTime: 0,
            isRunning: false
        };

        tasks.push(task);
        renderTask(task);
        taskInput.value = '';
    }

    function renderTask(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.id;

        li.innerHTML = `
            <span class="task-name">${task.name}</span>
            <span class="timer-display">00:00:00</span>
            <button class="start-btn">開始</button>
            <button class="pause-btn" disabled>一時停止</button>
            <button class="stop-btn" disabled>停止</button>
        `;

        taskList.appendChild(li);

        const startBtn = li.querySelector('.start-btn');
        const pauseBtn = li.querySelector('.pause-btn');
        const stopBtn = li.querySelector('.stop-btn');
        const timerDisplay = li.querySelector('.timer-display');

        startBtn.addEventListener('click', () => startTimer(task, timerDisplay, startBtn, pauseBtn, stopBtn));
        pauseBtn.addEventListener('click', () => pauseTimer(task, startBtn, pauseBtn));
        stopBtn.addEventListener('click', () => stopTimer(task, timerDisplay, startBtn, pauseBtn, stopBtn));
    }

    function startTimer(task, timerDisplay, startBtn, pauseBtn, stopBtn) {
        if (task.isRunning) return;
        task.isRunning = true;

        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;

        task.timer = setInterval(() => {
            task.elapsedTime++;
            timerDisplay.textContent = formatTime(task.elapsedTime);
        }, 1000);
    }

    function pauseTimer(task, startBtn, pauseBtn) {
        if (!task.isRunning) return;
        task.isRunning = false;

        startBtn.disabled = false;
        startBtn.textContent = '再開';
        pauseBtn.disabled = true;

        clearInterval(task.timer);
    }

    function stopTimer(task, timerDisplay, startBtn, pauseBtn, stopBtn) {
        task.isRunning = false;
        clearInterval(task.timer);
        task.elapsedTime = 0;

        timerDisplay.textContent = '00:00:00';
        startBtn.disabled = false;
        startBtn.textContent = '開始';
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
    }

    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }
});