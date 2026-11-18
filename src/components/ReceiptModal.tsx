import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import type { PaymentRecord, GymSettings } from '../types';
import { formatDate } from '../utils/date';
import { G5MekaLogo } from './G5MekaLogo';

interface ReceiptModalProps {
  payment: PaymentRecord;
  settings?: GymSettings | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const currency = settings?.currencySymbol || 'Rs.';
  const gymName = settings?.gymName || 'G5MEKA Gym';
  const gymAddress = settings?.address || 'Gym Fitness Center';
  const gymPhone = settings?.phone || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden my-8">
        {/* Header toolbar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-medium text-white hover:bg-zinc-700 border border-zinc-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div
          id="printable-receipt"
          className="p-8 bg-zinc-900 text-zinc-100 print:bg-white print:text-zinc-900"
        >
          {/* Gym & Brand Header */}
          <div className="flex items-start justify-between border-b border-zinc-800 pb-6 print:border-zinc-300">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <G5MekaLogo size="sm" showTagline={false} />
              </div>
              <h2 className="text-xl font-bold text-white print:text-black tracking-tight">
                {gymName}
              </h2>
              <p className="text-xs text-zinc-400 print:text-zinc-600 mt-0.5">
                {gymAddress}
              </p>
              {gymPhone && (
                <p className="text-xs text-zinc-400 print:text-zinc-600">
                  Tel: {gymPhone}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold print:border-emerald-600 print:text-emerald-700">
                OFFICIAL RECEIPT
              </span>
              <p className="text-xs font-mono font-medium text-zinc-300 print:text-zinc-800 mt-2">
                {payment.receiptNo}
              </p>
              <p className="text-xs text-zinc-400 print:text-zinc-600">
                Date: {formatDate(payment.paymentDate)}
              </p>
            </div>
          </div>

          {/* Member Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-800 text-xs print:border-zinc-300">
            <div>
              <span className="text-zinc-500 print:text-zinc-500 uppercase tracking-wider text-[10px] block">
                Received From:
              </span>
              <span className="font-semibold text-white print:text-black text-sm block mt-0.5">
                {payment.memberName}
              </span>
              <span className="text-zinc-400 print:text-zinc-600 font-mono text-[11px]">
                ID: {payment.memberId}
              </span>
            </div>

            <div className="text-right">
              <span className="text-zinc-500 print:text-zinc-500 uppercase tracking-wider text-[10px] block">
                Payment Method:
              </span>
              <span className="font-semibold text-zinc-200 print:text-black block mt-0.5">
                {payment.method}
              </span>
              <span className="text-zinc-400 print:text-zinc-600 text-[11px]">
                Month: {payment.monthCovered}
              </span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="py-4 border-b border-zinc-800 print:border-zinc-300">
            <div className="flex justify-between text-xs py-1 text-zinc-400 print:text-zinc-600">
              <span>Gym Membership Fee:</span>
              <span className="font-mono text-zinc-200 print:text-black">
                {currency} {(payment.amount + payment.remainingBalance).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between text-sm py-2 font-bold text-white print:text-black border-t border-zinc-800 print:border-zinc-300 mt-1">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-400 print:text-emerald-700">
                {currency} {payment.amount.toLocaleString()}
              </span>
            </div>

            {payment.remainingBalance > 0 && (
              <div className="flex justify-between text-xs py-1 text-red-400 print:text-red-700 font-medium">
                <span>Remaining Balance Due:</span>
                <span className="font-mono">
                  {currency} {payment.remainingBalance.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs py-1.5 text-zinc-300 print:text-zinc-800 mt-2 bg-zinc-950/50 print:bg-zinc-100 p-2.5 rounded-lg border border-zinc-800 print:border-zinc-200">
              <span className="font-medium">Valid Until Next Renewal:</span>
              <span className="font-semibold text-amber-300 print:text-amber-800">
                {formatDate(payment.nextRenewalDateCalculated)}
              </span>
            </div>

            {payment.notes && (
              <p className="text-xs text-zinc-400 print:text-zinc-600 italic mt-3">
                Note: {payment.notes}
              </p>
            )}
          </div>

          {/* Footer & Sign */}
          <div className="pt-6 flex justify-between items-end text-xs">
            <div className="text-[10px] text-zinc-500 print:text-zinc-500 max-w-[200px]">
              Generated by G5MEKA Gym Operating System. Keep this receipt for your records.
            </div>
            <div className="text-center">
              <div className="w-28 border-b border-zinc-600 print:border-zinc-400 mb-1"></div>
              <span className="text-[10px] text-zinc-400 print:text-zinc-600 uppercase tracking-wider">
                Authorized Sign
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions (hidden on print) */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
