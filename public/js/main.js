/* ============================================
   FurniHaven - Frontend (API Connected)
   ============================================ */

const API_BASE = '/api';

// Cart (LocalStorage)
let cart = JSON.parse(localStorage.getItem('furnihaven_cart')) || [];

function saveCart() {
  localStorage.setItem('furnihaven_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const countEls = document.querySelectorAll('.cart-count');
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  countEls.forEach(el => {
    el.textContent = totalItems;
    el.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

function addToCart(productId, name, price, image) {
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, name, price, image, qty: 1 });
  }
  saveCart();
  showToast(name + ' added to cart!');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  if (typeof renderCart === 'function') renderCart();
}

function updateQty(productId, change) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += change;
  if (item.qty <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
    if (typeof renderCart === 'function') renderCart();
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function formatPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN');
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('active'));
  }
}

function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    if (btn) {
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });
}

// ========== API ==========

async function fetchProducts(category) {
  try {
    let url = API_BASE + '/products';
    if (category) url += '?category=' + category;
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) return json.data;
    throw new Error(json.message || 'Failed');
  } catch (err) {
    console.error('API Error:', err);
    showToast('Could not load products. Start the server!');
    return [];
  }
}

function renderProductCards(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!products || products.length === 0) {
    container.innerHTML = '<p style="text-align:center;grid-column:1/-1;padding:40px;color:#666;">No products found.</p>';
    return;
  }

  container.innerHTML = products.map(function(p) {
    var badge = p.badge ? '<span class="product-badge">' + p.badge + '</span>' : '';
    var oldPrice = p.oldPrice ? '<span class="old-price">' + formatPrice(p.oldPrice) + '</span>' : '';
    var cat = p.category.charAt(0).toUpperCase() + p.category.slice(1);
    return '<div class="product-card">' + badge +
      '<div class="product-img"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"></div>' +
      '<div class="product-info"><h3>' + p.name + '</h3>' +
      '<p class="category">' + cat + ' Room</p>' +
      '<div class="product-price"><div><span class="price">' + formatPrice(p.price) + '</span>' + oldPrice + '</div>' +
      '<button class="add-to-cart" onclick="addToCart(' + p.id + ', \'' + p.name.replace(/'/g, "\\'") + '\', ' + p.price + ', \'' + p.image + '\')" title="Add to Cart">+</button>' +
      '</div></div></div>';
  }).join('');
}

async function loadFeaturedProducts() {
  var products = await fetchProducts();
  renderProductCards(products.slice(0, 8), 'featured-products');
}

async function loadShopProducts(category) {
  var products = await fetchProducts(category);
  renderProductCards(products, 'shop-products');
}

async function loadCategoryProducts(category, containerId) {
  var products = await fetchProducts(category);
  renderProductCards(products, containerId);
}

function renderCart() {
  var container = document.getElementById('cart-content');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart"><h2>Your cart is empty</h2><p>Looks like you haven\'t added any furniture yet.</p><br><a href="shop.html" class="btn btn-primary">Continue Shopping</a></div>';
    return;
  }

  var html = '<table class="cart-table"><thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr></thead><tbody>';
  cart.forEach(function(item) {
    html += '<tr><td><div style="display:flex;align-items:center;gap:15px;"><img src="' + item.image + '" class="cart-item-img"><strong>' + item.name + '</strong></div></td>' +
      '<td>' + formatPrice(item.price) + '</td><td><div class="qty-control"><button class="qty-btn" onclick="updateQty(' + item.id + ',-1)">−</button><span>' + item.qty + '</span><button class="qty-btn" onclick="updateQty(' + item.id + ',1)">+</button></div></td>' +
      '<td>' + formatPrice(item.price * item.qty) + '</td><td><button onclick="removeFromCart(' + item.id + ')" style="background:none;border:none;color:#c0392b;cursor:pointer;font-size:1.2rem;">×</button></td></tr>';
  });
  html += '</tbody></table><div class="cart-summary"><h3>Order Summary</h3>' +
    '<div class="summary-row"><span>Subtotal</span><span>' + formatPrice(getCartTotal()) + '</span></div>' +
    '<div class="summary-row"><span>Shipping</span><span>Free</span></div>' +
    '<div class="summary-row total"><span>Total</span><span>' + formatPrice(getCartTotal()) + '</span></div><br>' +
    '<button class="btn btn-primary" style="width:100%;" onclick="showCheckoutForm()">Proceed to Checkout</button></div>' +
    '<div id="checkout-form-container" style="display:none;margin-top:30px;"></div>';
  container.innerHTML = html;
}

function showCheckoutForm() {
  var container = document.getElementById('checkout-form-container');
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML = '<div class="contact-form" style="max-width:500px;margin:0 auto;"><h3 style="margin-bottom:20px;color:var(--primary);">Checkout Details</h3>' +
    '<form id="checkout-form">' +
    '<div class="form-group"><label>Full Name *</label><input type="text" name="customer_name" required placeholder="Your full name"></div>' +
    '<div class="form-group"><label>Email *</label><input type="email" name="customer_email" required placeholder="you@example.com"></div>' +
    '<div class="form-group"><label>Phone</label><input type="tel" name="customer_phone" placeholder="+91 98765 43210"></div>' +
    '<div class="form-group"><label>Address</label><textarea name="address" placeholder="Full delivery address"></textarea></div>' +
    '<div class="form-group"><label>City</label><input type="text" name="city" placeholder="City"></div>' +
    '<div class="form-group"><label>Pincode</label><input type="text" name="pincode" placeholder="380015"></div>' +
    '<button type="submit" class="btn btn-primary" style="width:100%;">Place Order</button></form></div>';
  document.getElementById('checkout-form').addEventListener('submit', placeOrder);
}

async function placeOrder(e) {
  e.preventDefault();
  var form = e.target;
  var formData = new FormData(form);
  var orderData = {
    customer_name: formData.get('customer_name'),
    customer_email: formData.get('customer_email'),
    customer_phone: formData.get('customer_phone'),
    address: formData.get('address'),
    city: formData.get('city'),
    pincode: formData.get('pincode'),
    items: cart.map(function(item) { return { product_id: item.id, quantity: item.qty }; })
  };

  try {
    var headers = { 'Content-Type': 'application/json' };
    var token = localStorage.getItem('fh_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var res = await fetch(API_BASE + '/orders', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(orderData)
    });
    var json = await res.json();
    if (json.success) {
      showToast('Order #' + json.orderId + ' placed successfully!');
      cart = [];
      saveCart();
      setTimeout(function() {
        document.getElementById('cart-content').innerHTML = '<div class="empty-cart"><h2>🎉 Order Placed Successfully!</h2><p>Your order ID is <strong>#' + json.orderId + '</strong></p><p>Total: ' + formatPrice(json.total) + '</p><p>We will contact you soon.</p><br><a href="shop.html" class="btn btn-primary">Continue Shopping</a></div>';
      }, 500);
    } else {
      showToast(json.message || 'Order failed');
    }
  } catch (err) {
    showToast('Could not place order. Is the server running?');
  }
}

function initContactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    var name = form.querySelector('input[type="text"]') ? form.querySelector('input[type="text"]').value : '';
    var email = form.querySelector('input[type="email"]') ? form.querySelector('input[type="email"]').value : '';
    var phone = form.querySelector('input[type="tel"]') ? form.querySelector('input[type="tel"]').value : '';
    var subject = form.querySelector('select') ? form.querySelector('select').value : '';
    var message = form.querySelector('textarea') ? form.querySelector('textarea').value : '';

    try {
      var res = await fetch(API_BASE + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, phone: phone, subject: subject, message: message })
      });
      var json = await res.json();
      if (json.success) {
        showToast('Thank you! Your message has been saved.');
        form.reset();
      } else {
        showToast(json.message || 'Failed');
      }
    } catch (err) {
      showToast('Could not send. Is the server running?');
    }
  });
}

function initFilters() {
  var checkboxes = document.querySelectorAll('.filter-group input[type="checkbox"]');
  checkboxes.forEach(function(cb) {
    cb.addEventListener('change', async function() {
      var checked = Array.from(document.querySelectorAll('.filter-group input:checked')).map(function(c) { return c.value; });
      if (checked.length === 0) {
        await loadShopProducts();
      } else if (checked.length === 1) {
        await loadShopProducts(checked[0]);
      } else {
        var all = await fetchProducts();
        var filtered = all.filter(function(p) { return checked.indexOf(p.category) !== -1; });
        renderProductCards(filtered, 'shop-products');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  updateCartCount();
  initMobileMenu();
  initFAQ();
  initContactForm();
  initFilters();

  if (document.getElementById('featured-products')) await loadFeaturedProducts();
  if (document.getElementById('shop-products')) await loadShopProducts();
  if (document.getElementById('living-products')) await loadCategoryProducts('living', 'living-products');
  if (document.getElementById('bedroom-products')) await loadCategoryProducts('bedroom', 'bedroom-products');
  if (document.getElementById('dining-products')) await loadCategoryProducts('dining', 'dining-products');
  if (document.getElementById('office-products')) await loadCategoryProducts('office', 'office-products');
  if (document.getElementById('cart-content')) renderCart();
});
