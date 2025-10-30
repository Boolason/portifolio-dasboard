// Analytics tracking class
class PortfolioAnalytics {
    constructor() {
        this.storageKey = 'portfolio_analytics';
        this.initStorage();
        this.trackPageView();
        this.trackUserBehavior();
    }

    initStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify({
                pageViews: {},
                visitors: new Set(),
                sessions: [],
                events: [],
                startTime: Date.now()
            }));
        }
    }

    getAnalytics() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }

    saveAnalytics(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    trackPageView() {
        const analytics = this.getAnalytics();
        const page = window.location.pathname;
        const timestamp = new Date().toISOString();

        // Track page views
        if (!analytics.pageViews[page]) {
            analytics.pageViews[page] = [];
        }
        analytics.pageViews[page].push(timestamp);

        // Track unique visitors using session storage
        if (!sessionStorage.getItem('visitor_id')) {
            const visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('visitor_id', visitorId);
            analytics.visitors.push(visitorId);
        }

        // Track session
        const sessionId = sessionStorage.getItem('session_id') || 
            's_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('session_id', sessionId);

        const session = {
            id: sessionId,
            startTime: sessionStorage.getItem('session_start') || timestamp,
            lastActivity: timestamp,
            pages: sessionStorage.getItem('session_pages') ? 
                JSON.parse(sessionStorage.getItem('session_pages')) : []
        };

        if (!session.pages.includes(page)) {
            session.pages.push(page);
            sessionStorage.setItem('session_pages', JSON.stringify(session.pages));
        }

        // Update session storage
        sessionStorage.setItem('session_start', session.startTime);
        
        // Save analytics
        this.saveAnalytics(analytics);

        // Broadcast event for dashboard
        this.broadcastEvent('pageview', {
            page,
            timestamp,
            sessionId,
            visitorId: sessionStorage.getItem('visitor_id')
        });
    }

    trackUserBehavior() {
        // Track clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (target) {
                this.trackEvent('click', {
                    element: target.tagName.toLowerCase(),
                    text: target.textContent.trim(),
                    path: e.composedPath().map(el => el.tagName?.toLowerCase()).filter(Boolean).join(' > ')
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName.toLowerCase() === 'form') {
                this.trackEvent('form_submission', {
                    formId: e.target.id || 'unnamed_form'
                });
            }
        });

        // Track scroll depth
        let maxScroll = 0;
        document.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY + window.innerHeight) / 
                document.documentElement.scrollHeight * 100);
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
                    this.trackEvent('scroll_depth', {
                        depth: maxScroll
                    });
                }
            }
        });
    }

    trackEvent(eventType, eventData) {
        const analytics = this.getAnalytics();
        const timestamp = new Date().toISOString();

        const event = {
            type: eventType,
            data: eventData,
            timestamp,
            page: window.location.pathname,
            sessionId: sessionStorage.getItem('session_id'),
            visitorId: sessionStorage.getItem('visitor_id')
        };

        analytics.events.push(event);
        this.saveAnalytics(analytics);

        // Broadcast event for dashboard
        this.broadcastEvent('custom_event', event);
    }

    broadcastEvent(eventType, eventData) {
        // Use BroadcastChannel for real-time communication between tabs
        const channel = new BroadcastChannel('portfolio_analytics');
        channel.postMessage({
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
        });
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new PortfolioAnalytics();
        }
        return this.instance;
    }
}

// Initialize analytics
const analytics = PortfolioAnalytics.getInstance();