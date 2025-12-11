// =======================================================
// === I. КОНФИГУРАЦИЯ ===
// =======================================================

const CURRENT_USER = 'Иванов Иван'; 
const ITEMS_PER_PAGE = 5; 

// =======================================================
// === II. VIEW: ОТОБРАЖЕНИЕ И РАБОТА С DOM ===
// =======================================================

// --- Вспомогательная функция (Создание HTML-элемента) ---
function createOrderElement(order, currentUser) {
    const isAuthor = order.author === currentUser;
    const element = document.createElement('article');
    element.classList.add('order-item');
    element.dataset.id = order.id; // Ключ для делегирования

    const statusClass = order.status ? order.status.toLowerCase().replace(/\s/g, '-') : 'new'; 

    let buttonsHtml = '';
    if (isAuthor) {
        // Кнопки без inline-обработчиков, используем data-action
        buttonsHtml = `
            <div class="actions">
                <button class="btn-edit" data-action="edit">Редактировать</button>
                <button class="btn-delete" data-action="delete">Удалить</button>
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

// --- КЛАСС OrderView ---
class OrderView {
    constructor(orderContainerId, filterContainerId, headerContainerId, editModalId, loadMoreId, currentUser) {
        this._container = document.getElementById(orderContainerId);
        this._filterContainer = document.getElementById(filterContainerId);
        this._headerContainer = document.getElementById(headerContainerId);
        this._editModal = document.getElementById(editModalId);
        this._loadMoreContainer = document.getElementById(loadMoreId);
        this._currentUser = currentUser;
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
            this._headerContainer.innerHTML = `
                <span class="user-info">Здравствуйте, <strong>${this._currentUser}</strong>!</span>
                <button class="btn-primary" data-action="show-add-form">Добавить заказ</button>
            `;
        } else {
            this._headerContainer.innerHTML = `<span class="user-info">Вы не авторизованы.</span>`;
        }
    }
    
    renderFilters(allOrders) {
        const statuses = [...new Set(allOrders.map(o => o.status))];
        
        this._filterContainer.innerHTML = `
            <label for="status-filter">Статус:</label>
            <select id="status-filter">
                <option value="">Все статусы</option>
                ${statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
            </select>
            <label for="author-filter">Автор:</label>
            <input type="text" id="author-filter" placeholder="Фильтр по автору">
            <button type="submit">Применить</button>
        `;
    }

    // Методы для формы редактирования
    showEditForm(order) {
        document.getElementById('edit-id').value = order.id;
        document.getElementById('edit-desc').value = order.description;
        document.getElementById('edit-service').value = order.serviceType;
        document.getElementById('edit-guests').value = order.guests;
        document.getElementById('edit-phone').value = order.phone;
        
        // Форматирование даты для input[type="datetime-local"]
        const dateString = order.createdAt.toISOString().substring(0, 16);
        document.getElementById('edit-created-at').value = dateString;

        this._editModal.style.display = 'flex'; // Используем flex для центрирования
    }

    hideEditForm() {
        this._editModal.style.display = 'none';
    }
    
    // Метод для пагинации
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
// === III. CONTROLLER (Инкапсулирован в IIFE) ===
// =======================================================

(function (model, viewClass, currentUser, itemsPerPage) {
    let systemView;
    let currentFilter = {};
    let currentPage = 1;

    // --- УПРАВЛЕНИЕ СПИСКОМ И ПАГИНАЦИЯ ---

    function renderList() {
        const skip = 0;
        const top = currentPage * itemsPerPage;
        
        const totalFilteredOrders = model.getObjs(0, model._orders.length, currentFilter);
        const visibleOrders = totalFilteredOrders.slice(skip, top);

        systemView.renderOrders(visibleOrders);
        systemView.renderLoadMoreButton(totalFilteredOrders.length, visibleOrders.length);
    }
    
    function handleLoadMore() {
        currentPage++;
        renderList();
    }

    // --- ОБРАБОТКА ФОРМ ---

    function handleAuthSubmit(event) {
        event.preventDefault();
        const username = document.getElementById('auth-username').value;
        if (username.trim()) {
            alert(`Авторизация успешна. Для полной имитации, обновите CURRENT_USER в коде и перезагрузите страницу.`);
        }
    }

    function handleAddSubmit(event) {
        event.preventDefault();
        const form = event.target;
        
        const newOrder = {
            description: form.querySelector('#add-desc').value,
            serviceType: form.querySelector('#add-service').value,
            guests: parseInt(form.querySelector('#add-guests').value, 10),
            phone: form.querySelector('#add-phone').value,
            author: currentUser || 'Аноним', 
            createdAt: new Date(), // Дата создания: сейчас
            status: 'Новый'
        };

        if (model.addObj(newOrder)) {
            currentPage = 1; 
            renderList();
            form.reset();
        } else {
            alert('Ошибка создания заказа. Проверьте введенные данные.');
        }
    }

    function handleEditSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const id = form.querySelector('#edit-id').value;
        
        const updatedFields = {
            description: form.querySelector('#edit-desc').value,
            serviceType: form.querySelector('#edit-service').value,
            guests: parseInt(form.querySelector('#edit-guests').value, 10),
            phone: form.querySelector('#edit-phone').value,
            createdAt: form.querySelector('#edit-created-at').value, // Строка даты
        };
        
        if (model.editObj(id, updatedFields)) {
            systemView.hideEditForm();
            // Перерисовка всего списка для обновления сортировки
            renderList(); 
        } else {
            alert('Ошибка при сохранении изменений. Проверьте данные.');
        }
    }

    function handleFilterSubmit(event) {
        event.preventDefault();
        const status = document.getElementById('status-filter').value;
        const author = document.getElementById('author-filter').value;

        currentFilter = {};
        if (status) currentFilter.status = status;
        if (author) currentFilter.author = author;

        currentPage = 1; // Сброс пагинации при фильтрации
        renderList();
    }
    
    // --- ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ДИНАМИЧЕСКОГО КОНТЕНТА ---

    function handleOrderContainerClick(event) {
        const target = event.target;
        const orderItem = target.closest('.order-item');
        if (!orderItem) return;

        const orderId = orderItem.dataset.id;
        const action = target.dataset.action;
        const order = model.getObj(orderId);

        if (action === 'delete') {
            if (confirm(`Вы уверены, что хотите удалить заказ №${orderId}?`)) {
                if (order.author !== currentUser) {
                     alert("Удаление доступно только автору заказа.");
                     return;
                }
                if (model.removeObj(orderId)) { 
                    renderList(); // Перерисовываем, чтобы заполнить пустое место
                }
            }
        } else if (action === 'edit') {
            if (order.author !== currentUser) {
                alert("Редактирование доступно только автору заказа.");
                return;
            }
            if (order) {
                systemView.showEditForm(order);
            }
        }
    }


    // --- ИНИЦИАЛИЗАЦИЯ (ENTRY POINT) ---

    function init() {
        // 1. Инициализация View
        systemView = new viewClass(
            'order-list-container', 
            'filter-controls-container', 
            'header-user-controls', 
            'edit-modal-container',
            'load-more-container',
            currentUser
        );
        
        // 2. Начальная отрисовка
        systemView.renderHeader();
        systemView.renderFilters(model.getObjs(0, model._orders.length)); 
        renderList();

        // 3. Обработчики событий (Контроллер)
        
        document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);
        document.getElementById('add-form')?.addEventListener('submit', handleAddSubmit);
        document.getElementById('filter-form')?.addEventListener('submit', handleFilterSubmit);
        document.getElementById('edit-form')?.addEventListener('submit', handleEditSubmit);
        
        // Делегирование: Кнопки "Редактировать"/"Удалить"
        document.getElementById('order-list-container')?.addEventListener('click', handleOrderContainerClick);

        // Делегирование: Кнопка "Загрузить еще"
        document.getElementById('load-more-container')?.addEventListener('click', (e) => {
            if (e.target.id === 'load-more-btn') {
                handleLoadMore();
            }
        });

        // Кнопка отмены редактирования
        document.getElementById('edit-cancel-btn')?.addEventListener('click', () => {
             systemView.hideEditForm();
        });
        
        console.log('Приложение готово. Контроллер запущен.');
    }

    document.addEventListener('DOMContentLoaded', init);

})(systemModel, OrderView, CURRENT_USER, ITEMS_PER_PAGE);