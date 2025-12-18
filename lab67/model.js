// model.js - Модель данных с системой пользователей

// =======================================================
// === СИСТЕМА ПОЛЬЗОВАТЕЛЕЙ ===
// =======================================================

class User {
    constructor(id, username, password, role, attributes = {}) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.role = role; // 'customer', 'courier', 'manager'
        this.attributes = attributes;
        this.isAuthenticated = false;
    }

    authenticate(password) {
        this.isAuthenticated = (this.password === password);
        return this.isAuthenticated;
    }

    logout() {
        this.isAuthenticated = false;
    }
}

class Customer extends User {
    constructor(id, username, password, attributes = {}) {
        super(id, username, password, 'customer', attributes);
        this.defaultPhone = attributes.phone || '';
        this.defaultAddress = attributes.address || '';
        this.loyaltyPoints = attributes.loyaltyPoints || 0;
        this.preferredHall = attributes.preferredHall || '';
        this.canCreateOrders = true;
        this.canEditOwnOrders = true;
        this.canDeleteOwnOrders = true;
    }
}

class Courier extends User {
    constructor(id, username, password, attributes = {}) {
        super(id, username, password, 'courier', attributes);
        this.vehicleType = attributes.vehicleType || '';
        this.rating = attributes.rating || 0;
        this.currentDeliveryZone = attributes.deliveryZone || '';
        this.isAvailable = attributes.isAvailable || true;
        this.canCreateOrders = false;
        this.canEditOwnOrders = false;
        this.canDeleteOwnOrders = false;
        this.canUpdateDeliveryStatus = true;
        this.assignedOrders = attributes.assignedOrders || [];
    }
}

class Manager extends User {
    constructor(id, username, password, attributes = {}) {
        super(id, username, password, 'manager', attributes);
        this.restaurantBranch = attributes.restaurantBranch || 'main';
        this.accessLevel = attributes.accessLevel || 'full';
        this.canCreateOrders = true;
        this.canEditAllOrders = true;
        this.canDeleteAllOrders = true;
        this.canViewStatistics = true;
        this.canManageUsers = true;
    }
}

// =======================================================
// === МОДЕЛЬ ЗАКАЗОВ ===
// =======================================================

class OrderCollection {
    _orders = [];
    _users = [];
    STORAGE_KEY = 'orderAppData';
    USERS_KEY = 'orderAppUsers';
    _nextOrderId = 1;
    _currentUser = null;

    constructor(initialData = [], initialUsers = []) {
        this.restore();
        
        if (this._orders.length === 0 && initialData.length > 0) {
            this.addAll(initialData);
        }
        
        if (this._users.length === 0 && initialUsers.length > 0) {
            this.addAllUsers(initialUsers);
        }
        
        this._setNextOrderId();
        this.save();
    }
    
    // --- МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ---

    addUser(user) {
        if (!this.getUserById(user.id) && !this.getUserByUsername(user.username)) {
            this._users.push(user);
            this.save();
            return true;
        }
        return false;
    }

    addAllUsers(users) {
        users.forEach(user => this.addUser(user));
    }

    getUserById(id) {
        return this._users.find(user => user.id === id) || null;
    }

    getUserByUsername(username) {
        return this._users.find(user => user.username === username) || null;
    }

    authenticateUser(username, password) {
        const user = this.getUserByUsername(username);
        if (user && user.authenticate(password)) {
            this._currentUser = user;
            this.save();
            return user;
        }
        return null;
    }

    logoutUser() {
        if (this._currentUser) {
            this._currentUser.logout();
        }
        this._currentUser = null;
        this.save();
    }

    getCurrentUser() {
        return this._currentUser;
    }

    getAllUsers() {
        return [...this._users];
    }

    // --- МЕТОДЫ ДЛЯ ЗАКАЗОВ ---

    _setNextOrderId() {
        const currentMaxId = this._orders.reduce((max, order) => {
            const idNum = parseInt(order.id, 10);
            return isNaN(idNum) ? max : Math.max(max, idNum);
        }, 0);
        this._nextOrderId = currentMaxId + 1;
    }

    save() {
        try {
            const serializableOrders = this._orders.map(order => ({
                ...order,
                createdAt: order.createdAt.toISOString()
            }));

            const serializableUsers = this._users.map(user => ({
                ...user,
                isAuthenticated: false
            }));

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializableOrders));
            localStorage.setItem(this.USERS_KEY, JSON.stringify(serializableUsers));
        } catch (e) {
            console.error("Ошибка при сохранении в localStorage:", e);
        }
    }

    restore() {
        try {
            // Восстанавливаем заказы
            const ordersData = localStorage.getItem(this.STORAGE_KEY);
            if (ordersData) {
                const parsedData = JSON.parse(ordersData);
                this._orders = parsedData.map(order => ({
                    ...order,
                    createdAt: new Date(order.createdAt)
                }));
            }

            // Восстанавливаем пользователей
            const usersData = localStorage.getItem(this.USERS_KEY);
            if (usersData) {
                const parsedUsers = JSON.parse(usersData);
                
                this._users = parsedUsers.map(userData => {
                    let user;
                    switch(userData.role) {
                        case 'customer':
                            user = new Customer(
                                userData.id,
                                userData.username,
                                userData.password,
                                userData.attributes
                            );
                            break;
                        case 'courier':
                            user = new Courier(
                                userData.id,
                                userData.username,
                                userData.password,
                                userData.attributes
                            );
                            break;
                        case 'manager':
                            user = new Manager(
                                userData.id,
                                userData.username,
                                userData.password,
                                userData.attributes
                            );
                            break;
                        default:
                            user = new User(
                                userData.id,
                                userData.username,
                                userData.password,
                                userData.role,
                                userData.attributes
                            );
                    }
                    return user;
                });
            }
        } catch (e) {
            console.error("Ошибка при восстановлении из localStorage:", e);
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.USERS_KEY);
        }
    }

    getObjs(skip = 0, top = 10, filterConfig = {}) {
        let result = [...this._orders];
        
        if (Object.keys(filterConfig).length > 0) {
            result = result.filter(order => {
                for (let key in filterConfig) {
                    const filterValue = filterConfig[key].toString().toLowerCase();
                    const orderValue = order[key] ? order[key].toString().toLowerCase() : '';
                    
                    if (key === 'author') {
                        if (!orderValue.includes(filterValue)) return false;
                    } else if (orderValue !== filterValue) {
                        return false;
                    }
                }
                return true;
            });
        }

        result.sort((a, b) => b.createdAt - a.createdAt);
        return result.slice(skip, skip + top);
    }

    getObj(id) {
        return this._orders.find(order => order.id === id) || null;
    }

    validateObj(obj) {
        if (!obj.id || typeof obj.id !== 'string') return false;
        if (!obj.description || typeof obj.description !== 'string' || obj.description.length >= 200) return false;
        if (!(obj.createdAt instanceof Date) || isNaN(obj.createdAt)) return false;
        if (!obj.author || typeof obj.author !== 'string' || obj.author.trim() === '') return false;
        if (!obj.phone || typeof obj.phone !== 'string') return false;
        if (typeof obj.guests !== 'number' || obj.guests < 1) return false;
        return true;
    }

    addObj(obj) {
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
        const { id: _, ...allowedUpdates } = newFields;
        let updatedObj = { ...currentObj, ...allowedUpdates };

        if (newFields.createdAt && typeof newFields.createdAt === 'string') {
            const newDate = new Date(newFields.createdAt);
            if (!isNaN(newDate)) {
                updatedObj.createdAt = newDate;
            }
        }
        
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
            if (!this.addObj(obj)) failed.push(obj);
        });
        return failed;
    }

    // Методы для статистики (для менеджера)
    getRevenueByMonth() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const completedOrders = this._orders.filter(order => {
            const orderDate = order.createdAt;
            return order.status === 'Завершен' && 
                   orderDate.getMonth() === currentMonth &&
                   orderDate.getFullYear() === currentYear;
        });

        // Пример: каждый заказ приносит 1000 рублей
        return completedOrders.length * 1000;
    }

    getPopularDishes() {
        // Простая имитация популярных блюд
        return [
            { name: 'Стейк Рибай', count: 25 },
            { name: 'Салат Цезарь', count: 18 },
            { name: 'Паста Карбонара', count: 15 },
            { name: 'Пицца Маргарита', count: 12 }
        ];
    }
}

// =======================================================
// === ИНИЦИАЛИЗАЦИЯ ДАННЫХ ===
// =======================================================

const mockData = [
    { id: '1', description: 'Бронь на день рождения, нужен торт.', createdAt: new Date('2023-10-01T10:00:00'), author: 'ivanov', phone: '+79001112233', serviceType: 'В ресторане', guests: 5, status: 'Подтвержден' },
    { id: '2', description: 'Тихий столик у окна.', createdAt: new Date('2023-10-01T11:30:00'), author: 'petrova', phone: '+79004445566', serviceType: 'В ресторане', guests: 2, status: 'В ожидании' },
    { id: '3', description: 'Доставка офисных обедов.', createdAt: new Date('2023-10-02T09:15:00'), author: 'ivanov', phone: '+79007778899', serviceType: 'Доставка', guests: 10, status: 'В пути' },
    { id: '4', description: 'Банкет, корпоратив.', createdAt: new Date('2023-10-02T14:00:00'), author: 'manager1', phone: '+79001234567', serviceType: 'В ресторане', guests: 20, status: 'Подтвержден' },
    { id: '5', description: 'Ужин на двоих.', createdAt: new Date('2023-10-03T18:00:00'), author: 'ivanov', phone: '+79009876543', serviceType: 'В ресторане', guests: 2, status: 'Завершен' },
    { id: '6', description: 'Детский праздник', createdAt: new Date('2023-10-04T12:00:00'), author: 'petrova', phone: '12345', serviceType: 'В ресторане', guests: 8, status: 'В ожидании' },
    { id: '7', description: 'Пицца пепперони x3', createdAt: new Date('2023-10-04T13:00:00'), author: 'petrova', phone: '54321', serviceType: 'Доставка', guests: 1, status: 'В пути' },
    { id: '8', description: 'Встреча выпускников', createdAt: new Date('2023-10-05T17:00:00'), author: 'ivanov', phone: '11223', serviceType: 'В ресторане', guests: 15, status: 'Подтвержден' },
    { id: '9', description: 'Завтрак', createdAt: new Date('2023-10-06T08:00:00'), author: 'manager1', phone: '33221', serviceType: 'В ресторане', guests: 1, status: 'Завершен' },
    { id: '10', description: 'Сеты суши', createdAt: new Date('2023-10-06T19:00:00'), author: 'ivanov', phone: '44556', serviceType: 'Доставка', guests: 4, status: 'Новый' }
];

const initialUsers = [
    new Customer('1', 'ivanov', '123456', {
        phone: '+79001112233',
        address: 'ул. Ленина, 10',
        loyaltyPoints: 150,
        preferredHall: 'Основной зал'
    }),
    new Courier('2', 'courier1', '123456', {
        vehicleType: 'car',
        rating: 4.8,
        deliveryZone: 'Центральный район',
        isAvailable: true,
        assignedOrders: ['3', '7', '10']
    }),
    new Manager('3', 'manager1', '123456', {
        restaurantBranch: 'main',
        accessLevel: 'full'
    }),
    new Customer('4', 'petrova', '123456', {
        phone: '+79004445566',
        address: 'ул. Мира, 25',
        loyaltyPoints: 75,
        preferredHall: 'Терраса'
    })
];

// Глобальный экземпляр Модели
const systemModel = new OrderCollection(mockData, initialUsers);