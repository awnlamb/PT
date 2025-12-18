// script.js - Система авторизации и управления заказами с ролями

// =======================================================
// === I. КОНФИГУРАЦИЯ ===
// =======================================================

const ITEMS_PER_PAGE = 5;

// =======================================================
// === II. VIEW: ОТОБРАЖЕНИЕ И РАБОТА С DOM ===
// =======================================================

function createOrderElement(order, currentUser) {
    const isAuthor = order.author === currentUser.username;
    const isManager = currentUser.role === 'manager';
    const isCourier = currentUser.role === 'courier';
    
    const element = document.createElement('article');
    element.classList.add('order-item');
    element.dataset.id = order.id;

    const statusClass = order.status ? order.status.toLowerCase().replace(/\s/g, '-') : 'new';

    let buttonsHtml = '';
    
    if (isManager) {
        // Менеджер может все
        buttonsHtml = `
            <div class="actions">
                <button class="btn-edit" data-action="edit">Редактировать</button>
                <button class="btn-delete" data-action="delete">Удалить</button>
                ${order.serviceType === 'Доставка' ? '<button class="btn-assign" data-action="assign">Назначить курьера</button>' : ''}
            </div>
        `;
    } else if (isAuthor && currentUser.role === 'customer') {
        // Заказчик может редактировать свои заказы
        buttonsHtml = `
            <div class="actions">
                <button class="btn-edit" data-action="edit">Редактировать</button>
                <button class="btn-delete" data-action="delete">Удалить</button>
            </div>
        `;
    } else if (isCourier && order.serviceType === 'Доставка' && (order.status === 'В пути' || order.status === 'Новый')) {
        // Курьер может отмечать доставку
        buttonsHtml = `
            <div class="actions">
                <button class="btn-complete" data-action="complete">Доставлено</button>
            </div>
        `;
    }

    element.innerHTML = `
        <div class="order-header">
            <h3>Заказ №${order.id}</h3>
            <span class="status ${statusClass}">${order.status}</span>
        </div>
        <p class="order-desc">${order.description}</p>
        <p class="order-meta">
            Автор: <strong>${order.author}</strong>
            | Тип услуги: ${order.serviceType} | Гостей: ${order.guests}
            | Дата: ${order.createdAt.toLocaleDateString()} ${order.createdAt.toLocaleTimeString()}
        </p>
        ${buttonsHtml}
    `;
    return element;
}

class OrderView {
    constructor(orderContainerId, filterContainerId, headerContainerId, editModalId, loadMoreId, authContainerId) {
        this._container = document.getElementById(orderContainerId);
        this._filterContainer = document.getElementById(filterContainerId);
        this._headerContainer = document.getElementById(headerContainerId);
        this._editModal = document.getElementById(editModalId);
        this._loadMoreContainer = document.getElementById(loadMoreId);
        this._authContainer = document.getElementById(authContainerId);
        this._currentUser = null;
    }

    setCurrentUser(user) {
        this._currentUser = user;
    }

    renderOrders(orders) {
        this._container.innerHTML = '';
        if (orders.length === 0) {
            this._container.innerHTML = '<p>Заказов по текущему фильтру не найдено.</p>';
            return;
        }
        orders.forEach(order => {
            this._container.appendChild(createOrderElement(order, this._currentUser));
        });
    }

    editOrder(id, updatedOrder) {
        const oldElement = this._container.querySelector(`.order-item[data-id="${id}"]`);
        if (oldElement) {
            const newElement = createOrderElement(updatedOrder, this._currentUser);
            this._container.replaceChild(newElement, oldElement);
            return true;
        }
        return false;
    }

    renderHeader() {
        if (this._currentUser) {
            const roleNames = {
                'customer': 'Заказчик',
                'courier': 'Курьер',
                'manager': 'Менеджер'
            };

            this._headerContainer.innerHTML = `
                <div class="user-info">
                    <span>${roleNames[this._currentUser.role]}: <strong>${this._currentUser.username}</strong></span>
                    ${this._currentUser.role === 'courier' ? `<span class="courier-status">${this._currentUser.isAvailable ? '🟢 Доступен' : '🔴 Не доступен'}</span>` : ''}
                    <button class="btn-logout" data-action="logout">Выйти</button>
                </div>
                ${this._currentUser.canCreateOrders ? '<button class="btn-primary" data-action="show-add-form">Добавить заказ</button>' : ''}
                ${this._currentUser.role === 'manager' ? '<button class="btn-manager" data-action="show-stats">Статистика</button>' : ''}
            `;
        } else {
            this._headerContainer.innerHTML = `
                <div class="user-info">
                    <span>Вы не авторизованы</span>
                    <button class="btn-login" data-action="show-login">Войти</button>
                </div>
            `;
        }
    }

    renderAuthForm() {
        this._authContainer.style.display = 'flex';
        this._authContainer.innerHTML = `
            <div class="auth-box">
                <h3>Вход в систему</h3>
                <form id="login-form">
                    <select id="login-role">
                        <option value="">Выберите роль</option>
                        <option value="customer">Заказчик</option>
                        <option value="courier">Курьер</option>
                        <option value="manager">Менеджер</option>
                    </select>
                    <input type="text" id="login-username" placeholder="Логин" required>
                    <input type="password" id="login-password" placeholder="Пароль (123456)" required>
                    <button type="submit" class="btn-primary">Войти</button>
                    <button type="button" class="btn-secondary" data-action="close-auth">Отмена</button>
                </form>
                <div class="auth-hint">
                    <p><strong>Тестовые пользователи:</strong></p>
                    <p>• Заказчик: ivanov / 123456</p>
                    <p>• Курьер: courier1 / 123456</p>
                    <p>• Менеджер: manager1 / 123456</p>
                    <p>• Заказчик: petrova / 123456</p>
                </div>
            </div>
        `;
    }

    hideAuthForm() {
        this._authContainer.style.display = 'none';
        this._authContainer.innerHTML = '';
    }

    renderFilters(allOrders) {
        const statuses = [...new Set(allOrders.map(o => o.status))];
        
        let filterHtml = `
            <label for="status-filter">Статус:</label>
            <select id="status-filter">
                <option value="">Все статусы</option>
                ${statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
            </select>
            <label for="author-filter">Автор:</label>
            <input type="text" id="author-filter" placeholder="Фильтр по автору">
        `;
        
        if (this._currentUser?.role === 'courier') {
            filterHtml += '<label><input type="checkbox" id="only-delivery"> Только доставка</label>';
        }
        
        filterHtml += '<button type="submit">Применить</button>';
        
        this._filterContainer.innerHTML = filterHtml;
    }

    showEditForm(order) {
        document.getElementById('edit-id').value = order.id;
        document.getElementById('edit-desc').value = order.description;
        document.getElementById('edit-service').value = order.serviceType;
        document.getElementById('edit-guests').value = order.guests;
        document.getElementById('edit-phone').value = order.phone;
        
        const dateString = order.createdAt.toISOString().substring(0, 16);
        document.getElementById('edit-created-at').value = dateString;

        this._editModal.style.display = 'flex';
    }

    hideEditForm() {
        this._editModal.style.display = 'none';
    }

    renderStats(stats) {
        this._container.innerHTML = `
            <div class="stats-container">
                <h2><i class="fas fa-chart-line"></i> Статистика ресторана</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Выручка за месяц</h3>
                        <div class="stat-value">${stats.revenue} р.</div>
                    </div>
                    <div class="stat-card">
                        <h3>Всего заказов</h3>
                        <div class="stat-value">${stats.totalOrders}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Популярные блюда</h3>
                        <ul class="popular-dishes">
                            ${stats.popularDishes.map(dish => 
                                `<li><span class="dish-name">${dish.name}</span><span class="dish-count">${dish.count} заказов</span></li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
                <button class="btn-secondary" data-action="back-to-orders">Назад к заказам</button>
            </div>
        `;
    }
    
    renderLoadMoreButton(totalCount, currentCount) {
        if (!this._loadMoreContainer) return;

        this._loadMoreContainer.innerHTML = '';
        if (totalCount > currentCount) {
            const button = document.createElement('button');
            button.classList.add('btn-secondary');
            button.id = 'load-more-btn';
            button.textContent = `Загрузить еще (${Math.min(ITEMS_PER_PAGE, totalCount - currentCount)})`;
            this._loadMoreContainer.appendChild(button);
        }
    }
}

// =======================================================
// === III. CONTROLLER ===
// =======================================================

(function (model, viewClass, itemsPerPage) {
    let systemView;
    let currentFilter = {};
    let currentPage = 1;
    let showStats = false;

    // --- ОСНОВНЫЕ ФУНКЦИИ ---

    function renderList() {
        const user = model.getCurrentUser();
        if (!user) return;

        const skip = 0;
        const top = currentPage * itemsPerPage;
        
        let filteredOrders = model.getObjs(0, model._orders.length, currentFilter);
        
        // Фильтрация по ролям
        if (user.role === 'courier') {
            const onlyDelivery = document.getElementById('only-delivery')?.checked;
            if (onlyDelivery) {
                filteredOrders = filteredOrders.filter(order => 
                    order.serviceType === 'Доставка'
                );
            }
        }

        const visibleOrders = filteredOrders.slice(skip, top);

        systemView.renderOrders(visibleOrders);
        systemView.renderLoadMoreButton(filteredOrders.length, visibleOrders.length);
    }

    function handleLoadMore() {
        currentPage++;
        renderList();
    }

    // --- АВТОРИЗАЦИЯ ---

    function handleLogin(event) {
        event.preventDefault();
        const role = document.getElementById('login-role').value;
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const user = model.authenticateUser(username, password);
        
        if (user) {
            if (role && user.role !== role) {
                alert(`Пользователь ${username} не является ${role === 'customer' ? 'заказчиком' : role === 'courier' ? 'курьером' : 'менеджером'}`);
                return;
            }

            systemView.setCurrentUser(user);
            systemView.hideAuthForm();
            systemView.renderHeader();
            systemView.renderFilters(model.getObjs(0, model._orders.length));
            renderList();
        } else {
            alert('Неверный логин или пароль');
        }
    }

    function handleLogout() {
        model.logoutUser();
        systemView.setCurrentUser(null);
        systemView.renderHeader();
        systemView.renderFilters([]);
        document.getElementById('order-list-container').innerHTML = `
            <div class="welcome-message">
                <h3>Добро пожаловать в систему управления рестораном!</h3>
                <p>Пожалуйста, войдите в систему для работы с заказами.</p>
                <button class="btn-primary" data-action="show-login">Войти в систему</button>
            </div>
        `;
    }

    // --- УПРАВЛЕНИЕ ЗАКАЗАМИ ---

    function handleAddSubmit(event) {
        event.preventDefault();
        const user = model.getCurrentUser();
        if (!user || !user.canCreateOrders) return;

        const form = event.target;
        
        const newOrder = {
            description: form.querySelector('#add-desc').value,
            serviceType: form.querySelector('#add-service').value,
            guests: parseInt(form.querySelector('#add-guests').value, 10),
            phone: form.querySelector('#add-phone').value,
            author: user.username,
            createdAt: new Date(),
            status: 'Новый'
        };

        if (model.addObj(newOrder)) {
            currentPage = 1;
            renderList();
            form.reset();
        } else {
            alert('Ошибка создания заказа');
        }
    }

    function handleEditSubmit(event) {
        event.preventDefault();
        const user = model.getCurrentUser();
        if (!user) return;

        const form = event.target;
        const id = form.querySelector('#edit-id').value;
        const order = model.getObj(id);
        
        // Проверка прав
        if (user.role === 'customer' && order.author !== user.username) {
            alert('Вы можете редактировать только свои заказы');
            return;
        }

        const updatedFields = {
            description: form.querySelector('#edit-desc').value,
            serviceType: form.querySelector('#edit-service').value,
            guests: parseInt(form.querySelector('#edit-guests').value, 10),
            phone: form.querySelector('#edit-phone').value,
            createdAt: form.querySelector('#edit-created-at').value,
        };
        
        if (model.editObj(id, updatedFields)) {
            systemView.hideEditForm();
            renderList();
        } else {
            alert('Ошибка при сохранении');
        }
    }

    function handleFilterSubmit(event) {
        event.preventDefault();
        const status = document.getElementById('status-filter')?.value;
        const author = document.getElementById('author-filter')?.value;

        currentFilter = {};
        if (status) currentFilter.status = status;
        if (author) currentFilter.author = author;

        currentPage = 1;
        renderList();
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    function handleOrderContainerClick(event) {
        const target = event.target;
        const orderItem = target.closest('.order-item');
        if (!orderItem) return;

        const orderId = orderItem.dataset.id;
        const action = target.dataset.action;
        const order = model.getObj(orderId);
        const user = model.getCurrentUser();

        if (!user || !order) return;

        switch(action) {
            case 'delete':
                if (user.role === 'customer' && order.author !== user.username) {
                    alert("Удаление доступно только автору заказа.");
                    return;
                }
                if (user.role === 'customer' || (user.role === 'manager' && user.canDeleteAllOrders)) {
                    if (confirm(`Удалить заказ №${orderId}?`)) {
                        if (model.removeObj(orderId)) {
                            renderList();
                        }
                    }
                }
                break;

            case 'edit':
                if ((user.role === 'customer' && order.author === user.username) || 
                    (user.role === 'manager' && user.canEditAllOrders)) {
                    systemView.showEditForm(order);
                } else {
                    alert("Нет прав для редактирования");
                }
                break;

            case 'complete':
                if (user.role === 'courier' && order.serviceType === 'Доставка') {
                    if (model.editObj(orderId, { status: 'Завершен' })) {
                        renderList();
                    }
                }
                break;

            case 'assign':
                if (user.role === 'manager') {
                    alert(`Курьер назначен на заказ ${orderId}`);
                }
                break;
        }
    }

    function handleHeaderClick(event) {
        const action = event.target.dataset.action;
        
        switch(action) {
            case 'logout':
                handleLogout();
                break;
            case 'show-login':
                systemView.renderAuthForm();
                break;
            case 'show-stats':
                if (model.getCurrentUser()?.role === 'manager') {
                    showStats = true;
                    systemView.renderStats({
                        revenue: model.getRevenueByMonth(),
                        totalOrders: model._orders.length,
                        popularDishes: model.getPopularDishes()
                    });
                }
                break;
            case 'show-add-form':
                document.getElementById('add-form').scrollIntoView({ behavior: 'smooth' });
                break;
        }
    }

    function handleAuthContainerClick(event) {
        if (event.target.dataset.action === 'close-auth') {
            systemView.hideAuthForm();
        }
    }

    // --- ИНИЦИАЛИЗАЦИЯ ---

    function init() {
        systemView = new viewClass(
            'order-list-container',
            'filter-controls-container',
            'header-user-controls',
            'edit-modal-container',
            'load-more-container',
            'auth-container'
        );

        // Устанавливаем текущего пользователя если он есть
        const currentUser = model.getCurrentUser();
        if (currentUser) {
            systemView.setCurrentUser(currentUser);
        }

        // Начальная отрисовка
        systemView.renderHeader();
        systemView.hideAuthForm(); // Скрываем форму авторизации при загрузке
        
        if (currentUser) {
            systemView.renderFilters(model.getObjs(0, model._orders.length));
            renderList();
        } else {
            // Если пользователь не авторизован, показываем приветственное сообщение
            document.getElementById('order-list-container').innerHTML = `
                <div class="welcome-message">
                    <h3>Добро пожаловать в систему управления рестораном!</h3>
                    <p>Пожалуйста, войдите в систему для работы с заказами.</p>
                    <button class="btn-primary" data-action="show-login">Войти в систему</button>
                </div>
            `;
            systemView.renderFilters([]);
        }

        // Обработчики событий
        document.getElementById('add-form')?.addEventListener('submit', handleAddSubmit);
        document.getElementById('filter-form')?.addEventListener('submit', handleFilterSubmit);
        document.getElementById('edit-form')?.addEventListener('submit', handleEditSubmit);
        document.getElementById('edit-cancel-btn')?.addEventListener('click', () => {
            systemView.hideEditForm();
        });

        // Делегирование событий
        document.getElementById('order-list-container')?.addEventListener('click', handleOrderContainerClick);
        document.getElementById('header-user-controls')?.addEventListener('click', handleHeaderClick);
        document.getElementById('auth-container')?.addEventListener('click', handleAuthContainerClick);

        // Форма логина
        document.addEventListener('submit', function(event) {
            if (event.target.id === 'login-form') {
                handleLogin(event);
            }
        });

        // Кнопка "Загрузить еще"
        document.getElementById('load-more-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'load-more-btn') {
                handleLoadMore();
            }
        });

        // Назад из статистики
        document.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'back-to-orders') {
                showStats = false;
                renderList();
            }
        });

        // Обработчик клика вне модального окна
        document.getElementById('auth-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'auth-container') {
                systemView.hideAuthForm();
            }
        });

        // Обработчик клика вне окна редактирования
        document.getElementById('edit-modal-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal-container') {
                systemView.hideEditForm();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})(systemModel, OrderView, ITEMS_PER_PAGE);