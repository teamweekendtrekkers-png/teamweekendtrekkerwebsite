(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    else root.BookingRules=api;
}(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    const defaults={version:1,payment:{upiId:'',receiverName:'',showReceiverName:true,showRazorpay:false},showCoupons:true,coupons:[]};
    function normalize(raw){
        raw=raw&&typeof raw==='object'?raw:{};
        const payment=typeof PaymentOptions==='object'?PaymentOptions.normalize(raw.payment):raw.payment||{};
        return {version:raw.version===2?2:1,payment:{...payment,upiId:/^[\w.-]+@[\w.-]+$/.test(payment.upiId||'')?payment.upiId:'',receiverName:String(payment.receiverName||'').trim().slice(0,100),showReceiverName:payment.showReceiverName!==false,showRazorpay:payment.showRazorpay===true},showCoupons:raw.showCoupons!==false,coupons:Array.isArray(raw.coupons)?raw.coupons:[]};
    }
    function quote(config,code,tripId,subtotal,now=new Date()){
        const cleaned=String(code||'').trim().toUpperCase();
        const amount=Number(subtotal);
        const invalid=message=>({valid:false,message,discount:0,total:amount});
        if(!Number.isFinite(amount)||amount<0)return invalid('Invalid trip amount.');
        const coupon=normalize(config).coupons.find(c=>String(c.code||'').trim().toUpperCase()===cleaned);
        if(!cleaned||!coupon||coupon.enabled===false)return invalid('This coupon is not available.');
        const timestamp=now.getTime();
        for(const [field,after] of [['startsAt',false],['expiresAt',true]]){
            if(!coupon[field])continue;
            const boundary=Date.parse(coupon[field]);
            if(!Number.isFinite(boundary))return invalid('This coupon has an invalid validity date.');
            if(after?timestamp>=boundary:timestamp<boundary)return invalid(after?'This coupon has expired.':'This coupon is not active yet.');
        }
        if(Array.isArray(coupon.tripIds)&&coupon.tripIds.length&&!coupon.tripIds.includes(tripId))return invalid('This coupon does not apply to this trip.');
        const value=Number(coupon.value);
        if(!Number.isFinite(value)||value<=0||!['fixed','percent'].includes(coupon.type)||(coupon.type==='percent'&&value>100))return invalid('This coupon is not configured correctly.');
        let discount=coupon.type==='percent'?amount*value/100:value;
        if(coupon.maxDiscount!==null&&coupon.maxDiscount!==undefined&&coupon.maxDiscount!==''){
            const cap=Number(coupon.maxDiscount);
            if(!Number.isFinite(cap)||cap<=0)return invalid('This coupon is not configured correctly.');
            discount=Math.min(discount,cap);
        }
        discount=Math.min(amount,Math.round(discount*100)/100);
        return {valid:true,code:cleaned,discount,total:Math.round((amount-discount)*100)/100,message:'Coupon applied. Our team will verify your quote before payment.'};
    }
    async function load(fetcher){
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
        try{const response=await fetcher('js/commerce-config.json',{cache:'no-cache',signal:controller.signal});if(!response.ok)throw new Error('Payment settings unavailable');return normalize(await response.json());}
        finally{clearTimeout(timeout);}
    }
    return {defaults,normalize,quote,load};
}));
