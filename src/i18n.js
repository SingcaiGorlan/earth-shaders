class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'zh';
        this.translations = {};
        this.observers = [];
    }

    async init() {
        await this.loadTranslations();
        this.applyLanguage();
        this.setupLanguageSwitcher();
    }

    async loadTranslations() {
        try {
            const zhResponse = await fetch('./translations/zh.json');
            const enResponse = await fetch('./translations/en.json');
            
            this.translations.zh = await zhResponse.json();
            this.translations.en = await enResponse.json();
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to minimal translations
            this.translations = {
                zh: {},
                en: {}
            };
        }
    }

    t(key, lang = this.currentLang) {
        const keys = key.split('.');
        let value = this.translations[lang];
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return original key if not found
            }
        }
        
        return typeof value === 'string' ? value : key;
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.applyLanguage();
            this.notifyObservers();
        }
    }

    applyLanguage() {
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
        
        // Update title
        const titleKey = this.getPageTitleKey();
        if (titleKey) {
            document.title = this.t(titleKey);
        }
        
        // Update all elements with data-i18n attributes
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = this.t(key);
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = text;
            } else if (element.tagName === 'INPUT' && element.placeholder) {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });
        
        // Update placeholder attributes
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const text = this.t(key);
            element.placeholder = text;
        });
        
        // Update title attributes
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const text = this.t(key);
            element.title = text;
        });
    }

    getPageTitleKey() {
        const pathname = window.location.pathname;
        if (pathname.includes('launch.html')) return 'launch.title';
        if (pathname.includes('knowledge-base.html')) return 'knowledgeBase.title';
        if (pathname.includes('aerospace-history.html')) return 'aerospaceHistory.title';
        if (pathname.includes('exam-guide.html')) return 'examGuide.title';
        if (pathname.includes('exercises.html')) return 'exercises.title';
        return 'index.title';
    }

    setupLanguageSwitcher() {
        const switcher = document.getElementById('language-switcher');
        if (switcher) {
            const currentLangBtn = switcher.querySelector(`button[data-lang="${this.currentLang}"]`);
            if (currentLangBtn) {
                currentLangBtn.classList.add('active');
            }
            
            switcher.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const lang = e.target.getAttribute('data-lang');
                    if (lang) {
                        this.setLanguage(lang);
                        // Update active button
                        switcher.querySelectorAll('button').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        e.target.classList.add('active');
                    }
                }
            });
        }
    }

    addObserver(callback) {
        this.observers.push(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentLang));
    }
}

// Initialize i18n when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new I18n();
    window.i18n.init().catch(console.error);
});

export default I18n;