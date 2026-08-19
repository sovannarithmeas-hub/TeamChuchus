// ==============================================
// TELEGRAM CLOTHING SHOP - MAIN APPLICATION
// ==============================================

import { createClient } from '@supabase/supabase-js';

// ===== CONFIGURATION =====
// យកតម្លៃទាំងនេះពី Supabase → Settings → API
const SUPABASE_URL = 'https://gzclvhcvsfcslilxaiyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y2x2aGN2c2Zjc2xpbHhhaXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjUyMjAsImV4cCI6MjEwMTYwMTIyMH0.8gD4bwPpxdLl9kGtPVCRRPylEsES_DHWH4KhKDJvzuE';

// ===== SUPABASE CLIENT =====
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== TELEGRAM WEBAPP =====
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// ===== STATE MANAGEMENT =====
const state = {
    currentPage: 'home',
    products: [],
    cart: [],
    inventory: [],
    currentProduct: null,
    selectedSize: null,
    selectedColor: null,
    quantity: 1,
    user: tg.initDataUnsafe?.user || null,
    customer: null,
};

// ===== DOM REFERENCES =====
const $ = (id) => document.getElementById(id);
const pageContainer = $('pageContainer');
const loading = $('loading');
const backBtn = $('backBtn');
const pageTitle = $('pageTitle');
const cartBtn = $('cartBtn');
const cartCount = $('cartCount');
const adminBtn = $('adminBtn');

// ===== TOAST NOTIFICATION =====
function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ===== TELEGRAM HAPTIC FEEDBACK =====
function haptic(type = 'medium') {
    try {
        tg.HapticFeedback.impactOccurred(type);
    } catch (e) { /* ignore */ }
}

// ===== NAVIGATION =====
function navigate(page, data = null) {
    state.currentPage = page;
    
    if (page === 'home') {
        backBtn.style.display = 'none';
        pageTitle.textContent = 'ហាងខោអាវជជុស';
    } else if (page === 'cart') {
        backBtn.style.display = 'flex';
        pageTitle.textContent = 'កន្ត្រក​ទំនិញ';
    } else if (page === 'product') {
        backBtn.style.display = 'flex';
        pageTitle.textContent = 'លម្អិត​ផលិតផល';
    } else if (page === 'checkout') {
        backBtn.style.display = 'flex';
        pageTitle.textContent = 'បញ្ជាទិញ';
    } else if (page.startsWith('admin')) {
        backBtn.style.display = 'flex';
        pageTitle.textContent = 'ផ្ទាំង​គ្រប់គ្រង';
    }
    
    renderPage(page, data);
    updateCartBadge();
    window.scrollTo(0, 0);
}

// ===== RENDER FUNCTIONS =====
async function renderPage(page, data) {
    switch (page) {
        case 'home':
            await renderHome();
            break;
        case 'product':
            await renderProduct(data);
            break;
        case 'cart':
            renderCart();
            break;
        case 'checkout':
            await renderCheckout();
            break;
        case 'admin-dashboard':
            await renderAdminDashboard();
            break;
        case 'admin-inventory':
            await renderAdminInventory();
            break;
        case 'admin-orders':
            await renderAdminOrders();
            break;
        case 'admin-reports':
            await renderAdminReports();
            break;
        default:
            pageContainer.innerHTML = '<p>ទំព័រ​មិន​មាន</p>';
    }
}

// ==============================================
// HOME PAGE
// ==============================================
async function renderHome() {
    if (state.products.length === 0) {
        await loadProducts();
    }
    
    let html = `<div class="products-grid">`;
    
    for (const product of state.products) {
        const totalStock = state.inventory
            .filter(i => i.product_id === product.id)
            .reduce((sum, i) => sum + i.quantity, 0);
        
        html += `
            <div class="product-card" data-product-id="${product.id}">
                <img src="${product.image_url || 'https://picsum.photos/seed/' + product.id + '/400/400'}" 
                     class="product-image" 
                     alt="${product.name}"
                     loading="lazy">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-price">${product.price}</div>
                    <div class="product-stock">${totalStock > 0 ? `ស្តុក: ${totalStock}` : 'អស់​ស្តុក'}</div>
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    pageContainer.innerHTML = html;
    
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = card.dataset.productId;
            const product = state.products.find(p => p.id === productId);
            if (product) navigate('product', product);
        });
    });
}

// ==============================================
// PRODUCT DETAIL PAGE
// ==============================================
async function renderProduct(product) {
    state.currentProduct = product;
    state.selectedSize = null;
    state.selectedColor = null;
    state.quantity = 1;
    
    const productInventory = state.inventory.filter(i => i.product_id === product.id);
    const availableSizes = [...new Set(productInventory.map(i => i.size))];
    const availableColors = [...new Set(productInventory.map(i => i.color))];
    
    if (availableSizes.length > 0) state.selectedSize = availableSizes[0];
    if (availableColors.length > 0) state.selectedColor = availableColors[0];
    
    const getStock = (size, color) => {
        const item = productInventory.find(i => i.size === size && i.color === color);
        return item ? item.quantity : 0;
    };
    
    let html = `
        <div class="product-detail">
            <img src="${product.image_url || 'https://picsum.photos/seed/' + product.id + '/600/600'}" 
                 class="product-detail-image" 
                 alt="${product.name}">
            <div class="product-detail-content">
                <div class="product-detail-name">${product.name}</div>
                <div class="product-detail-price">$${product.price}</div>
                <div class="product-detail-desc">${product.description || 'គ្មាន​ការ​ពណ៌នា'}</div>
                
                <div class="selector-label">ទំហំ</div>
                <div class="size-grid">
    `;
    
    for (const size of availableSizes) {
        const hasStock = productInventory.some(i => i.size === size && i.quantity > 0);
        const selected = state.selectedSize === size ? 'selected' : '';
        html += `<button class="size-btn ${selected}" data-size="${size}" ${!hasStock ? 'disabled' : ''}>${size}</button>`;
    }
    
    html += `
                </div>
                
                <div class="selector-label">ពណ៌</div>
                <div class="color-grid">
    `;
    
    const colorMap = {
        'ខៀវ': '#2563eb', 'ខ្មៅ': '#1a1a1a', 'ស': '#ffffff',
        'ក្រហម': '#dc2626', 'ផ្កាឈូក': '#ec4899', 'ត្នោត': '#8b6914',
        'បៃតង': '#16a34a', 'លឿង': '#eab308', 'ប្រផេះ': '#6b7280'
    };
    
    for (const color of availableColors) {
        const hasStock = productInventory.some(i => i.color === color && i.quantity > 0);
        const selected = state.selectedColor === color ? 'selected' : '';
        const bg = colorMap[color] || '#cccccc';
        html += `<button class="color-btn ${selected}" data-color="${color}" style="background:${bg};${color === 'ស' ? 'border-color:#ccc;' : ''}" ${!hasStock ? 'disabled' : ''}></button>`;
    }
    
    html += `
                </div>
                
                <div class="selector-label">ចំនួន</div>
                <div class="quantity-selector">
                    <button class="quantity-btn" id="quantityMinus">-</button>
                    <span class="quantity-display" id="quantityDisplay">${state.quantity}</span>
                    <button class="quantity-btn" id="quantityPlus">+</button>
                </div>
                
                <div id="stockInfo" style="font-size:13px;color:var(--tg-hint);margin:8px 0;">
                    ${state.selectedSize && state.selectedColor ? 
                        `ស្តុក: ${getStock(state.selectedSize, state.selectedColor)}` : 
                        'សូម​ជ្រើស​រើស​ទំហំ និង​ពណ៌'
                    }
                </div>
                
                <button class="btn-primary" id="addToCartBtn" ${!state.selectedSize || !state.selectedColor || getStock(state.selectedSize, state.selectedColor) === 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i> បន្ថែម​ទៅ​កន្ត្រក
                </button>
            </div>
        </div>
    `;
    
    pageContainer.innerHTML = html;
    
    // Size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            state.selectedSize = this.dataset.size;
            updateStockInfo();
            updateAddToCartBtn();
        });
    });
    
    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            state.selectedColor = this.dataset.color;
            updateStockInfo();
            updateAddToCartBtn();
        });
    });
    
    // Quantity
    $('quantityMinus').addEventListener('click', () => {
        if (state.quantity > 1) {
            state.quantity--;
            $('quantityDisplay').textContent = state.quantity;
        }
    });
    
    $('quantityPlus').addEventListener('click', () => {
        const maxStock = getStock(state.selectedSize, state.selectedColor);
        if (state.quantity < maxStock) {
            state.quantity++;
            $('quantityDisplay').textContent = state.quantity;
        } else {
            showToast('មិន​មាន​ស្តុក​គ្រប់គ្រាន់');
        }
    });
    
    // Add to cart
    $('addToCartBtn').addEventListener('click', () => {
        if (!state.selectedSize || !state.selectedColor) {
            showToast('សូម​ជ្រើស​រើស​ទំហំ និង​ពណ៌');
            return;
        }
        
        const stock = getStock(state.selectedSize, state.selectedColor);
        if (stock < state.quantity) {
            showToast('មិន​មាន​ស្តុក​គ្រប់គ្រាន់');
            return;
        }
        
        const inventoryItem = state.inventory.find(
            i => i.product_id === product.id && 
                 i.size === state.selectedSize && 
                 i.color === state.selectedColor
        );
        
        if (!inventoryItem) {
            showToast('ផលិតផល​នេះ​មិន​មាន​ស្តុក');
            return;
        }
        
        addToCart(product, inventoryItem, state.quantity);
        haptic('light');
        showToast(`បាន​បន្ថែម ${product.name} (${state.selectedSize}) ${state.quantity} ទៅ​កន្ត្រក`);
    });
    
    function updateStockInfo() {
        const stock = getStock(state.selectedSize, state.selectedColor);
        document.getElementById('stockInfo').textContent = 
            state.selectedSize && state.selectedColor ? 
                `ស្តុក: ${stock}` : 
                'សូម​ជ្រើស​រើស​ទំហំ និង​ពណ៌';
    }
    
    function updateAddToCartBtn() {
        const btn = document.getElementById('addToCartBtn');
        const stock = getStock(state.selectedSize, state.selectedColor);
        btn.disabled = !(state.selectedSize && state.selectedColor && stock > 0);
    }
    
    function getStock(size, color) {
        const item = productInventory.find(i => i.size === size && i.color === color);
        return item ? item.quantity : 0;
    }
}

// ==============================================
// CART FUNCTIONS
// ==============================================
function addToCart(product, inventoryItem, quantity) {
    const existing = state.cart.find(item => item.inventory_id === inventoryItem.id);
    
    if (existing) {
        existing.quantity += quantity;
    } else {
        state.cart.push({
            inventory_id: inventoryItem.id,
            product_id: product.id,
            product_name: product.name,
            size: inventoryItem.size,
            color: inventoryItem.color,
            price: product.price,
            quantity: quantity,
            image_url: product.image_url,
            max_stock: inventoryItem.quantity
        });
    }
    
    updateCartBadge();
    saveCartToStorage();
}

function removeFromCart(inventoryId) {
    state.cart = state.cart.filter(item => item.inventory_id !== inventoryId);
    updateCartBadge();
    saveCartToStorage();
    renderCart();
}

function updateCartBadge() {
    const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = total;
    cartCount.style.display = total > 0 ? 'inline' : 'none';
}

function saveCartToStorage() {
    try {
        localStorage.setItem('cart', JSON.stringify(state.cart));
    } catch (e) { /* ignore */ }
}

function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('cart');
        if (saved) {
            state.cart = JSON.parse(saved);
            updateCartBadge();
        }
    } catch (e) { /* ignore */ }
}

// ==============================================
// CART PAGE
// ==============================================
function renderCart() {
    if (state.cart.length === 0) {
        pageContainer.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-shopping-cart" style="font-size:48px;color:var(--tg-hint);margin-bottom:16px;"></i>
                <p style="color:var(--tg-hint);font-size:16px;">កន្ត្រក​របស់​អ្នក​នៅ​ទទេ</p>
                <button class="btn-primary" style="margin-top:20px;max-width:200px;" onclick="navigate('home')">
                    ត្រលប់​ទៅ​ទិញ​ទំនិញ
                </button>
            </div>
        `;
        return;
    }
    
    let html = `<div class="cart-items">`;
    let total = 0;
    
    for (const item of state.cart) {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        html += `
            <div class="cart-item">
                <img src="${item.image_url || 'https://picsum.photos/seed/' + item.product_id + '/200/200'}" 
                     class="cart-item-image" 
                     alt="${item.product_name}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.product_name}</div>
                    <div class="cart-item-detail">ទំហំ: ${item.size} | ពណ៌: ${item.color}</div>
                    <div class="cart-item-detail">ចំនួន: ${item.quantity}</div>
                    <div class="cart-item-price">$${itemTotal}</div>
                </div>
                <button class="cart-item-remove" data-inventory-id="${item.inventory_id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    html += `
        </div>
        <div class="cart-total">
            <span>សរុប</span>
            <span>$${total.toFixed(2)}</span>
        </div>
        <button class="btn-primary btn-success" id="checkoutBtn">
            <i class="fas fa-credit-card"></i> បញ្ជាទិញ
        </button>
    `;
    
    pageContainer.innerHTML = html;
    
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            removeFromCart(this.dataset.inventoryId);
            haptic('light');
            showToast('បាន​ដក​ចេញ​ពី​កន្ត្រក');
        });
    });
    
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        if (state.cart.length === 0) {
            showToast('កន្ត្រក​របស់​អ្នក​នៅ​ទទេ');
            return;
        }
        navigate('checkout');
    });
}

// ==============================================
// LOAD PRODUCTS
// ==============================================
async function loadProducts() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        state.products = products;
        
        const { data: inventory, error: invError } = await supabase
            .from('inventory')
            .select('*');
        
        if (invError) throw invError;
        state.inventory = inventory;
        
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('មិន​អាច​ផ្ទុក​ផលិតផល​បាន');
    }
}

// ==============================================
// CHECKOUT PAGE
// ==============================================
async function renderCheckout() {
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    let customer = state.customer;
    if (!customer && state.user) {
        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('telegram_id', state.user.id)
            .single();
        if (data) {
            customer = data;
            state.customer = customer;
        }
    }
    
    let html = `
        <form id="checkoutForm">
            <div class="form-group">
                <label class="form-label">ឈ្មោះ</label>
                <input class="form-input" id="checkoutName" 
                       value="${customer?.first_name || state.user?.first_name || ''}" 
                       required>
            </div>
            <div class="form-group">
                <label class="form-label">លេខទូរស័ព្ទ</label>
                <input class="form-input" id="checkoutPhone" 
                       value="${customer?.phone || ''}" 
                       placeholder="0xx xxx xxx" required>
            </div>
            <div class="form-group">
                <label class="form-label">អាសយដ្ឋាន​ដឹកជញ្ជូន</label>
                <textarea class="form-input" id="checkoutAddress" 
                          rows="3" placeholder="អាសយដ្ឋាន​លម្អិត" required>${customer?.address || ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">វិធីសាស្ត្រ​បង់ប្រាក់</label>
                <select class="form-input" id="checkoutPayment">
                    <option value="khqr">KHQR (បង់តាម​ធនាគារ​ណា​ក៏​បាន)</option>
                    <option value="aba">ABA Payway</option>
                    <option value="wing">Wing Bank</option>
                    <option value="truemoney">TrueMoney</option>
                    <option value="cash">ទូទាត់​ពេល​ទទួល​ទំនិញ</option>
                </select>
            </div>
            
            <div style="background:var(--tg-section-bg);padding:16px;border-radius:var(--border-radius);margin:16px 0;">
                <div style="display:flex;justify-content:space-between;font-weight:500;">
                    <span>សរុប​តម្លៃ</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
            
            <button type="submit" class="btn-primary btn-success">
                <i class="fas fa-check"></i> បញ្ជាក់​ការ​បញ្ជាទិញ
            </button>
        </form>
    `;
    
    pageContainer.innerHTML = html;
    
    document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await placeOrder();
    });
}

// ==============================================
// PLACE ORDER
// ==============================================
async function placeOrder() {
    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const paymentMethod = document.getElementById('checkoutPayment').value;
    
    if (!name || !phone || !address) {
        showToast('សូម​បំពេញ​ព័ត៌មាន​ឲ្យ​បាន​ពេញលេញ');
        return;
    }
    
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
        let customerId = state.customer?.id;
        
        if (!customerId && state.user) {
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('telegram_id', state.user.id)
                .single();
            
            if (existing) {
                customerId = existing.id;
                await supabase
                    .from('customers')
                    .update({ first_name: name, phone: phone, address: address, username: state.user.username })
                    .eq('id', customerId);
            } else {
                const { data: newCustomer } = await supabase
                    .from('customers')
                    .insert({
                        telegram_id: state.user.id,
                        username: state.user.username,
                        first_name: name,
                        phone: phone,
                        address: address
                    })
                    .select()
                    .single();
                customerId = newCustomer.id;
                state.customer = newCustomer;
            }
        }
        
        const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                customer_id: customerId,
                total_amount: total,
                shipping_address: address,
                shipping_phone: phone,
                payment_method: paymentMethod,
                status: 'pending',
                payment_status: 'unpaid'
            })
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        const orderItems = state.cart.map(item => ({
            order_id: order.id,
            inventory_id: item.inventory_id,
            product_name: item.product_name,
            product_size: item.size,
            product_color: item.color,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));
        
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
        
        if (itemsError) throw itemsError;
        
        for (const item of state.cart) {
            const { data: inv } = await supabase
                .from('inventory')
                .select('quantity')
                .eq('id', item.inventory_id)
                .single();
            
            if (inv) {
                await supabase
                    .from('inventory')
                    .update({ quantity: inv.quantity - item.quantity })
                    .eq('id', item.inventory_id);
            }
        }
        
        state.cart = [];
        saveCartToStorage();
        updateCartBadge();
        
        haptic('heavy');
        showToast('បញ្ជាទិញ​បាន​ជោគជ័យ! លេខបញ្ជា: ' + orderNumber, 5000);
        
        const paymentNames = {
            'khqr': 'KHQR', 'aba': 'ABA Payway', 'wing': 'Wing Bank',
            'truemoney': 'TrueMoney', 'cash': 'ទូទាត់​ពេល​ទទួល​ទំនិញ'
        };
        
        pageContainer.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <i class="fas fa-check-circle" style="font-size:64px;color:var(--success);margin-bottom:16px;"></i>
                <h2 style="margin-bottom:8px;">បញ្ជាទិញ​បាន​ជោគជ័យ!</h2>
                <p style="color:var(--tg-hint);">លេខបញ្ជា: <strong>${orderNumber}</strong></p>
                <div style="margin:20px 0;padding:16px;background:var(--tg-section-bg);border-radius:var(--border-radius);">
                    <p>${paymentMethod === 'cash' ? 
                        'ទំនិញ​នឹង​ត្រូវ​បាន​ដឹកជញ្ជូន​ទៅ​កាន់​អាសយដ្ឋាន​របស់​អ្នក' : 
                        `សូម​បង់ប្រាក់ $${total.toFixed(2)} តាមរយៈ ${paymentNames[paymentMethod] || paymentMethod}`
                    }</p>
                    <p style="font-size:13px;color:var(--tg-hint);margin-top:8px;">
                        ${paymentMethod === 'cash' ? 
                            'សូម​រង់ចាំ​ការ​ទាក់ទង​ពី​អ្នក​គ្រប់គ្រង' : 
                            'បន្ទាប់​ពី​បង់រួច សូម​ផ្ញើ​រូបថត​ភស្តុតាង​មក​កាន់​អ្នក​គ្រប់គ្រង'
                        }
                    </p>
                </div>
                <button class="btn-primary" onclick="navigate('home')">
                    <i class="fas fa-home"></i> ត្រលប់​ទៅ​ទំព័រ​ដើម
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Order error:', error);
        showToast('មាន​បញ្ហា​ក្នុង​ការ​បញ្ជាទិញ សូម​ព្យាយាម​ម្តង​ទៀត');
    }
}

// ==============================================
// ADMIN FUNCTIONS (សង្ខេប)
// ==============================================
async function renderAdminDashboard() {
    const isAdmin = state.user && (state.user.id === 123456789 || state.user.id === 987654321);
    
    if (!isAdmin) {
        pageContainer.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-lock" style="font-size:48px;color:var(--danger);margin-bottom:16px;"></i>
                <p>អ្នក​មិន​មាន​សិទ្ធិ​ចូល​មើល​ទំព័រ​នេះ​ទេ</p>
                <button class="btn-primary" style="margin-top:20px;" onclick="navigate('home')">ត្រលប់​ទៅ​ទំព័រ​ដើម</button>
            </div>
        `;
        return;
    }
    
    const { data: orders } = await supabase.from('orders').select('*');
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: totalCustomers } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    
    const totalRevenue = orders?.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total_amount : sum, 0) || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    
    let html = `
        <div class="admin-stats">
            <div class="stat-card"><div class="stat-number">${totalOrders || 0}</div><div class="stat-label">បញ្ជាទិញ​សរុប</div></div>
            <div class="stat-card"><div class="stat-number">$${totalRevenue.toFixed(0)}</div><div class="stat-label">ចំណូល​សរុប</div></div>
            <div class="stat-card"><div class="stat-number">${pendingOrders}</div><div class="stat-label">កំពុង​រង់ចាំ</div></div>
            <div class="stat-card"><div class="stat-number">${totalCustomers || 0}</div><div class="stat-label">អតិថិជន</div></div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
            <button class="btn-primary" style="font-size:13px;padding:10px;" onclick="navigate('admin-inventory')">
                <i class="fas fa-boxes"></i> គ្រប់គ្រង​ស្តុក
            </button>
            <button class="btn-primary" style="font-size:13px;padding:10px;background:var(--success);" onclick="navigate('admin-orders')">
                <i class="fas fa-list"></i> បញ្ជាទិញ
            </button>
            <button class="btn-primary" style="font-size:13px;padding:10px;background:var(--warning);color:#000;" onclick="navigate('admin-reports')">
                <i class="fas fa-chart-bar"></i> របាយការណ៍
            </button>
        </div>
        
        <h3 style="margin:16px 0 8px;">បញ្ជាទិញ​ថ្មីៗ</h3>
    `;
    
    if (orders && orders.length > 0) {
        const recent = orders.slice(0, 5);
        const statusNames = { pending: 'កំពុង​រង់ចាំ', paid: 'បាន​បង់', processing: 'កំពុង​រៀបចំ', shipped: 'បាន​ផ្ញើ', delivered: 'បាន​ប្រគល់', cancelled: 'បាន​លុប' };
        
        html += `<table class="admin-table"><thead><tr><th>លេខ</th><th>ថ្ងៃ</th><th>តម្លៃ</th><th>ស្ថានភាព</th></tr></thead><tbody>`;
        for (const order of recent) {
            html += `<tr><td>${order.order_number}</td><td>${new Date(order.order_date).toLocaleDateString('km')}</td><td>$${order.total_amount}</td><td><span class="status-badge status-${order.status}">${statusNames[order.status] || order.status}</span></td></tr>`;
        }
        html += `</tbody></table>`;
    } else {
        html += `<p style="color:var(--tg-hint);">មិន​ទាន់​មាន​បញ្ជាទិញ</p>`;
    }
    
    pageContainer.innerHTML = html;
}

async function renderAdminInventory() {
    const { data: inventory } = await supabase.from('inventory').select('*, products(name)');
    
    let html = `
        <div style="margin-bottom:16px;">
            <button class="btn-primary" style="width:auto;padding:10px 20px;" onclick="showAddProduct()">
                <i class="fas fa-plus"></i> បន្ថែម​ផលិតផល
            </button>
        </div>
        <h3 style="margin-bottom:8px;">ស្តុក​បច្ចុប្បន្ន</h3>
    `;
    
    if (inventory && inventory.length > 0) {
        html += `<table class="admin-table"><thead><tr><th>ផលិតផល</th><th>ទំហំ</th><th>ពណ៌</th><th>ចំនួន</th></tr></thead><tbody>`;
        for (const item of inventory) {
            const lowStock = item.quantity <= item.min_stock_alert;
            html += `<tr style="${lowStock ? 'background:rgba(239,68,68,0.1);' : ''}">
                <td>${item.products?.name || 'N/A'}</td>
                <td>${item.size}</td>
                <td>${item.color}</td>
                <td style="${lowStock ? 'color:var(--danger);font-weight:700;' : ''}">${item.quantity}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    } else {
        html += `<p style="color:var(--tg-hint);">មិន​ទាន់​មាន​ទិន្នន័យ​ស្តុក</p>`;
    }
    
    pageContainer.innerHTML = html;
}

async function renderAdminOrders() {
    const { data: orders } = await supabase
        .from('orders')
        .select('*, customers(first_name, phone)')
        .order('order_date', { ascending: false });
    
    const statusNames = { pending: 'កំពុង​រង់ចាំ', paid: 'បាន​បង់', processing: 'កំពុង​រៀបចំ', shipped: 'បាន​ផ្ញើ', delivered: 'បាន​ប្រគល់', cancelled: 'បាន​លុប' };
    
    let html = `<h3 style="margin-bottom:8px;">បញ្ជាទិញ​ទាំងអស់</h3>`;
    
    if (orders && orders.length > 0) {
        html += `<table class="admin-table"><thead><tr><th>លេខ</th><th>អតិថិជន</th><th>តម្លៃ</th><th>ស្ថានភាព</th><th>សកម្មភាព</th></tr></thead><tbody>`;
        for (const order of orders) {
            html += `<tr>
                <td style="font-size:11px;">${order.order_number}</td>
                <td>${order.customers?.first_name || 'N/A'}</td>
                <td>$${order.total_amount}</td>
                <td><span class="status-badge status-${order.status}">${statusNames[order.status] || order.status}</span></td>
                <td>
                    <select onchange="updateOrderStatus('${order.id}', this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--tg-secondary-bg);background:var(--tg-bg);color:var(--tg-text);font-size:11px;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>កំពុង​រង់ចាំ</option>
                        <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>បាន​បង់</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>កំពុង​រៀបចំ</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>បាន​ផ្ញើ</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>បាន​ប្រគល់</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>បាន​លុប</option>
                    </select>
                </td>
            </tr>`;
        }
        html += `</tbody></table>`;
    } else {
        html += `<p style="color:var(--tg-hint);">មិន​ទាន់​មាន​បញ្ជាទិញ</p>`;
    }
    
    pageContainer.innerHTML = html;
}

async function renderAdminReports() {
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: transactions } = await supabase.from('transactions').select('*');
    
    const totalIncome = orders?.filter(o => o.status !== 'cancelled' && o.payment_status === 'paid')
        .reduce((sum, o) => sum + o.total_amount, 0) || 0;
    
    const totalExpense = transactions?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0) || 0;
    
    const netProfit = totalIncome - totalExpense;
    
    let html = `
        <div class="admin-stats">
            <div class="stat-card"><div class="stat-number" style="color:var(--success);">$${totalIncome.toFixed(0)}</div><div class="stat-label">ចំណូល</div></div>
            <div class="stat-card"><div class="stat-number" style="color:var(--danger);">$${totalExpense.toFixed(0)}</div><div class="stat-label">ចំណាយ</div></div>
            <div class="stat-card"><div class="stat-number" style="color:${netProfit >= 0 ? 'var(--success)' : 'var(--danger)'};">$${netProfit.toFixed(0)}</div><div class="stat-label">ប្រាក់​ចំណេញ</div></div>
        </div>
        
        <div style="background:var(--tg-section-bg);padding:16px;border-radius:var(--border-radius);margin-bottom:16px;">
            <h4 style="margin-bottom:8px;">បន្ថែម​ប្រវត្តិ​ចំណាយ</h4>
            <form id="expenseForm" style="display:flex;flex-direction:column;gap:8px;">
                <input class="form-input" id="expenseAmount" type="number" placeholder="ចំនួនទឹកប្រាក់ ($)" required>
                <input class="form-input" id="expenseDesc" placeholder="ការ​ពណ៌នា" required>
                <button type="submit" class="btn-primary" style="background:var(--danger);">បន្ថែម​ចំណាយ</button>
            </form>
        </div>
        
        <h4 style="margin:12px 0 8px;">ប្រវត្តិ​ប្រតិបត្តិការ</h4>
    `;
    
    if (transactions && transactions.length > 0) {
        const recent = transactions.slice(0, 10);
        html += `<table class="admin-table"><thead><tr><th>ថ្ងៃ</th><th>ប្រភេទ</th><th>ចំនួន</th><th>ការ​ពណ៌នា</th></tr></thead><tbody>`;
        for (const t of recent) {
            html += `<tr>
                <td style="font-size:11px;">${new Date(t.date).toLocaleDateString('km')}</td>
                <td>${t.type === 'income' ? '📈 ចំណូល' : '📉 ចំណាយ'}</td>
                <td style="color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'};">$${t.amount}</td>
                <td style="font-size:12px;">${t.description || '-'}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
    } else {
        html += `<p style="color:var(--tg-hint);">មិន​ទាន់​មាន​ប្រតិបត្តិការ</p>`;
    }
    
    pageContainer.innerHTML = html;
    
    const form = document.getElementById('expenseForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const description = document.getElementById('expenseDesc').value.trim();
            
            if (!amount || !description) {
                showToast('សូម​បំពេញ​ព័ត៌មាន​ឲ្យ​បាន​ពេញលេញ');
                return;
            }
            
            const { error } = await supabase
                .from('transactions')
                .insert({
                    type: 'expense',
                    category: 'other',
                    amount: amount,
                    description: description,
                    date: new Date().toISOString()
                });
            
            if (error) {
                showToast('មាន​បញ្ហា​ក្នុង​ការ​បន្ថែម');
                console.error(error);
            } else {
                showToast('បាន​បន្ថែម​ចំណាយ');
                navigate('admin-reports');
            }
        });
    }
}

// ==============================================
// UPDATE ORDER STATUS (Global)
// ==============================================
window.updateOrderStatus = async function(orderId, status) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: status, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        
        if (error) throw error;
        showToast('បាន​ធ្វើ​បច្ចុប្បន្នភាព​ស្ថានភាព');
        navigate('admin-orders');
    } catch (error) {
        showToast('មាន​បញ្ហា​ក្នុង​ការ​ធ្វើ​បច្ចុប្បន្នភាព');
        console.error(error);
    }
};

// ==============================================
// ADD PRODUCT (Global)
// ==============================================
window.showAddProduct = function() {
    pageContainer.innerHTML = `
        <h3>បន្ថែម​ផលិតផល​ថ្មី</h3>
        <form id="addProductForm" style="margin-top:16px;">
            <div class="form-group">
                <label class="form-label">ឈ្មោះ</label>
                <input class="form-input" id="prodName" required>
            </div>
            <div class="form-group">
                <label class="form-label">ប្រភេទ</label>
                <select class="form-input" id="prodCategory">
                    <option value="ខោ">ខោ</option>
                    <option value="អាវ">អាវ</option>
                    <option value="សំពត់">សំពត់</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">តម្លៃ ($)</label>
                <input class="form-input" id="prodPrice" type="number" step="0.01" required>
            </div>
            <div class="form-group">
                <label class="form-label">ការ​ពណ៌នា</label>
                <textarea class="form-input" id="prodDesc" rows="2"></textarea>
            </div>
            <button type="submit" class="btn-primary">បន្ថែម</button>
            <button type="button" class="btn-primary btn-outline" style="margin-top:8px;" onclick="navigate('admin-inventory')">បោះបង់</button>
        </form>
    `;
    
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('prodName').value.trim();
        const category = document.getElementById('prodCategory').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const description = document.getElementById('prodDesc').value.trim();
        
        if (!name || !price) {
            showToast('សូម​បំពេញ​ឈ្មោះ និង​តម្លៃ');
            return;
        }
        
        const { error } = await supabase
            .from('products')
            .insert({
                name: name,
                category: category,
                price: price,
                description: description,
                is_active: true
            });
        
        if (error) {
            showToast('មាន​បញ្ហា​ក្នុង​ការ​បន្ថែម');
            console.error(error);
        } else {
            showToast('បាន​បន្ថែម​ផលិតផល');
            await loadProducts();
            navigate('admin-inventory');
        }
    });
};

// ==============================================
// EVENT LISTENERS
// ==============================================
backBtn.addEventListener('click', () => {
    if (state.currentPage === 'home') {
        tg.close();
    } else if (['cart', 'product'].includes(state.currentPage)) {
        navigate('home');
    } else if (state.currentPage === 'checkout') {
        navigate('cart');
    } else if (state.currentPage.startsWith('admin')) {
        navigate('home');
    }
});

cartBtn.addEventListener('click', () => {
    if (state.currentPage !== 'cart') navigate('cart');
});

adminBtn.addEventListener('click', () => {
    navigate('admin-dashboard');
});

// ==============================================
// INITIALIZE
// ==============================================
async function init() {
    loadCartFromStorage();
    await loadProducts();
    
    if (state.user) {
        console.log('User:', state.user.first_name);
    }
    
    loading.style.display = 'none';
    document.getElementById('app').style.display = 'block';
    navigate('home');
    
    tg.BackButton.onClick(() => {
        if (state.currentPage === 'home') {
            tg.close();
        } else {
            backBtn.click();
        }
    });
    
    console.log('🚀 Telegram Clothing Shop initialized!');
}

init();
