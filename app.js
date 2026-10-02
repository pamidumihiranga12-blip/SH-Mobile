// ============================================
//   SH Mobile Padaviya ERP - Main Application
//   Design & Develop By SMARTZONE LK
// ============================================

// ===== DATA STORE =====
let db = {
  products: [],
  sales: [],
  repairs: [],
  warranty: [],
  customers: [],
  expenses: [],
  categories: ['Phones', 'Accessories', 'Spare Parts', 'Tablets', 'Other'],
  settings: {
    shopName: 'SH Mobile Padaviya',
    phone: '078-533-6459',
    address: 'Main Street, Padaviya',
    currency: 'Rs.',
    invoiceSettings: {
      shopTitle: 'SH Mobile Padaviya',
      tagline: 'TAX INVOICE',
      phone: '078-533-6459',
      address: 'Main Street, Padaviya',
      policy: 'Please retain this receipt for warranty & returns.',
      footerNote: 'Thank you for shopping at SH Mobile Padaviya!',
      devCredit: 'Develop By SMARTZONE LK',
      showBarcode: 'yes',
      paperWidth: '80mm'
    }
  }
};

let cart = [];
let currentPayment = 'cash';
let currentPOSTier = 'retail';
let salesChart = null;
let profitChart = null;
let nextRepairId = 1;

// ===== LOAD/SAVE DATA =====
function loadData() {
  try {
    const saved = localStorage.getItem('sh_mobile_erp_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      db = {
        ...db,
        ...parsed,
        settings: {
          ...db.settings,
          ...(parsed.settings || {}),
          invoiceSettings: {
            ...db.settings.invoiceSettings,
            ...(parsed.settings?.invoiceSettings || {})
          }
        }
      };

      // Developer credit is permanently secured to SMARTZONE LK
      if (db.settings) {
        if (!db.settings.invoiceSettings) db.settings.invoiceSettings = {};
        db.settings.invoiceSettings.devCredit = 'Develop By SMARTZONE LK';
      }

      // Ensure wholesalePrice & shopPrice backward compatibility for existing products
      if (db.products && db.products.length > 0) {
        db.products.forEach(p => {
          if (p.wholesalePrice === undefined) {
            if (p.id === 'P1') { p.wholesalePrice = 61500; p.shopPrice = 60500; }
            else if (p.id === 'P2') { p.wholesalePrice = 14000; p.shopPrice = 13500; }
            else if (p.id === 'P3') { p.wholesalePrice = 450; p.shopPrice = 400; }
            else if (p.id === 'P4') { p.wholesalePrice = 35500; p.shopPrice = 34500; }
            else if (p.id === 'P5') { p.wholesalePrice = 180; p.shopPrice = 160; }
            else { p.wholesalePrice = 0; p.shopPrice = 0; }
          }
          if (p.shopPrice === undefined) p.shopPrice = 0;
        });
      }
    }
    nextRepairId = db.repairs.length > 0
      ? Math.max(...db.repairs.map(r => parseInt(r.jobId) || 0)) + 1
      : 1;
  } catch (e) { console.error('Load error:', e); }
}

function saveData() {
  try {
    localStorage.setItem('sh_mobile_erp_v2', JSON.stringify(db));
  } catch (e) { console.error('Save error:', e); }
}

// ===== NAVIGATION =====
function showPage(pageId, element) {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  if (element) {
    element.classList.add('active');
  } else {
    const navItem = document.querySelector(`.nav-item[onclick*="'${pageId}'"]`);
    if (navItem) navItem.classList.add('active');
  }

  const titles = {
    dashboard: ['Dashboard', 'Welcome to SH Mobile Padaviya ERP'],
    pos: ['Point of Sale', 'Create new sale transactions'],
    products: ['Products', 'Manage product inventory'],
    barcode: ['Barcode Generator', 'Generate & print product barcodes'],
    repairs: ['Repair Jobs', 'Track and manage device repairs'],
    warranty: ['Warranty', 'Manage product warranties'],
    sales: ['Sales History', 'View all sale transactions'],
    profit: ['Profit & Loss', 'Financial analysis and reports'],
    customers: ['Customers', 'Customer database management'],
    expenses: ['Expenses', 'Track business expenses'],
    settings: ['Settings', 'System configuration']
  };
  const [title, subtitle] = titles[pageId] || ['Page', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle;

  // Render page-specific content
  if (pageId === 'dashboard') {
    updateDashboard();
    setTimeout(() => { if (salesChart) salesChart.resize(); }, 50);
  }
  if (pageId === 'products') renderProducts();
  if (pageId === 'repairs') renderRepairs();
  if (pageId === 'warranty') renderWarranty();
  if (pageId === 'sales') renderSales();
  if (pageId === 'profit') {
    updateProfitPage();
    setTimeout(() => { if (profitChart) profitChart.resize(); }, 50);
  }
  if (pageId === 'customers') renderCustomers();
  if (pageId === 'expenses') renderExpenses();
  if (pageId === 'pos') initPOS();
  if (pageId === 'barcode') initBarcodeSelect();
  if (pageId === 'settings') renderSettings();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ===== DATE/TIME =====
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('currentDate').textContent = dateStr;
  document.getElementById('currentTime').textContent = timeStr;
}

// ===== TOAST NOTIFICATIONS =====
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ===== FORMAT CURRENCY =====
function fmt(val) {
  const s = db.settings.currency || 'Rs.';
  return `${s} ${parseFloat(val || 0).toFixed(2)}`;
}

// ===== MODAL =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

// ===== UNIVERSAL PRINT HELPER =====
function printContent(htmlContent, title = 'Print') {
  let iframe = document.getElementById('appPrintIframe');
  if (iframe) {
    try { iframe.remove(); } catch (e) {}
  }

  iframe = document.createElement('iframe');
  iframe.id = 'appPrintIframe';
  iframe.name = 'appPrintIframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '10px';
  iframe.style.height = '10px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print error, falling back to window.open:', e);
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      } else {
        toast('Popup blocked by browser. Please allow popups or press Ctrl+P.', 'error');
      }
    }
  }, 300);
}

// ===== STATUS HELPERS =====
function repairStatusBadge(status) {
  const map = {
    'received': ['badge-blue', '📥 Received'],
    'in-progress': ['badge-orange', '⚙️ In Progress'],
    'waiting-parts': ['badge-purple', '⏳ Waiting Parts'],
    'completed': ['badge-green', '✅ Completed'],
    'delivered': ['badge-gray', '📦 Delivered'],
    'cancelled': ['badge-red', '❌ Cancelled']
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function warrantyStatusBadge(status) {
  const map = {
    'active': ['badge-green', '✅ Active'],
    'expired': ['badge-red', '❌ Expired'],
    'claimed': ['badge-orange', '🔄 Claimed']
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function stockBadge(product) {
  if (product.stock <= 0) return '<span class="badge badge-red">Out of Stock</span>';
  if (product.stock <= product.lowStock) return '<span class="badge badge-orange">Low Stock</span>';
  return '<span class="badge badge-green">In Stock</span>';
}

// ===== AUTO-UPDATE WARRANTY STATUS =====
function updateWarrantyStatuses() {
  const today = new Date();
  db.warranty.forEach(w => {
    if (w.status !== 'claimed') {
      const expDate = new Date(w.expiresOn);
      w.status = expDate < today ? 'expired' : 'active';
    }
  });
  saveData();
}

// ===== DASHBOARD =====
function updateDashboard() {
  const today = new Date().toDateString();
  const todaySales = db.sales.filter(s => new Date(s.date).toDateString() === today);
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0);
  const todayProfit = todaySales.reduce((a, s) => a + s.profit, 0);
  const margin = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : 0;

  document.getElementById('todaySales').textContent = fmt(todayRevenue);
  document.getElementById('todaySalesCount').textContent = `${todaySales.length} transactions`;
  document.getElementById('todayProfit').textContent = fmt(todayProfit);
  document.getElementById('profitMargin').textContent = `${margin}% margin`;

  document.getElementById('totalProducts').textContent = db.products.length;
  const lowStock = db.products.filter(p => p.stock > 0 && p.stock <= p.lowStock);
  const outStock = db.products.filter(p => p.stock <= 0);
  document.getElementById('lowStockCount').textContent = `${outStock.length} out, ${lowStock.length} low`;

  const activeRepairs = db.repairs.filter(r => !['delivered','cancelled'].includes(r.status));
  const completedToday = db.repairs.filter(r => r.status === 'completed' && new Date(r.updatedAt || r.createdAt).toDateString() === today);
  document.getElementById('activeRepairs').textContent = activeRepairs.length;
  document.getElementById('completedToday').textContent = `${completedToday.length} completed today`;

  renderRecentRepairs();
  renderLowStockAlert();
  renderRecentSalesDash();
  renderSalesChart();
}

function renderRecentRepairs() {
  const el = document.getElementById('recentRepairsList');
  const recent = db.repairs.filter(r => !['delivered','cancelled'].includes(r.status)).slice(0, 5);
  if (recent.length === 0) { el.innerHTML = '<div class="empty-state-sm">No active repairs</div>'; return; }
  el.innerHTML = recent.map(r => `
    <div class="list-item">
      <div>
        <div class="list-item-name">${r.customer} - ${r.device}</div>
        <div class="list-item-sub">${r.issue.substring(0, 40)}...</div>
      </div>
      <div>${repairStatusBadge(r.status)}</div>
    </div>
  `).join('');
}

function renderLowStockAlert() {
  const el = document.getElementById('lowStockList');
  const low = db.products.filter(p => p.stock <= p.lowStock).slice(0, 5);
  if (low.length === 0) { el.innerHTML = '<div class="empty-state-sm">All stock OK ✓</div>'; return; }
  el.innerHTML = low.map(p => `
    <div class="list-item">
      <div>
        <div class="list-item-name">${p.name}</div>
        <div class="list-item-sub">${p.category}</div>
      </div>
      <div class="list-item-value">
        <span class="${p.stock <= 0 ? 'badge badge-red' : 'badge badge-orange'}">${p.stock} left</span>
      </div>
    </div>
  `).join('');
}

function renderRecentSalesDash() {
  const el = document.getElementById('recentSalesList');
  const recent = [...db.sales].reverse().slice(0, 5);
  if (recent.length === 0) { el.innerHTML = '<div class="empty-state-sm">No sales yet</div>'; return; }
  el.innerHTML = recent.map(s => `
    <div class="list-item">
      <div>
        <div class="list-item-name">#${s.invoice} - ${s.customer || 'Walk-in'}</div>
        <div class="list-item-sub">${new Date(s.date).toLocaleString()} · ${s.items.length} item(s)</div>
      </div>
      <div class="list-item-value">
        <div style="color:var(--accent-green);font-weight:800">${fmt(s.total)}</div>
      </div>
    </div>
  `).join('');
}

function renderSalesChart(days = 7) {
  const ctx = document.getElementById('salesChart');
  if (!ctx) return;

  const labels = [], revenueData = [], profitData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toDateString();
    const dayLabel = d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
    const daySales = db.sales.filter(s => new Date(s.date).toDateString() === dayStr);
    labels.push(dayLabel);
    revenueData.push(daySales.reduce((a, s) => a + s.total, 0));
    profitData.push(daySales.reduce((a, s) => a + s.profit, 0));
  }

  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Revenue', data: revenueData, backgroundColor: 'rgba(79,195,247,0.6)', borderColor: '#4fc3f7', borderWidth: 1.5, borderRadius: 6 },
        { label: 'Profit', data: profitData, backgroundColor: 'rgba(105,240,174,0.6)', borderColor: '#69f0ae', borderWidth: 1.5, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892b0', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8892b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { beginAtZero: true, ticks: { color: '#8892b0', font: { size: 10 }, callback: v => 'Rs.' + v.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

function updateChart() {
  const days = parseInt(document.getElementById('chartPeriod').value);
  renderSalesChart(days);
}

// ===== PRODUCTS =====
function openProductModal(id = null) {
  document.getElementById('productModalTitle').textContent = id ? 'Edit Product' : 'Add Product';
  document.getElementById('editProductId').value = id || '';

  const imgEl = document.getElementById('prodImgPreview');
  const phEl = document.getElementById('prodImgPlaceholder');
  const rmBtn = document.getElementById('btnRemoveProdImg');
  const base64Input = document.getElementById('pPhotoBase64');
  const fileInput = document.getElementById('pPhotoInput');
  if (fileInput) fileInput.value = '';

  if (id) {
    const p = db.products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pName').value = p.name || '';
    document.getElementById('pCategory').value = p.category || 'Phones';
    document.getElementById('pBrand').value = p.brand || '';
    document.getElementById('pModel').value = p.model || '';
    document.getElementById('pBarcode').value = p.barcode || '';
    document.getElementById('pImei').value = p.imei || '';
    document.getElementById('pCostPrice').value = p.costPrice || '';
    document.getElementById('pSellPrice').value = p.sellPrice || '';
    document.getElementById('pWholesalePrice').value = p.wholesalePrice || '';
    document.getElementById('pShopPrice').value = p.shopPrice || '';
    document.getElementById('pStock').value = p.stock || 0;
    document.getElementById('pLowStock').value = p.lowStock || 5;
    document.getElementById('pWarrantyPeriod').value = p.warrantyPeriod || '';
    document.getElementById('pWarrantyUnit').value = p.warrantyUnit || 'months';
    document.getElementById('pDescription').value = p.description || '';
    calcMargin();

    if (p.image) {
      if (imgEl) { imgEl.src = p.image; imgEl.style.display = 'block'; }
      if (phEl) phEl.style.display = 'none';
      if (rmBtn) rmBtn.style.display = 'inline-block';
      if (base64Input) base64Input.value = p.image;
    } else {
      removeProductImage();
    }
  } else {
    document.getElementById('pName').value = '';
    document.getElementById('pCategory').value = 'Phones';
    document.getElementById('pBrand').value = '';
    document.getElementById('pModel').value = '';
    document.getElementById('pBarcode').value = '';
    document.getElementById('pImei').value = '';
    document.getElementById('pCostPrice').value = '';
    document.getElementById('pSellPrice').value = '';
    document.getElementById('pWholesalePrice').value = '';
    document.getElementById('pShopPrice').value = '';
    document.getElementById('pStock').value = '';
    document.getElementById('pLowStock').value = '5';
    document.getElementById('pWarrantyPeriod').value = '';
    document.getElementById('pWarrantyUnit').value = 'months';
    document.getElementById('pDescription').value = '';
    document.getElementById('marginDisplay').textContent = 'Set prices to calculate';
    document.getElementById('marginDisplay').style.color = 'var(--text-muted)';
    removeProductImage();
  }

  // Populate category dropdown
  const catSelect = document.getElementById('pCategory');
  catSelect.innerHTML = db.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  if (id) catSelect.value = db.products.find(x => x.id === id)?.category || '';

  openModal('productModal');
}

function handleProductImageFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    toast('Please select an image file (PNG/JPG)!', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress and resize using offscreen canvas to max 360x360
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxSize = 360;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed jpeg data URL (quality 0.82 ~15-20KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

      const imgEl = document.getElementById('prodImgPreview');
      const phEl = document.getElementById('prodImgPlaceholder');
      const rmBtn = document.getElementById('btnRemoveProdImg');
      const base64Input = document.getElementById('pPhotoBase64');

      if (imgEl) {
        imgEl.src = compressedDataUrl;
        imgEl.style.display = 'block';
      }
      if (phEl) phEl.style.display = 'none';
      if (rmBtn) rmBtn.style.display = 'inline-block';
      if (base64Input) base64Input.value = compressedDataUrl;

      toast('Photo uploaded & compressed! 📷', 'success');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeProductImage() {
  const imgEl = document.getElementById('prodImgPreview');
  const phEl = document.getElementById('prodImgPlaceholder');
  const rmBtn = document.getElementById('btnRemoveProdImg');
  const base64Input = document.getElementById('pPhotoBase64');
  const fileInput = document.getElementById('pPhotoInput');

  if (imgEl) {
    imgEl.src = '';
    imgEl.style.display = 'none';
  }
  if (phEl) phEl.style.display = 'flex';
  if (rmBtn) rmBtn.style.display = 'none';
  if (base64Input) base64Input.value = '';
  if (fileInput) fileInput.value = '';
}

function generateProductBarcode() {
  const code = 'SH' + Date.now().toString().slice(-10);
  document.getElementById('pBarcode').value = code;
}

function calcMargin() {
  const cost = parseFloat(document.getElementById('pCostPrice').value) || 0;
  const sell = parseFloat(document.getElementById('pSellPrice').value) || 0;
  const el = document.getElementById('marginDisplay');
  if (cost > 0 && sell > 0) {
    const profit = sell - cost;
    const margin = ((profit / sell) * 100).toFixed(1);
    el.textContent = `Profit: Rs. ${profit.toFixed(2)} (${margin}% margin)`;
    el.style.color = profit > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  } else {
    el.textContent = 'Set prices to calculate';
    el.style.color = 'var(--text-muted)';
  }
}

function saveProduct() {
  const name = document.getElementById('pName').value.trim();
  const costPrice = parseFloat(document.getElementById('pCostPrice').value);
  const sellPrice = parseFloat(document.getElementById('pSellPrice').value);
  const stock = parseInt(document.getElementById('pStock').value);

  if (!name || isNaN(costPrice) || isNaN(sellPrice) || isNaN(stock)) {
    toast('Please fill all required fields!', 'error'); return;
  }

  let barcode = document.getElementById('pBarcode').value.trim();
  if (!barcode) barcode = 'SH' + Date.now().toString().slice(-10);

  const image = document.getElementById('pPhotoBase64')?.value || '';
  const wholesalePrice = parseFloat(document.getElementById('pWholesalePrice')?.value) || 0;
  const shopPrice = parseFloat(document.getElementById('pShopPrice')?.value) || 0;

  const product = {
    id: document.getElementById('editProductId').value || 'P' + Date.now(),
    name,
    category: document.getElementById('pCategory').value,
    brand: document.getElementById('pBrand').value.trim(),
    model: document.getElementById('pModel').value.trim(),
    barcode,
    image,
    imei: document.getElementById('pImei').value.trim(),
    costPrice,
    sellPrice,
    wholesalePrice,
    shopPrice,
    stock,
    lowStock: parseInt(document.getElementById('pLowStock').value) || 5,
    warrantyPeriod: parseInt(document.getElementById('pWarrantyPeriod').value) || 0,
    warrantyUnit: document.getElementById('pWarrantyUnit').value,
    description: document.getElementById('pDescription').value.trim(),
    createdAt: new Date().toISOString()
  };

  const idx = db.products.findIndex(p => p.id === product.id);
  if (idx >= 0) db.products[idx] = product;
  else db.products.push(product);

  saveData();
  closeModal('productModal');
  renderProducts();
  toast('Product saved successfully! ✅', 'success');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  db.products = db.products.filter(p => p.id !== id);
  saveData();
  renderProducts();
  toast('Product deleted', 'warning');
}

function renderProducts() {
  const search = (document.getElementById('productSearch')?.value || '').toLowerCase();
  const catFilter = document.getElementById('productCategoryFilter')?.value || '';

  let list = db.products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search) || p.barcode?.toLowerCase().includes(search) || p.brand?.toLowerCase().includes(search);
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  document.getElementById('productTableCount').textContent = `${list.length} products`;

  const tbody = document.getElementById('productsTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">No products found</td></tr>';
    return;
  }

  const icons = { Phones: '📱', Accessories: '🎧', 'Spare Parts': '🔧', Tablets: '📟', Other: '📦' };

  tbody.innerHTML = list.map(p => `
    <tr>
      <td style="text-align:center;">
        <div class="table-prod-photo">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span class="fallback-icon">${icons[p.category] || '📦'}</span>`}
        </div>
      </td>
      <td><code style="font-size:11px;color:var(--accent-blue)">${p.barcode}</code></td>
      <td>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${p.brand} ${p.model}</div>
      </td>
      <td><span class="badge badge-purple">${p.category}</span></td>
      <td style="color:var(--accent-orange);font-weight:600">${fmt(p.costPrice)}</td>
      <td style="color:var(--accent-green);font-weight:700">
        <div>${fmt(p.sellPrice)} <span style="font-size:9.5px;color:var(--text-muted);font-weight:normal;">(Retail)</span></div>
        ${p.wholesalePrice > 0 ? `<div style="font-size:10.5px;color:#4fc3f7;font-weight:600;" title="Wholesale Price">📦 ${fmt(p.wholesalePrice)}</div>` : ''}
        ${p.shopPrice > 0 ? `<div style="font-size:10.5px;color:#ce93d8;font-weight:600;" title="Shop Price">🏪 ${fmt(p.shopPrice)}</div>` : ''}
      </td>
      <td>
        <div style="font-weight:700;font-size:15px">${p.stock}</div>
        <div style="font-size:10px;color:var(--text-muted)">Low: ${p.lowStock}</div>
      </td>
      <td>${stockBadge(p)}</td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="openProductModal('${p.id}')">✏️</button>
          <button class="btn-sm btn-primary" onclick="quickAddBarcode('${p.id}')">🏷️</button>
          <button class="btn-sm btn-danger" onclick="deleteProduct('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update category filter
  const cf = document.getElementById('productCategoryFilter');
  if (cf) {
    const currentVal = cf.value;
    cf.innerHTML = '<option value="">All Categories</option>' + db.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    cf.value = currentVal;
  }
}

function quickAddBarcode(productId) {
  const p = db.products.find(x => x.id === productId);
  if (!p) return;
  showPage('barcode', null);
  setTimeout(() => {
    document.getElementById('barcodeProduct').value = productId;
    generateBarcode();
    document.querySelector('[onclick*="barcode"]').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick')?.includes("'barcode'")) n.classList.add('active');
      else n.classList.remove('active');
    });
  }, 100);
}

// ===== POS & PRICE TIERS =====
function getProductTierPrice(product, tier = currentPOSTier) {
  if (!product) return 0;
  if (tier === 'wholesale') {
    const wp = parseFloat(product.wholesalePrice);
    if (!isNaN(wp) && wp > 0) return wp;
  } else if (tier === 'shop') {
    const sp = parseFloat(product.shopPrice);
    if (!isNaN(sp) && sp > 0) return sp;
  }
  return parseFloat(product.sellPrice) || 0;
}

function setPOSPriceTier(tier) {
  currentPOSTier = tier || 'retail';

  // Update tier button active states
  ['retail', 'wholesale', 'shop'].forEach(t => {
    const btn = document.getElementById('tierBtn-' + t);
    if (btn) {
      if (t === currentPOSTier) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  // Update tier header pill display
  const display = document.getElementById('posCurrentTierDisplay');
  if (display) {
    display.className = 'active-tier-pill ' + currentPOSTier;
    if (currentPOSTier === 'wholesale') {
      display.textContent = '📦 Wholesale (තොග)';
    } else if (currentPOSTier === 'shop') {
      display.textContent = '🏪 Shop Price (කඩේ)';
    } else {
      display.textContent = '🏷️ Normal (Retail)';
    }
  }

  // Update existing cart items to reflect newly chosen tier price
  if (cart.length > 0) {
    cart.forEach(item => {
      const p = db.products.find(x => x.id === item.id);
      if (p) {
        item.price = getProductTierPrice(p, currentPOSTier);
        item.tier = currentPOSTier;
      }
    });
    updateCart();
  }

  // Refresh POS grid to show active tier prices
  const searchVal = document.getElementById('posSearch')?.value?.trim()?.toLowerCase() || '';
  renderPOSProducts(searchVal);

  const tierNames = {
    retail: '🏷️ Normal (Retail)',
    wholesale: '📦 Wholesale (තොග මිල)',
    shop: '🏪 Shop / Dealer Price (කඩේ මිල)'
  };
  toast(`Price Mode: ${tierNames[currentPOSTier] || currentPOSTier}`, 'info');
}

function initPOS() {
  setPOSPriceTier(currentPOSTier || 'retail');
  renderPOSProducts();
  renderCustomerDropdown();
}

function renderCustomerDropdown() {
  const sel = document.getElementById('posCustomer');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Walk-in Customer --</option>' +
    db.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
}

function renderPOSProducts(filter = '') {
  const grid = document.getElementById('posProductGrid');
  if (!grid) return;
  let products = db.products.filter(p => p.stock > 0);
  if (filter) products = products.filter(p =>
    p.name.toLowerCase().includes(filter) ||
    p.barcode?.toLowerCase().includes(filter) ||
    p.brand?.toLowerCase().includes(filter) ||
    p.model?.toLowerCase().includes(filter)
  );

  if (products.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">No products found</div>';
    return;
  }

  const icons = { Phones: '📱', Accessories: '🎧', 'Spare Parts': '🔧', Tablets: '📟', Other: '📦' };
  grid.innerHTML = products.map(p => {
    const activePrice = getProductTierPrice(p, currentPOSTier);
    let tierBadge = '';
    if (currentPOSTier === 'wholesale') {
      if (p.wholesalePrice > 0) {
        tierBadge = `<span class="tier-tag-card wholesale">Wholesale</span>`;
      } else {
        tierBadge = `<span class="tier-tag-card" style="background:rgba(255,255,255,0.08);color:var(--text-muted);font-size:9px;">(Normal Price)</span>`;
      }
    } else if (currentPOSTier === 'shop') {
      if (p.shopPrice > 0) {
        tierBadge = `<span class="tier-tag-card shop">Shop Price</span>`;
      } else {
        tierBadge = `<span class="tier-tag-card" style="background:rgba(255,255,255,0.08);color:var(--text-muted);font-size:9px;">(Normal Price)</span>`;
      }
    }

    return `
      <div class="pos-product-card" onclick="addToCart('${p.id}')">
        <div class="p-img-wrap">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span style="font-size:24px;">${icons[p.category] || '📦'}</span>`}
        </div>
        <div class="p-name">${p.name}</div>
        <div class="p-price">${fmt(activePrice)} ${tierBadge}</div>
        <div class="p-stock">Stock: ${p.stock}</div>
      </div>
    `;
  }).join('');
}

function searchPOSProducts() {
  const input = document.getElementById('posSearch');
  const val = (input?.value || '').trim();
  if (val) {
    const clean = val.toLowerCase();
    // Instant barcode / IMEI match auto-add to bill
    const exactMatch = db.products.find(p =>
      (p.barcode && p.barcode.toLowerCase() === clean) ||
      (p.imei && p.imei.toLowerCase() === clean)
    );
    if (exactMatch) {
      if (exactMatch.stock > 0) {
        addToCart(exactMatch.id);
        playScanBeep();
        toast(`✅ Auto-Added to Bill: ${exactMatch.name}`, 'success');
        input.value = '';
        renderPOSProducts('');
        return;
      } else {
        toast(`⚠️ ${exactMatch.name} is Out of Stock!`, 'warning');
        input.value = '';
        renderPOSProducts('');
        return;
      }
    }
  }
  renderPOSProducts(val.toLowerCase());
}

function addToCart(productId) {
  const product = db.products.find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) { toast('Out of stock!', 'error'); return; }

  const unitPrice = getProductTierPrice(product, currentPOSTier);
  const existing = cart.find(c => c.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { toast('Insufficient stock!', 'warning'); return; }
    existing.qty++;
    existing.price = unitPrice;
    existing.tier = currentPOSTier;
  } else {
    cart.push({
      id: productId,
      name: product.name,
      price: unitPrice,
      cost: product.costPrice,
      qty: 1,
      tier: currentPOSTier
    });
  }
  updateCart();
}

function updateCartQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  const product = db.products.find(p => p.id === id);
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  if (item.qty > (product?.stock || 999)) { item.qty = product.stock; toast('Max stock reached!', 'warning'); }
  updateCart();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCart();
}

function clearCart() {
  cart = [];
  document.getElementById('discountAmt').value = '';
  document.getElementById('cashGiven').value = '';
  updateCart();
}

function getCartTotal() {
  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const discountVal = parseFloat(document.getElementById('discountAmt')?.value) || 0;
  const discountType = document.getElementById('discountType')?.value || 'fixed';
  const discount = discountType === 'percent' ? (subtotal * discountVal / 100) : discountVal;
  return Math.max(0, subtotal - discount);
}

function updateCart() {
  const cartEl = document.getElementById('cartItems');
  if (cart.length === 0) {
    cartEl.innerHTML = '<div class="empty-cart"><span>🛒</span><p>Add products to cart</p></div>';
    document.getElementById('cartSubtotal').textContent = fmt(0);
    document.getElementById('cartTotal').textContent = fmt(0);
    document.getElementById('changeAmount').textContent = fmt(0);
    document.getElementById('changeAmount').style.color = 'var(--text-secondary)';
    return;
  }

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const total = getCartTotal();

  cartEl.innerHTML = cart.map(item => {
    let tierTag = '';
    if (item.tier === 'wholesale') {
      tierTag = '<span class="cart-tier-tag wholesale">Wholesale</span>';
    } else if (item.tier === 'shop') {
      tierTag = '<span class="cart-tier-tag shop">Shop Price</span>';
    }

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name} ${tierTag}</div>
          <div class="cart-item-price">${fmt(item.price)} each</div>
        </div>
        <div class="cart-qty-wrap">
          <button class="cart-qty-btn" onclick="updateCartQty('${item.id}', -1)">−</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="cart-qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
        <div class="cart-item-total">${fmt(item.price * item.qty)}</div>
        <span class="cart-remove" onclick="removeFromCart('${item.id}')">✕</span>
      </div>
    `;
  }).join('');

  document.getElementById('cartSubtotal').textContent = fmt(subtotal);
  document.getElementById('cartTotal').textContent = fmt(total);
  calcChange();
}

function setPayment(method) {
  currentPayment = method;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('payBtn-' + method)?.classList.add('active');
  const cashInput = document.getElementById('cashGiven');
  const cashRow = cashInput?.closest('.summary-row');
  const changeRow = document.getElementById('changeAmount')?.closest('.summary-row');
  if (cashRow && changeRow) {
    cashRow.style.display = method === 'cash' ? 'flex' : 'none';
    changeRow.style.display = method === 'cash' ? 'flex' : 'none';
  }
}

function calcChange() {
  const total = getCartTotal();
  const givenInput = document.getElementById('cashGiven');
  const givenRaw = givenInput ? givenInput.value.trim() : '';
  if (!givenRaw || cart.length === 0) {
    document.getElementById('changeAmount').textContent = fmt(0);
    document.getElementById('changeAmount').style.color = 'var(--text-secondary)';
    return;
  }
  const given = parseFloat(givenRaw) || 0;
  const change = given - total;
  if (change < 0) {
    document.getElementById('changeAmount').textContent = `Due: ${fmt(Math.abs(change))}`;
    document.getElementById('changeAmount').style.color = 'var(--accent-red)';
  } else {
    document.getElementById('changeAmount').textContent = fmt(change);
    document.getElementById('changeAmount').style.color = 'var(--accent-green)';
  }
}

function completeSale() {
  if (cart.length === 0) { toast('Cart is empty!', 'error'); return; }

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const discountVal = parseFloat(document.getElementById('discountAmt').value) || 0;
  const discountType = document.getElementById('discountType').value;
  const discount = discountType === 'percent' ? (subtotal * discountVal / 100) : discountVal;
  const total = Math.max(0, subtotal - discount);
  const cogs = cart.reduce((a, c) => a + c.cost * c.qty, 0);
  const profit = total - cogs;

  const cashGiven = currentPayment === 'cash' ? (parseFloat(document.getElementById('cashGiven').value) || 0) : 0;
  if (currentPayment === 'cash' && cashGiven > 0 && cashGiven < total) {
    toast(`Cash given (${fmt(cashGiven)}) is less than total amount (${fmt(total)})!`, 'error');
    return;
  }
  const change = currentPayment === 'cash' && cashGiven >= total ? cashGiven - total : 0;

  const customerId = document.getElementById('posCustomer').value;
  const customer = customerId ? db.customers.find(c => c.id === customerId) : null;

  const invoice = 'INV' + Date.now();
  const sale = {
    invoice,
    date: new Date().toISOString(),
    customer: customer?.name || 'Walk-in Customer',
    customerId,
    items: cart.map(c => ({ ...c })),
    subtotal,
    discount,
    total,
    cogs,
    profit,
    payment: currentPayment,
    priceTier: currentPOSTier,
    cashGiven,
    change
  };

  // Deduct stock
  cart.forEach(item => {
    const p = db.products.find(x => x.id === item.id);
    if (p) p.stock -= item.qty;
  });

  db.sales.push(sale);
  saveData();

  // Auto-add warranty for products with warranty period
  cart.forEach(item => {
    const p = db.products.find(x => x.id === item.id);
    if (p && p.warrantyPeriod > 0) {
      const expDate = new Date();
      if (p.warrantyUnit === 'days') expDate.setDate(expDate.getDate() + p.warrantyPeriod);
      else if (p.warrantyUnit === 'years') expDate.setFullYear(expDate.getFullYear() + p.warrantyPeriod);
      else expDate.setMonth(expDate.getMonth() + p.warrantyPeriod);

      db.warranty.push({
        id: 'W' + Date.now() + Math.random(),
        product: p.name,
        customer: customer?.name || 'Walk-in Customer',
        phone: customer?.phone || '',
        saleDate: new Date().toISOString().split('T')[0],
        period: p.warrantyPeriod,
        unit: p.warrantyUnit,
        expiresOn: expDate.toISOString().split('T')[0],
        status: 'active',
        notes: `Auto-added from sale ${invoice}`,
        saleId: invoice
      });
      saveData();
    }
  });

  toast(`Sale completed! Total: ${fmt(total)}`, 'success');
  showInvoice(sale);
  clearCart();
}

// ===== INVOICE CONFIGURATION & CUSTOMIZER =====
function getInvoiceSettings() {
  const defaults = {
    shopTitle: db.settings.shopName || 'SH Mobile Padaviya',
    tagline: 'TAX INVOICE',
    phone: db.settings.phone || '078-533-6459',
    address: db.settings.address || 'Main Street, Padaviya',
    policy: 'Please retain this receipt for warranty & returns.',
    footerNote: `Thank you for shopping at ${db.settings.shopName || 'SH Mobile'}!`,
    devCredit: 'Develop By SMARTZONE LK',
    showBarcode: 'yes',
    paperWidth: '80mm'
  };
  const settings = { ...defaults, ...(db.settings.invoiceSettings || {}) };
  settings.devCredit = 'Develop By SMARTZONE LK'; // Permanently locked to SMARTZONE LK
  return settings;
}

function populateInvoiceSettingsForm() {
  const inv = getInvoiceSettings();
  if (document.getElementById('settingInvTitle')) document.getElementById('settingInvTitle').value = inv.shopTitle || '';
  if (document.getElementById('settingInvTagline')) document.getElementById('settingInvTagline').value = inv.tagline || '';
  if (document.getElementById('settingInvPhone')) document.getElementById('settingInvPhone').value = inv.phone || '';
  if (document.getElementById('settingInvAddress')) document.getElementById('settingInvAddress').value = inv.address || '';
  if (document.getElementById('settingInvPaperWidth')) document.getElementById('settingInvPaperWidth').value = inv.paperWidth || '80mm';
  if (document.getElementById('settingInvShowBarcode')) document.getElementById('settingInvShowBarcode').value = inv.showBarcode || 'yes';
  if (document.getElementById('settingInvPolicy')) document.getElementById('settingInvPolicy').value = inv.policy || '';
  if (document.getElementById('settingInvFooter')) document.getElementById('settingInvFooter').value = inv.footerNote || '';
  const devCreditEl = document.getElementById('settingInvDevCredit');
  if (devCreditEl) {
    devCreditEl.value = 'Develop By SMARTZONE LK';
    devCreditEl.readOnly = true;
  }
}

function renderLiveInvoicePreview() {
  const box = document.getElementById('invoiceLivePreviewBox');
  if (!box) return;

  const title = document.getElementById('settingInvTitle')?.value.trim() || db.settings.shopName || 'SH Mobile Padaviya';
  const tagline = document.getElementById('settingInvTagline')?.value.trim() || 'TAX INVOICE';
  const phone = document.getElementById('settingInvPhone')?.value.trim() || db.settings.phone || '078-533-6459';
  const address = document.getElementById('settingInvAddress')?.value.trim() || db.settings.address || 'Main Street, Padaviya';
  const paperWidth = document.getElementById('settingInvPaperWidth')?.value || '80mm';
  const showBarcode = document.getElementById('settingInvShowBarcode')?.value || 'yes';
  const policy = document.getElementById('settingInvPolicy')?.value.trim() || 'Please retain this receipt for warranty & returns.';
  const footerNote = document.getElementById('settingInvFooter')?.value.trim() || `Thank you for shopping at ${title}!`;
  const devCredit = 'Develop By SMARTZONE LK';

  const is58 = paperWidth === '58mm';
  if (is58) {
    box.classList.add('width-58mm');
    const lbl = document.getElementById('previewPaperLabel');
    if (lbl) lbl.textContent = '58mm Mini Format';
  } else {
    box.classList.remove('width-58mm');
    const lbl = document.getElementById('previewPaperLabel');
    if (lbl) lbl.textContent = '80mm Standard Format';
  }

  box.innerHTML = `
    <div class="preview-inv-header">
      <h2>${title}</h2>
      ${address ? `<p>${address}</p>` : ''}
      <p>📞 ${phone}</p>
      ${tagline ? `<p style="margin-top:5px;font-weight:800;letter-spacing:1px;">${tagline}</p>` : ''}
    </div>
    <div class="preview-inv-meta">
      <div class="preview-inv-meta-row">
        <span><b>Inv:</b> INV-SAMPLE</span>
        <span><b>Date:</b> ${new Date().toLocaleDateString('en-GB')}</span>
      </div>
      <div class="preview-inv-meta-row">
        <span><b>Time:</b> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        <span><b>Pay:</b> CASH</span>
      </div>
      <div class="preview-inv-meta-row">
        <span><b>Customer:</b> Walk-in Customer</span>
      </div>
    </div>
    <table class="preview-inv-table">
      <thead>
        <tr>
          <th style="text-align:left;width:45%">Item</th>
          <th style="text-align:center;width:15%">Qty</th>
          <th style="text-align:right;width:20%">Price</th>
          <th style="text-align:right;width:20%">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:left;font-weight:600">Samsung Galaxy A55 5G</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">65,000.00</td>
          <td style="text-align:right;font-weight:700">65,000.00</td>
        </tr>
        <tr>
          <td style="text-align:left;font-weight:600">Tempered Glass Guard</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">250.00</td>
          <td style="text-align:right;font-weight:700">250.00</td>
        </tr>
        <tr>
          <td style="text-align:left;font-weight:600">Fast Type-C Cable 1m</td>
          <td style="text-align:center">1</td>
          <td style="text-align:right">600.00</td>
          <td style="text-align:right;font-weight:700">600.00</td>
        </tr>
      </tbody>
    </table>
    <div class="preview-inv-total">
      <div class="preview-inv-meta-row" style="font-size:9px;color:#333;">
        <span>Total Items: 3</span>
        <span>Total Qty: 3</span>
      </div>
      <div class="preview-inv-meta-row" style="font-size:10px;">
        <span>Subtotal:</span>
        <span>${fmt(65850)}</span>
      </div>
      <div class="preview-inv-meta-row" style="font-size:10px;color:#333;">
        <span>Discount:</span>
        <span>-${fmt(850)}</span>
      </div>
      <div class="preview-inv-total-line">
        <span>NET TOTAL:</span>
        <span>${fmt(65000)}</span>
      </div>
      <div class="preview-inv-meta-row" style="font-size:9.5px;margin-top:2px;">
        <span>Cash Tendered:</span>
        <span>${fmt(70000)}</span>
      </div>
      <div class="preview-inv-meta-row" style="font-size:10px;font-weight:700;">
        <span>Change:</span>
        <span>${fmt(5000)}</span>
      </div>
    </div>
    ${showBarcode !== 'no' ? `
      <div class="preview-inv-barcode">
        <svg id="previewLiveBarcodeSvg"></svg>
      </div>
    ` : ''}
    <div class="preview-inv-footer">
      ${policy ? `<p style="margin-bottom:3px;">${policy}</p>` : ''}
      ${footerNote ? `<p style="font-weight:700;">${footerNote}</p>` : ''}
      ${devCredit ? `<p style="margin-top:5px;font-size:7.5px;color:#888;">${devCredit}</p>` : ''}
    </div>
  `;

  if (showBarcode !== 'no') {
    try {
      if (typeof JsBarcode === 'function') {
        JsBarcode('#previewLiveBarcodeSvg', 'INV-SAMPLE', {
          format: 'CODE128',
          width: is58 ? 1.0 : 1.2,
          height: is58 ? 20 : 24,
          displayValue: true,
          fontSize: 8.5,
          margin: 0
        });
      }
    } catch (e) {
      console.warn('Barcode render error in preview:', e);
    }
  }
}

function saveInvoiceSettings() {
  const invSettings = {
    shopTitle: document.getElementById('settingInvTitle')?.value.trim() || db.settings.shopName,
    tagline: document.getElementById('settingInvTagline')?.value.trim() || 'TAX INVOICE',
    phone: document.getElementById('settingInvPhone')?.value.trim() || db.settings.phone,
    address: document.getElementById('settingInvAddress')?.value.trim() || '',
    paperWidth: document.getElementById('settingInvPaperWidth')?.value || '80mm',
    showBarcode: document.getElementById('settingInvShowBarcode')?.value || 'yes',
    policy: document.getElementById('settingInvPolicy')?.value.trim() || '',
    footerNote: document.getElementById('settingInvFooter')?.value.trim() || '',
    devCredit: 'Develop By SMARTZONE LK' // Permanently locked to SMARTZONE LK
  };

  db.settings.invoiceSettings = invSettings;
  saveData();
  renderLiveInvoicePreview();
  toast('Invoice settings saved! ✅', 'success');
}

function resetInvoiceSettingsToDefault() {
  db.settings.invoiceSettings = {
    shopTitle: db.settings.shopName || 'SH Mobile Padaviya',
    tagline: 'TAX INVOICE',
    phone: db.settings.phone || '078-533-6459',
    address: db.settings.address || 'Main Street, Padaviya',
    paperWidth: '80mm',
    showBarcode: 'yes',
    policy: 'Please retain this receipt for warranty & returns.',
    footerNote: `Thank you for shopping at ${db.settings.shopName || 'SH Mobile'}!`,
    devCredit: 'Develop By SMARTZONE LK'
  };
  saveData();
  populateInvoiceSettingsForm();
  renderLiveInvoicePreview();
  toast('Invoice settings reset to default', 'info');
}

function testPrintInvoice() {
  const sampleSale = {
    invoice: 'INV' + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    customer: 'Walk-in Customer (Sample)',
    payment: 'cash',
    items: [
      { name: 'Samsung Galaxy A55 5G', qty: 1, price: 65000, cost: 58000 },
      { name: 'Tempered Glass Guard', qty: 1, price: 250, cost: 120 },
      { name: 'Fast Type-C Cable 1m', qty: 1, price: 600, cost: 350 }
    ],
    subtotal: 65850,
    discount: 850,
    total: 65000,
    cashGiven: 70000,
    change: 5000
  };
  showInvoice(sampleSale);
  toast('Sample receipt generated! Click Print to test print. 🖨️', 'success');
}

// ===== INVOICE DISPLAY & PRINTING =====
function showInvoice(sale) {
  const invSet = getInvoiceSettings();
  const totalQty = sale.items.reduce((a, item) => a + item.qty, 0);
  const is58 = invSet.paperWidth === '58mm';

  document.getElementById('invoiceContent').innerHTML = `
    <div class="invoice-print ${is58 ? 'width-58mm' : ''}" id="invoicePrintable" style="${is58 ? 'width: 56mm; max-width: 58mm; font-size: 9.5px;' : 'width: 74mm; max-width: 80mm; font-size: 11px;'}">
      <div class="invoice-header">
        <h1>${invSet.shopTitle}</h1>
        ${invSet.address ? `<p>${invSet.address}</p>` : ''}
        <p>📞 ${invSet.phone}</p>
        ${invSet.tagline ? `<p style="margin-top:6px;font-weight:800;letter-spacing:1px;">${invSet.tagline}</p>` : ''}
      </div>
      <div class="invoice-meta">
        <div class="invoice-meta-row">
          <span><b>Inv:</b> ${sale.invoice}</span>
          <span><b>Date:</b> ${new Date(sale.date).toLocaleDateString('en-GB')}</span>
        </div>
        <div class="invoice-meta-row">
          <span><b>Time:</b> ${new Date(sale.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          <span><b>Pay:</b> ${sale.payment.toUpperCase()}</span>
        </div>
        <div class="invoice-meta-row">
          <span><b>Customer:</b> ${sale.customer}</span>
          ${sale.priceTier && sale.priceTier !== 'retail' ? `
            <span><b>Rate:</b> <span style="font-weight:700;text-transform:uppercase;">${sale.priceTier === 'wholesale' ? '📦 WHOLESALE' : '🏪 SHOP / DEALER'}</span></span>
          ` : ''}
        </div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="text-align:left;width:45%">Item</th>
            <th style="text-align:center;width:15%">Qty</th>
            <th style="text-align:right;width:20%">Price</th>
            <th style="text-align:right;width:20%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map(item => `
            <tr>
              <td style="text-align:left;font-weight:600">${item.name}</td>
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:right">${item.price.toFixed(2)}</td>
              <td style="text-align:right;font-weight:700">${(item.price * item.qty).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="invoice-total">
        <div class="invoice-meta-row" style="font-size:10px;color:#333;">
          <span>Total Items: ${sale.items.length}</span>
          <span>Total Qty: ${totalQty}</span>
        </div>
        ${sale.discount > 0 ? `
          <div class="invoice-meta-row" style="font-size:11px;">
            <span>Subtotal:</span>
            <span>${fmt(sale.subtotal)}</span>
          </div>
          <div class="invoice-meta-row" style="font-size:11px;color:#333;">
            <span>Discount:</span>
            <span>-${fmt(sale.discount)}</span>
          </div>
        ` : ''}
        <div class="invoice-meta-row total-line">
          <span>NET TOTAL:</span>
          <span>${fmt(sale.total)}</span>
        </div>
        ${sale.payment === 'cash' && sale.cashGiven > 0 ? `
          <div class="invoice-meta-row" style="font-size:10px;margin-top:2px;">
            <span>Cash Tendered:</span>
            <span>${fmt(sale.cashGiven)}</span>
          </div>
          <div class="invoice-meta-row" style="font-size:11px;font-weight:700;">
            <span>Change:</span>
            <span>${fmt(sale.change)}</span>
          </div>
        ` : ''}
      </div>
      ${invSet.showBarcode !== 'no' ? `
        <div class="invoice-barcode-wrap">
          <svg id="invoiceBarcodeSvg"></svg>
        </div>
      ` : ''}
      <div class="invoice-footer">
        ${invSet.policy ? `<p style="margin-bottom:3px;">${invSet.policy}</p>` : ''}
        ${invSet.footerNote ? `<p style="font-weight:700;">${invSet.footerNote}</p>` : ''}
        ${invSet.devCredit ? `<p style="margin-top:6px;font-size:8px;color:#888;">${invSet.devCredit}</p>` : ''}
      </div>
    </div>
  `;

  if (invSet.showBarcode !== 'no') {
    try {
      if (typeof JsBarcode === 'function') {
        JsBarcode('#invoiceBarcodeSvg', sale.invoice, {
          format: 'CODE128',
          width: is58 ? 1.0 : 1.2,
          height: is58 ? 22 : 26,
          displayValue: true,
          fontSize: is58 ? 8 : 9,
          margin: 0
        });
      }
    } catch (e) {
      console.warn('Barcode render error:', e);
    }
  }

  openModal('invoiceModal');
}

function printInvoice() {
  const invoiceEl = document.getElementById('invoicePrintable');
  if (!invoiceEl) { toast('No invoice to print!', 'warning'); return; }
  const invSet = getInvoiceSettings();
  const is58 = invSet.paperWidth === '58mm';
  const paperSize = is58 ? '58mm auto' : '80mm auto';
  const paperWidth = is58 ? '54mm' : '74mm';

  const content = invoiceEl.innerHTML;
  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${invSet.shopTitle}</title>
      <style>
        @page {
          size: ${paperSize};
          margin: 2mm 3mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: ${paperWidth};
          max-width: ${paperWidth};
          margin: 0 auto;
          padding: 2mm 1mm;
          background: #fff;
          color: #000;
          font-family: 'Segoe UI', Arial, -apple-system, sans-serif;
          font-size: ${is58 ? '9.5px' : '11px'};
          line-height: 1.35;
        }
        .invoice-print {
          width: 100%;
          padding: 0;
          box-shadow: none;
        }
        .invoice-header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .invoice-header h1 {
          font-size: ${is58 ? '13px' : '16px'};
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .invoice-header p {
          font-size: ${is58 ? '8.5px' : '10px'};
          color: #111;
          margin-top: 1px;
        }
        .invoice-meta {
          font-size: ${is58 ? '8.5px' : '10px'};
          line-height: 1.45;
          border-bottom: 1px dashed #000;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .invoice-meta-row {
          display: flex;
          justify-content: space-between;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: ${is58 ? '8.5px' : '10px'};
        }
        .invoice-table th {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 4px 2px;
          font-weight: 700;
        }
        .invoice-table td {
          border-bottom: 1px dotted #ccc;
          padding: 4px 2px;
        }
        .invoice-total {
          border-top: 1px dashed #000;
          padding-top: 6px;
          font-size: ${is58 ? '9.5px' : '11px'};
          line-height: 1.5;
        }
        .total-line {
          font-size: ${is58 ? '12px' : '15px'};
          font-weight: 900;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 0;
          margin: 4px 0;
        }
        .invoice-barcode-wrap {
          text-align: center;
          margin: 6px 0 2px;
        }
        .invoice-barcode-wrap svg {
          max-width: 100%;
          height: ${is58 ? '20px' : '26px'};
          display: block;
          margin: 0 auto;
        }
        .invoice-footer {
          text-align: center;
          margin-top: 8px;
          font-size: ${is58 ? '8px' : '9px'};
          color: #333;
          border-top: 1px dashed #aaa;
          padding-top: 6px;
          line-height: 1.4;
        }
        @media print {
          body {
            width: ${paperWidth};
            max-width: ${paperWidth};
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-print">
        ${content}
      </div>
    </body>
    </html>
  `;
  printContent(printHtml, 'Invoice');
}

// ===== CUSTOMER STORE & CATALOG HELPERS =====
function getCatalogUrl() {
  try {
    const loc = window.location;
    if (loc.protocol === 'file:') {
      const path = loc.href.substring(0, loc.href.lastIndexOf('/') + 1);
      return path + 'catalog.html';
    }
    return new URL('catalog.html', loc.href).href;
  } catch (e) {
    return 'catalog.html';
  }
}

function openCatalogModal() {
  const url = getCatalogUrl();
  const input = document.getElementById('catalogModalUrl');
  if (input) input.value = url;
  openModal('catalogModal');
}

function openCatalogStore() {
  window.open('catalog.html', '_blank');
}

function copyCatalogLink(inputId = 'catalogModalUrl') {
  const input = document.getElementById(inputId) || document.getElementById('catalogModalUrl');
  const url = input?.value || getCatalogUrl();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      toast('📋 Store link copied! Send it to customer.', 'success');
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  toast('📋 Store link copied!', 'success');
}

function shareCatalogWhatsApp() {
  const url = getCatalogUrl();
  const shopName = db.settings.shopName || 'SH Mobile Padaviya';
  const text = encodeURIComponent(`📱 Hello! Visit ${shopName} online store to check our latest mobile phones, accessories and warranty items:\n${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function viewSaleInvoice(saleId) {
  const sale = db.sales.find(s => s.invoice === saleId);
  if (sale) showInvoice(sale);
}

// ===== SALES HISTORY =====
function renderSales() {
  const search = (document.getElementById('salesSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('salesDateFilter')?.value || '';

  let list = [...db.sales].reverse().filter(s => {
    const matchSearch = !search || s.invoice.toLowerCase().includes(search) || s.customer?.toLowerCase().includes(search);
    const matchDate = !dateFilter || new Date(s.date).toISOString().split('T')[0] === dateFilter;
    return matchSearch && matchDate;
  });

  const totalRev = list.reduce((a, s) => a + s.total, 0);
  const totalProfit = list.reduce((a, s) => a + s.profit, 0);
  document.getElementById('totalRevenue').textContent = fmt(totalRev);
  document.getElementById('totalProfitSales').textContent = fmt(totalProfit);
  document.getElementById('totalTransactions').textContent = list.length;

  const tbody = document.getElementById('salesTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No sales found</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(s => `
    <tr>
      <td>
        <span style="color:var(--accent-blue);font-weight:600">${s.invoice}</span>
        ${s.priceTier === 'wholesale' ? '<span class="cart-tier-tag wholesale" style="margin-left:4px;">Wholesale</span>' : (s.priceTier === 'shop' ? '<span class="cart-tier-tag shop" style="margin-left:4px;">Shop</span>' : '')}
      </td>
      <td style="font-size:12px">${new Date(s.date).toLocaleString()}</td>
      <td>${s.customer || 'Walk-in'}</td>
      <td>${s.items.length} item(s)</td>
      <td style="color:var(--accent-green);font-weight:700">${fmt(s.total)}</td>
      <td style="color:var(--accent-green);font-weight:600">${fmt(s.profit)}</td>
      <td><span class="badge badge-blue">${s.payment?.toUpperCase()}</span></td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="viewSaleInvoice('${s.invoice}')">🧾 Invoice</button>
          <button class="btn-sm btn-danger" onclick="deleteSale('${s.invoice}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function deleteSale(invoiceId) {
  if (!confirm('Delete this sale record?')) return;
  db.sales = db.sales.filter(s => s.invoice !== invoiceId);
  saveData();
  renderSales();
  toast('Sale deleted', 'warning');
}

function exportSales() {
  const data = db.sales.map(s => ({
    Invoice: s.invoice, Date: new Date(s.date).toLocaleString(),
    Customer: s.customer, Items: s.items.length,
    Total: s.total, Profit: s.profit, Payment: s.payment
  }));
  downloadCSV('sales_report.csv', data);
}

function downloadCSV(filename, data) {
  if (!data.length) { toast('No data to export', 'warning'); return; }
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast('Exported successfully!', 'success');
}

// ===== REPAIRS =====
function openRepairModal(id = null) {
  document.getElementById('repairModalTitle').textContent = id ? 'Edit Repair Job' : 'New Repair Job';
  document.getElementById('editRepairId').value = id || '';

  if (id) {
    const r = db.repairs.find(x => x.id === id);
    if (!r) return;
    document.getElementById('rCustomer').value = r.customer || '';
    document.getElementById('rPhone').value = r.phone || '';
    document.getElementById('rDevice').value = r.device || '';
    document.getElementById('rImei').value = r.imei || '';
    document.getElementById('rIssue').value = r.issue || '';
    document.getElementById('rTechnician').value = r.technician || '';
    document.getElementById('rEstimate').value = r.estimate || '';
    document.getElementById('rActualCost').value = r.actualCost || '';
    document.getElementById('rStatus').value = r.status || 'received';
    document.getElementById('rDelivery').value = r.delivery || '';
    document.getElementById('rNotes').value = r.notes || '';
  } else {
    ['rCustomer','rPhone','rDevice','rImei','rIssue','rTechnician','rEstimate','rActualCost','rNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('rStatus').value = 'received';
    document.getElementById('rDelivery').value = '';
  }
  openModal('repairModal');
}

function saveRepair() {
  const customer = document.getElementById('rCustomer').value.trim();
  const phone = document.getElementById('rPhone').value.trim();
  const device = document.getElementById('rDevice').value.trim();
  const issue = document.getElementById('rIssue').value.trim();

  if (!customer || !device || !issue) { toast('Fill required fields!', 'error'); return; }

  const editId = document.getElementById('editRepairId').value;
  const repair = {
    id: editId || 'R' + Date.now(),
    jobId: editId ? db.repairs.find(r => r.id === editId)?.jobId : nextRepairId++,
    customer, phone, device,
    imei: document.getElementById('rImei').value.trim(),
    issue,
    technician: document.getElementById('rTechnician').value.trim(),
    estimate: parseFloat(document.getElementById('rEstimate').value) || 0,
    actualCost: parseFloat(document.getElementById('rActualCost').value) || 0,
    status: document.getElementById('rStatus').value,
    delivery: document.getElementById('rDelivery').value,
    notes: document.getElementById('rNotes').value.trim(),
    createdAt: editId ? db.repairs.find(r => r.id === editId)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const idx = db.repairs.findIndex(r => r.id === repair.id);
  if (idx >= 0) db.repairs[idx] = repair;
  else db.repairs.push(repair);

  saveData();
  closeModal('repairModal');
  renderRepairs();
  toast('Repair job saved!', 'success');
}

function deleteRepair(id) {
  if (!confirm('Delete this repair job?')) return;
  db.repairs = db.repairs.filter(r => r.id !== id);
  saveData();
  renderRepairs();
  toast('Repair deleted', 'warning');
}

function renderRepairs() {
  const search = (document.getElementById('repairSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('repairStatusFilter')?.value || '';

  let list = [...db.repairs].reverse().filter(r => {
    const matchSearch = !search || r.customer?.toLowerCase().includes(search) || r.device?.toLowerCase().includes(search) || r.jobId?.toString().includes(search);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const active = db.repairs.filter(r => !['delivered','cancelled'].includes(r.status)).length;
  const done = db.repairs.filter(r => r.status === 'delivered').length;
  document.getElementById('repairCountAll').textContent = `All: ${db.repairs.length}`;
  document.getElementById('repairCountActive').textContent = `Active: ${active}`;
  document.getElementById('repairCountDone').textContent = `Done: ${done}`;

  const tbody = document.getElementById('repairsTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No repair jobs found</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr>
      <td><span style="color:var(--accent-blue);font-weight:700">#${r.jobId}</span></td>
      <td>
        <div style="font-weight:600">${r.customer}</div>
        <div style="font-size:11px;color:var(--text-muted)">${r.phone}</div>
      </td>
      <td>
        <div style="font-weight:600">${r.device}</div>
        <div style="font-size:11px;color:var(--text-muted)">${r.imei}</div>
      </td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.issue}</td>
      <td style="font-size:12px">${new Date(r.createdAt).toLocaleDateString()}</td>
      <td style="color:var(--accent-orange);font-weight:600">${r.estimate > 0 ? fmt(r.estimate) : '-'}</td>
      <td>${repairStatusBadge(r.status)}</td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="openRepairModal('${r.id}')">✏️</button>
          <button class="btn-sm btn-orange" onclick="printRepairJob('${r.id}')">🖨️</button>
          <button class="btn-sm btn-danger" onclick="deleteRepair('${r.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function printRepairJob(id) {
  const r = db.repairs.find(x => x.id === id);
  if (!r) return;
  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Repair Job #${r.jobId}</title>
      <style>
        @page { margin: 5mm; size: auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; color: #000; background: #fff; }
        h1 { font-size: 20px; text-align: center; }
        h3 { font-size: 13px; text-align: center; margin-top: 4px; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 6px 8px; border: 1px solid #ddd; font-size: 12px; }
        td:first-child { width: 35%; background: #f9f9f9; }
        .header { text-align: center; border-bottom: 2px solid #333; margin-bottom: 12px; padding-bottom: 8px; }
        .header p { font-size: 11px; margin-top: 2px; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #555; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${db.settings.shopName}</h1>
        <p>📞 ${db.settings.phone}</p>
        <h3>REPAIR JOB CARD</h3>
      </div>
      <table>
        <tr><td><b>Job #</b></td><td>#${r.jobId}</td></tr>
        <tr><td><b>Customer</b></td><td>${r.customer}</td></tr>
        <tr><td><b>Phone</b></td><td>${r.phone}</td></tr>
        <tr><td><b>Device</b></td><td>${r.device}</td></tr>
        <tr><td><b>IMEI</b></td><td>${r.imei || '-'}</td></tr>
        <tr><td><b>Issue</b></td><td>${r.issue}</td></tr>
        <tr><td><b>Technician</b></td><td>${r.technician || '-'}</td></tr>
        <tr><td><b>Estimate</b></td><td>${r.estimate > 0 ? fmt(r.estimate) : '-'}</td></tr>
        <tr><td><b>Status</b></td><td>${r.status.toUpperCase()}</td></tr>
        <tr><td><b>Expected</b></td><td>${r.delivery || '-'}</td></tr>
        <tr><td><b>Notes</b></td><td>${r.notes || '-'}</td></tr>
        <tr><td><b>Received</b></td><td>${new Date(r.createdAt).toLocaleString()}</td></tr>
      </table>
      <div class="footer">
        <p>Design & Develop By SMARTZONE LK</p>
      </div>
    </body>
    </html>
  `;
  printContent(printHtml, `Repair Job #${r.jobId}`);
}

// ===== WARRANTY =====
function openWarrantyModal(id = null) {
  document.getElementById('warrantyModalTitle').textContent = id ? 'Edit Warranty' : 'Add Warranty';
  document.getElementById('editWarrantyId').value = id || '';

  if (id) {
    const w = db.warranty.find(x => x.id === id);
    if (!w) return;
    document.getElementById('wProduct').value = w.product || '';
    document.getElementById('wCustomer').value = w.customer || '';
    document.getElementById('wPhone').value = w.phone || '';
    document.getElementById('wImei').value = w.imei || '';
    document.getElementById('wSaleDate').value = w.saleDate || '';
    document.getElementById('wPeriod').value = w.period || '';
    document.getElementById('wUnit').value = w.unit || 'months';
    document.getElementById('wStatus').value = w.status || 'active';
    document.getElementById('wNotes').value = w.notes || '';
  } else {
    ['wProduct','wCustomer','wPhone','wImei','wNotes'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('wSaleDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('wPeriod').value = '';
    document.getElementById('wUnit').value = 'months';
    document.getElementById('wStatus').value = 'active';
  }
  openModal('warrantyModal');
}

function saveWarranty() {
  const product = document.getElementById('wProduct').value.trim();
  const customer = document.getElementById('wCustomer').value.trim();
  const saleDate = document.getElementById('wSaleDate').value;
  const period = parseInt(document.getElementById('wPeriod').value);
  const unit = document.getElementById('wUnit').value;

  if (!product || !customer || !saleDate || !period) { toast('Fill required fields!', 'error'); return; }

  const expDate = new Date(saleDate);
  if (unit === 'days') expDate.setDate(expDate.getDate() + period);
  else if (unit === 'years') expDate.setFullYear(expDate.getFullYear() + period);
  else expDate.setMonth(expDate.getMonth() + period);

  const editId = document.getElementById('editWarrantyId').value;
  const w = {
    id: editId || 'W' + Date.now(),
    product, customer,
    phone: document.getElementById('wPhone').value.trim(),
    imei: document.getElementById('wImei').value.trim(),
    saleDate, period, unit,
    expiresOn: expDate.toISOString().split('T')[0],
    status: document.getElementById('wStatus').value,
    notes: document.getElementById('wNotes').value.trim(),
    createdAt: new Date().toISOString()
  };

  const idx = db.warranty.findIndex(x => x.id === w.id);
  if (idx >= 0) db.warranty[idx] = w;
  else db.warranty.push(w);

  saveData();
  closeModal('warrantyModal');
  renderWarranty();
  toast('Warranty saved!', 'success');
}

function deleteWarranty(id) {
  if (!confirm('Delete this warranty?')) return;
  db.warranty = db.warranty.filter(w => w.id !== id);
  saveData();
  renderWarranty();
  toast('Warranty deleted', 'warning');
}

function renderWarranty() {
  updateWarrantyStatuses();
  const search = (document.getElementById('warrantySearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('warrantyStatusFilter')?.value || '';

  let list = [...db.warranty].reverse().filter(w => {
    const matchSearch = !search || w.product?.toLowerCase().includes(search) || w.customer?.toLowerCase().includes(search);
    const matchStatus = !statusFilter || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const tbody = document.getElementById('warrantyTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No warranty records found</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(w => {
    const today = new Date();
    const exp = new Date(w.expiresOn);
    const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    return `
    <tr>
      <td style="color:var(--accent-blue);font-weight:600">${w.id.substring(0, 8)}</td>
      <td>
        <div style="font-weight:600">${w.product}</div>
        <div style="font-size:11px;color:var(--text-muted)">${w.imei || ''}</div>
      </td>
      <td>
        <div>${w.customer}</div>
        <div style="font-size:11px;color:var(--text-muted)">${w.phone}</div>
      </td>
      <td style="font-size:12px">${w.saleDate}</td>
      <td>${w.period} ${w.unit}</td>
      <td>
        <div style="font-size:12px">${w.expiresOn}</div>
        <div style="font-size:11px;color:${daysLeft > 30 ? 'var(--accent-green)' : daysLeft > 0 ? 'var(--accent-orange)' : 'var(--accent-red)'}">
          ${daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
        </div>
      </td>
      <td>${warrantyStatusBadge(w.status)}</td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="openWarrantyModal('${w.id}')">✏️</button>
          <button class="btn-sm btn-danger" onclick="deleteWarranty('${w.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

// ===== PROFIT =====
function updateProfitPage() {
  const period = document.getElementById('profitPeriod')?.value || 'month';
  const customRange = document.getElementById('customDateRange');
  if (customRange) customRange.style.display = period === 'custom' ? 'flex' : 'none';

  const now = new Date();
  let fromDate, toDate = new Date();
  toDate.setHours(23,59,59,999);

  if (period === 'today') {
    fromDate = new Date(); fromDate.setHours(0,0,0,0);
  } else if (period === 'week') {
    fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 7);
  } else if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'custom') {
    fromDate = new Date(document.getElementById('profitFrom')?.value || now);
    toDate = new Date(document.getElementById('profitTo')?.value || now);
    toDate.setHours(23,59,59,999);
  }

  const filteredSales = db.sales.filter(s => {
    const d = new Date(s.date);
    return d >= fromDate && d <= toDate;
  });

  const filteredRepairs = db.repairs.filter(r => {
    const d = new Date(r.createdAt);
    return d >= fromDate && d <= toDate && r.actualCost > 0;
  });

  const filteredExpenses = db.expenses.filter(e => {
    const d = new Date(e.date);
    return d >= fromDate && d <= toDate;
  });

  const revenue = filteredSales.reduce((a, s) => a + s.total, 0);
  const cogs = filteredSales.reduce((a, s) => a + s.cogs, 0);
  const grossProfit = revenue - cogs;
  const repairRevenue = filteredRepairs.reduce((a, r) => a + r.actualCost, 0);
  const totalExpenses = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const netProfit = grossProfit + repairRevenue - totalExpenses;
  const margin = (revenue + repairRevenue) > 0 ? ((netProfit / (revenue + repairRevenue)) * 100).toFixed(1) : 0;

  document.getElementById('pRevenue').textContent = fmt(revenue);
  document.getElementById('pCOGS').textContent = fmt(cogs);
  document.getElementById('pRepairRev').textContent = fmt(repairRevenue);
  document.getElementById('pExpenses').textContent = fmt(totalExpenses);
  document.getElementById('pGrossProfit').textContent = fmt(grossProfit);
  document.getElementById('pTotalExp').textContent = fmt(totalExpenses);
  document.getElementById('pNet').textContent = fmt(netProfit);
  document.getElementById('pNetProfit').textContent = fmt(netProfit);
  document.getElementById('pMarginPct').textContent = `${margin}% margin`;

  const profitCircle = document.getElementById('profitCircle');
  if (netProfit >= 0) profitCircle.style.background = 'conic-gradient(var(--accent-green) 0%, var(--primary) 60%, var(--accent-blue) 100%)';
  else profitCircle.style.background = 'conic-gradient(var(--accent-red) 0%, var(--accent-orange) 60%, var(--accent-red) 100%)';

  renderProfitChart(filteredSales, fromDate, toDate, period);
  renderTopProducts(filteredSales);
}

function renderProfitChart(sales, fromDate, toDate, period) {
  const ctx = document.getElementById('profitChart');
  if (!ctx) return;

  const labels = [], revenues = [], profits = [];
  const dayCount = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
  const step = dayCount <= 30 ? 1 : 7;

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + step)) {
    const endD = new Date(d); endD.setDate(endD.getDate() + step);
    const dayLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const daySales = sales.filter(s => { const sd = new Date(s.date); return sd >= d && sd < endD; });
    labels.push(dayLabel);
    revenues.push(daySales.reduce((a, s) => a + s.total, 0));
    profits.push(daySales.reduce((a, s) => a + s.profit, 0));
  }

  if (profitChart) profitChart.destroy();
  profitChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Revenue', data: revenues, borderColor: '#4fc3f7', backgroundColor: 'rgba(79,195,247,0.1)', fill: true, tension: 0.4, pointRadius: 3 },
        { label: 'Profit', data: profits, borderColor: '#69f0ae', backgroundColor: 'rgba(105,240,174,0.1)', fill: true, tension: 0.4, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8892b0', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8892b0', font: { size: 10 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { beginAtZero: true, ticks: { color: '#8892b0', font: { size: 10 }, callback: v => 'Rs.' + v.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

function renderTopProducts(sales) {
  const el = document.getElementById('topProductsList');
  const productTotals = {};
  sales.forEach(s => {
    s.items.forEach(item => {
      if (!productTotals[item.name]) productTotals[item.name] = { qty: 0, revenue: 0 };
      productTotals[item.name].qty += item.qty;
      productTotals[item.name].revenue += item.price * item.qty;
    });
  });

  const sorted = Object.entries(productTotals).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10);
  if (sorted.length === 0) { el.innerHTML = '<div class="empty-state-sm">No sales data</div>'; return; }

  el.innerHTML = sorted.map(([name, data], i) => `
    <div class="top-product-item">
      <div class="top-product-rank">${i + 1}</div>
      <div class="top-product-info">
        <div class="top-product-name">${name}</div>
        <div class="top-product-qty">${data.qty} units sold</div>
      </div>
      <div class="top-product-revenue">${fmt(data.revenue)}</div>
    </div>
  `).join('');
}

// ===== CUSTOMERS =====
function openCustomerModal(id = null) {
  document.getElementById('editCustomerId').value = id || '';
  if (id) {
    const c = db.customers.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cName').value = c.name || '';
    document.getElementById('cPhone').value = c.phone || '';
    document.getElementById('cAddress').value = c.address || '';
    document.getElementById('cEmail').value = c.email || '';
    document.getElementById('cNic').value = c.nic || '';
  } else {
    ['cName','cPhone','cAddress','cEmail','cNic'].forEach(i => document.getElementById(i).value = '');
  }
  openModal('customerModal');
}

function saveCustomer() {
  const name = document.getElementById('cName').value.trim();
  const phone = document.getElementById('cPhone').value.trim();
  if (!name || !phone) { toast('Name and phone required!', 'error'); return; }

  const editId = document.getElementById('editCustomerId').value;
  const c = {
    id: editId || 'C' + Date.now(),
    name, phone,
    address: document.getElementById('cAddress').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    nic: document.getElementById('cNic').value.trim(),
    createdAt: editId ? db.customers.find(x => x.id === editId)?.createdAt : new Date().toISOString()
  };

  const idx = db.customers.findIndex(x => x.id === c.id);
  if (idx >= 0) db.customers[idx] = c;
  else db.customers.push(c);

  saveData();
  closeModal('customerModal');
  renderCustomers();
  toast('Customer saved!', 'success');
}

function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  db.customers = db.customers.filter(c => c.id !== id);
  saveData();
  renderCustomers();
  toast('Customer deleted', 'warning');
}

function renderCustomers() {
  const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
  let list = db.customers.filter(c => !search || c.name.toLowerCase().includes(search) || c.phone.includes(search));
  document.getElementById('customerCount').textContent = `${list.length} customers`;

  const tbody = document.getElementById('customersTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No customers found</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((c, i) => {
    const totalPurchases = db.sales.filter(s => s.customerId === c.id).reduce((a, s) => a + s.total, 0);
    return `
    <tr>
      <td>${i + 1}</td>
      <td><div style="font-weight:600">${c.name}</div><div style="font-size:11px;color:var(--text-muted)">${c.nic || ''}</div></td>
      <td>${c.phone}</td>
      <td style="font-size:12px">${c.address || '-'}</td>
      <td style="color:var(--accent-green);font-weight:700">${fmt(totalPurchases)}</td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="openCustomerModal('${c.id}')">✏️</button>
          <button class="btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

// ===== EXPENSES =====
function openExpenseModal(id = null) {
  document.getElementById('editExpenseId').value = id || '';
  if (id) {
    const e = db.expenses.find(x => x.id === id);
    if (!e) return;
    document.getElementById('eDate').value = e.date || '';
    document.getElementById('eCategory').value = e.category || 'Other';
    document.getElementById('eDescription').value = e.description || '';
    document.getElementById('eAmount').value = e.amount || '';
  } else {
    document.getElementById('eDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('eCategory').value = 'Other';
    document.getElementById('eDescription').value = '';
    document.getElementById('eAmount').value = '';
  }
  openModal('expenseModal');
}

function saveExpense() {
  const date = document.getElementById('eDate').value;
  const amount = parseFloat(document.getElementById('eAmount').value);
  if (!date || isNaN(amount)) { toast('Fill required fields!', 'error'); return; }

  const editId = document.getElementById('editExpenseId').value;
  const e = {
    id: editId || 'E' + Date.now(),
    date,
    category: document.getElementById('eCategory').value,
    description: document.getElementById('eDescription').value.trim(),
    amount,
    createdAt: new Date().toISOString()
  };

  const idx = db.expenses.findIndex(x => x.id === e.id);
  if (idx >= 0) db.expenses[idx] = e;
  else db.expenses.push(e);

  saveData();
  closeModal('expenseModal');
  renderExpenses();
  toast('Expense saved!', 'success');
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  db.expenses = db.expenses.filter(e => e.id !== id);
  saveData();
  renderExpenses();
  toast('Expense deleted', 'warning');
}

function renderExpenses() {
  const search = (document.getElementById('expenseSearch')?.value || '').toLowerCase();
  let list = [...db.expenses].reverse().filter(e => !search || e.description?.toLowerCase().includes(search) || e.category?.toLowerCase().includes(search));

  const now = new Date();
  const monthExp = db.expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((a, e) => a + e.amount, 0);
  const yearExp = db.expenses.filter(e => new Date(e.date).getFullYear() === now.getFullYear()).reduce((a, e) => a + e.amount, 0);

  document.getElementById('monthExpense').textContent = fmt(monthExp);
  document.getElementById('yearExpense').textContent = fmt(yearExp);

  const tbody = document.getElementById('expensesTableBody');
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No expenses recorded</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="font-size:12px">${e.date}</td>
      <td><span class="badge badge-orange">${e.category}</span></td>
      <td>${e.description || '-'}</td>
      <td style="color:var(--accent-red);font-weight:700">${fmt(e.amount)}</td>
      <td>
        <div class="action-group">
          <button class="btn-sm btn-secondary" onclick="openExpenseModal('${e.id}')">✏️</button>
          <button class="btn-sm btn-danger" onclick="deleteExpense('${e.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== BARCODE =====
function initBarcodeSelect() {
  const sel = document.getElementById('barcodeProduct');
  sel.innerHTML = '<option value="">-- Select Product --</option>' +
    db.products.map(p => `<option value="${p.id}">${p.name} - ${p.barcode}</option>`).join('');
}

function generateBarcode() {
  const productId = document.getElementById('barcodeProduct').value;
  if (!productId) return;
  const p = db.products.find(x => x.id === productId);
  if (!p) return;

  document.getElementById('barcodeCustom').value = p.barcode;
  document.getElementById('bcProductName').textContent = p.name;
  document.getElementById('bcPrice').textContent = fmt(p.sellPrice);

  renderBarcodeLabel(p.barcode, p.name, p.sellPrice);
}

function generateBarcodeManual() {
  const code = document.getElementById('barcodeCustom').value.trim();
  if (!code || code.length < 4) return;
  renderBarcodeLabel(code, 'Custom Product', 0);
}

function renderBarcodeLabel(code, name, price) {
  const type = document.getElementById('barcodeType').value;
  try {
    JsBarcode('#barcodePreviewSvg', code, {
      format: type, width: 1.8, height: 50,
      displayValue: true, fontSize: 11, margin: 0
    });
    document.getElementById('bcProductName').textContent = name;
    if (price > 0) document.getElementById('bcPrice').textContent = fmt(price);
  } catch (e) {
    toast('Invalid barcode value for this format!', 'error');
  }
}

function printBarcode() {
  const code = document.getElementById('barcodeCustom').value.trim();
  if (!code) { toast('Please generate or enter a barcode first!', 'warning'); return; }

  let previewSvg = document.getElementById('barcodePreviewSvg');
  if (!previewSvg || !previewSvg.innerHTML.trim()) {
    const productId = document.getElementById('barcodeProduct').value;
    const p = productId ? db.products.find(x => x.id === productId) : null;
    renderBarcodeLabel(code, p ? p.name : 'Product', p ? p.sellPrice : 0);
    previewSvg = document.getElementById('barcodePreviewSvg');
  }

  if (!previewSvg || !previewSvg.innerHTML.trim()) {
    toast('Could not render barcode. Please check format!', 'error');
    return;
  }

  const svgMarkup = previewSvg.outerHTML.replace(/id="[^"]*"/g, 'class="print-barcode-svg"');
  const copies = Math.max(1, Math.min(200, parseInt(document.getElementById('barcodeCopies').value) || 1));
  const productId = document.getElementById('barcodeProduct').value;
  const p = productId ? db.products.find(x => x.id === productId) : null;
  const name = p ? p.name : (document.getElementById('bcProductName').textContent || 'Product');
  const price = p ? fmt(p.sellPrice) : document.getElementById('bcPrice').textContent;
  const size = document.getElementById('labelSize').value;

  const sizes = {
    small: { w: '38mm', h: '22mm', shopFs: '7px', nameFs: '7px', priceFs: '8px' },
    medium: { w: '58mm', h: '32mm', shopFs: '9px', nameFs: '8px', priceFs: '11px' },
    large: { w: '78mm', h: '42mm', shopFs: '11px', nameFs: '10px', priceFs: '13px' }
  };
  const sz = sizes[size] || sizes.medium;

  const singleLabel = `
    <div class="barcode-sticker" style="
      width: ${sz.w};
      min-height: ${sz.h};
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2mm 3mm;
      border: 1px dashed #bbb;
      margin: 1.5mm;
      box-sizing: border-box;
      background: #fff;
      color: #000;
      page-break-inside: avoid;
      break-inside: avoid;
      vertical-align: top;
      font-family: Arial, sans-serif;
    ">
      <div style="font-size:${sz.shopFs}; font-weight:800; letter-spacing:0.5px; margin-bottom:1mm; text-transform:uppercase;">${db.settings.shopName}</div>
      <div style="width:100%; display:flex; justify-content:center; overflow:hidden;">${svgMarkup}</div>
      <div style="font-size:${sz.nameFs}; font-weight:600; color:#222; margin-top:1mm; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
      ${price ? `<div style="font-size:${sz.priceFs}; font-weight:800; color:#000; margin-top:0.5mm;">${price}</div>` : ''}
    </div>
  `;

  let allLabels = '';
  for (let i = 0; i < copies; i++) {
    allLabels += singleLabel;
  }

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Barcode Print - ${db.settings.shopName}</title>
      <style>
        @page {
          size: auto;
          margin: 4mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          background: #fff;
          color: #000;
          font-family: Arial, sans-serif;
          padding: 2mm;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
        }
        .barcode-sticker svg {
          max-width: 100% !important;
          height: auto !important;
          display: block;
        }
        @media print {
          body {
            padding: 0;
          }
          .barcode-sticker {
            border: 1px dashed #ccc !important;
          }
        }
      </style>
    </head>
    <body>
      ${allLabels}
    </body>
    </html>
  `;

  printContent(printHtml, 'Barcode Print');
}

// ===== SETTINGS =====
function renderSettings() {
  document.getElementById('settingShopName').value = db.settings.shopName;
  document.getElementById('settingPhone').value = db.settings.phone;
  document.getElementById('settingAddress').value = db.settings.address || '';
  document.getElementById('settingCurrency').value = db.settings.currency || 'Rs.';

  document.getElementById('dataCountProducts').textContent = db.products.length;
  document.getElementById('dataCountSales').textContent = db.sales.length;
  document.getElementById('dataCountRepairs').textContent = db.repairs.length;
  document.getElementById('dataCountCustomers').textContent = db.customers.length;
  document.getElementById('dataCountWarranty').textContent = db.warranty.length;

  renderCategoriesList();

  // Populate Invoice settings & live preview
  populateInvoiceSettingsForm();
  renderLiveInvoicePreview();

  // Set catalog URL input display
  const catalogUrlDisp = document.getElementById('catalogUrlDisplay');
  if (catalogUrlDisp) catalogUrlDisp.value = getCatalogUrl();
}

function saveSettings() {
  db.settings.shopName = document.getElementById('settingShopName').value.trim();
  db.settings.phone = document.getElementById('settingPhone').value.trim();
  db.settings.address = document.getElementById('settingAddress').value.trim();
  db.settings.currency = document.getElementById('settingCurrency').value;
  saveData();
  toast('Settings saved!', 'success');
}

function addCategory() {
  const input = document.getElementById('newCategory');
  const name = input.value.trim();
  if (!name || db.categories.includes(name)) { toast('Category already exists or empty!', 'warning'); return; }
  db.categories.push(name);
  saveData();
  renderCategoriesList();
  input.value = '';
  toast('Category added!', 'success');
}

function deleteCategory(name) {
  if (['Phones','Accessories','Spare Parts','Tablets','Other'].includes(name)) {
    toast('Cannot delete default category!', 'warning'); return;
  }
  db.categories = db.categories.filter(c => c !== name);
  saveData();
  renderCategoriesList();
}

function renderCategoriesList() {
  const el = document.getElementById('categoriesList');
  el.innerHTML = db.categories.map(c => `
    <span class="category-tag">${c}<button onclick="deleteCategory('${c}')">✕</button></span>
  `).join('');
}

function exportData() {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sh_mobile_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Data exported!', 'success');
}

function importData() { document.getElementById('importFile').click(); }

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (confirm('Import data? This will replace current data!')) {
        db = { ...db, ...parsed };
        saveData();
        renderSettings();
        toast('Data imported successfully!', 'success');
      }
    } catch { toast('Invalid file format!', 'error'); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('⚠️ Are you sure? This will delete ALL data permanently!')) return;
  if (!confirm('Last warning! Delete everything?')) return;
  localStorage.removeItem('sh_mobile_erp_v2');
  db = { products: [], sales: [], repairs: [], warranty: [], customers: [], expenses: [],
    categories: ['Phones','Accessories','Spare Parts','Tablets','Other'],
    settings: { shopName: 'SH Mobile Padaviya', phone: '078-533-6459', address: '', currency: 'Rs.' }
  };
  saveData();
  renderSettings();
  updateDashboard();
  toast('All data cleared!', 'warning');
}

// ============================================
//   BARCODE SCANNING MODULE (CAMERA & HARDWARE)
// ============================================

let scannerStream = null;
let scannerInterval = null;
let currentScannerTargetId = null;
let currentScannerCallback = null;
let html5QrScannerInstance = null;
let availableCameraDevices = [];

// Realistic POS Beep sound using Web Audio API
function playScanBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

async function openBarcodeScanner(targetInputId, callback = null) {
  currentScannerTargetId = targetInputId;
  currentScannerCallback = callback;
  openModal('barcodeScannerModal');

  const select = document.getElementById('scannerCameraSelect');
  select.innerHTML = '<option value="">Default Camera</option>';

  // Enumerate cameras
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCameraDevices = devices.filter(d => d.kind === 'videoinput');
      if (availableCameraDevices.length > 0) {
        select.innerHTML = availableCameraDevices.map((d, i) =>
          `<option value="${d.deviceId}">${d.label || `Camera ${i + 1}`}</option>`
        ).join('');
      }
    }
  } catch (e) {}

  startScannerCamera(select.value || null);
}

async function startScannerCamera(deviceId = null) {
  stopScannerCamera();

  const video = document.getElementById('scannerVideo');
  const qrDiv = document.getElementById('html5QrCodeReader');
  const laser = document.querySelector('.scanner-laser');
  const guidelines = document.querySelector('.scanner-guidelines');

  // Try native BarcodeDetector API first (Supported in Chrome/Edge, very fast & accurate)
  if ('BarcodeDetector' in window) {
    if (video) video.style.display = 'block';
    if (qrDiv) qrDiv.style.display = 'none';
    if (laser) laser.style.display = 'block';
    if (guidelines) guidelines.style.display = 'block';

    const constraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };

    try {
      scannerStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (video) {
        video.srcObject = scannerStream;
        await video.play();
      }

      const supportedFormats = await BarcodeDetector.getSupportedFormats();
      const detector = new BarcodeDetector({ formats: supportedFormats });

      scannerInterval = setInterval(async () => {
        try {
          if (video && video.readyState >= 2) {
            const detected = await detector.detect(video);
            if (detected && detected.length > 0) {
              const code = detected[0].rawValue;
              if (code) {
                onBarcodeSuccessfullyDetected(code);
              }
            }
          }
        } catch (err) {}
      }, 150);
      return;
    } catch (err) {
      console.warn('Native BarcodeDetector camera error:', err);
    }
  }

  // Fallback to Html5Qrcode if native detector not supported or failed
  if (typeof Html5Qrcode !== 'undefined') {
    if (video) video.style.display = 'none';
    if (qrDiv) qrDiv.style.display = 'block';
    if (laser) laser.style.display = 'none';
    if (guidelines) guidelines.style.display = 'none';

    try {
      html5QrScannerInstance = new Html5Qrcode('html5QrCodeReader');
      const cameraConfig = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' };
      await html5QrScannerInstance.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 150 }
        },
        (decodedText) => {
          onBarcodeSuccessfullyDetected(decodedText);
        },
        () => {}
      );
      return;
    } catch (err) {
      console.warn('Html5Qrcode error:', err);
    }
  }

  toast('Camera could not be accessed. Please allow camera permissions or use a USB barcode scanner.', 'warning');
}

function switchScannerCamera() {
  const select = document.getElementById('scannerCameraSelect');
  startScannerCamera(select.value || null);
}

function stopScannerCamera() {
  if (scannerInterval) {
    clearInterval(scannerInterval);
    scannerInterval = null;
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  const video = document.getElementById('scannerVideo');
  if (video) {
    video.srcObject = null;
  }
  if (html5QrScannerInstance) {
    try {
      html5QrScannerInstance.stop().then(() => {
        html5QrScannerInstance.clear();
        html5QrScannerInstance = null;
      }).catch(() => {
        html5QrScannerInstance = null;
      });
    } catch (e) {
      html5QrScannerInstance = null;
    }
  }
}

function closeBarcodeScanner() {
  stopScannerCamera();
  closeModal('barcodeScannerModal');
  currentScannerTargetId = null;
  currentScannerCallback = null;
}

function onBarcodeSuccessfullyDetected(rawCode) {
  const code = (rawCode || '').trim();
  if (!code) return;

  playScanBeep();

  // If there is an active input target
  if (currentScannerTargetId) {
    const input = document.getElementById(currentScannerTargetId);
    if (input) {
      input.value = code;
      input.classList.add('input-scanned-success');
      setTimeout(() => input.classList.remove('input-scanned-success'), 1500);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // Execute callback if provided
  if (typeof currentScannerCallback === 'function') {
    currentScannerCallback(code);
  }

  closeBarcodeScanner();
  toast(`✅ Barcode Scanned: ${code}`, 'success');
}

// Handlers for POS Barcode Scan
function handlePOSBarcodeScan(code) {
  const clean = (code || '').trim().toLowerCase();
  if (!clean) return;

  const found = db.products.find(p =>
    (p.barcode && p.barcode.toLowerCase() === clean) ||
    p.id.toLowerCase() === clean ||
    p.name.toLowerCase() === clean
  );

  if (found) {
    addToCart(found.id);
    playScanBeep();
    toast(`Added to Cart: ${found.name}`, 'success');
    const input = document.getElementById('posSearch');
    if (input) {
      input.value = '';
      renderPOSProducts();
    }
  } else {
    toast(`Product not found for barcode: ${code}`, 'warning');
    const input = document.getElementById('posSearch');
    if (input) {
      input.value = code;
      renderPOSProducts(code);
    }
  }
}

// Global Hardware Barcode Gun Scanner Listener
let hwScannerBuffer = '';
let hwScannerLastTime = 0;

window.addEventListener('keydown', (e) => {
  const now = Date.now();

  // Check if Enter key was sent
  if (e.key === 'Enter') {
    // Hardware scanners type rapidly (< 60ms between chars) and end with Enter
    if (hwScannerBuffer.length >= 3 && (now - hwScannerLastTime < 100)) {
      const scannedCode = hwScannerBuffer.trim();
      hwScannerBuffer = '';
      handleHardwareBarcodeGunScan(scannedCode, e);
    } else {
      hwScannerBuffer = '';
    }
    return;
  }

  // Record characters
  if (e.key && e.key.length === 1) {
    if (now - hwScannerLastTime > 100) {
      hwScannerBuffer = '';
    }
    hwScannerBuffer += e.key;
    hwScannerLastTime = now;
  }
});

function handleHardwareBarcodeGunScan(code, event) {
  // 1. If Product Modal is open, put the barcode in pBarcode
  const productModal = document.getElementById('productModal');
  if (productModal && productModal.classList.contains('open')) {
    event.preventDefault();
    const barcodeInput = document.getElementById('pBarcode');
    if (barcodeInput) {
      barcodeInput.value = code;
      barcodeInput.classList.add('input-scanned-success');
      setTimeout(() => barcodeInput.classList.remove('input-scanned-success'), 1500);
      playScanBeep();
      toast(`✅ Scanned into Product Barcode: ${code}`, 'success');
    }
    return;
  }

  // 2. If Scanner Modal is open
  const scannerModal = document.getElementById('barcodeScannerModal');
  if (scannerModal && scannerModal.classList.contains('open')) {
    event.preventDefault();
    onBarcodeSuccessfullyDetected(code);
    return;
  }

  // 3. If POS Page is active, add product to cart
  const posPage = document.getElementById('page-pos');
  if (posPage && posPage.classList.contains('active')) {
    event.preventDefault();
    handlePOSBarcodeScan(code);
    return;
  }

  // 4. If Barcode Generator page is active
  const barcodePage = document.getElementById('page-barcode');
  if (barcodePage && barcodePage.classList.contains('active')) {
    event.preventDefault();
    const customInput = document.getElementById('barcodeCustom');
    if (customInput) {
      customInput.value = code;
      generateBarcodeManual();
      playScanBeep();
      toast(`✅ Barcode loaded: ${code}`, 'success');
    }
    return;
  }
}

// Attach scanner listeners once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const pBarcodeInput = document.getElementById('pBarcode');
  if (pBarcodeInput) {
    pBarcodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = pBarcodeInput.value.trim();
        if (val) {
          playScanBeep();
          pBarcodeInput.classList.add('input-scanned-success');
          setTimeout(() => pBarcodeInput.classList.remove('input-scanned-success'), 1200);
          toast(`✅ Barcode registered: ${val}`, 'success');
        }
      }
    });
  }

  const posInput = document.getElementById('posSearch');
  if (posInput) {
    posInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = posInput.value.trim();
        if (val) handlePOSBarcodeScan(val);
      }
    });
  }
});

// ===== INIT =====
function init() {
  loadData();
  updateDashboard();
  setInterval(updateDateTime, 1000);
  updateDateTime();
  updateWarrantyStatuses();

  // Add demo data if empty
  if (db.products.length === 0) {
    addDemoData();
  }
}

function addDemoData() {
  db.products = [
    { id: 'P1', name: 'Samsung Galaxy A55', category: 'Phones', brand: 'Samsung', model: 'A55', barcode: 'SH0001234567', imei: '', costPrice: 58000, sellPrice: 65000, wholesalePrice: 61500, shopPrice: 60500, stock: 10, lowStock: 3, warrantyPeriod: 12, warrantyUnit: 'months', description: '' },
    { id: 'P2', name: 'iPhone 15 Screen', category: 'Spare Parts', brand: 'Apple', model: 'iPhone 15', barcode: 'SH0001234568', imei: '', costPrice: 12000, sellPrice: 16000, wholesalePrice: 14000, shopPrice: 13500, stock: 5, lowStock: 2, warrantyPeriod: 3, warrantyUnit: 'months', description: '' },
    { id: 'P3', name: 'USB-C Cable 1m', category: 'Accessories', brand: 'Generic', model: '', barcode: 'SH0001234569', imei: '', costPrice: 350, sellPrice: 600, wholesalePrice: 450, shopPrice: 400, stock: 50, lowStock: 10, warrantyPeriod: 0, warrantyUnit: 'months', description: '' },
    { id: 'P4', name: 'Realme C65', category: 'Phones', brand: 'Realme', model: 'C65', barcode: 'SH0001234570', imei: '', costPrice: 32000, sellPrice: 38000, wholesalePrice: 35500, shopPrice: 34500, stock: 7, lowStock: 3, warrantyPeriod: 12, warrantyUnit: 'months', description: '' },
    { id: 'P5', name: 'Tempered Glass Universal', category: 'Accessories', brand: 'Generic', model: '', barcode: 'SH0001234571', imei: '', costPrice: 120, sellPrice: 250, wholesalePrice: 180, shopPrice: 160, stock: 100, lowStock: 20, warrantyPeriod: 0, warrantyUnit: 'months', description: '' }
  ];

  db.customers = [
    { id: 'C1', name: 'Kamal Perera', phone: '0712345678', address: 'Padaviya', email: '', nic: '', createdAt: new Date().toISOString() },
    { id: 'C2', name: 'Nimal Silva', phone: '0776543210', address: 'Kekirawa', email: '', nic: '', createdAt: new Date().toISOString() }
  ];

  saveData();
  updateDashboard();
  toast('Welcome to SH Mobile ERP! Demo data loaded. 🎉', 'success');
}

// Start the app
init();
