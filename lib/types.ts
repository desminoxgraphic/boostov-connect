export type RewardStatus = 'ACTIVE' | 'USED';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  google_review_url: string;
  share_url: string;
  share_message: string;
  discount_percentage: number;
  phone: string | null;
  merchant_token: string;
  next_serial: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PublicBusiness = Omit<Business, 'merchant_token' | 'next_serial'>;

export interface Reward {
  id: string;
  business_id: string;
  serial_number: number;
  customer_name: string;
  customer_phone: string;
  discount_percentage: number;
  status: RewardStatus;
  created_at: string;
  redeemed_at: string | null;
}

export interface CreateBusinessInput {
  id?: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  primary_color?: string;
  google_review_url?: string;
  share_url?: string;
  share_message?: string;
  discount_percentage?: number;
  phone?: string;
  is_active?: boolean;
}

export interface CreateRewardInput {
  business_id: string;
  customer_name: string;
  customer_phone: string;
}
