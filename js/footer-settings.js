(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else {
        root.FooterSettings = api;
        const script = root.document.currentScript;
        const configUrl = new URL('homepage-config.json', script.src).href;
        const start = async () => {
            const config = await api.load(root.fetch.bind(root), configUrl);
            api.apply(config, root.document);
        };
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, {once: true});
        else start();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const defaults = {
    "brandName": "Team Weekend Trekkers",
    "description": "A travel community for travellers, by travellers. 🧗 Trips | Tours | Unique Experiences 🏕️",
    "quickLinksTitle": "Quick Links",
    "homeLabel": "Home",
    "tripsLabel": "All Trips",
    "aboutLabel": "About Us",
    "contactLabel": "Contact",
    "informationTitle": "Information",
    "informationLinks": [],
    "contactTitle": "Contact Us",
    "location": "Kalkere, Bangalore",
    "whatsAppNumber": "",
    "instagramUrl": "",
    "instagramLabel": "",
    "email": "",
    "showSocialLinks": true,
    "showUpi": true,
    "upiTitle": "Pay via UPI",
    "copyUpiLabel": "Copy UPI ID",
    "copyright": "© {year} {brand}. All rights reserved."
};
    const clone = value => JSON.parse(JSON.stringify(value));
    const optional = ['whatsAppNumber', 'instagramUrl', 'instagramLabel', 'email'];
    function safeLink(value) {
        if (typeof value !== 'string' || /[\s<>"'`\\\u0000-\u001f]/.test(value)) return false;
        if (/^(?:index|trips|about|contact)\.html(?:#[A-Za-z][A-Za-z0-9_-]*)?$/.test(value)) return true;
        if (!/^https:\/\//i.test(value)) return false;
        try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !url.port && !/^https:\/\/[^/?#]+:\d+(?:[/?#]|$)/i.test(value); }
        catch (_) { return false; }
    }
    function safeInstagram(value) {
        if (!safeLink(value)) return false;
        try { const url = new URL(value); return ['instagram.com', 'www.instagram.com'].includes(url.hostname) && url.pathname.length > 1; }
        catch (_) { return false; }
    }
    function normalize(raw) {
        const result = clone(defaults);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
        for (const key of Object.keys(defaults)) {
            if (typeof defaults[key] === 'boolean' && typeof raw[key] === 'boolean') result[key] = raw[key];
            if (typeof defaults[key] === 'string' && typeof raw[key] === 'string' && raw[key].length <= 2000 && (raw[key].trim() || optional.includes(key))) result[key] = raw[key].trim();
        }
        if (result.whatsAppNumber && !/^[1-9]\d{7,14}$/.test(result.whatsAppNumber)) result.whatsAppNumber = '';
        if (result.instagramUrl && !safeInstagram(result.instagramUrl)) result.instagramUrl = '';
        if (result.email && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(result.email)) result.email = '';
        const seen = new Set();
        if (Array.isArray(raw.informationLinks)) result.informationLinks = raw.informationLinks.slice(0, 8).filter(item => {
            if (!item || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(item.id) || seen.has(item.id) || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 2000 || !safeLink(item.url) || item.url.length > 2000) return false;
            seen.add(item.id); return true;
        }).map(item => ({id: item.id, label: item.label.trim(), url: item.url, visible: item.visible !== false}));
        return result;
    }
    function formatPhone(digits) {
        if (typeof digits !== 'string' || !/^[1-9]\\d{7,14}$/.test(digits)) return '';
        return /^91\\d{10}$/.test(digits) ? '+91 ' + digits.slice(2,7) + ' ' + digits.slice(7) : '+' + digits;
    }
    function apply(raw, document) {
        if (typeof document.createElement !== 'function') return;
        const footer = document.querySelector('footer.footer');
        if (!footer) return;
        const config = normalize(raw), view = document.defaultView;
        const make = (tag, text, className) => {
            const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
            if (className) node.className = className; return node;
        };
        const link = (text, href, external = false) => {
            const node = make('a', text); node.href = href;
            if (external) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
            return node;
        };
        const text = (selector, value) => { const node = footer.querySelector(selector); if (node) node.textContent = value; };
        // Capture live HTML settings once: blank overrides must continue to use
        // the existing Website Contact & Payment sync, not a duplicate number.
        if (!footer._footerOriginal) footer._footerOriginal = {
            whatsapp: footer.querySelector('a[href*="wa.me/"]')?.getAttribute('href') || '',
            instagram: footer.querySelector('a[href*="instagram.com/"]')?.getAttribute('href') || ''
        };
        const original = footer._footerOriginal;
        const whatsapp = config.whatsAppNumber ? 'https://wa.me/' + config.whatsAppNumber : original.whatsapp;
        const instagram = config.instagramUrl || (safeInstagram(original.instagram) ? original.instagram : '');
        text('[data-footer-brand] h4', config.brandName); text('[data-footer-brand] > p', config.description);
        text('[data-footer-navigation] h4', config.quickLinksTitle);
        const navigation = footer.querySelector('[data-footer-navigation] ul');
        if (navigation) navigation.replaceChildren(...[['index.html','homeLabel'],['trips.html','tripsLabel'],['about.html','aboutLabel'],['contact.html','contactLabel']].map(([url,key]) => { const item = make('li'); item.append(link(config[key], url)); return item; }));
        const social = footer.querySelector('.social-links');
        if (social) {
            social.hidden = !config.showSocialLinks;
            const insta = social.querySelector('a[href*="instagram.com/"]'), wa = social.querySelector('a[href*="wa.me/"]');
            for (const [node, href, label] of [[insta,instagram,'Instagram'],[wa,whatsapp,'WhatsApp']]) {
                if (node && href) { node.href = href; node.setAttribute('aria-label', label); node.rel = 'noopener noreferrer'; }
            }
        }
        const contact = footer.querySelector('[data-footer-contact]');
        if (contact) {
            const location = make('p', config.location);
            contact.replaceChildren(make('h4', config.contactTitle), location);
            const digits = config.whatsAppNumber || whatsapp.match(/wa\\.me\\/([1-9]\\d{7,14})(?:[/?#]|$)/)?.[1] || '';
            const phone = formatPhone(digits);
            if (phone) {
                const row = make('p'), call = link(phone, 'tel:+' + digits);
                call.setAttribute('aria-label', 'Call ' + phone);
                row.append(call, document.createTextNode(' · '), link('WhatsApp', 'https://wa.me/' + digits, true));
                contact.append(row);
            }
            if (instagram) { const row = make('p'); row.append(link(config.instagramLabel || '@' + new URL(instagram).pathname.split('/').filter(Boolean).pop(), instagram, true)); contact.append(row); }
            if (config.email) { const row = make('p'); row.append(link(config.email, 'mailto:' + config.email)); contact.append(row); }
        }
        const upi = footer.querySelector('[data-footer-upi]');
        if (upi) {
            upi.hidden = !config.showUpi;
            const heading = upi.querySelector('h4'); if (heading) heading.textContent = config.upiTitle;
            const button = upi.querySelector('button');
            if (button) button.replaceChildren(make('i', undefined, 'fas fa-copy'), document.createTextNode(' ' + config.copyUpiLabel));
            const masked = upi.querySelector('.upi-id-display');
            if (masked && view?.TravelSecurity?.getMaskedUPI) masked.textContent = view.TravelSecurity.getMaskedUPI();
            // The actual payment ID, security handlers and checkout DOM are never edited.
        }
        const grid = footer.querySelector('.footer-grid');
        let information = footer.querySelector('[data-footer-information]');
        const links = config.informationLinks.filter(item => item.visible);
        if (grid && links.length) {
            if (!information) { information = make('div', undefined, 'footer-col'); information.setAttribute('data-footer-information', ''); grid.insertBefore(information, upi); }
            const list = make('ul');
            for (const item of links) { const row = make('li'); row.append(link(item.label, item.url, item.url.startsWith('https:'))); list.append(row); }
            information.replaceChildren(make('h4', config.informationTitle), list);
        } else if (information) information.remove();
        text('.footer-bottom > p', config.copyright.replaceAll('{year}', String(new Date().getFullYear())).replaceAll('{brand}', config.brandName));
        footer.setAttribute('data-footer-ready', 'true');
    }
    async function load(fetcher, url = 'js/homepage-config.json') {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetcher(url, {cache: 'no-cache', signal: controller.signal});
            if (!response.ok) throw Error('Footer settings unavailable');
            const config = await response.json();
            if (!config || config.version !== 1) throw Error('Unsupported footer settings');
            if (config.footer !== undefined && (!config.footer || typeof config.footer !== 'object' || Array.isArray(config.footer) || ('showUpi' in config.footer && typeof config.footer.showUpi !== 'boolean'))) throw Error('Invalid footer settings');
            return normalize(config.footer);
        } catch (_) { return {...clone(defaults), showUpi: false}; }
        finally { clearTimeout(timer); }
    }
    return {defaults, safeLink, safeInstagram, normalize, formatPhone, apply, load};
}));
