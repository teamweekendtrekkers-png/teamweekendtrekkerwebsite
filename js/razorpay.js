// ===== Razorpay Integration - Stub Code =====
// Replace rzp_test_XXXXXXXXXXXXXX with your actual Razorpay Key ID

document.addEventListener('DOMContentLoaded', function() {
    const rzpButton = document.getElementById('rzpButton');
    
    if (rzpButton) {
        rzpButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get amount from URL params or default
            const params = new URLSearchParams(window.location.search);
            const price = parseInt(params.get('price')) || 3499;
            const people = parseInt(params.get('people')) || 1;
            const total = price * people;
            
            // Get user details from form
            const fullName = document.getElementById('fullName')?.value || '';
            const email = document.getElementById('email')?.value || '';
            const phone = document.getElementById('phone')?.value || '';
            
            // Validate form
            if (!fullName || !email || !phone) {
                alert('Please fill in all required fields (Name, Email, Phone)');
                return;
            }
            
            // Razorpay configuration
            const options = {
                // STUB: Replace with your actual Razorpay Key ID
                key: 'rzp_test_XXXXXXXXXXXXXX', // TODO: Replace with actual key
                
                // Amount in paise (multiply INR by 100)
                amount: total * 100,
                
                currency: 'INR',
                
                name: 'Team Weekend Trekkers',
                
                description: 'Trip Booking Payment',
                
                // STUB: Add your logo URL here
                image: 'https://via.placeholder.com/150x150?text=TWT',
                
                // Pre-fill customer details
                prefill: {
                    name: fullName,
                    email: email,
                    contact: phone
                },
                
                // Additional data to store with payment
                notes: {
                    trip_name: params.get('trip') || 'Trip Booking',
                    participants: people,
                    booking_date: new Date().toISOString()
                },
                
                // Theme customization
                theme: {
                    color: '#1a472a' // Primary green color
                },
                
                // Handler for successful payment
                handler: function(response) {
                    // Payment successful
                    console.log('Payment successful:', response);
                    
                    // STUB: In production, verify payment on your server
                    // fetch('/api/verify-payment', {
                    //     method: 'POST',
                    //     headers: { 'Content-Type': 'application/json' },
                    //     body: JSON.stringify({
                    //         razorpay_payment_id: response.razorpay_payment_id,
                    //         razorpay_order_id: response.razorpay_order_id,
                    //         razorpay_signature: response.razorpay_signature
                    //     })
                    // }).then(res => res.json()).then(data => {
                    //     if (data.verified) {
                    //         window.location.href = '/booking-confirmed.html';
                    //     }
                    // });
                    
                    // For now, show success message
                    alert('Payment Successful!\n\nPayment ID: ' + response.razorpay_payment_id + 
                          '\n\nPlease take a screenshot and share on WhatsApp for confirmation.');
                    
                    // Open WhatsApp with payment details
                    const whatsappMsg = encodeURIComponent(
                        `Hi! I've completed my trip booking payment.\n\n` +
                        `Payment ID: ${response.razorpay_payment_id}\n` +
                        `Amount: ₹${total}\n` +
                        `Name: ${fullName}\n` +
                        `Phone: ${phone}`
                    );
                    window.open(`https://wa.me/917019235581?text=${whatsappMsg}`, '_blank');
                },
                
                // Handler for payment modal close
                modal: {
                    ondismiss: function() {
                        console.log('Payment cancelled by user');
                    },
                    // Prevent escape key from closing
                    escape: true,
                    // Enable back button handling on mobile
                    backdropclose: false
                }
            };
            
            // Create Razorpay instance and open checkout
            try {
                const rzp = new Razorpay(options);
                
                // Handle payment failures
                rzp.on('payment.failed', function(response) {
                    console.error('Payment failed:', response.error);
                    alert('Payment Failed!\n\n' + 
                          'Error: ' + response.error.description + '\n\n' +
                          'Please try again or use UPI payment option.');
                });
                
                rzp.open();
            } catch (error) {
                console.error('Razorpay initialization error:', error);
                alert('Payment gateway is being configured. Please use UPI payment option for now.');
            }
        });
    }
});

// ===== HOW TO SETUP RAZORPAY =====
/*
1. Sign up at https://dashboard.razorpay.com/
2. Complete KYC verification
3. Go to Settings > API Keys
4. Generate Test/Live API Keys
5. Replace 'rzp_test_XXXXXXXXXXXXXX' above with your Key ID
6. For production:
   - Use Live API Key (starts with rzp_live_)
   - Implement server-side order creation
   - Verify payment signature on server

Server-side order creation example (Node.js):

const Razorpay = require('razorpay');
const instance = new Razorpay({
    key_id: 'YOUR_KEY_ID',
    key_secret: 'YOUR_KEY_SECRET'
});

app.post('/create-order', async (req, res) => {
    const options = {
        amount: req.body.amount * 100, // in paise
        currency: 'INR',
        receipt: 'order_' + Date.now()
    };
    
    const order = await instance.orders.create(options);
    res.json(order);
});

Server-side signature verification:

const crypto = require('crypto');

function verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', 'YOUR_KEY_SECRET')
        .update(body)
        .digest('hex');
    
    return expectedSignature === razorpay_signature;
}
*/
