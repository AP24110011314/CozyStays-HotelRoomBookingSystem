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
          theme: { color: '#4f46e5' },
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/80 shadow-2xl overflow-hidden animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="absolute top-5 right-5 text-indigo-200 hover:text-white transition-colors p-1 rounded-lg"
            aria-label="Close payment dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-400 text-indigo-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
              Simulated Gateway (Mock Mode)
            </span>
          </div>

          <h2 id="payment-modal-title" className="text-xl font-bold">
            Complete Online Payment
          </h2>
          <p className="text-xs text-indigo-200 mt-1">
            Test mode enabled &mdash; no real charges will be made.
          </p>

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-indigo-700/50">
            <div>
              <span className="text-[11px] text-indigo-300 block">Total Amount Due</span>
              <span className="text-2xl font-extrabold text-white">
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
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Payment Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {isExpired ? (
            <div className="text-center py-6 space-y-3">
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Hold Window Expired</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Room</span>
                  <span className="font-semibold text-slate-900">{booking.room?.name || 'Selected Room'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Booking Reference</span>
                  <span className="font-mono font-bold text-indigo-700">{booking.reference}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Order ID</span>
                  <span className="font-mono text-slate-700">{paymentData.orderId}</span>
                </div>
              </div>

              {/* Simulated Method Tabs */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Select Mock Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMockTab('card')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all min-h-[48px] ${
                      selectedMockTab === 'card'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Netbanking</span>
                  </button>
                </div>

                {/* Tab preview info */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
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
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all min-h-[50px] disabled:opacity-50"
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
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all min-h-[44px] disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Simulate Payment Failure</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HMAC-SHA256 signature verification enabled</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
