const formatter = new Intl.NumberFormat('vi-VN');
const FEED_URL = './household-feed.json';

function formatPrice(value) {
  return `${formatter.format(value)}đ`;
}

let deals = [];

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

function parseSold(text = '') {
  const lower = String(text).toLowerCase();
  const num = parseFloat((lower.match(/[\d.]+/) || [0])[0]);
  if (lower.includes('k')) return Math.round(num * 1000);
  if (lower.includes('tr')) return Math.round(num * 1000000);
  return Math.round(num || 0);
}

function priceFromText(text = '') {
  const digits = String(text).replace(/[^\d]/g, '');
  return Number(digits || 0);
}

function inferCategory(title = '') {
  const t = title.toLowerCase();
  if (/(giấy|khăn giấy|pulppy|posy)/.test(t)) return 'Giấy & vệ sinh';
  if (/(nước giặt|omo|ariel|tide|comfort|downy|nước xả|xả vải)/.test(t)) return 'Giặt giũ';
  if (/(nước rửa chén|sunlight|lau sàn|tẩy bếp|tẩy rửa|túi rác|lau đa năng|vệ sinh)/.test(t)) return 'Vệ sinh nhà cửa';
  if (/(bàn chải|kem đánh răng|chăm sóc cá nhân)/.test(t)) return 'Chăm sóc cá nhân';
  if (/(hộp đựng thực phẩm|hộp đựng|nhà bếp|bếp)/.test(t)) return 'Nhà bếp';
  return 'Gia dụng';
}

function inferEssential(category) {
  return ['Giấy & vệ sinh', 'Giặt giũ', 'Vệ sinh nhà cửa', 'Chăm sóc cá nhân'].includes(category);
}

function categoryEmoji(category) {
  return {
    'Giấy & vệ sinh': '🧻',
    'Giặt giũ': '🧺',
    'Vệ sinh nhà cửa': '🧼',
    'Chăm sóc cá nhân': '🪥',
    'Nhà bếp': '🍽️',
    'Gia dụng': '🏠',
  }[category] || '🛒';
}

function makeSvgThumb(title, category) {
  const emoji = categoryEmoji(category);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff1ec"/><stop offset="100%" stop-color="#ffd8cc"/></linearGradient></defs>
    <rect width="320" height="320" rx="28" fill="url(#g)"/>
    <rect x="18" y="18" width="284" height="284" rx="22" fill="#ffffff" opacity="0.85"/>
    <text x="32" y="68" font-size="42">${emoji}</text>
    <text x="32" y="112" font-size="20" font-family="Arial, sans-serif" fill="#7d3b2e">${esc(category)}</text>
    <foreignObject x="28" y="130" width="264" height="150">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:24px;line-height:1.25;color:#241915;font-weight:700;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;">
        ${esc(title)}
      </div>
    </foreignObject>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function isDirectListing(link = '') {
  return /^https:\/\/shopee\.vn\/.+-i\.\d+\.\d+/i.test(link);
}

function computeDealScore({ rating = 0, sold = 0, essential = false, price = 0 }) {
  let score = rating * 12 + Math.min(sold, 100000) / 3000 + (essential ? 16 : 4);
  if (price && price < 150000) score += 8;
  if (price && price < 80000) score += 5;
  return Math.max(55, Math.min(96, Math.round(score)));
}

function normalizeProducts(payload) {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  return products.map((item, index) => {
    const category = inferCategory(item.title);
    const price = priceFromText(item.price);
    const sold = parseSold(item.sold);
    const essential = inferEssential(category);
    const score = computeDealScore({ rating: item.rating, sold, essential, price });
    const direct = isDirectListing(item.link);
    return {
      id: `feed-${item.id || index}`,
      name: item.title,
      category,
      essential,
      price,
      oldPrice: Math.round(price * 1.18),
      unit: direct ? 'Listing thật' : 'Search link sát món',
      discountPercent: 15,
      rating: Number(item.rating || 0),
      sold,
      shop: payload?.store?.name || 'Household feed',
      shopType: direct ? 'Direct listing' : 'Search',
      freeShip: false,
      voucher: direct ? 'Link trực tiếp' : 'Link tìm kiếm sát nhất',
      dealScore: score,
      status: score >= 80 ? 'buy' : 'wait',
      emoji: categoryEmoji(category),
      note: direct ? 'Đã gắn listing Shopee trực tiếp cho món này.' : 'Món này hiện đang dùng search link rất sát; em sẽ tiếp tục thay bằng listing trực tiếp sau.',
      image: item.image || makeSvgThumb(item.title, category),
      link: item.link,
    };
  });
}

function resetCategoryOptions() {
  elements.categoryFilter.innerHTML = '<option value="all">Tất cả</option>';
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
  const directCount = list.filter((item) => item.shopType === 'Direct listing').length;
  const avgDiscount = list.length ? Math.round(list.reduce((sum, item) => sum + item.discountPercent, 0) / list.length) : 0;
  const summary = [
    { label: 'Tổng deal đang theo dõi', value: list.length },
    { label: 'Nên mua ngay', value: buyNow },
    { label: 'Listing trực tiếp', value: directCount },
    { label: 'Giảm giá quy đổi', value: `${avgDiscount}%` },
  ];
  elements.summaryGrid.innerHTML = summary.map((item) => `
    <div class="summary-item">
      <div class="label">${item.label}</div>
      <div class="value">${item.value}</div>
    </div>
  `).join('');
}

function getFilteredDeals() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;
  const sortBy = elements.sortBy.value;
  const onlyBuyNow = elements.onlyBuyNow.checked;
  const onlyEssential = elements.onlyEssential.checked;

  let list = [...deals];
  if (keyword) list = list.filter((item) => [item.name, item.shop, item.category, item.note].join(' ').toLowerCase().includes(keyword));
  if (category !== 'all') list = list.filter((item) => item.category === category);
  if (onlyBuyNow) list = list.filter((item) => item.status === 'buy');
  if (onlyEssential) list = list.filter((item) => item.essential);

  const sorters = {
    dealScore: (a, b) => b.dealScore - a.dealScore,
    discountPercent: (a, b) => b.discountPercent - a.discountPercent,
    priceAsc: (a, b) => a.price - b.price,
    unitPriceAsc: (a, b) => a.price - b.price,
    ratingDesc: (a, b) => b.rating - a.rating || b.sold - a.sold,
  };
  list.sort(sorters[sortBy]);
  return list;
}

function renderDeals() {
  const list = getFilteredDeals();
  renderSummary(list);
  elements.resultCount.textContent = `${list.length} deal • household feed`;

  if (!list.length) {
    elements.productGrid.innerHTML = '<div class="empty">Chưa có deal nào khớp bộ lọc hiện tại cả anh Roy ơi.</div>';
    return;
  }

  elements.productGrid.innerHTML = list.map((item) => {
    const bg = item.image ? `style="background-image:url('${item.image}')"` : '';
    const imageClass = item.image ? 'product-image has-photo' : 'product-image';
    const action = item.link ? `<a class="metric-chip" href="${item.link}" target="_blank" rel="noopener noreferrer">${item.shopType === 'Direct listing' ? 'Mở listing thật' : 'Mở search sát nhất'}</a>` : '';
    return `
      <article class="product-card">
        <div class="${imageClass}" ${bg}>${item.emoji || '🛒'}</div>
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
            <span class="metric-chip">${item.voucher}</span>
            ${action}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadFeed() {
  elements.productGrid.innerHTML = '<div class="empty">Đang tải household feed cho anh Roy...</div>';
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    deals = normalizeProducts(payload);
    resetCategoryOptions();
    renderDeals();
  } catch (error) {
    console.error(error);
    elements.productGrid.innerHTML = '<div class="empty">Không tải được household feed lúc này.</div>';
    elements.summaryGrid.innerHTML = '';
    elements.resultCount.textContent = '0 deal';
  }
}

['input', 'change'].forEach((eventName) => {
  elements.searchInput.addEventListener(eventName, renderDeals);
  elements.categoryFilter.addEventListener(eventName, renderDeals);
  elements.sortBy.addEventListener(eventName, renderDeals);
  elements.onlyBuyNow.addEventListener(eventName, renderDeals);
  elements.onlyEssential.addEventListener(eventName, renderDeals);
});

elements.refreshBtn.addEventListener('click', loadFeed);
loadFeed();
