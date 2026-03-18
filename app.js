const formatter = new Intl.NumberFormat('vi-VN');

function formatPrice(value) {
  return `${formatter.format(value)}đ`;
}

function cloneDeals() {
  return (window.MOCK_DEALS || []).map((item) => ({ ...item }));
}

let deals = cloneDeals();

const elements = {
  summaryGrid: document.getElementById('summaryGrid'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortBy: document.getElementById('sortBy'),
  searchInput: document.getElementById('searchInput'),
  onlyBuyNow: document.getElementById('onlyBuyNow'),
  onlyEssential: document.getElementById('onlyEssential'),
  productGrid: document.getElementById('productGrid'),
  resultCount: document.getElementById('resultCount'),
  refreshBtn: document.getElementById('refreshBtn'),
};

function initCategories() {
  const categories = [...new Set(deals.map((item) => item.category))].sort();
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.categoryFilter.appendChild(option);
  });
}

function renderSummary(list) {
  const buyNow = list.filter((item) => item.status === 'buy').length;
  const essential = list.filter((item) => item.essential).length;
  const avgDiscount = list.length ? Math.round(list.reduce((sum, item) => sum + item.discountPercent, 0) / list.length) : 0;
  const freeShip = list.filter((item) => item.freeShip).length;

  const summary = [
    { label: 'Tổng deal đang theo dõi', value: list.length },
    { label: 'Nên mua ngay', value: buyNow },
    { label: 'Deal freeship', value: freeShip },
    { label: 'Giảm giá TB', value: `${avgDiscount}%` },
  ];

  elements.summaryGrid.innerHTML = summary
    .map((item) => `
      <div class="summary-item">
        <div class="label">${item.label}</div>
        <div class="value">${item.value}</div>
      </div>
    `)
    .join('');
}

function getFilteredDeals() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;
  const sortBy = elements.sortBy.value;
  const onlyBuyNow = elements.onlyBuyNow.checked;
  const onlyEssential = elements.onlyEssential.checked;

  let list = [...deals];

  if (keyword) {
    list = list.filter((item) => [item.name, item.shop, item.category, item.note].join(' ').toLowerCase().includes(keyword));
  }

  if (category !== 'all') {
    list = list.filter((item) => item.category === category);
  }

  if (onlyBuyNow) {
    list = list.filter((item) => item.status === 'buy');
  }

  if (onlyEssential) {
    list = list.filter((item) => item.essential);
  }

  const sorters = {
    dealScore: (a, b) => b.dealScore - a.dealScore,
    discountPercent: (a, b) => b.discountPercent - a.discountPercent,
    priceAsc: (a, b) => a.price - b.price,
    unitPriceAsc: (a, b) => parseUnit(a.unit) - parseUnit(b.unit),
    ratingDesc: (a, b) => b.rating - a.rating || b.sold - a.sold,
  };

  list.sort(sorters[sortBy]);
  return list;
}

function parseUnit(unitText) {
  const match = unitText.match(/([\d.]+)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1].replace(/\./g, ''));
}

function renderDeals() {
  const list = getFilteredDeals();
  renderSummary(list);
  elements.resultCount.textContent = `${list.length} deal`;

  if (!list.length) {
    elements.productGrid.innerHTML = '<div class="empty">Không có deal nào khớp bộ lọc hiện tại cả anh Roy ơi.</div>';
    return;
  }

  elements.productGrid.innerHTML = list
    .map((item) => `
      <article class="product-card">
        <div class="product-image">${item.emoji}</div>
        <div>
          <div class="product-top">
            <div>
              <p class="product-name">${item.name}</p>
              <div class="meta">${item.category} • ${item.shop} • ${item.shopType}</div>
            </div>
            <span class="badge ${item.status === 'buy' ? 'buy' : 'wait'}">${item.status === 'buy' ? 'Nên mua ngay' : 'Theo dõi thêm'}</span>
          </div>
          <div class="price-row">
            <span class="price">${formatPrice(item.price)}</span>
            <span class="old-price">${formatPrice(item.oldPrice)}</span>
          </div>
          <div class="tags">${item.note}</div>
          <div class="metrics">
            <span class="metric-chip">-${item.discountPercent}%</span>
            <span class="metric-chip">${item.unit}</span>
            <span class="metric-chip">⭐ ${item.rating}</span>
            <span class="metric-chip">Đã bán ${formatter.format(item.sold)}</span>
            <span class="metric-chip">Deal score ${item.dealScore}</span>
            ${item.freeShip ? '<span class="metric-chip">Freeship</span>' : ''}
            <span class="metric-chip">${item.voucher}</span>
          </div>
        </div>
      </article>
    `)
    .join('');
}

function refreshMockData() {
  deals = cloneDeals().map((item) => {
    const variance = Math.floor(Math.random() * 8) - 3;
    const newDiscount = Math.max(10, item.discountPercent + variance);
    const newPrice = Math.round(item.oldPrice * (100 - newDiscount) / 100 / 1000) * 1000;
    const newScore = Math.max(55, Math.min(97, item.dealScore + variance * 1.7 + (item.freeShip ? 1.5 : 0)));
    return {
      ...item,
      discountPercent: newDiscount,
      price: newPrice,
      dealScore: Math.round(newScore),
      status: newScore >= 82 ? 'buy' : 'wait',
    };
  });
  renderDeals();
}

['input', 'change'].forEach((eventName) => {
  elements.searchInput.addEventListener(eventName, renderDeals);
  elements.categoryFilter.addEventListener(eventName, renderDeals);
  elements.sortBy.addEventListener(eventName, renderDeals);
  elements.onlyBuyNow.addEventListener(eventName, renderDeals);
  elements.onlyEssential.addEventListener(eventName, renderDeals);
});

elements.refreshBtn.addEventListener('click', refreshMockData);

initCategories();
renderDeals();
