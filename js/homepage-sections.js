(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HomepageSections = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const defaults = {
    "stats": {
        "enabled": true,
        "items": [
            {
                "id": "trips",
                "value": "683+",
                "label": "Trips Completed",
                "visible": true
            },
            {
                "id": "travellers",
                "value": "7.2k+",
                "label": "Happy Travellers",
                "visible": true
            },
            {
                "id": "rating",
                "value": "4.8⭐",
                "label": "Google Rating",
                "visible": true
            },
            {
                "id": "destinations",
                "value": "50+",
                "label": "Destinations",
                "visible": true
            }
        ]
    },
    "whyUs": {
        "enabled": true,
        "title": "Why Travel With Us?",
        "items": [
            {
                "id": "offbeat",
                "icon": "🗺️",
                "title": "Offbeat Destinations",
                "text": "We go where Google Maps doesn't. Hidden waterfalls, untouched valleys, and secret viewpoints away from tourist crowds.",
                "visible": true
            },
            {
                "id": "inclusive",
                "icon": "✅",
                "title": "Trip Arrangements",
                "text": "Transport, stays and trip arrangements handled. See each package for inclusions.",
                "visible": true
            },
            {
                "id": "vibe",
                "icon": "🎉",
                "title": "Vibe Over Volume",
                "text": "Small groups, music, bonfire nights & new friendships. Every trip feels like traveling with old friends.",
                "visible": true
            }
        ]
    },
    "howItWorks": {
        "enabled": true,
        "eyebrow": "Your next adventure, made simple",
        "title": "How It Works",
        "subtitle": "Three simple steps from your everyday routine to a memorable weekend.",
        "items": [
            {
                "id": "pick",
                "icon": "📱",
                "title": "Pick a Weekend",
                "text": "Browse our trips and choose the destination and departure that suit you.",
                "accent": "blue",
                "visible": true
            },
            {
                "id": "book",
                "icon": "🎟️",
                "title": "Book Your Spot",
                "text": "Check the itinerary and price, then book online or chat with our team for help.",
                "accent": "orange",
                "visible": true
            },
            {
                "id": "explore",
                "icon": "🎒",
                "title": "Show Up & Explore",
                "text": "Pack your essentials, meet your travel crew and make memories along the way.",
                "accent": "green",
                "visible": true
            }
        ]
    },
    "whyChooseUs": {
        "enabled": true,
        "eyebrow": "The Weekend Trekkers way",
        "title": "Why Thousands Choose Us",
        "subtitle": "Thoughtful trips. Shared experiences. A team you can talk to.",
        "items": [
            {
                "id": "pricing",
                "icon": "₹",
                "value": "Upfront",
                "title": "Clear Trip Details",
                "text": "See the price, inclusions and exclusions before you book.",
                "accent": "orange",
                "visible": true
            },
            {
                "id": "planned",
                "icon": "🗺️",
                "value": "For you",
                "title": "Thoughtfully Planned",
                "text": "Explore the day-wise itinerary and find the trip that matches your travel style.",
                "accent": "blue",
                "visible": true
            },
            {
                "id": "support",
                "icon": "💬",
                "value": "Real people",
                "title": "A Friendly Team",
                "text": "Have a question? Connect with us on WhatsApp before your next adventure.",
                "accent": "green",
                "visible": true
            }
        ]
    },
    "reviews": {
        "enabled": true,
        "title": "Google Reviews",
        "rating": "4.8",
        "googleMapsUrl": "https://maps.app.goo.gl/6ZimFRc231p2BWMv6",
        "buttonLabel": "See All Reviews on Google →",
        "autoPlay": true,
        "intervalSeconds": 6,
        "items": [
            {
                "id": "review-1",
                "name": "Manish Singh",
                "date": "a week ago",
                "rating": 5,
                "text": "Just got back from an amazing weekend spiritual trip to Rameshwaram and Dhanushkodi! 🧘‍♀️🙏 The journey was so rejuvenating, and seeing the bridge at Dhanushkodi was absolutely breathtaking. 🌊",
                "photo": "https://lh3.googleusercontent.com/a-/ALV-UjXHVUSEuvKI6CKUHupOjMxwiwTWkz-N3WpR60Sry3W1_hyLcN180A=w72-h72-p-rp-mo-ba4-br100",
                "googleMapsUrl": "",
                "visible": true
            },
            {
                "id": "review-2",
                "name": "Pavan Shinde",
                "date": "4 months ago",
                "rating": 5,
                "text": "This was my first trip in Bangalore with an unknown group of people, but by the end of it, I genuinely felt like I'd made some amazing friends. Wonderful experience!",
                "photo": "https://lh3.googleusercontent.com/a/ACg8ocL6BOYdFlrubH2qQg4YaY7epbmpu_nlM3Htq27nFC64_64u3cEu=w72-h72-p-rp-mo-ba7-br100",
                "googleMapsUrl": "",
                "visible": true
            },
            {
                "id": "review-3",
                "name": "S N",
                "date": "4 months ago",
                "rating": 5,
                "text": "The guide Mr. Richee is a very humble guy. Who took care of each individual traveller. Patiently waiting for everyone to arrive and made sure no one was left out. Creates a comfort zone!",
                "photo": "https://lh3.googleusercontent.com/a-/ALV-UjWKrLJJZTHX0LGC9ltiPPKAFgO3chglSLiW-vzUW6zLdRbdaIOb-g=w72-h72-p-rp-mo-ba5-br100",
                "googleMapsUrl": "",
                "visible": true
            },
            {
                "id": "review-4",
                "name": "Harjinder Bhatti",
                "date": "3 months ago",
                "rating": 5,
                "text": "I went on a trip to Rameshwaram, Dhanushkodi, navagraha temples and Thanjavur Temple. My first solo trip and I quickly found comfort in the amazing people I met. 😃",
                "photo": "https://lh3.googleusercontent.com/a-/ALV-UjUE7_9pFqJN-1fn_l_kqDafhrkQfkhpnI_gKZlsGeBG8PHXpEBJ=w72-h72-p-rp-mo-br100",
                "googleMapsUrl": "",
                "visible": true
            },
            {
                "id": "review-5",
                "name": "Sandeep Reddy",
                "date": "2 months ago",
                "rating": 5,
                "text": "Amazing experience on Rameshwaram-Dhanushkodi trip! Our tour guide Vinayaka S was so kind and patient with all of us. Though we part ways, the memories we've made will always keep us connected.",
                "photo": "https://lh3.googleusercontent.com/a-/ALV-UjXs3IaRcUWq0K0ELrv3dMkqYTQ9T2uY6oV9Xmigxt7uBnQraye0=w72-h72-p-rp-mo-br100",
                "googleMapsUrl": "",
                "visible": true
            },
            {
                "id": "review-6",
                "name": "Uma Bhat",
                "date": "3 weeks ago",
                "rating": 5,
                "text": "Me and my friend booked for Rameshwaram and Tanjavur weekend package. Met many new people and spending these 2 days as a group was fun. Highly recommended!",
                "photo": "https://lh3.googleusercontent.com/a-/ALV-UjWv_1VanAp09wFyIUFNk2a9GExbFNDSBPyS6W3F9gVWX3o3ytg=w72-h72-p-rp-mo-br100",
                "googleMapsUrl": "",
                "visible": true
            }
        ]
    },
    "cta": {
        "enabled": true,
        "title": "Ready for Your Next Adventure?",
        "description": "Join 7,200+ happy travellers who've explored with us",
        "primaryLabel": "Browse Trips",
        "secondaryLabel": "WhatsApp Us"
    }
};
    const clone = value => JSON.parse(JSON.stringify(value));
    function safeGoogleMapsUrl(value) {
        if (typeof value !== 'string' || /[\s<>\\\u0000-\u001f]/.test(value)) return false;
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
            return (url.hostname === 'maps.app.goo.gl' && url.pathname.length > 1) ||
                (['google.com', 'www.google.com', 'google.co.in', 'www.google.co.in'].includes(url.hostname) && url.pathname.startsWith('/maps')) ||
                ['maps.google.com', 'maps.google.co.in'].includes(url.hostname) ||
                (url.hostname === 'goo.gl' && url.pathname.startsWith('/maps/')) ||
                (url.hostname === 'g.page' && url.pathname.length > 1);
        } catch (_) { return false; }
    }
    function normalize(raw, safeImage) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clone(defaults);
        const result = clone(defaults);
        for (const name of Object.keys(defaults)) {
            const input = raw[name];
            if (!input || typeof input !== 'object' || Array.isArray(input)) continue;
            const section = result[name];
            for (const key of Object.keys(section)) {
                if (typeof section[key] === 'boolean' && typeof input[key] === 'boolean') section[key] = input[key];
                else if (typeof section[key] === 'string' && typeof input[key] === 'string' && (input[key].trim() || ['eyebrow', 'subtitle'].includes(key)) && input[key].length <= 2000) {
                    if (key !== 'googleMapsUrl' || safeGoogleMapsUrl(input[key])) section[key] = input[key].trim();
                }
            }
            if (name === 'reviews' && Number.isInteger(input.intervalSeconds) && input.intervalSeconds >= 4 && input.intervalSeconds <= 30) section.intervalSeconds = input.intervalSeconds;
            if (name === 'reviews' && (!Number.isFinite(Number(section.rating)) || Number(section.rating) < 1 || Number(section.rating) > 5)) section.rating = defaults.reviews.rating;
            if (!Array.isArray(input.items)) continue;
            const seen = new Set(), limit = name === 'reviews' ? 30 : 8;
            section.items = input.items.slice(0, limit).filter(item => {
                if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || seen.has(item.id)) return false;
                seen.add(item.id); return true;
            }).map(item => {
                const template = defaults[name].items[0], output = {};
                for (const key of Object.keys(template)) {
                    if (key === 'visible') output[key] = item[key] !== false;
                    else if (key === 'rating') output[key] = Number.isInteger(item[key]) && item[key] >= 1 && item[key] <= 5 ? item[key] : 5;
                    else if (key === 'accent') output[key] = ['blue', 'orange', 'green'].includes(item[key]) ? item[key] : 'green';
                    else output[key] = typeof item[key] === 'string' ? item[key].slice(0, key === 'text' ? 10000 : 2000) : '';
                }
                if (name === 'reviews') {
                    if (!safeImage(output.photo)) output.photo = '';
                    if (!safeGoogleMapsUrl(output.googleMapsUrl)) output.googleMapsUrl = '';
                }
                return output;
            }).filter(item => name === 'stats' ? item.value.trim() && item.label.trim() : ['whyUs', 'howItWorks', 'whyChooseUs'].includes(name) ? item.title.trim() && item.text.trim() : item.name.trim() && item.text.trim());
        }
        // Preserve an intentionally hidden legacy section until each replacement
        // has its own explicit visibility setting. Never mutate saved legacy data.
        for (const name of ['howItWorks', 'whyChooseUs']) {
            if (!raw[name] && raw.whyUs && raw.whyUs.enabled === false) result[name].enabled = false;
        }
        return result;
    }
    function visibleItems(section) { return section.items.filter(item => item.visible); }
    function apply(sections, document) {
        // Config values are always text nodes or validated URLs, never HTML.
        if (typeof document.createElement !== 'function') return; // permits minimal consumers
        const make = (tag, className, text) => {
            const node = document.createElement(tag); node.className = className;
            if (text !== undefined) node.textContent = text;
            return node;
        };
        const link = (label, url) => {
            const node = make('a', 'review-google-link', label);
            node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node;
        };
        const setText = (selector, text) => { const node = document.querySelector(selector); if (node) node.textContent = text; };
        for (const [name, selector] of [['stats', '.stats'], ['howItWorks', '.how-it-works'], ['whyChooseUs', '.why-choose-us'], ['reviews', '.testimonials'], ['cta', '.cta-section']]) {
            const node = document.querySelector(selector); if (node) node.hidden = !sections[name].enabled;
        }
        const stats = document.querySelector('.stats-grid');
        if (stats) stats.replaceChildren(...visibleItems(sections.stats).map(item => {
            const node = make('div', 'stat-item'); node.append(make('span', 'stat-number', item.id === 'rating' ? sections.reviews.rating + '⭐' : item.value), make('span', 'stat-label', item.label)); return node;
        }));
        for (const [name, selector] of [['howItWorks', '.how-it-works'], ['whyChooseUs', '.why-choose-us']]) {
            const section = sections[name];
            setText(selector + ' .section-title', section.title);
            setText(selector + ' .section-eyebrow', section.eyebrow);
            setText(selector + ' .section-subtitle', section.subtitle);
            const cards = document.querySelector(selector + ' .homepage-info-grid');
            if (cards) cards.replaceChildren(...visibleItems(section).map((item, index) => {
                const card = make(name === 'howItWorks' ? 'li' : 'article', 'homepage-info-card accent-' + item.accent);
                card.append(make('span', 'homepage-info-icon', item.icon));
                if (name === 'howItWorks') card.append(make('span', 'homepage-step-number', String(index + 1)));
                else if (item.value) card.append(make('span', 'homepage-info-value', item.value));
                card.append(make('h3', '', item.title), make('p', '', item.text));
                return card;
            }));
        }
        const reviews = sections.reviews;
        const title = document.querySelector('.testimonials .section-title');
        if (title) title.replaceChildren(document.createTextNode(reviews.title + ' '), make('span', 'rating-badge', '⭐ ' + reviews.rating));
        const all = document.querySelector('.reviews-cta a');
        if (all) { all.textContent = reviews.buttonLabel; all.href = reviews.googleMapsUrl; all.rel = 'noopener noreferrer'; }
        const grid = document.querySelector('.testimonials-grid');
        if (grid) {
            grid.replaceChildren(...visibleItems(reviews).map(item => {
                const card = make('article', 'testimonial-card'), header = make('div', 'testimonial-header');
                const avatar = make('span', 'reviewer-avatar', item.name.trim().slice(0, 1));
                header.append(avatar);
                if (item.photo) {
                    const image = make('img', 'reviewer-photo'); image.src = item.photo; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer';
                    image.addEventListener('error', () => image.remove(), { once: true }); avatar.append(image);
                }
                const info = make('div', 'reviewer-info'); info.append(make('span', 'reviewer-name', item.name), make('span', 'review-date', item.date)); header.append(info);
                const stars = make('div', 'testimonial-stars', '⭐'.repeat(item.rating)); stars.setAttribute('aria-label', item.rating + ' out of 5 stars');
                card.append(header, stars, make('p', '', item.text), link('View on Google ↗', item.googleMapsUrl || reviews.googleMapsUrl)); return card;
            }));
            if (!grid.children.length) grid.append(make('p', 'reviews-empty', 'Read traveller reviews on Google.'));
            initSlider(grid, reviews, document);
        }
        setText('.cta-section h2', sections.cta.title);
        setText('.cta-section p', sections.cta.description);
        setText('.cta-section .btn-primary', sections.cta.primaryLabel);
        const secondary = document.querySelector('.cta-section .btn-whatsapp');
        if (secondary) secondary.replaceChildren(make('i', 'fab fa-whatsapp'), document.createTextNode(' ' + sections.cta.secondaryLabel));
    }
    function initSlider(grid, config, document) {
        if (grid._reviewCleanup) grid._reviewCleanup();
        const view = document.defaultView;
        if (!view) return;
        grid.classList.add('reviews-slider');
        grid.setAttribute('tabindex', '0'); grid.setAttribute('role', 'region'); grid.setAttribute('aria-label', 'Traveller reviews. Swipe or use arrow keys.');
        const controls = document.createElement('div'); controls.className = 'review-slider-controls';
        const button = (label, text) => { const node = document.createElement('button'); node.type = 'button'; node.className = 'review-slider-button'; node.textContent = text; node.setAttribute('aria-label', label); controls.append(node); return node; };
        const previous = button('Previous reviews', '←'), next = button('Next reviews', '→');
        const status = document.createElement('span'); status.className = 'review-slider-status'; status.setAttribute('aria-live', 'polite'); controls.append(status);
        grid.after(controls);
        const media = view.matchMedia('(prefers-reduced-motion: reduce)');
        let hovering = false, focused = false, dragging = false, timer, frame;
        const canSlide = () => grid.scrollWidth > grid.clientWidth + 2 && config.enabled;
        const stop = () => { if (timer) view.clearInterval(timer); timer = null; };
        const sync = () => {
            stop(); controls.hidden = !canSlide();
            if (canSlide() && config.autoPlay && !media.matches && !hovering && !focused && !dragging && !document.hidden)
                timer = view.setInterval(() => move(1, false), config.intervalSeconds * 1000);
        };
        const move = (direction, manual = true) => {
            if (manual) sync();
            const end = grid.scrollWidth - grid.clientWidth;
            const offset = direction > 0 && grid.scrollLeft >= end - 3 ? 0 : direction < 0 && grid.scrollLeft <= 3 ? end : grid.scrollLeft + direction * (grid.firstElementChild.getBoundingClientRect().width + 20);
            grid.scrollTo({ left: Math.max(0, Math.min(end, offset)), behavior: media.matches ? 'auto' : 'smooth' });
        };
        const scroll = () => {
            if (frame) view.cancelAnimationFrame(frame);
            frame = view.requestAnimationFrame(() => {
                const count = visibleItems(config).length;
                const index = Math.min(count, Math.round(grid.scrollLeft / (grid.firstElementChild.getBoundingClientRect().width + 20)) + 1);
                status.textContent = count ? 'Review ' + index + ' of ' + count : '';
            });
        };
        const key = event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } };
        const enter = event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } }, leave = () => { hovering = false; sync(); };
        const focus = () => { focused = true; sync(); }, blur = () => { focused = grid.contains(document.activeElement) || controls.contains(document.activeElement); sync(); };
        const interact = () => { dragging = true; sync(); }, release = () => { if (dragging) { dragging = false; sync(); } };
        previous.onclick = () => move(-1); next.onclick = () => move(1);
        grid.addEventListener('keydown', key); grid.addEventListener('scroll', scroll, { passive: true }); grid.addEventListener('pointerdown', interact);
        view.addEventListener('pointerup', release); view.addEventListener('pointercancel', release);
        for (const node of [grid, controls]) { node.addEventListener('pointerenter', enter); node.addEventListener('pointerleave', leave); node.addEventListener('focusin', focus); node.addEventListener('focusout', blur); }
        document.addEventListener('visibilitychange', sync); media.addEventListener('change', sync); view.addEventListener('resize', sync);
        grid._reviewCleanup = () => {
            stop(); if (frame) view.cancelAnimationFrame(frame); controls.remove();
            grid.removeEventListener('keydown', key); grid.removeEventListener('scroll', scroll); grid.removeEventListener('pointerdown', interact);
            view.removeEventListener('pointerup', release); view.removeEventListener('pointercancel', release);
            for (const node of [grid, controls]) { node.removeEventListener('pointerenter', enter); node.removeEventListener('pointerleave', leave); node.removeEventListener('focusin', focus); node.removeEventListener('focusout', blur); }
            document.removeEventListener('visibilitychange', sync); media.removeEventListener('change', sync); view.removeEventListener('resize', sync);
        };
        scroll(); sync();
    }
    return { defaults, normalize, safeGoogleMapsUrl, visibleItems, apply };
}));
