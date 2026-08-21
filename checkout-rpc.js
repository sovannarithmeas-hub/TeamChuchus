import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gzclvhcvsfcslilxaiyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y2x2aGN2c2Zjc2xpbHhhaXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMjUyMjAsImV4cCI6MjEwMTYwMTIyMH0.8gD4bwPpxdLl9kGtPVCRRPylEsES_DHWH4KhKDJvzuE';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tg = window.Telegram?.WebApp;

function toast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => el.classList.remove('show'), 3000);
    setTimeout(() => el.remove(), 3350);
}

function readCart() {
    try {
        const value = JSON.parse(localStorage.getItem('cart') || '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function clearCart() {
    localStorage.removeItem('cart');
    const badge = document.getElementById('cartCount');
    if (badge) {
        badge.textContent = '0';
        badge.style.display = 'none';
    }
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
}

async function handleAtomicCheckout(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'checkoutForm') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    const name = document.getElementById('checkoutName')?.value.trim();
    const phone = document.getElementById('checkoutPhone')?.value.trim();
    const address = document.getElementById('checkoutAddress')?.value.trim();
    const paymentMethod = document.getElementById('checkoutPayment')?.value;
    const cart = readCart();
    const user = tg?.initDataUnsafe?.user;

    if (!name || !phone || !address) {
        toast('សូម​បំពេញ​ព័ត៌មាន​ឲ្យ​បាន​ពេញលេញ');
        if (button) button.disabled = false;
        return;
    }
    if (!user?.id) {
        toast('មិន​អាច​កំណត់​អត្តសញ្ញាណ Telegram បាន');
        if (button) button.disabled = false;
        return;
    }
    if (!cart.length) {
        toast('កន្ត្រក​របស់​អ្នក​នៅ​ទទេ');
        if (button) button.disabled = false;
        return;
    }

    const items = cart.map(item => ({
        inventory_id: item.inventory_id,
        quantity: Number(item.quantity)
    }));

    try {
        const { data, error } = await supabase.rpc('place_order_atomic', {
            p_telegram_id: Number(user.id),
            p_username: user.username || null,
            p_first_name: name,
            p_phone: phone,
            p_address: address,
            p_payment_method: paymentMethod,
            p_items: items
        });

        if (error) throw error;
        if (!data?.order_id || !data?.order_number) throw new Error('ការឆ្លើយតបពី server មិនត្រឹមត្រូវ');

        clearCart();
        try { tg?.HapticFeedback?.impactOccurred('heavy'); } catch {}

        const paymentNames = {
            khqr: 'KHQR',
            aba: 'ABA Payway',
            wing: 'Wing Bank',
            truemoney: 'TrueMoney',
            cash: 'ទូទាត់​ពេល​ទទួល​ទំនិញ'
        };
        const total = Number(data.total || 0);
        const paymentText = paymentMethod === 'cash'
            ? 'ទំនិញ​នឹង​ត្រូវ​បាន​ដឹកជញ្ជូន​ទៅ​កាន់​អាសយដ្ឋាន​របស់​អ្នក'
            : `សូម​បង់ប្រាក់ $${total.toFixed(2)} តាមរយៈ ${paymentNames[paymentMethod] || paymentMethod}`;
        const nextText = paymentMethod === 'cash'
            ? 'សូម​រង់ចាំ​ការ​ទាក់ទង​ពី​អ្នក​គ្រប់គ្រង'
            : 'បន្ទាប់​ពី​បង់រួច សូម​ផ្ញើ​រូបថត​ភស្តុតាង​មក​កាន់​អ្នក​គ្រប់គ្រង';

        const container = document.getElementById('pageContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;">
                    <i class="fas fa-check-circle" style="font-size:64px;color:var(--success);margin-bottom:16px;"></i>
                    <h2 style="margin-bottom:8px;">បញ្ជាទិញ​បាន​ជោគជ័យ!</h2>
                    <p style="color:var(--tg-hint);">លេខបញ្ជា: <strong>${escapeHtml(data.order_number)}</strong></p>
                    <div style="margin:20px 0;padding:16px;background:var(--tg-section-bg);border-radius:var(--border-radius);">
                        <p>${escapeHtml(paymentText)}</p>
                        <p style="font-size:13px;color:var(--tg-hint);margin-top:8px;">${escapeHtml(nextText)}</p>
                    </div>
                    <button class="btn-primary" id="atomicCheckoutHomeBtn">
                        <i class="fas fa-home"></i> ត្រលប់​ទៅ​ទំព័រ​ដើម
                    </button>
                </div>`;
            document.getElementById('atomicCheckoutHomeBtn')?.addEventListener('click', () => {
                window.location.reload();
            });
        }
    } catch (error) {
        console.error('Atomic checkout error:', error);
        toast(error?.message || 'មាន​បញ្ហា​ក្នុង​ការ​បញ្ជាទិញ សូម​ព្យាយាម​ម្តង​ទៀត');
        if (button) button.disabled = false;
    }
}

// Capture the submit before app.js's old checkout handler so checkout is atomic.
document.addEventListener('submit', handleAtomicCheckout, true);
