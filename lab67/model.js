// =======================================================
// === 1. MOCK DATA (ДАННЫЕ) ===
// =======================================================

const mockData = [
    { id: '1', description: 'Бронь на день рождения, нужен торт.', createdAt: new Date('2023-10-01T10:00:00'), author: 'Иванов Иван', phone: '+79001112233', serviceType: 'В ресторане', guests: 5, status: 'Подтвержден' },
    { id: '2', description: 'Тихий столик у окна.', createdAt: new Date('2023-10-01T11:30:00'), author: 'Петрова Анна', phone: '+79004445566', serviceType: 'В ресторане', guests: 2, status: 'В ожидании' },
    { id: '3', description: 'Доставка офисных обедов.', createdAt: new Date('2023-10-02T09:15:00'), author: 'Сидоров Алексей', phone: '+79007778899', serviceType: 'Доставка', guests: 10, status: 'В пути' },
    { id: '4', description: 'Банкет, корпоратив.', createdAt: new Date('2023-10-02T14:00:00'), author: 'ООО "Вектор"', phone: '+79001234567', serviceType: 'В ресторане', guests: 20, status: 'Подтвержден' },
    { id: '5', description: 'Ужин на двоих.', createdAt: new Date('2023-10-03T18:00:00'), author: 'Смирнов Дмитрий', phone: '+79009876543', serviceType: 'В ресторане', guests: 2, status: 'Завершен' },
    { id: '6', description: 'Детский праздник', createdAt: new Date('2023-10-04T12:00:00'), author: 'Мария К.', phone: '12345', serviceType: 'В ресторане', guests: 8, status: 'В ожидании' },
    { id: '7', description: 'Пицца пепперони x3', createdAt: new Date('2023-10-04T13:00:00'), author: 'Коля', phone: '54321', serviceType: 'Доставка', guests: 1, status: 'В пути' },
    { id: '8', description: 'Встреча выпускников', createdAt: new Date('2023-10-05T17:00:00'), author: 'Иванов Иван', phone: '11223', serviceType: 'В ресторане', guests: 15, status: 'Подтвержден' },
    { id: '9', description: 'Завтрак', createdAt: new Date('2023-10-06T08:00:00'), author: 'Олег', phone: '33221', serviceType: 'В ресторане', guests: 1, status: 'Завершен' },
    { id: '10', description: 'Сеты суши', createdAt: new Date('2023-10-06T19:00:00'), author: 'Алина', phone: '44556', serviceType: 'Доставка', guests: 4, status: 'Новый' },
    { id: '11', description: 'Бизнес-ланч', createdAt: new Date('2023-10-07T12:30:00'), author: 'Максим', phone: '77889', serviceType: 'В ресторане', guests: 3, status: 'Завершен' },
    { id: '12', description: 'Юбилей 50 лет', createdAt: new Date('2023-10-08T15:00:00'), author: 'Валентина', phone: '99001', serviceType: 'В ресторане', guests: 50, status: 'Подтвержден' },
    { id: '13', description: 'Бургеры на дом', createdAt: new Date('2023-10-08T20:00:00'), author: 'Стас', phone: '22334', serviceType: 'Доставка', guests: 2, status: 'В пути' },
    { id: '14', description: 'Кофе и десерт', createdAt: new Date('2023-10-09T10:00:00'), author: 'Виктория', phone: '55667', serviceType: 'В ресторане', guests: 1, status: 'Новый' },
    { id: '15', description: 'Семейный обед', createdAt: new Date('2023-10-09T14:00:00'), author: 'Иванов Иван', phone: '88990', serviceType: 'В ресторане', guests: 4, status: 'Подтвержден' },
    { id: '16', description: 'Романтический ужин', createdAt: new Date('2023-10-10T19:30:00'), author: 'Артем', phone: '11122', serviceType: 'В ресторане', guests: 2, status: 'Завершен' },
    { id: '17', description: 'Заказ пирогов', createdAt: new Date('2023-10-11T09:00:00'), author: 'Офис 303', phone: '33344', serviceType: 'Доставка', guests: 20, status: 'Подтвержден' },
    { id: '18', description: 'VIP комната', createdAt: new Date('2023-10-12T21:00:00'), author: 'Григорий Лепс', phone: '55566', serviceType: 'В ресторане', guests: 5, status: 'В ожидании' },
    { id: '19', description: 'Веганское меню', createdAt: new Date('2023-10-13T13:00:00'), author: 'Лиза', phone: '77788', serviceType: 'Доставка', guests: 1, status: 'Новый' },
    { id: '20', description: 'Чайная церемония', createdAt: new Date('2023-10-14T16:00:00'), author: 'Клуб чая', phone: '99900', serviceType: 'В ресторане', guests: 6, status: 'Подтвержден' }
];

// =======================================================
// === 2. КЛАСС OrderCollection (MODEL) ===
// =======================================================

class OrderCollection {
    _orders = [];
    STORAGE_KEY = 'orderAppData';
    _nextOrderId = 1; // Для инкрементирующегося ID

    constructor(initialData = []) {
        this.restore();
        
        if (this._orders.length === 0 && initialData.length > 0) {
            this.addAll(initialData);
            this.save();
        }
        
        // Установка _nextOrderId на основе восстановленных или mock-данных
        this._setNextOrderId();
    }
    
    // Вспомогательный метод для определения следующего ID
    _setNextOrderId() {
        const currentMaxId = this._orders.reduce((max, order) => {
            const idNum = parseInt(order.id, 10);
            return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);
        this._nextOrderId = currentMaxId + 1;
    }

    // --- МЕТОДЫ PERSISTENCE ---

    save() {
        try {
            const serializableOrders = this._orders.map(order => ({
                ...order,
                createdAt: order.createdAt.toISOString() // Сохраняем дату в виде ISO строки
            }));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializableOrders));
        } catch (e) {
            console.error("Ошибка при сохранении в localStorage:", e);
        }
    }

    restore() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                
                this._orders = parsedData.map(order => ({
                    ...order,
                    createdAt: new Date(order.createdAt) // Обратно в объект Date
                }));
            }
        } catch (e) {
            console.error("Ошибка при восстановлении из localStorage:", e);
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    // --- CRUD МЕТОДЫ ---

    getObjs(skip = 0, top = 10, filterConfig = {}) {
        let result = [...this._orders];
        
        // Фильтрация (простая реализация: точное совпадение или частичное для строк)
        if (Object.keys(filterConfig).length > 0) {
            result = result.filter(order => {
                for (let key in filterConfig) {
                    const filterValue = filterConfig[key].toString().toLowerCase();
                    const orderValue = order[key] ? order[key].toString().toLowerCase() : '';
                    
                    if (key === 'author') {
                        // Частичное совпадение для поиска по автору
                        if (!orderValue.includes(filterValue)) return false;
                    } else if (orderValue !== filterValue) {
                        // Точное совпадение для статуса
                        return false;
                    }
                }
                return true;
            });
        }

        // Сортировка: по дате создания (createdAt) от нового к старому.
        result.sort((a, b) => b.createdAt - a.createdAt);

        // Пагинация
        return result.slice(skip, skip + top);
    }

    getObj(id) {
        return this._orders.find(order => order.id === id) || null;
    }

    validateObj(obj) {
        // Проверяем обязательные поля
        if (!obj.id || typeof obj.id !== 'string') return false;
        if (!obj.description || typeof obj.description !== 'string' || obj.description.length >= 200) return false;
        if (!(obj.createdAt instanceof Date) || isNaN(obj.createdAt)) return false; // Проверка на валидность даты
        if (!obj.author || typeof obj.author !== 'string' || obj.author.trim() === '') return false;
        if (!obj.phone || typeof obj.phone !== 'string') return false; 
        if (typeof obj.guests !== 'number' || obj.guests < 1) return false;
        return true;
    }

    addObj(obj) {
        // 5. Инкрементирующийся ID
        if (!obj.id) {
            obj.id = (this._nextOrderId++).toString();
        }

        if (this.validateObj(obj) && !this.getObj(obj.id)) {
            this._orders.push(obj);
            this.save();
            return true;
        }
        return false;
    }

    editObj(id, newFields) {
        const index = this._orders.findIndex(o => o.id === id);
        if (index === -1) return false;

        const currentObj = this._orders[index];
        
        // Разрешаем все поля, кроме ID. Дату (createdAt) обрабатываем отдельно.
        const { id: _, ...allowedUpdates } = newFields; 

        let updatedObj = { ...currentObj, ...allowedUpdates };

        // 5. Обработка изменения даты (конвертация строки в Date)
        if (newFields.createdAt && typeof newFields.createdAt === 'string') {
             const newDate = new Date(newFields.createdAt);
             if (!isNaN(newDate)) {
                 updatedObj.createdAt = newDate;
             }
        }
        
        // Валидация обновленного объекта
        if (this.validateObj(updatedObj)) {
            this._orders[index] = updatedObj;
            this.save();
            return true;
        }
        return false;
    }

    removeObj(id) {
        const initialLength = this._orders.length;
        this._orders = this._orders.filter(order => order.id !== id);
        
        if (this._orders.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }
    
    addAll(objs) {
        const failed = [];
        objs.forEach(obj => { 
             // При добавлении mock-данных не инкрементируем счетчик, используем их ID
             if (!this.addObj(obj)) failed.push(obj); 
        });
        return failed; 
    }
}

// Глобальный экземпляр Модели
const systemModel = new OrderCollection(mockData);