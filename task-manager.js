class TaskManager {
    constructor(containerId, inputId) {
        this.container = document.getElementById(containerId);
        this.input = document.getElementById(inputId);
        this._tasks = [];
        
        this._handleInput = this._handleInput.bind(this);
        this._handleTaskClick = this._handleTaskClick.bind(this);
        this._handleTaskDelete = this._handleTaskDelete.bind(this);
        
        this._attachEventListeners();
        this._loadFromStorage();
        this.render();
    }

    _loadFromStorage() {
        try {
            const raw = localStorage.getItem('taskList');
            this._tasks = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this._tasks = [];

        }
    }

    _saveToStorage() {
        try {
            localStorage.setItem('taskList', JSON.stringify(this._tasks));
        } catch (e) {

        }
    }

    _attachEventListeners() {
        this.input.addEventListener('keydown', this._handleInput);
        this.container.addEventListener('click', e => {
            const li = e.target.closest('li');
            const deleteBtn = e.target.closest('.task-del');
            
            if (!li) return;
            
            if (deleteBtn) {
                this._handleTaskDelete(li.dataset.index);
            } else {
                this._handleTaskClick(li.dataset.index);
            }
        });
    }

    _handleInput(e) {
        if (e.key !== 'Enter') return;
        
        const value = e.target.value.trim();
        if (!value) return;
        
        this.addTask(value);
        e.target.value = '';
    }

    _handleTaskClick(index) {
        this.toggleTask(Number(index));
    }

    _handleTaskDelete(index) {
        this.removeTask(Number(index));
    }

    addTask(text) {
        const task = { text, done: false };
        this._tasks.unshift(task);
        this._saveToStorage();

        const taskElement = this._createTaskElement(task, 0);
        this.container.prepend(taskElement);
        this._updateTaskIndices();
    }

    toggleTask(index) {
        if (index >= 0 && index < this._tasks.length) {
            const task = this._tasks[index];
            task.done = !task.done;
            this._saveToStorage();
            const li = this.container.querySelector(`[data-index="${index}"]`);
            if (li) {
                li.classList.toggle('done', task.done);
            }
        }
    }

    removeTask(index) {
        if (index >= 0 && index < this._tasks.length) {
            this._tasks.splice(index, 1);
            this._saveToStorage();

            const taskElement = this.container.querySelector(`[data-index="${index}"]`);
            if (taskElement) {
                taskElement.remove();
            }
            this._updateTaskIndices();
        }
    }
    
    _createTaskElement(task, index) {
        const li = document.createElement('li');
        li.dataset.index = index;
        li.className = task.done ? 'done' : '';
        li.innerHTML = `${task.text} <button class="task-del">&times;</button>`;
        return li;
    }

    _updateTaskIndices() {
        const tasks = this.container.children;
        for (let i = 0; i < tasks.length; i++) {
            tasks[i].dataset.index = i;
        }
    }

    render() {
        this.container.innerHTML = this._tasks.map((task, i) => `
            <li data-index="${i}" class="${task.done ? 'done' : ''}">
                ${task.text}
                <button class="task-del">&times;</button>
            </li>
        `).join('');
    }
}

export default TaskManager;