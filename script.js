// Fallback images for different categories if API returns null image
const CATEGORY_FALLBACK_IMAGES = {
    technology: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=800",
    sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800",
    economy: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800",
    politics: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",
    music: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800",
    science: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=800",
    weather: "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&q=80&w=800",
    world: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
    general: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800"
};

// DOM References
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const newsGrid = document.getElementById('news-grid');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const navLinks = document.querySelectorAll('.navigator a');
const activeFilterBadge = document.getElementById('active-filter-badge');
const resultsCount = document.getElementById('results-count');
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');
const toastClose = document.getElementById('toast-close');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');

// Nav Dropdown DOM
const navMoreToggle = document.getElementById('nav-more-toggle');
const navMoreMenu = document.getElementById('nav-more-menu');
const navDropdownLinks = document.querySelectorAll('.nav-dropdown-link');

// App state variables
let currentCategory = 'general';
let currentQuery = '';
let toastTimeout = null;
let nextPageToken = null;
let currentArticles = [];

// Helper: Show/Hide Elements
function showElement(el) { el.classList.remove('hidden'); }
function hideElement(el) { el.classList.add('hidden'); }
function updateActiveFilterBadge(text) {
    if (activeFilterBadge) {
        activeFilterBadge.textContent = text;
    }
}
function formatAuthorName(name) {
    if (!name || typeof name !== 'string') return 'Logika Feeds';

    return name
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((part) =>
            part
                .split('-')
                .map((subPart) =>
                    subPart
                        .split("'")
                        .map((token) => token ? token.charAt(0).toUpperCase() + token.slice(1) : token)
                        .join("'")
                )
                .join('-')
        )
        .join(' ');
}

// Helper: Format Date string
function formatDate(dateString) {
    if (!dateString) return 'Нещодавно';
    try {
        const date = new Date(dateString.replace(' ', 'T'));
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Helper: Show custom Toast Notification
function showToast(message, isWarning = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastMessage.textContent = message;
    const toastIcon = toastNotification.querySelector('.toast-icon');
    if (isWarning) {
        toastIcon.textContent = '⚠️';
        toastNotification.style.borderLeft = '4px solid #F56565';
    } else {
        toastIcon.textContent = '⚡';
        toastNotification.style.borderLeft = '4px solid #6C5CE7';
    }
    
    showElement(toastNotification);
    
    // Auto-hide after 5 seconds
    toastTimeout = setTimeout(() => {
        hideElement(toastNotification);
    }, 5000);
}

// Event Listener for closing Toast
toastClose.addEventListener('click', () => {
    hideElement(toastNotification);
});

// Event Listener for Load More Button
loadMoreBtn.addEventListener('click', () => {
    fetchNews(currentCategory, currentQuery, true);
});

const API_KEY = "pub_bc56c8889e884671a0ee8b71e09d9865";

// Helper: Get API URL based on active filters
function getApiUrl(category, query, pageToken = null) {
    let baseUrl = `https://newsdata.io/api/1/latest?apikey=${API_KEY}&country=ua&language=uk`;
    
    if (pageToken) {
        baseUrl += `&page=${pageToken}`;
    }

    if (query) {
        return `${baseUrl}&q=${encodeURIComponent(query)}`;
    }
    
    switch (category) {
        case 'music':
            return `${baseUrl}&category=entertainment&q=music`;
        case 'sports':
            return `${baseUrl}&category=sports`;
        case 'economy':
            return `${baseUrl}&category=business`;
        case 'politics':
            return `${baseUrl}&category=politics`;
        case 'technology':
            return `${baseUrl}&category=technology`;
        case 'science':
            return `${baseUrl}&category=science`;
        case 'weather':
            return `${baseUrl}&q=weather`;
        case 'world':
            return `${baseUrl}&category=world`;
        case 'general':
        default:
            return baseUrl;
    }
}

// Render News Card HTML
const CATEGORY_LABELS_UA = {
    technology: 'Технології',
    sports: 'Спорт',
    economy: 'Бізнес',
    business: 'Бізнес',
    politics: 'Політика',
    science: 'Наука',
    world: 'Світ',
    music: 'Музика',
    weather: 'Погода',
    health: "Здоров'я",
    entertainment: 'Розваги',
    general: 'Загальне',
    domestic: 'Місцеве',
    environment: 'Довкілля',
    food: 'Їжа',
    lifestyle: 'Стиль',
    other: 'Інше',
};

function getCategoryLabel(article) {
    const cats = article.category || [];
    // Filter out "top" to get the real category
    const real = cats.find(c => c.toLowerCase() !== 'top');
    const key = (real || currentCategory || 'general').toLowerCase();
    return CATEGORY_LABELS_UA[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function createNewsCard(article) {
    const categoryRaw = (article.category && article.category.length > 0)
        ? (article.category.find(c => c.toLowerCase() !== 'top') || article.category[0])
        : (currentCategory || 'general');
    const fallbackImage = CATEGORY_FALLBACK_IMAGES[categoryRaw.toLowerCase()] || CATEGORY_FALLBACK_IMAGES.general;
    const imageUrl = article.image_url || article.image || fallbackImage;
    const authors = article.creator || article.authors;
    const authorName = (authors && authors.length > 0) ? formatAuthorName(authors[0]) : 'Logika Feeds';
    const dateFormatted = formatDate(article.pubDate || article.publish_date);
    const categoryLabel = getCategoryLabel(article);
    
    return `
        <article class="news-card">
            <div class="card-image-container">
                <span class="card-category">${categoryLabel}</span>
                <img class="card-image" src="${imageUrl}" alt="${article.title}" onerror="this.onerror=null;this.src='${fallbackImage}';" loading="lazy" />
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <span>${authorName}</span>
                    <span>•</span>
                    <span>${dateFormatted}</span>
                </div>
                <h3 class="card-title">${article.title}</h3>
                <p class="card-summary">${article.description || article.summary || article.text || 'Опис недоступний для цієї новини.'}</p>
                <div class="card-footer">
                    <a href="${article.link || article.url || '#'}" target="_blank" rel="noopener noreferrer" class="card-link">
                        Читати повністю
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                </div>
            </div>
        </article>
    `;
}

// Render all articles to grid
function renderArticles(articles, append = false) {
    if (!append) {
        newsGrid.innerHTML = '';
        currentArticles = [];
    }
    
    if ((!articles || articles.length === 0) && currentArticles.length === 0) {
        newsGrid.innerHTML = `
            <div class="error-container" style="background: #FAF5FF; border: 1px solid #E9D8FD; color: #6B46C1; grid-column: 1 / -1; text-align: center; justify-content: center; padding: 40px;">
                <p>Не знайдено новин за вашим запитом. Спробуйте змінити критерії пошуку або категорію!</p>
            </div>
        `;
        resultsCount.textContent = 'Показано 0 статей';
        hideElement(loadMoreContainer);
        return;
    }
    
    currentArticles = currentArticles.concat(articles);
    const cardsHtml = articles.map(article => createNewsCard(article)).join('');
    
    if (append) {
        newsGrid.insertAdjacentHTML('beforeend', cardsHtml);
    } else {
        newsGrid.innerHTML = cardsHtml;
    }
    
    resultsCount.textContent = `Показано ${currentArticles.length} ${currentArticles.length === 1 ? 'статтю' : 'статей'}`;
}

// Load Mock News (Offline Mode)
function loadMockNews(category, query, isLoadMore = false) {
    if (isLoadMore) {
        hideElement(loadMoreContainer);
        return;
    }
    console.log(`[Demo Mode] Filtering mock news by Category: ${category}, Query: ${query}`);
    
    let filtered = [...mockNews];
    
    if (query) {
        const queryLower = query.toLowerCase();
        filtered = filtered.filter(item => 
            item.title.toLowerCase().includes(queryLower) || 
            item.summary.toLowerCase().includes(queryLower) ||
            item.text.toLowerCase().includes(queryLower)
        );
    } else if (category && category !== 'general') {
        filtered = filtered.filter(item => item.category === category);
    }
    
    // Simulate slight network delay for better UX feel
    setTimeout(() => {
        hideElement(loader);
        renderArticles(filtered, false);
        hideElement(loadMoreContainer);
        showToast("Демонстраційний режим: Відображено офлайн стрічку новин.");
    }, 450);
}

// Fetch news from API
async function fetchNews(category, query, isLoadMore = false) {
    hideElement(errorMessage);
    
    if (!isLoadMore) {
        showElement(loader);
        newsGrid.innerHTML = '';
        currentArticles = [];
        nextPageToken = null;
        resultsCount.textContent = 'Завантаження...';
        hideElement(loadMoreContainer);
    } else {
        loadMoreBtn.textContent = 'Завантаження...';
        loadMoreBtn.disabled = true;
    }
    
    const url = getApiUrl(category, query, nextPageToken);
    console.log(`Fetching: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`API error (Status: ${response.status})`);
        }
        
        const data = await response.json();
        const fetchedArticles = data.results || data.news || [];
        
        if (fetchedArticles.length > 0) {
            if (!isLoadMore) hideElement(loader);
            renderArticles(fetchedArticles, isLoadMore);
            
            if (data.nextPage) {
                nextPageToken = data.nextPage;
                showElement(loadMoreContainer);
            } else {
                nextPageToken = null;
                hideElement(loadMoreContainer);
            }
            console.log("News fetched successfully from API!");
        } else {
            console.warn("API returned empty news array, falling back to mock news.");
            if (!isLoadMore) loadMockNews(category, query, false);
            else hideElement(loadMoreContainer);
        }
        
    } catch (error) {
        console.error("Fetch operation encountered an error:", error);
        // Fallback to mock news when API fails or rate limit hits
        if (!isLoadMore) loadMockNews(category, query, false);
        else hideElement(loadMoreContainer);
    } finally {
        if (isLoadMore) {
            loadMoreBtn.textContent = 'Завантажити ще';
            loadMoreBtn.disabled = false;
        }
    }
}

// Navigation Category Click Handlers
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));
        // Add active class to clicked link
        link.classList.add('active');
        
        // Reset Search state
        searchInput.value = '';
        currentQuery = '';
        
        // Update active category state
        currentCategory = link.getAttribute('data-category');
        
        // Update badge text
        updateActiveFilterBadge(link.textContent.trim());
        
        // Fetch new feeds
        fetchNews(currentCategory, currentQuery);
    });
});

// Search Form Submission Handler
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    
    if (!query) return;
    
    currentQuery = query;
    
    // Reset category links visual active state
    navLinks.forEach(l => l.classList.remove('active'));
    // Mark General as active category
    const generalLink = document.querySelector('.navigator a[data-category="general"]');
    if (generalLink) generalLink.classList.add('active');
    currentCategory = 'general';
    
    // Update badge text to show search keyword
    updateActiveFilterBadge(`Пошук: "${query}"`);
    
    // Fetch news based on search query
    fetchNews(currentCategory, currentQuery);
});

// Nav Dropdown Toggle
if (navMoreToggle && navMoreMenu) {
    navMoreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navMoreMenu.classList.contains('open');
        navMoreMenu.classList.toggle('open', !isOpen);
        navMoreToggle.classList.toggle('open', !isOpen);
    });

    document.addEventListener('click', (e) => {
        if (!navMoreMenu.contains(e.target) && !navMoreToggle.contains(e.target)) {
            navMoreMenu.classList.remove('open');
            navMoreToggle.classList.remove('open');
        }
    });
}

// Nav Dropdown Link Handlers
navDropdownLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        // Close dropdown
        navMoreMenu.classList.remove('open');
        navMoreToggle.classList.remove('open');

        // Remove active from all main nav links and dropdown links
        navLinks.forEach(l => l.classList.remove('active'));
        navDropdownLinks.forEach(l => l.classList.remove('active'));

        // Mark clicked as active
        link.classList.add('active');

        // Reset search
        searchInput.value = '';
        currentQuery = '';

        currentCategory = link.getAttribute('data-category');
        updateActiveFilterBadge(link.textContent.trim());
        fetchNews(currentCategory, currentQuery);
    });
});


// Footer Link Handlers
const footerLinks = document.querySelectorAll('.footer-link[data-category]');
footerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.getAttribute('data-category');

        // Update main nav active state
        navLinks.forEach(l => l.classList.remove('active'));
        navDropdownLinks.forEach(l => l.classList.remove('active'));
        const matchingNavLink = document.querySelector(`.navigator a[data-category="${category}"]`);
        const matchingDropLink = document.querySelector(`.nav-dropdown-link[data-category="${category}"]`);
        if (matchingNavLink) matchingNavLink.classList.add('active');
        if (matchingDropLink) matchingDropLink.classList.add('active');

        // Reset search
        searchInput.value = '';
        currentQuery = '';

        currentCategory = category;
        updateActiveFilterBadge(link.textContent.trim());
        fetchNews(currentCategory, currentQuery);

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// Initial Fetch on Page Load
document.addEventListener('DOMContentLoaded', () => {
    fetchNews(currentCategory, currentQuery);
});

