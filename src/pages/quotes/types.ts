export interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
  estimated_delivery: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  labs: { name: string };
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  price: number | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }> | null;
  status: string | null;
  date_submitted: string | null;
  date_completed: string | null;
  test_results: string | null;
  report_url: string | null;
  report_file: string | null;
  testing_notes: string | null;
  products: { name: string };
}

export interface Product {
  id: string;
  name: string;
}

export interface Lab {
  id: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
}

export interface Manufacturer {
  id: string;
  name: string;
}

export interface TrackingHistory {
  id: string;
  quote_id: string;
  status: string;
  tracking_number: string;
  changed_at: string;
  source: string;
  details: any;
}

export interface SavedView {
  id: string;
  name: string;
  filters: {
    searchQuery: string;
    filterStatus: string;
    filterLab: string;
    filterProduct: string;
    filterLockStatus: string;
  };
  createdAt: number;
}

export interface QuoteFormData {
  lab_id: string;
  quote_number: string;
  lab_quote_number: string;
  status: string;
  notes: string;
  tracking_number: string;
  shipped_date: string;
  payment_status: string;
  payment_amount_usd: string;
  payment_amount_crypto: string;
  payment_date: string;
  transaction_id: string;
}

export interface ItemFormData {
  product_id: string;
  client: string;
  sample: string;
  manufacturer: string;
  batch: string;
  price: string;
  additional_samples: number;
  additional_report_headers: number;
  has_additional_samples: boolean;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }>;
  status: string;
  date_submitted: string;
  date_completed: string;
  test_results: string;
  report_url: string;
  report_file: string;
  testing_notes: string;
}
