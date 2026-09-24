const catalogEl = document.getElementById('catalog');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const categoryTabsEl = document.getElementById('categoryTabs');
const itemCountEl = document.getElementById('itemCount');
const wishlistCountEl = document.getElementById('wishlistCount');
const wishlistListEl = document.getElementById('wishlistList');
const checkoutPanelEl = document.getElementById('checkoutPanel');
const checkoutSummaryEl = document.getElementById('checkoutSummary');
const checkoutBtnEl = document.getElementById('checkoutBtn');
const clearCartBtnEl = document.getElementById('clearCartBtn');
const cancelCheckoutBtnEl = document.getElementById('cancelCheckoutBtn');
const placeOrderBtnEl = document.getElementById('placeOrderBtn');
const ordersListEl = document.getElementById('ordersList');
const clearOrdersBtnEl = document.getElementById('clearOrdersBtn');
const imageModalEl = document.getElementById('imageModal');
const modalImageEl = document.getElementById('modalImage');
const closeModalBtnEl = document.getElementById('closeModalBtn');
const sortSelectEl = document.getElementById('sortSelect');
const hideSoldCheckboxEl = document.getElementById('hideSoldCheckbox');
const drawOutfitBtnEl = document.getElementById('drawOutfitBtn');
const outfitResultEl = document.getElementById('outfitResult');
const statsContentEl = document.getElementById('statsContent');
const dailyPicksEl = document.getElementById('dailyPicks');
const dailyDateEl = document.getElementById('dailyDate');
const spendingSummaryEl = document.getElementById('spendingSummary');
const colorChipsEl = document.getElementById('colorChips');
const swatchWallEl = document.getElementById('swatchWall');
const paletteInsightEl = document.getElementById('paletteInsight');
const metaMissingEl = document.getElementById('metaMissing');
const seasonBarsEl = document.getElementById('seasonBars');
const seasonInsightEl = document.getElementById('seasonInsight');
const activeFiltersEl = document.getElementById('activeFilters');

const COLOR_SWATCHES = {
  黑: '#1F1F1F',
  白: '#FAFAFA',
  米白: '#F1E8D8',
  灰: '#9A9A9A',
  卡其: '#C8AD7F',
  咖啡: '#7B5236',
  深藍: '#1F2F55',
  藍: '#6C9BD2',
  綠: '#5E8C61',
  粉: '#F2B5C4',
  紅: '#C0392B',
  黃: '#E9C94B',
  紫: '#9B7BB8',
  橘: '#E8894A',
  金屬色: 'linear-gradient(135deg, #e5e5e5, #b8860b)',
  多色: 'conic-gradient(#e57373, #ffd54f, #81c784, #64b5f6, #ba68c8, #e57373)',
};
const COLOR_ORDER = Object.keys(COLOR_SWATCHES);
const SEASONS = ['春', '夏', '秋', '冬'];

let items = [];
let metadata = {};
let colorFilter = null;
let seasonFilter = null;
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
let orders = JSON.parse(localStorage.getItem('orders') || '[]');
let soldItems = JSON.parse(localStorage.getItem('soldItems') || '[]');
let viewCounts = JSON.parse(localStorage.getItem('viewCounts') || '{}');
let recommendHistory = JSON.parse(localStorage.getItem('recommendHistory') || '{}');
const DAILY_PICK_COUNT = 5;
const MAX_PER_CATEGORY = 2;
const HISTORY_DAYS = 14;
let longPressTimer = null;
let longPressTriggered = false;
let displayedItemCount = 50;
const ITEMS_PER_LOAD = 50;

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

function saveOrders() {
  localStorage.setItem('orders', JSON.stringify(orders));
}

function clearOrders() {
  orders = [];
  saveOrders();
  render();
}

function saveSoldItems() {
  localStorage.setItem('soldItems', JSON.stringify(soldItems));
}

function saveViewCounts() {
  localStorage.setItem('viewCounts', JSON.stringify(viewCounts));
}

function saveRecommendHistory() {
  localStorage.setItem('recommendHistory', JSON.stringify(recommendHistory));
}

function formatMoney(value) {
  return `NT$ ${value.toLocaleString('zh-TW')}`;
}

function zeroPad(value, length = 4) {
  return String(value).padStart(length, '0');
}

function getImageUrl(item) {
  const hasCustomImage = item.image && !item.image.includes('placeholder');
  if (hasCustomImage) {
    return item.image;
  }

  const idString = zeroPad(item.id);
  return `./assets/${idString}.jpg`;
}

function getWishlistItems() {
  return wishlist
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);
}

function getNumericPrice(item) {
  return Number(String(item.price).replace(/[^\d]/g, '')) || 0;
}

function getMeta(item) {
  return metadata[item.id] || null;
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '春';
  if (month >= 6 && month <= 8) return '夏';
  if (month >= 9 && month <= 11) return '秋';
  return '冬';
}

// 還沒有 metadata 的衣服不擋掉，避免新加的衣服永遠抽不到
function isInSeason(item, season) {
  const meta = getMeta(item);
  return !meta || meta.seasons.includes(season);
}

function getHexLightness(hex) {
  const value = parseInt(String(hex).slice(1), 16);
  if (Number.isNaN(value)) return 0;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

function getOwnedItems() {
  return items.filter((item) => !soldItems.includes(item.id));
}

function calculateTotal(itemsList) {
  const subtotal = itemsList.reduce((sum, item) => sum + getNumericPrice(item), 0);

  return {
    subtotal,
    total: subtotal,
  };
}

function toggleWishlist(itemId) {
  if (wishlist.includes(itemId)) {
    wishlist = wishlist.filter((id) => id !== itemId);
  } else {
    wishlist.push(itemId);
  }
  saveWishlist();
  render();
}

function removeFromWishlist(itemId) {
  wishlist = wishlist.filter((id) => id !== itemId);
  saveWishlist();
  render();
}

function toggleSoldItem(itemId) {
  if (soldItems.includes(itemId)) {
    soldItems = soldItems.filter((id) => id !== itemId);
  } else {
    soldItems.push(itemId);
  }
  saveSoldItems();
  render();
}

function handleSoldTagPointerDown(event) {
  const tag = event.target.closest('[data-sold-tag]');
  if (!tag) return;

  longPressTriggered = false;
  longPressTimer = window.setTimeout(() => {
    longPressTriggered = true;
    toggleSoldItem(tag.dataset.soldTag);
  }, 400);
}

function handleSoldTagPointerUp() {
  if (longPressTimer) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function openImageModal(imageUrl, itemId) {
  if (itemId) {
    viewCounts[itemId] = (viewCounts[itemId] || 0) + 1;
    saveViewCounts();
  }
  modalImageEl.src = imageUrl;
  imageModalEl.classList.remove('hidden');
}

function closeImageModal() {
  imageModalEl.classList.add('hidden');
  modalImageEl.src = '';
}

function showCheckout() {
  checkoutPanelEl.classList.remove('hidden');
  renderCheckoutSummary();
}

function hideCheckout() {
  checkoutPanelEl.classList.add('hidden');
}

function clearCart() {
  wishlist = [];
  saveWishlist();
  hideCheckout();
  render();
}

function placeOrder() {
  const selectedItems = getWishlistItems();
  if (selectedItems.length === 0) {
    return;
  }

  const { subtotal, total } = calculateTotal(selectedItems);
  const order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toLocaleString('zh-TW'),
    timestamp: Date.now(),
    items: selectedItems.map((item) => ({
      name: item.name,
      price: item.price,
      category: item.category,
    })),
    subtotal,
    total,
  };

  orders.unshift(order);
  saveOrders();
  wishlist = [];
  saveWishlist();
  hideCheckout();
  render();
}

function getFilteredItems() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const hideSold = hideSoldCheckboxEl.checked;
  const sortOrder = sortSelectEl.value;

  const filtered = items.filter((item) => {
    const meta = getMeta(item);
    const metaText = meta
      ? [meta.color, ...meta.secondaryColors, meta.pattern, meta.tone, meta.sleeve, ...meta.seasons, ...meta.styles].join(' ')
      : '';

    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.note.toLowerCase().includes(query) ||
      metaText.includes(query);

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSold = !hideSold || !soldItems.includes(item.id);
    const matchesColor = !colorFilter || (meta && meta.color === colorFilter);
    const matchesSeason = !seasonFilter || (meta && meta.seasons.includes(seasonFilter));

    return matchesQuery && matchesCategory && matchesSold && matchesColor && matchesSeason;
  });

  if (sortOrder === 'price-asc') {
    filtered.sort((a, b) => getNumericPrice(a) - getNumericPrice(b));
  } else if (sortOrder === 'price-desc') {
    filtered.sort((a, b) => getNumericPrice(b) - getNumericPrice(a));
  }

  return filtered;
}

function renderCategoryTabs() {
  if (!categoryTabsEl) return;

  const categories = [...new Set(items.map((item) => item.category))];
  const tabs = ['all', ...categories];

  categoryTabsEl.innerHTML = tabs
    .map((value) => {
      const label = value === 'all' ? '全部' : value;
      const active = categoryFilter.value === value;
      return `<button type="button" class="tab-btn ${active ? 'active' : ''}" data-value="${value}">${label}</button>`;
    })
    .join('');
}

function renderWishlist() {
  const selectedItems = getWishlistItems();
  wishlistCountEl.textContent = selectedItems.length;

  if (selectedItems.length === 0) {
    wishlistListEl.innerHTML = '<div>目前沒有選擇的衣服</div>';
    return;
  }

  wishlistListEl.innerHTML = selectedItems
    .map((item) => `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <div>${item.price}</div>
        </div>
        <button type="button" data-remove-id="${item.id}">移除</button>
      </div>
    `)
    .join('');
}

function renderCheckoutSummary() {
  const selectedItems = getWishlistItems();
  if (selectedItems.length === 0) {
    checkoutSummaryEl.innerHTML = '<div class="empty">請先加入你想買的衣服</div>';
    placeOrderBtnEl.disabled = true;
    return;
  }

  const { subtotal, total } = calculateTotal(selectedItems);
  checkoutSummaryEl.innerHTML = `
    <div class="checkout-row"><span>商品數量</span><strong>${selectedItems.length} 件</strong></div>
    ${selectedItems
      .map(
        (item) => `<div class="checkout-row"><span>${item.name}</span><strong>${item.price}</strong></div>`
      )
      .join('')}
    <div class="checkout-row total"><span>總金額</span><strong>${formatMoney(total)}</strong></div>
  `;
  placeOrderBtnEl.disabled = false;
}

function renderOrders() {
  if (orders.length === 0) {
    ordersListEl.innerHTML = '<div class="empty">尚無訂單紀錄</div>';
    return;
  }

  ordersListEl.innerHTML = orders
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-meta">
            <strong>${order.id}</strong>
            <span>${order.createdAt}</span>
          </div>
          <div>${order.items.map((item) => item.name).join('、')}</div>
          <div class="checkout-row"><span>總金額</span><strong>${formatMoney(order.total)}</strong></div>
        </article>
      `
    )
    .join('');
}

function renderCatalog() {
  const filteredItems = getFilteredItems();
  itemCountEl.textContent = filteredItems.length;

  if (filteredItems.length === 0) {
    catalogEl.innerHTML = '<div class="empty">沒有符合條件的衣服，試試改一下搜尋或分類。</div>';
    return;
  }

  catalogEl.innerHTML = filteredItems
    .map((item) => {
      const liked = wishlist.includes(item.id);
      const sold = soldItems.includes(item.id);
      const meta = getMeta(item);
      const tags = meta
        ? `<div class="card-tags"><span class="color-dot" style="background:${meta.hex}"></span>${meta.color}・${meta.seasons.join('')}</div>`
        : '';
      return `
        <article class="card">
          <img src="${getImageUrl(item)}" alt="${item.name}" class="card-image" data-item-id="${item.id}" loading="lazy" decoding="async" onerror="this.src='./assets/placeholder.svg'; this.onerror=null" />
          <div class="card-body">
            <div class="card-top">
              <span class="badge">${item.category}</span>
              <button type="button" class="sold-tag ${sold ? 'sold' : ''}" data-sold-tag="${item.id}">
                ${sold ? '已售出' : '標記售出'}
              </button>
            </div>
            <div class="card-meta">
              <span class="price">${item.price}</span>
            </div>
            <h3>${item.name}</h3>
            ${tags}
            <p class="note">${item.note}</p>
            <div class="card-actions">
              <button class="btn-primary ${liked ? 'active' : ''}" data-id="${item.id}" ${sold && !liked ? 'disabled' : ''}>
                ${sold && !liked ? '已售出' : liked ? '已加入購物車' : '加入購物車'}
              </button>

            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function loadMoreItems() {
  const filteredItems = getFilteredItems();
  const catalogRect = catalogEl.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  
  // 當目錄距離底部少於 500px 時，載入更多
  if (catalogRect.bottom < windowHeight + 500 && displayedItemCount < filteredItems.length) {
    displayedItemCount += ITEMS_PER_LOAD;
    renderCatalog();
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function renderOutfitCards(picks, season) {
  const { total } = calculateTotal(picks);
  outfitResultEl.innerHTML = `
    <div class="outfit-cards">
      ${picks
        .map(
          (item) => `
            <div class="outfit-card">
              <img src="${getImageUrl(item)}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.src='./assets/placeholder.svg'; this.onerror=null" />
              <div class="outfit-card-body">
                <span class="badge">${item.category}</span>
                <span class="outfit-card-name">${item.name}</span>
                <span class="outfit-card-price">${item.price}</span>
              </div>
            </div>
          `
        )
        .join('')}
    </div>
    <div class="outfit-total">${season}季穿搭・共 ${picks.length} 件・<strong>${formatMoney(total)}</strong></div>
  `;
}

const COAT_CHANCE = { 春: 0.5, 夏: 0.15, 秋: 0.6, 冬: 1 };
const MAX_OUTFIT_ATTEMPTS = 30;

function pickOutfitOnce(pools, season) {
  const { dressPool, topPool, bottomPool, coatPool } = pools;
  const picks = [];
  const useDress = dressPool.length > 0 && (topPool.length === 0 || bottomPool.length === 0 || Math.random() < 0.5);

  if (useDress) {
    picks.push(pickRandom(dressPool));
  } else if (topPool.length > 0 && bottomPool.length > 0) {
    picks.push(pickRandom(topPool), pickRandom(bottomPool));
  } else if (dressPool.length > 0) {
    picks.push(pickRandom(dressPool));
  } else if (topPool.length > 0) {
    picks.push(pickRandom(topPool));
  } else if (bottomPool.length > 0) {
    picks.push(pickRandom(bottomPool));
  }

  if (coatPool.length > 0 && Math.random() < COAT_CHANCE[season]) {
    picks.push(pickRandom(coatPool));
  }

  return picks;
}

// 一套最多一件鮮豔色，其他用中性或柔和色襯托
function isColorBalanced(picks) {
  return picks.filter((item) => getMeta(item)?.tone === '鮮豔').length <= 1;
}

function drawOutfit() {
  const season = getCurrentSeason();
  const available = getOwnedItems();
  const byCategory = (category) => {
    const all = available.filter((item) => item.category === category);
    const inSeason = all.filter((item) => isInSeason(item, season));
    return inSeason.length > 0 ? inSeason : all;
  };

  const pools = {
    dressPool: byCategory('洋裝'),
    topPool: byCategory('上衣'),
    bottomPool: byCategory('下身'),
    coatPool: byCategory('外套'),
  };

  let picks = pickOutfitOnce(pools, season);
  for (let attempt = 1; attempt < MAX_OUTFIT_ATTEMPTS && !isColorBalanced(picks); attempt += 1) {
    picks = pickOutfitOnce(pools, season);
  }

  if (picks.length === 0) {
    outfitResultEl.innerHTML = '<p class="empty">目前沒有可以搭配的衣服了（可能都已售出）</p>';
    return;
  }

  renderOutfitCards(picks, season);
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${zeroPad(now.getMonth() + 1, 2)}-${zeroPad(now.getDate(), 2)}`;
}

// 以日期當種子，同一天永遠抽到同一組推薦，隔天才會換
function createSeededRandom(seedText) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pruneRecommendHistory() {
  const staleKeys = Object.keys(recommendHistory).sort().reverse().slice(HISTORY_DAYS);
  staleKeys.forEach((key) => delete recommendHistory[key]);
}

function getRecentlyRecommendedIds(todayKey) {
  const recent = new Set();
  Object.entries(recommendHistory).forEach(([date, ids]) => {
    if (date === todayKey) return;
    ids.forEach((id) => recent.add(id));
  });
  return recent;
}

function pickDailyItems(todayKey) {
  const recentIds = getRecentlyRecommendedIds(todayKey);
  const random = createSeededRandom(todayKey);

  const season = getCurrentSeason();
  const owned = getOwnedItems();
  const inSeason = owned.filter((item) => isInSeason(item, season));
  const candidates = inSeason.length >= DAILY_PICK_COUNT ? inSeason : owned;

  let pool = candidates
    .map((item) => {
      const views = viewCounts[item.id] || 0;
      // 越少被點開的權重越高，完全沒看過的再加成，最近推薦過的降權
      let weight = views === 0 ? 3 : 1 / (1 + views);
      if (recentIds.has(item.id)) {
        weight *= 0.1;
      }
      return { item, weight };
    });

  const picks = [];
  const categoryCount = {};

  while (picks.length < DAILY_PICK_COUNT && pool.length > 0) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let threshold = random() * totalWeight;
    let chosen = pool[pool.length - 1];

    for (const entry of pool) {
      threshold -= entry.weight;
      if (threshold <= 0) {
        chosen = entry;
        break;
      }
    }

    picks.push(chosen.item);
    categoryCount[chosen.item.category] = (categoryCount[chosen.item.category] || 0) + 1;
    pool = pool.filter(
      (entry) =>
        entry.item.id !== chosen.item.id &&
        (categoryCount[entry.item.category] || 0) < MAX_PER_CATEGORY
    );
  }

  return picks;
}

function getDailyPickIds() {
  const todayKey = getTodayKey();
  const stored = recommendHistory[todayKey];

  if (Array.isArray(stored)) {
    const stillValid = stored.filter((id) => items.some((item) => item.id === id));
    if (stillValid.length > 0) {
      return stillValid;
    }
  }

  recommendHistory[todayKey] = pickDailyItems(todayKey).map((item) => item.id);
  pruneRecommendHistory();
  saveRecommendHistory();
  return recommendHistory[todayKey];
}

function renderDailyPicks() {
  if (!dailyPicksEl) return;

  const picks = getDailyPickIds()
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean);

  dailyDateEl.textContent = `${getTodayKey()}・${picks.length} 件`;

  if (picks.length === 0) {
    dailyPicksEl.innerHTML = '<p class="empty">沒有可以推薦的衣服了</p>';
    return;
  }

  dailyPicksEl.innerHTML = picks
    .map((item) => {
      const liked = wishlist.includes(item.id);
      const neverViewed = !viewCounts[item.id];
      return `
        <div class="daily-card">
          <img src="${getImageUrl(item)}" alt="${item.name}" data-item-id="${item.id}" loading="lazy" decoding="async" onerror="this.src='./assets/placeholder.svg'; this.onerror=null" />
          <div class="daily-card-body">
            <div class="daily-card-badges">
              <span class="badge">${item.category}</span>
              ${neverViewed ? '<span class="badge daily-badge-new">久違了</span>' : ''}
            </div>
            <span class="daily-card-name">${item.name}</span>
            <span class="daily-card-price">${item.price}</span>
            <button type="button" class="daily-card-btn ${liked ? 'active' : ''}" data-daily-id="${item.id}">
              ${liked ? '已加入' : '加入購物車'}
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function getOrderTime(order) {
  if (order.timestamp) {
    return order.timestamp;
  }

  const datePart = String(order.createdAt || '').split(' ')[0].replace(/-/g, '/');
  const parsed = Date.parse(datePart);
  return Number.isNaN(parsed) ? null : parsed;
}

function renderSpending() {
  if (!spendingSummaryEl) return;

  const now = new Date();
  let monthTotal = 0;
  let allTotal = 0;
  let orderedCount = 0;

  orders.forEach((order) => {
    allTotal += order.total || 0;
    orderedCount += order.items ? order.items.length : 0;

    const time = getOrderTime(order);
    if (time === null) return;

    const orderDate = new Date(time);
    if (orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth()) {
      monthTotal += order.total || 0;
    }
  });

  spendingSummaryEl.innerHTML = `
    <div class="spending-tile">
      <strong>${formatMoney(monthTotal)}</strong>
      <span>本月消費</span>
    </div>
    <div class="spending-tile">
      <strong>${formatMoney(allTotal)}</strong>
      <span>累計消費</span>
    </div>
    <div class="spending-tile">
      <strong>${orderedCount}</strong>
      <span>累計件數</span>
    </div>
  `;
}

function toColorLabel(color) {
  return color.endsWith('色') ? color : `${color}色`;
}

function renderPalette() {
  if (!colorChipsEl) return;

  const owned = getOwnedItems();
  const tagged = owned.filter((item) => getMeta(item));
  const missing = owned.length - tagged.length;

  metaMissingEl.classList.toggle('hidden', missing === 0);
  metaMissingEl.textContent = `還有 ${missing} 件沒有顏色與季節資料，重新產生 metadata.json 後就會出現在這裡。`;

  if (tagged.length === 0) {
    paletteInsightEl.textContent = '';
    colorChipsEl.innerHTML = '';
    swatchWallEl.innerHTML = '';
    return;
  }

  const counts = {};
  tagged.forEach((item) => {
    const { color } = getMeta(item);
    counts[color] = (counts[color] || 0) + 1;
  });
  const colors = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  colorChipsEl.innerHTML = colors
    .map(
      (color) => `
        <button type="button" class="color-chip ${colorFilter === color ? 'active' : ''}" data-color="${color}">
          <span class="color-dot" style="background:${COLOR_SWATCHES[color]}"></span>${color}<small>${counts[color]}</small>
        </button>
      `
    )
    .join('');

  const sorted = [...tagged].sort((a, b) => {
    const metaA = getMeta(a);
    const metaB = getMeta(b);
    const byFamily = COLOR_ORDER.indexOf(metaA.color) - COLOR_ORDER.indexOf(metaB.color);
    return byFamily || getHexLightness(metaA.hex) - getHexLightness(metaB.hex);
  });

  swatchWallEl.innerHTML = sorted
    .map((item) => {
      const meta = getMeta(item);
      const dimmed = colorFilter && meta.color !== colorFilter;
      return `<button type="button" class="swatch ${dimmed ? 'dimmed' : ''}" style="background:${meta.hex}" data-swatch-id="${item.id}" title="${item.name}" aria-label="${item.name}"></button>`;
    })
    .join('');

  const top = colors[0];
  const neutralCount = tagged.filter((item) => getMeta(item).tone === '中性').length;
  const neutralPercent = Math.round((neutralCount / tagged.length) * 100);
  paletteInsightEl.textContent = `${toColorLabel(top)}最多（${counts[top]} 件）・中性色佔 ${neutralPercent}%`;
}

function renderSeasons() {
  if (!seasonBarsEl) return;

  const now = getCurrentSeason();
  const tagged = getOwnedItems().filter((item) => getMeta(item));

  if (tagged.length === 0) {
    seasonInsightEl.textContent = '';
    seasonBarsEl.innerHTML = '';
    return;
  }

  const counts = {};
  SEASONS.forEach((season) => {
    counts[season] = tagged.filter((item) => getMeta(item).seasons.includes(season)).length;
  });
  const maxCount = Math.max(1, ...Object.values(counts));
  const fewest = SEASONS.reduce((least, season) => (counts[season] < counts[least] ? season : least));

  seasonBarsEl.innerHTML = SEASONS.map(
    (season) => `
      <div class="stat-bar-row ${seasonFilter === season ? 'active' : ''}" data-season="${season}" role="button" tabindex="0">
        <span class="stat-bar-label">${season}${season === now ? '<span class="season-now">現在</span>' : ''}</span>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${Math.round((counts[season] / maxCount) * 100)}%"></div></div>
        <span class="stat-bar-value">${counts[season]} 件</span>
      </div>
    `
  ).join('');

  seasonInsightEl.textContent = `現在是${now}天，有 ${counts[now]} 件能穿・${fewest}天最少`;
}

function renderActiveFilters() {
  const chips = [];
  if (colorFilter) {
    chips.push(
      `<button type="button" data-clear="color"><span class="color-dot" style="background:${COLOR_SWATCHES[colorFilter]}"></span>顏色：${colorFilter} ✕</button>`
    );
  }
  if (seasonFilter) {
    chips.push(`<button type="button" data-clear="season">季節：${seasonFilter} ✕</button>`);
  }

  activeFiltersEl.classList.toggle('hidden', chips.length === 0);
  activeFiltersEl.innerHTML = chips.length > 0 ? `<span>篩選中</span>${chips.join('')}` : '';
}

function scrollToCatalog() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  activeFiltersEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
}

function renderStats() {
  if (!statsContentEl) return;

  const totalCount = items.length;
  const soldCount = items.filter((item) => soldItems.includes(item.id)).length;
  const totalValue = items.reduce((sum, item) => sum + getNumericPrice(item), 0);
  const soldRatio = totalCount === 0 ? 0 : Math.round((soldCount / totalCount) * 100);

  const categories = [...new Set(items.map((item) => item.category))];
  const maxCategoryCount = Math.max(1, ...categories.map((category) => items.filter((item) => item.category === category).length));

  statsContentEl.innerHTML = `
    <div class="stats-summary">
      <div class="stat-tile">
        <strong>${totalCount}</strong>
        <span>總件數</span>
      </div>
      <div class="stat-tile">
        <strong>${formatMoney(totalValue)}</strong>
        <span>衣櫃總價值</span>
      </div>
      <div class="stat-tile">
        <strong>${soldCount} / ${soldRatio}%</strong>
        <span>已售出</span>
      </div>
    </div>
    <div class="stat-bars">
      ${categories
        .map((category) => {
          const count = items.filter((item) => item.category === category).length;
          const widthPercent = Math.round((count / maxCategoryCount) * 100);
          return `
            <div class="stat-bar-row">
              <span class="stat-bar-label">${category}</span>
              <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${widthPercent}%"></div></div>
              <span class="stat-bar-value">${count} 件</span>
            </div>
          `;
        })
        .join('')}
      <div class="stat-bar-row">
        <span class="stat-bar-label">已售出</span>
        <div class="stat-bar-track"><div class="stat-bar-fill sold" style="width:${soldRatio}%"></div></div>
        <span class="stat-bar-value">${soldRatio}%</span>
      </div>
    </div>
  `;
}

function render() {
  displayedItemCount = 50; // 重設為初始值
  renderCategoryTabs();
  renderWishlist();
  renderCheckoutSummary();
  renderOrders();
  renderCatalog();
  renderDailyPicks();
  renderSpending();
  renderStats();
  renderPalette();
  renderSeasons();
  renderActiveFilters();
}

async function loadMetadata() {
  try {
    const response = await fetch('./metadata.json');
    return response.ok ? await response.json() : {};
  } catch (error) {
    console.warn('metadata.json 載入失敗，顏色與季節分析會先隱藏', error);
    return {};
  }
}

async function init() {
  const response = await fetch('./data.json');
  items = await response.json();
  metadata = await loadMetadata();

  const categories = [...new Set(items.map((item) => item.category))];
  categoryFilter.innerHTML = '<option value="all">全部</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');

  sortSelectEl.value = localStorage.getItem('sortOrder') || 'default';
  hideSoldCheckboxEl.checked = localStorage.getItem('hideSold') === 'true';

  searchInput.addEventListener('input', render);
  categoryFilter.addEventListener('change', render);
  sortSelectEl.addEventListener('change', () => {
    localStorage.setItem('sortOrder', sortSelectEl.value);
    render();
  });
  hideSoldCheckboxEl.addEventListener('change', () => {
    localStorage.setItem('hideSold', hideSoldCheckboxEl.checked);
    render();
  });
  drawOutfitBtnEl.addEventListener('click', drawOutfit);

  modalImageEl.addEventListener('error', () => {
    if (modalImageEl.src && !modalImageEl.src.endsWith('placeholder.svg')) {
      modalImageEl.src = './assets/placeholder.svg';
    }
  });

  colorChipsEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-color]');
    if (!chip) return;
    colorFilter = colorFilter === chip.dataset.color ? null : chip.dataset.color;
    render();
    if (colorFilter) scrollToCatalog();
  });

  swatchWallEl.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-swatch-id]');
    if (!swatch) return;
    const item = items.find((entry) => entry.id === swatch.dataset.swatchId);
    if (item) openImageModal(getImageUrl(item), item.id);
  });

  const toggleSeasonFilter = (row) => {
    seasonFilter = seasonFilter === row.dataset.season ? null : row.dataset.season;
    render();
    if (seasonFilter) scrollToCatalog();
  };

  seasonBarsEl.addEventListener('click', (event) => {
    const row = event.target.closest('[data-season]');
    if (row) toggleSeasonFilter(row);
  });

  seasonBarsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('[data-season]');
    if (!row) return;
    event.preventDefault();
    toggleSeasonFilter(row);
  });

  activeFiltersEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-clear]');
    if (!button) return;
    if (button.dataset.clear === 'color') colorFilter = null;
    if (button.dataset.clear === 'season') seasonFilter = null;
    render();
  });

  dailyPicksEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-daily-id]');
    if (button) {
      toggleWishlist(button.dataset.dailyId);
      return;
    }

    const img = event.target.closest('img[data-item-id]');
    if (img) {
      openImageModal(img.src, img.dataset.itemId);
    }
  });

  categoryTabsEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    categoryFilter.value = button.dataset.value;
    render();
  });

  catalogEl.addEventListener('pointerdown', handleSoldTagPointerDown);
  catalogEl.addEventListener('pointerup', handleSoldTagPointerUp);
  catalogEl.addEventListener('pointerleave', handleSoldTagPointerUp);
  catalogEl.addEventListener('pointercancel', handleSoldTagPointerUp);

  closeModalBtnEl.addEventListener('click', closeImageModal);

  imageModalEl.addEventListener('click', (event) => {
    if (event.target === imageModalEl || event.target === imageModalEl.querySelector('.modal-overlay')) {
      closeImageModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !imageModalEl.classList.contains('hidden')) {
      closeImageModal();
    }
  });

  window.addEventListener('scroll', loadMoreItems, { passive: true });

  catalogEl.addEventListener('click', (event) => {
    const img = event.target.closest('.card-image');
    if (img) {
      openImageModal(img.src, img.dataset.itemId);
      return;
    }

    const button = event.target.closest('button[data-id]');
    if (button) {
      toggleWishlist(button.dataset.id);
      return;
    }

    const soldTag = event.target.closest('[data-sold-tag]');
    if (!soldTag) return;
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }
    toggleSoldItem(soldTag.dataset.soldTag);
  });

  wishlistListEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-remove-id]');
    if (!button) return;
    removeFromWishlist(button.dataset.removeId);
  });

  checkoutBtnEl.addEventListener('click', showCheckout);
  clearCartBtnEl.addEventListener('click', clearCart);
  cancelCheckoutBtnEl.addEventListener('click', hideCheckout);
  placeOrderBtnEl.addEventListener('click', placeOrder);
  clearOrdersBtnEl.addEventListener('click', () => {
    if (confirm('確定要刪除所有訂單紀錄嗎？此動作無法復原。')) {
      clearOrders();
    }
  });

  render();
}

init().catch((error) => {
  catalogEl.innerHTML = '<div class="empty">載入資料時發生錯誤，請確認 data.json 存在。</div>';
  console.error(error);
});
