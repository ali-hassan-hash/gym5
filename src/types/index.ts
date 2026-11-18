export type Role = 'guest' | 'superadmin' | 'gym_owner';

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  id: string; // 'system'
  currency: string; // e.g. 'PKR'
  currencySymbol: string; // e.g. 'Rs.'
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  initializedAt: string;
}

export type AccountStatus = 'active' | 'inactive' | 'suspended';
export type LicenseType = 'Lifetime' | 'Annual' | 'Monthly' | 'Custom';

export interface GymPricing {
  oneTimePrice: number;
  setupCharges: number;
  discount: number;
  negotiatedPrice: number;
  paymentReceived: number;
  remainingPayment: number;
  purchaseDate: string;
  licenseType: LicenseType;
  notes?: string;
}

export interface GymAccount {
  id: string; // e.g. 'GYM-8492'
  gymName: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  gymAddress: string;
  username: string;
  passwordHash: string;
  temporaryPassword?: string; // Stored securely for admin retrieval/reset
  licenseStartDate: string;
  licenseExpiryDate: string;
  accountStatus: AccountStatus;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  pricing: GymPricing;
}

export interface GymSettings {
  gymId: string;
  gymName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  logoUrl?: string;
  currency: string;
  currencySymbol: string;
  defaultMonthlyFee: number;
  defaultDurationMonths: number;
  whatsappMessageTemplate: string;
  updatedAt: string;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export interface GymMember {
  id: string;
  memberId: string; // e.g. 'M-1001'
  gymId: string;
  fullName: string;
  mobileNumber: string;
  whatsappNumber: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: number;
  homeAddress?: string;
  monthlyFee: number;
  joiningDate: string; // YYYY-MM-DD
  durationMonths: number;
  nextRenewalDate: string; // YYYY-MM-DD
  status: 'active' | 'expired';
  paymentStatus: PaymentStatus;
  balanceDue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'EasyPaisa/JazzCash' | 'Other';

export interface PaymentRecord {
  id: string;
  receiptNo: string; // e.g. 'REC-2026-0001'
  gymId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  monthCovered: string;
  nextRenewalDateCalculated: string;
  previousBalance: number;
  remainingBalance: number;
  notes?: string;
  createdAt: string;
}
