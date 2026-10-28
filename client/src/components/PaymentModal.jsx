import { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  QrCode,
  Building,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { formatCurrency } from '../utils/currency';
import HoldCountdown from './HoldCountdown';
import hotelConfig from '../config/hotel';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({
  isOpen,
  onClose,
  booking,
  paymentData,
  onSuccess,
  onFailure,
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedMockTab, setSelectedMockTab] = useState('card');
  const [isExpired, setIsExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isOpen || !paymentData) return;

    setIsExpired(false);
    setErrorMessage(null);

    // If real Razorpay provider, load script and launch popup
    if (paymentData.provider === 'razorpay') {
      let isMounted = true;
      loadRazorpayScript().then((loaded) => {
        if (!isMounted) return;
        if (!loaded) {
          toast.error('Failed to load Razorpay payment gateway');
          if (onFailure) onFailure(new Error('Gateway load failed'));
          return;
        }

        const options = {
          key: paymentData.keyId,
          amount: paymentData.amount,
          currency: paymentData.currency || 'INR',
          name: hotelConfig.name,
          description: `Booking #${booking.reference} - ${booking.room?.name || 'Room'}`,
          order_id: paymentData.orderId,
          theme: { color: '#1B4D3E' },
          handler: async (response) => {
            await handleVerification({
              bookingId: booking.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              toast('Payment window closed. Your room remains on hold.', { icon: 'ℹ️' });
            },
          },
        };

        try {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (err) {
          console.error('Razorpay open error:', err);
          toast.error('Could not initialize checkout');
        }
      });

      return () => {
        isMounted = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentData]);

  if (!isOpen || !booking || !paymentData) return null;

  const handleVerification = async (payload) => {
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/payments/verify', payload);
      toast.success('Payment verified successfully!');
      if (onSuccess) onSuccess(res.data.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Payment verification failed';
      setErrorMessage(msg);
      toast.error(msg);
      if (onFailure) onFailure(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleMockSuccess = () => {
    handleVerification({
      bookingId: booking.id,
      razorpayOrderId: paymentData.orderId,
      razorpayPaymentId: `mock_pay_${Date.now()}`,
      razorpaySignature: 'mock_valid_signature',
      mockSuccess: true,
    });
  };

  const handleMockFailure = () => {
    handleVerification({
      bookingId: booking.id,
      razorpayOrderId: paymentData.orderId,
      razorpayPaymentId: `mock_pay_${Date.now()}`,
      mockSuccess: false,
    });
  };

  const handleHoldExpired = () => {
    setIsExpired(true);
    toast.error('Payment hold expired. Room has been released.');
  };

  // Only render mock modal dialog UI if provider is mock (or fallback)
  if (paymentData.provider !== 'mock') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-taupe shadow-2xl overflow-hidden animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Header */}
        <div className="bg-forest p-6 text-ivory relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="absolute top-5 right-5 text-taupe hover:text-ivory transition-colors p-1 rounded-lg"
            aria-label="Close payment dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-brass text-charcoal text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
              Simulated Gateway (Mock Mode)
            </span>
          </div>

          <h2 id="payment-modal-title" className="text-xl font-bold">
            Complete Online Payment
          </h2>
          <p className="text-xs text-taupe-200 mt-1">
            Test mode enabled &mdash; no real charges will be made.
          </p>

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-forest-600/50">
            <div>
              <span className="text-[11px] text-taupe-300 block">Total Amount Due</span>
              <span className="text-2xl font-extrabold text-ivory">
                {formatCurrency(booking.totalPrice, paymentData.currency)}
              </span>
            </div>
            {booking.holdExpiresAt && (
              <HoldCountdown
                expiresAt={booking.holdExpiresAt}
                onExpire={handleHoldExpired}
              />
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div
              className="p-3.5 rounded-2xl bg-brick-50 border border-brick-200 text-xs text-brick flex items-start gap-2.5"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-brick flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Payment Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {isExpired ? (
            <div className="text-center py-6 space-y-3">
              <XCircle className="w-12 h-12 text-brick mx-auto" />
              <h3 className="text-base font-bold text-charcoal">Hold Window Expired</h3>
              <p className="text-xs text-charcoal/70 max-w-sm mx-auto">
                The 15-minute hold time for this reservation has ended and the room has been returned to general inventory.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary mt-2 text-xs py-2 px-5 min-h-[40px]"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <>
              {/* Order Details Brief */}
              <div className="bg-taupe-50 rounded-2xl p-4 border border-taupe text-xs space-y-2">
                <div className="flex justify-between text-charcoal/70">
                  <span>Room</span>
                  <span className="font-semibold text-charcoal">{booking.room?.name || 'Selected Room'}</span>
                </div>
                <div className="flex justify-between text-charcoal/70">
                  <span>Booking Reference</span>
                  <span className="font-mono font-bold text-forest">{booking.reference}</span>
                </div>
                <div className="flex justify-between text-charcoal/70">
                  <span>Order ID</span>
                  <span className="font-mono text-charcoal">{paymentData.orderId}</span>
                </div>
              </div>

              {/* Simulated Method Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal/70 block">
                  Select Mock Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMockTab('card')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all min-h-[48px] ${
                      selectedMockTab === 'card'
                        ? 'bg-forest-50 border-forest text-forest ring-2 ring-forest/20'
                        : 'border-taupe text-charcoal/80 hover:bg-taupe-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMockTab('upi')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all min-h-[48px] ${
                      selectedMockTab === 'upi'
                        ? 'bg-forest-50 border-forest text-forest ring-2 ring-forest/20'
                        : 'border-taupe text-charcoal/80 hover:bg-taupe-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMockTab('netbanking')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all min-h-[48px] ${
                      selectedMockTab === 'netbanking'
                        ? 'bg-forest-50 border-forest text-forest ring-2 ring-forest/20'
                        : 'border-taupe text-charcoal/80 hover:bg-taupe-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Netbanking</span>
                  </button>
                </div>

                {/* Tab preview info */}
                <div className="p-3 bg-taupe-50 rounded-xl border border-taupe text-xs text-charcoal/70">
                  {selectedMockTab === 'card' && (
                    <p>Simulating card payment ending in &bull;&bull;&bull;&bull; 4242 (Visa / Mastercard)</p>
                  )}
                  {selectedMockTab === 'upi' && (
                    <p>Simulating instant UPI payment via test@upi / Google Pay</p>
                  )}
                  {selectedMockTab === 'netbanking' && (
                    <p>Simulating Netbanking redirect & instant approval</p>
                  )}
                </div>
              </div>

              {/* Action Simulation Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleMockSuccess}
                  disabled={isVerifying}
                  className="w-full btn-primary py-3.5 px-4 rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition-all min-h-[50px] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Payment Signature...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simulate Successful Payment</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleMockFailure}
                  disabled={isVerifying}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-semibold bg-brick-50 text-brick border border-brick-200 hover:bg-brick-100 transition-all min-h-[44px] disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-brick" />
                  <span>Simulate Payment Failure</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-charcoal/50 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                <span>HMAC-SHA256 signature verification enabled</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
