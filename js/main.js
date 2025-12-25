// ===== Main JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Accordion functionality
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all accordion items
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
    
    // Trip Filter functionality
    const filterBtns = document.querySelectorAll('.filter-btn');
    const tripCards = document.querySelectorAll('.trip-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            
            tripCards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // Price calculator on trip detail page
    const peopleSelect = document.getElementById('peopleCount');
    const totalAmountEl = document.getElementById('totalAmount');
    const bookNowBtn = document.getElementById('bookNowBtn');
    
    if (peopleSelect && totalAmountEl) {
        const basePrice = 3499;
        
        peopleSelect.addEventListener('change', () => {
            let count = parseInt(peopleSelect.value);
            if (count > 5) count = 5;
            const total = basePrice * count;
            totalAmountEl.textContent = '₹' + total.toLocaleString('en-IN');
            
            // Update book now link
            if (bookNowBtn) {
                const tripName = 'netravati';
                bookNowBtn.href = `checkout.html?trip=${tripName}&price=${basePrice}&people=${count}`;
            }
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        } else {
            navbar.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }
    });
    
    // Parse URL parameters for checkout page
    if (window.location.pathname.includes('checkout.html')) {
        const params = new URLSearchParams(window.location.search);
        const trip = params.get('trip');
        const price = params.get('price') || 3499;
        const people = params.get('people') || 1;
        
        const total = price * people;
        
        // Update summary
        const summaryTotal = document.getElementById('summaryTotal');
        const upiAmount = document.getElementById('upiAmount');
        const rzpAmount = document.getElementById('rzpAmount');
        const summaryPeople = document.getElementById('summaryPeople');
        
        if (summaryTotal) summaryTotal.textContent = '₹' + total.toLocaleString('en-IN');
        if (upiAmount) upiAmount.textContent = total.toLocaleString('en-IN');
        if (rzpAmount) rzpAmount.textContent = total.toLocaleString('en-IN');
        if (summaryPeople) summaryPeople.textContent = people + (people > 1 ? ' People' : ' Person');
        
        // Update UPI link with amount
        const upiPayBtn = document.getElementById('upiPayBtn');
        if (upiPayBtn) {
            // Generate UPI from ASCII codes
            const p = [57,53,51,56,50,51,54,53,56,49];
            const s = [64];
            const d = [121,98,108];
            const upiId = [...p,...s,...d].map(c => String.fromCharCode(c)).join('');
            upiPayBtn.href = `upi://pay?pa=${upiId}&pn=Team%20Weekend%20Trekkers&am=${total}&cu=INR&tn=Trek%20Booking`;
        }
    }
});

// Copy UPI ID function
function copyUPI() {
    // Generate UPI from ASCII codes
    const p = [57,53,51,56,50,51,54,53,56,49];
    const s = [64];
    const d = [121,98,108];
    const upiId = [...p,...s,...d].map(c => String.fromCharCode(c)).join('');
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(upiId).then(() => {
            showToast('UPI ID copied!');
        }).catch(() => {
            fallbackCopy(upiId);
        });
    } else {
        fallbackCopy(upiId);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('UPI ID copied!');
    } catch (err) {
        showToast('Failed to copy');
    }
    
    document.body.removeChild(textArea);
}

// Toast notification
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: fadeInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
