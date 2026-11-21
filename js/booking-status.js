(function () {
    const form = document.getElementById('bookingLookup');
    const input = document.getElementById('privateBookingLink');
    const result = document.getElementById('bookingUpdate');
    const button = form.querySelector('button');
    const endpoint = 'https://vdxunrhcahgkwtzvjjdj.supabase.co/functions/v1/booking-status';
    const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function tokenFrom(url) {
        try {
            const parsed = new URL(url);
            if (parsed.origin === location.origin && parsed.pathname === location.pathname) {
                return new URLSearchParams(parsed.hash.slice(1)).get('key');
            }
        } catch {}
        return null;
    }
    function show(title, detail) {
        const heading = document.createElement('h2');
        const copy = document.createElement('p');
        heading.textContent = title;
        copy.textContent = detail;
        result.replaceChildren(heading, copy);
    }
    async function lookup() {
        if (button.disabled) return;
        const token = tokenFrom(input.value);
        if (!token || !tokenPattern.test(token)) {
            show('Check the link', 'Paste the full private link from your booking screen.');
            return;
        }
        button.disabled = true;
        result.textContent = 'Checking your booking…';
        try {
            const config = await fetch('js/booking-config.json', {signal: AbortSignal.timeout(10000)}).then(r => r.json());
            const response = await fetch(endpoint, {
                method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
                headers: {'Content-Type': 'application/json', apikey: config.anonKey, Authorization: 'Bearer ' + config.anonKey},
                body: JSON.stringify({token}),
            });
            if (response.status === 404) {
                show('Booking not found', 'Check that you have the full link or contact our team.');
                return;
            }
            if (!response.ok) throw new Error('Lookup unavailable');
            const data = await response.json();
            let title = 'Request received';
            let detail = 'Our team will contact you about availability and next steps.';
            if (data.bookingStatus === 'confirmed') {
                title = 'Booking confirmed';
                detail = 'Our team has confirmed your place.';
            } else if (data.bookingStatus === 'cancelled' || data.bookingStatus === 'rejected') {
                title = data.bookingStatus === 'cancelled' ? 'Booking cancelled' : 'Booking could not be confirmed';
                detail = 'Contact our team if you have any questions.';
            } else if (data.paymentReview === 'rejected') {
                title = 'Payment needs attention';
                detail = 'Contact our team with your UPI receipt so we can help.';
            } else if (data.paymentReview === 'verified') {
                title = 'Payment verified';
                detail = 'Our team has verified payment. Check back for booking confirmation.';
            } else if (data.paymentReported) {
                title = 'Payment awaiting verification';
                detail = 'Our team is reviewing your payment and trip availability.';
            } else if (data.bookingStatus === 'awaiting_payment' || data.bookingStatus === 'availability_confirmed') {
                title = 'Availability confirmed';
                detail = 'Follow the payment instructions provided by our team.';
            }
            show(title, detail + ' Booking reference: ' + data.reference);
        } catch {
            show('Status temporarily unavailable', 'Try again shortly or contact our team on WhatsApp.');
        } finally {
            button.disabled = false;
        }
    }
    form.addEventListener('submit', event => {event.preventDefault(); lookup();});
    if (tokenFrom(location.href)) {
        input.value = location.href;
        lookup();
    }
}());
