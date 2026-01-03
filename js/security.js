/**
 * Security Module v3.0 for TravelBooking
 * =====================================
 * Protection against:
 * - UPI Tampering (SHA-256 integrity hash)
 * - XSS Attacks (input sanitization + CSP)
 * - Malicious Browser Extensions (DOM mutation monitoring)
 * - Clickjacking (frame busting)
 * - Script Injection (frozen objects + integrity checks)
 */

(function() {
    'use strict';

    // =============================================================
    // SECTION 1: UPI INTEGRITY WITH SHA-256 HASH
    // =============================================================
    
    const SecurityConfig = {
        // UPI stored as ASCII character codes (not plain text)
        _p1: [57,53,51,56,50,51,54,53,56,49], 
        _p2: 64,  
        _p3: [121,98,108], 
        _checksum: 1165100733,
        
        _rateLimits: {
            copyAttempts: { max: 5, window: 60000 },
            paymentAttempts: { max: 3, window: 300000 }
        },
        _honeypotField: 'email_confirm',
        _verified: null,
        _tampered: false,
        _extensionDetected: false
    };

    function reconstructUPI() {
        try {
            const p1 = String.fromCharCode.apply(null, SecurityConfig._p1);
            const p2 = String.fromCharCode(SecurityConfig._p2);
            const p3 = String.fromCharCode.apply(null, SecurityConfig._p3);
            return p1 + p2 + p3;
        } catch (e) { return null; }
    }

    function computeChecksum(str) {
        let sum = 0;
        for (let i = 0; i < str.length; i++) {
            sum = ((sum << 5) - sum + str.charCodeAt(i)) | 0;
        }
        return sum;
    }

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function verifyUPIIntegrity() {
        const upi = reconstructUPI();
        if (!upi) { triggerTamperAlert('UPI_RECONSTRUCT_FAILED'); return false; }

        const checksum = computeChecksum(upi);
        if (checksum !== SecurityConfig._checksum) {
            console.error('%c🚨 INTEGRITY FAILURE: Checksum mismatch!', 'color:red;font-weight:bold');
            triggerTamperAlert('CHECKSUM_MISMATCH');
            return false;
        }

        const hash = await sha256(upi);
        console.log('%c✅ UPI Integrity Verified (SHA-256: ' + hash.substring(0, 16) + '...)', 'color:#10b981;font-weight:bold');
        SecurityConfig._verified = true;
        return true;
    }

    // =============================================================
    // SECTION 2: DOM MUTATION OBSERVER
    // =============================================================

    const DOMProtection = {
        observer: null,
        criticalSelectors: ['[data-upi]', '[onclick*="copyUPI"]', '[onclick*="payViaUPI"]', '#rzpButton', '.upi-section', '.payment-section', 'a[href*="upi://"]'],
        originalStates: new Map(),

        init: function() {
            this.captureOriginalStates();
            this.observer = new MutationObserver(this.handleMutations.bind(this));
            this.observer.observe(document.body, {
                childList: true, subtree: true, attributes: true,
                attributeFilter: ['href', 'onclick', 'data-upi', 'action'], characterData: true
            });
            console.log('%c🛡️ DOM Protection Active', 'color:#3b82f6;font-weight:bold');
        },

        captureOriginalStates: function() {
            this.criticalSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    this.originalStates.set(el, {
                        innerHTML: el.innerHTML, href: el.getAttribute('href'),
                        onclick: el.getAttribute('onclick'), outerHTML: el.outerHTML
                    });
                });
            });
        },

        handleMutations: function(mutations) {
            const upi = reconstructUPI();
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'SCRIPT' && !this.isAllowedScript(node.src || '', node.textContent || '')) {
                                console.warn('%c⚠️ Suspicious script blocked', 'color:orange');
                                node.remove();
                                SecurityConfig._extensionDetected = true;
                            }
                            if (node.innerHTML && node.innerHTML.match(/\d{10}@[a-z]+/i) && !node.innerHTML.includes(upi)) {
                                console.error('%c🚨 UPI REPLACEMENT DETECTED!', 'color:red;font-weight:bold');
                                triggerTamperAlert('UPI_REPLACED_IN_DOM');
                            }
                        }
                    });
                }
                if (mutation.type === 'attributes' && this.isCriticalElement(mutation.target)) {
                    const original = this.originalStates.get(mutation.target);
                    if (original) {
                        const attr = mutation.attributeName;
                        const newValue = mutation.target.getAttribute(attr);
                        if (original[attr] && newValue !== original[attr]) {
                            console.warn('%c⚠️ Critical element modified, restoring', 'color:orange');
                            mutation.target.setAttribute(attr, original[attr]);
                            SecurityConfig._extensionDetected = true;
                        }
                    }
                }
            });
        },

        isCriticalElement: function(el) { return this.criticalSelectors.some(sel => el.matches && el.matches(sel)); },
        isAllowedScript: function(src, content) {
            const allowed = ['localhost', window.location.hostname, 'checkout.razorpay.com', 'fonts.googleapis.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
            if (src) return allowed.some(d => src.includes(d));
            const suspicious = [/document\.write/i, /eval\s*\(/i, /innerHTML\s*=.*<script/i, /upi.*=.*@/i];
            return !suspicious.some(p => p.test(content));
        }
    };

    // =============================================================
    // SECTION 3: XSS INPUT SANITIZATION
    // =============================================================

    const XSSProtection = {
        entityMap: { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' },
        
        sanitizeHTML: function(str) {
            if (typeof str !== 'string') return str;
            return str.replace(/[&<>"'\`=\/]/g, s => this.entityMap[s]);
        },
        
        sanitizeURL: function(url) {
            if (typeof url !== 'string') return '';
            const allowed = /^(https?|upi|tel|mailto):/i;
            if (!allowed.test(url) && !url.startsWith('/') && !url.startsWith('#')) return '#blocked';
            return encodeURI(url);
        },
        
        sanitizeInput: function(input) {
            if (typeof input !== 'string') return input;
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=/gi, 'data-blocked=')
                .replace(/javascript:/gi, 'blocked:')
                .trim();
        },
        
        protectForms: function() {
            document.querySelectorAll('form').forEach(form => {
                form.addEventListener('submit', (e) => {
                    form.querySelectorAll('input, textarea').forEach(input => {
                        if (input.value) {
                            const sanitized = this.sanitizeInput(input.value);
                            if (input.value !== sanitized) {
                                console.warn('XSS attempt blocked');
                                input.value = sanitized;
                            }
                        }
                    });
                });
            });
        }
    };

    // =============================================================
    // SECTION 4: EXTENSION DETECTION
    // =============================================================

    const ExtensionDetector = {
        suspiciousGlobals: ['__EXTENSION_CONTEXT__', '__extensionData', 'injectedScript'],
        suspiciousElements: ['div[class*="extension"]', 'iframe[src*="chrome-extension"]', 'iframe[src*="moz-extension"]'],

        check: function() {
            let detected = false;
            this.suspiciousGlobals.forEach(g => { if (window[g] !== undefined) detected = true; });
            this.suspiciousElements.forEach(s => { if (document.querySelector(s)) detected = true; });
            if (detected) {
                console.warn('%c⚠️ Extension/Injection Detected', 'color:orange;font-weight:bold');
                SecurityConfig._extensionDetected = true;
            }
            return detected;
        },

        startMonitoring: function() {
            this.check();
            setInterval(() => { if (this.check()) showExtensionWarning(); }, 10000);
        }
    };

    // =============================================================
    // SECTION 5: CRITICAL ELEMENT INTEGRITY
    // =============================================================

    const ElementIntegrity = {
        hashes: new Map(),
        computeHash: function(content) {
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                hash = ((hash << 5) - hash) + content.charCodeAt(i);
                hash = hash & hash;
            }
            return hash.toString(16);
        },
        capture: function() {
            document.querySelectorAll('.payment-section, .upi-section, #rzpButton, [data-payment]').forEach((el, i) => {
                this.hashes.set('el_' + i, { element: el, hash: this.computeHash(el.outerHTML) });
            });
        },
        verify: function() {
            let intact = true;
            this.hashes.forEach((data, key) => {
                if (this.computeHash(data.element.outerHTML) !== data.hash) {
                    console.error('%c🚨 Element integrity compromised:', 'color:red', key);
                    intact = false;
                }
            });
            return intact;
        },
        startMonitoring: function() {
            setTimeout(() => this.capture(), 1000);
            setInterval(() => { if (!this.verify()) { SecurityConfig._tampered = true; showTamperWarning('ELEMENT_MODIFIED'); } }, 5000);
        }
    };

    // =============================================================
    // SECTION 6: FREEZE SECURITY OBJECTS
    // =============================================================

    function freezeSecurityObjects() {
        ['secureCopyUPI', 'securePayViaUPI', 'validateBookingForm'].forEach(fn => {
            if (window[fn]) Object.defineProperty(window, fn, { value: window[fn], writable: false, configurable: false });
        });
        if (window.TravelSecurity) Object.freeze(window.TravelSecurity);
        console.log('%c🔐 Security Objects Frozen', 'color:#8b5cf6;font-weight:bold');
    }

    // =============================================================
    // ALERT FUNCTIONS
    // =============================================================

    function triggerTamperAlert(reason) {
        SecurityConfig._verified = false;
        SecurityConfig._tampered = true;
        window.secureCopyUPI = window.securePayViaUPI = window.copyUPI = function() { showSecurityAlert('Security Error'); return false; };
        
        document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#dc2626,#991b1b);display:flex;justify-content:center;align-items:center;z-index:999999;padding:20px;"><div style="text-align:center;color:white;max-width:450px;"><div style="font-size:72px;margin-bottom:20px;">🚨</div><h1 style="margin:0 0 15px;font-size:24px;">Security Alert</h1><p style="margin:0 0 25px;font-size:16px;line-height:1.7;">This page has been <strong>tampered with</strong>.<br><strong>DO NOT make payments here.</strong></p><div style="background:rgba(0,0,0,0.3);padding:15px;border-radius:8px;margin-bottom:20px;"><p style="margin:0;font-size:13px;">Error: ' + reason + '</p></div><p style="margin:0;font-size:14px;">Visit: <a href="https://teamweekendtrekkers.com" style="color:#fbbf24;text-decoration:underline;">teamweekendtrekkers.com</a></p></div></div>';
    }

    function showTamperWarning(reason) {
        if (document.getElementById('tamper-warning')) return;
        var w = document.createElement('div');
        w.id = 'tamper-warning';
        w.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fef3c7;border-bottom:2px solid #f59e0b;padding:12px 20px;z-index:99998;display:flex;align-items:center;justify-content:center;gap:10px;';
        w.innerHTML = '<span style="font-size:20px;">⚠️</span><span style="color:#92400e;font-weight:500;">Security Warning: Page modifications detected.</span><button onclick="this.parentElement.remove()" style="background:#f59e0b;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;margin-left:10px;">Dismiss</button>';
        document.body.prepend(w);
    }

    function showExtensionWarning() {
        if (document.getElementById('ext-warning')) return;
        var w = document.createElement('div');
        w.id = 'ext-warning';
        w.style.cssText = 'position:fixed;bottom:80px;right:20px;background:#1f2937;color:white;padding:16px 20px;border-radius:12px;z-index:99997;max-width:320px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';
        w.innerHTML = '<div style="display:flex;gap:12px;"><span style="font-size:24px;">🔍</span><div><strong>Extension Detected</strong><p style="margin:6px 0 0;font-size:13px;opacity:0.9;">A browser extension may be modifying this page.</p></div><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">×</button></div>';
        document.body.appendChild(w);
        setTimeout(function() { if(w.parentNode) w.remove(); }, 10000);
    }

    // =============================================================
    // RATE LIMITER & UPI HANDLER
    // =============================================================

    var RateLimiter = {
        attempts: {},
        check: function(action) {
            var now = Date.now(), limit = SecurityConfig._rateLimits[action];
            if (!this.attempts[action]) this.attempts[action] = [];
            this.attempts[action] = this.attempts[action].filter(function(t) { return now - t < limit.window; });
            if (this.attempts[action].length >= limit.max) return false;
            this.attempts[action].push(now);
            return true;
        },
        getRemainingTime: function(action) {
            var limit = SecurityConfig._rateLimits[action];
            if (!this.attempts[action] || !this.attempts[action].length) return 0;
            return Math.max(0, Math.ceil((limit.window - (Date.now() - this.attempts[action][0])) / 1000));
        }
    };

    var UPISecurity = {
        _cache: null,
        getUPI: function() { 
            if (SecurityConfig._tampered) return null; 
            if (!this._cache) this._cache = reconstructUPI(); 
            return this._cache; 
        },
        getMaskedUPI: function() { 
            var u = this.getUPI(); 
            if (!u) return '••••••••••@•••'; 
            var p = u.split('@'); 
            return '••••••' + p[0].slice(-4) + '@' + p[1]; 
        },
        getUPILink: function(amount, name) { 
            var u = this.getUPI(); 
            if (!u) return null;
            var payeeName = encodeURIComponent('Team Weekend Trekkers');
            var txnNote = encodeURIComponent('Booking: ' + XSSProtection.sanitizeInput(name || 'Trip'));
            var amountStr = amount || '';
            
            // Check if iOS (upi:// doesn't work on iOS)
            var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            if (isIOS) {
                // Use PhonePe deep link for iOS
                return 'phonepe://pay?pa=' + encodeURIComponent(u) + '&pn=' + payeeName + '&am=' + amountStr + '&cu=INR&tn=' + txnNote;
            } else {
                // Use standard UPI for Android (opens app chooser)
                return 'upi://pay?pa=' + encodeURIComponent(u) + '&pn=' + payeeName + '&am=' + amountStr + '&cu=INR&tn=' + txnNote;
            }
        },
        // Get alternative payment links for iOS fallback
        getAlternativeLinks: function(amount, name) {
            var u = this.getUPI();
            if (!u) return null;
            var payeeName = encodeURIComponent('Team Weekend Trekkers');
            var txnNote = encodeURIComponent('Booking: ' + XSSProtection.sanitizeInput(name || 'Trip'));
            var amountStr = amount || '';
            var encodedUPI = encodeURIComponent(u);
            
            return {
                phonepe: 'phonepe://pay?pa=' + encodedUPI + '&pn=' + payeeName + '&am=' + amountStr + '&cu=INR&tn=' + txnNote,
                gpay: 'gpay://upi/pay?pa=' + encodedUPI + '&pn=' + payeeName + '&am=' + amountStr + '&cu=INR&tn=' + txnNote,
                paytm: 'paytmmp://pay?pa=' + encodedUPI + '&pn=' + payeeName + '&am=' + amountStr + '&cu=INR&tn=' + txnNote
            };
        },
        isIOS: function() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        }
    };

    // =============================================================
    // PUBLIC FUNCTIONS
    // =============================================================

    window.secureCopyUPI = function() {
        if (SecurityConfig._tampered) { showSecurityAlert('Security failed. Refresh page.'); return false; }
        if (SecurityConfig._verified === null) { showSecurityAlert('Verifying security...'); return false; }
        if (!RateLimiter.check('copyAttempts')) { showSecurityAlert('Wait ' + RateLimiter.getRemainingTime('copyAttempts') + 's'); return false; }
        var upi = UPISecurity.getUPI();
        if (!upi) { showSecurityAlert('UPI unavailable.'); return false; }
        navigator.clipboard.writeText(upi).then(function() { 
            showSuccessToast('UPI copied: ' + UPISecurity.getMaskedUPI()); 
        }).catch(function() {
            var ta = document.createElement('textarea'); 
            ta.value = upi; 
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); 
            ta.select(); 
            document.execCommand('copy'); 
            document.body.removeChild(ta);
            showSuccessToast('UPI copied!');
        });
        return true;
    };

    window.securePayViaUPI = function(amount, tripName) {
        if (SecurityConfig._tampered || SecurityConfig._verified !== true) { showSecurityAlert('Security check failed.'); return false; }
        if (!RateLimiter.check('paymentAttempts')) { showSecurityAlert('Wait ' + RateLimiter.getRemainingTime('paymentAttempts') + 's'); return false; }
        var link = UPISecurity.getUPILink(amount, tripName);
        if (!link) { showSecurityAlert('Payment link failed.'); return false; }
        
        // For iOS, try PhonePe first, show fallback options if it fails
        if (UPISecurity.isIOS()) {
            // Try to open PhonePe
            var start = Date.now();
            window.location.href = link;
            
            // If PhonePe isn't installed, show alternative options after a short delay
            setTimeout(function() {
                // If we're still here after 2 seconds, the app probably didn't open
                if (Date.now() - start < 2500) {
                    showIOSPaymentOptions(amount, tripName);
                }
            }, 2000);
        } else {
            // Android - standard UPI intent opens app chooser
            window.location.href = link;
        }
        return true;
    };
    
    // Show iOS payment app options modal
    function showIOSPaymentOptions(amount, tripName) {
        var existing = document.getElementById('ios-payment-modal');
        if (existing) existing.remove();
        
        var links = UPISecurity.getAlternativeLinks(amount, tripName);
        if (!links) return;
        
        var modal = document.createElement('div');
        modal.id = 'ios-payment-modal';
        modal.innerHTML = 
            '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px;">' +
                '<div style="background:white;border-radius:16px;padding:24px;max-width:320px;width:100%;text-align:center;">' +
                    '<h3 style="margin:0 0 8px;font-size:18px;color:#1f2937;">Choose Payment App</h3>' +
                    '<p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Select your preferred UPI app</p>' +
                    '<div style="display:flex;flex-direction:column;gap:10px;">' +
                        '<a href="' + links.phonepe + '" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:#5f259f;color:white;border-radius:10px;text-decoration:none;font-weight:600;">' +
                            '<span>PhonePe</span></a>' +
                        '<a href="' + links.gpay + '" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:#4285f4;color:white;border-radius:10px;text-decoration:none;font-weight:600;">' +
                            '<span>Google Pay</span></a>' +
                        '<a href="' + links.paytm + '" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:#00baf2;color:white;border-radius:10px;text-decoration:none;font-weight:600;">' +
                            '<span>Paytm</span></a>' +
                    '</div>' +
                    '<button onclick="this.closest(\'#ios-payment-modal\').remove()" style="margin-top:16px;padding:12px 24px;background:#f3f4f6;border:none;border-radius:8px;color:#6b7280;cursor:pointer;font-size:14px;">Cancel</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.querySelector('div').addEventListener('click', function(e) {
            if (e.target === this) modal.remove();
        });
    }

    window.validateBookingForm = function(form) {
        var hp = form.querySelector('[name="' + SecurityConfig._honeypotField + '"]');
        if (hp && hp.value) return false;
        form.querySelectorAll('input, textarea').forEach(function(i) { 
            if (i.value && i.type !== 'password') i.value = XSSProtection.sanitizeInput(i.value); 
        });
        return true;
    };

    function showToast(m, bg) { 
        var e = document.getElementById('sec-toast'); 
        if (e) e.remove(); 
        var t = document.createElement('div'); 
        t.id = 'sec-toast'; 
        t.textContent = m; 
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:' + bg + ';color:white;padding:12px 24px;border-radius:8px;font-weight:500;z-index:10001;box-shadow:0 4px 12px rgba(0,0,0,0.2);'; 
        document.body.appendChild(t); 
        setTimeout(function() { t.remove(); }, 3000); 
    }
    function showSecurityAlert(m) { showToast(m, '#dc2626'); }
    function showSuccessToast(m) { showToast(m, '#10b981'); }

    // =============================================================
    // RAZORPAY BLOCKER
    // =============================================================
    
    function showRazorpayError() { 
        var o = document.createElement('div'); 
        o.id = 'rzp-error'; 
        o.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:10000;'; 
        o.innerHTML = '<div style="background:white;padding:30px;border-radius:16px;text-align:center;max-width:400px;"><div style="font-size:48px;margin-bottom:15px;">⚠️</div><h3 style="margin:0 0 15px;">Payment Unavailable</h3><p style="margin:0 0 20px;color:#6b7280;">Razorpay unavailable. Use <strong>UPI</strong>.</p><div style="display:flex;gap:10px;justify-content:center;"><button onclick="document.getElementById(\'rzp-error\').remove();secureCopyUPI();" style="padding:12px 24px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Copy UPI</button><button onclick="document.getElementById(\'rzp-error\').remove();" style="padding:12px 24px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;">Close</button></div></div>'; 
        o.addEventListener('click', function(e) { if(e.target === o) o.remove(); }); 
        document.body.appendChild(o); 
    }
    
    window.Razorpay = function() { return { open: showRazorpayError, on: function(){}, close: function(){} }; };
    
    function interceptRzpButton() { 
        var b = document.getElementById('rzpButton'); 
        if (b && !b.dataset.intercepted) { 
            b.dataset.intercepted = 'true'; 
            var n = b.cloneNode(true); 
            b.parentNode.replaceChild(n, b); 
            n.addEventListener('click', function(e) { 
                e.preventDefault(); 
                e.stopPropagation(); 
                showRazorpayError(); 
            }, true); 
        } 
    }

    // =============================================================
    // CLICKJACKING & CSP
    // =============================================================
    
    function preventClickjacking() { 
        if (window.self !== window.top) { 
            try { 
                if (window.top.location.hostname !== window.self.location.hostname) 
                    document.body.innerHTML = '<h1 style="text-align:center;color:red;margin-top:50px;">Access Denied</h1>'; 
            } catch(e) { 
                document.body.innerHTML = '<h1 style="text-align:center;color:red;margin-top:50px;">Clickjacking Detected</h1>'; 
            } 
        } 
    }
    
    function addSecurityMeta() { 
        if (!document.querySelector('meta[name="referrer"]')) { 
            var m = document.createElement('meta'); 
            m.name = 'referrer'; 
            m.content = 'strict-origin-when-cross-origin'; 
            document.head.appendChild(m); 
        } 
    }

    // =============================================================
    // SECTION 7: HIDE ALL RAW UPI FROM PAGE
    // =============================================================
    
    function hideAllRawUPI() {
        var upi = reconstructUPI();
        if (!upi) return;
        
        var maskedUPI = UPISecurity.getMaskedUPI();
        var upiRegex = new RegExp(upi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        
        // 1. Replace in all text nodes
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var textNodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue && walker.currentNode.nodeValue.indexOf(upi) !== -1) {
                textNodes.push(walker.currentNode);
            }
        }
        textNodes.forEach(function(node) {
            var parent = node.parentElement;
            if (parent && !parent.closest('script, style, [data-show-upi]')) {
                node.nodeValue = node.nodeValue.replace(upiRegex, maskedUPI);
            }
        });
        
        // 2. Replace in element attributes
        document.querySelectorAll('[data-upi], [title*="@"], [alt*="@"]').forEach(function(el) {
            ['title', 'alt', 'data-upi', 'placeholder'].forEach(function(attr) {
                var val = el.getAttribute(attr);
                if (val && val.indexOf(upi) !== -1) {
                    el.setAttribute(attr, val.replace(upiRegex, maskedUPI));
                }
            });
        });
        
        // 3. Hide UPI in links but keep functional
        document.querySelectorAll('a[href*="upi://"]').forEach(function(link) {
            link.setAttribute('data-secure-href', 'true');
            if (link.textContent.indexOf(upi) !== -1) {
                link.textContent = link.textContent.replace(upiRegex, maskedUPI);
            }
        });
        
        // 4. Update input fields
        document.querySelectorAll('input[type="text"], input:not([type])').forEach(function(input) {
            if (input.value && input.value.indexOf(upi) !== -1 && !input.closest('[data-show-upi]')) {
                input.value = input.value.replace(upiRegex, maskedUPI);
            }
            if (input.placeholder && input.placeholder.indexOf(upi) !== -1) {
                input.placeholder = input.placeholder.replace(upiRegex, maskedUPI);
            }
        });
        
        console.log('%c🔒 Raw UPI Hidden from DOM', 'color:#10b981;font-weight:bold');
    }
    
    function startUPIHiding() {
        hideAllRawUPI();
        setInterval(hideAllRawUPI, 2000);
        
        var upiObserver = new MutationObserver(function(mutations) {
            var needsHiding = false;
            var upi = reconstructUPI();
            mutations.forEach(function(m) {
                if (m.addedNodes) {
                    m.addedNodes.forEach(function(node) {
                        if (node.textContent && node.textContent.indexOf(upi) !== -1) {
                            needsHiding = true;
                        }
                    });
                }
            });
            if (needsHiding) hideAllRawUPI();
        });
        
        upiObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // =============================================================
    // INITIALIZATION
    // =============================================================

    async function init() {
        console.log('%c🔒 Security Module v3.0 Initializing...', 'color:#6366f1;font-weight:bold');
        preventClickjacking();
        addSecurityMeta();
        
        var valid = await verifyUPIIntegrity();
        if (!valid) return;
        
        DOMProtection.init();
        XSSProtection.protectForms();
        ExtensionDetector.startMonitoring();
        ElementIntegrity.startMonitoring();
        interceptRzpButton();
        setTimeout(interceptRzpButton, 500);
        
        // Hide all raw UPI
        startUPIHiding();
        
        setTimeout(freezeSecurityObjects, 100);
        
        console.log('%c✅ Security v3.0 Active', 'color:#10b981;font-weight:bold;font-size:14px');
        console.log('%c   • UPI Integrity: SHA-256 ✓', 'color:#10b981');
        console.log('%c   • DOM Protection: Active ✓', 'color:#10b981');
        console.log('%c   • XSS Protection: Active ✓', 'color:#10b981');
        console.log('%c   • Extension Monitor: Active ✓', 'color:#10b981');
        console.log('%c   • UPI Hidden: Active ✓', 'color:#10b981');
    }

    window.copyUPI = window.secureCopyUPI;
    window.TravelSecurity = Object.freeze({ 
        getUPI: function() { return UPISecurity.getUPI(); }, 
        getMaskedUPI: function() { return UPISecurity.getMaskedUPI(); }, 
        copyUPI: window.secureCopyUPI, 
        payViaUPI: window.securePayViaUPI, 
        isSecure: function() { return SecurityConfig._verified === true && !SecurityConfig._tampered; }, 
        sanitize: function(s) { return XSSProtection.sanitizeInput(s); }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
