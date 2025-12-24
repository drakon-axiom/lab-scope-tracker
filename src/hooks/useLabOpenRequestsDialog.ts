import { useReducer, useCallback } from "react";

interface QuoteItem {
  id: string;
  product_id: string;
  price: number | null;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  status: string | null;
  test_results: string | null;
  report_url: string | null;
  products?: { name: string; category: string | null };
}

interface Quote {
  id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  discount_amount: number | null;
  discount_type: string | null;
  lab_response: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_date: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
}

interface DialogState {
  isOpen: boolean;
  selectedQuote: Quote | null;
  selectedQuoteItems: QuoteItem[];
  itemsLoading: boolean;
  responseNotes: string;
  modifiedDiscount: string;
  modifiedPrices: Record<string, string>;
  modifiedSamplePrices: Record<string, string>;
  modifiedHeaderPrices: Record<string, string>;
  savingApproval: boolean;
}

type DialogAction =
  | { type: "OPEN_DIALOG"; payload: { quote: Quote } }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_ITEMS_LOADING"; payload: boolean }
  | { type: "SET_QUOTE_ITEMS"; payload: QuoteItem[] }
  | { type: "SET_RESPONSE_NOTES"; payload: string }
  | { type: "SET_MODIFIED_DISCOUNT"; payload: string }
  | { type: "SET_MODIFIED_PRICE"; payload: { itemId: string; value: string } }
  | { type: "SET_MODIFIED_SAMPLE_PRICE"; payload: { itemId: string; value: string } }
  | { type: "SET_MODIFIED_HEADER_PRICE"; payload: { itemId: string; value: string } }
  | { type: "SET_SAVING_APPROVAL"; payload: boolean }
  | { type: "RESET_MODIFICATIONS" };

const initialState: DialogState = {
  isOpen: false,
  selectedQuote: null,
  selectedQuoteItems: [],
  itemsLoading: false,
  responseNotes: "",
  modifiedDiscount: "",
  modifiedPrices: {},
  modifiedSamplePrices: {},
  modifiedHeaderPrices: {},
  savingApproval: false,
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_DIALOG":
      return {
        ...state,
        isOpen: true,
        selectedQuote: action.payload.quote,
        responseNotes: action.payload.quote.lab_response || "",
        modifiedDiscount: action.payload.quote.discount_amount?.toString() || "",
        modifiedPrices: {},
        modifiedSamplePrices: {},
        modifiedHeaderPrices: {},
      };
    case "CLOSE_DIALOG":
      return {
        ...state,
        isOpen: false,
        selectedQuote: null,
        selectedQuoteItems: [],
        itemsLoading: false,
      };
    case "SET_ITEMS_LOADING":
      return { ...state, itemsLoading: action.payload };
    case "SET_QUOTE_ITEMS":
      return { ...state, selectedQuoteItems: action.payload, itemsLoading: false };
    case "SET_RESPONSE_NOTES":
      return { ...state, responseNotes: action.payload };
    case "SET_MODIFIED_DISCOUNT":
      return { ...state, modifiedDiscount: action.payload };
    case "SET_MODIFIED_PRICE":
      return {
        ...state,
        modifiedPrices: { ...state.modifiedPrices, [action.payload.itemId]: action.payload.value },
      };
    case "SET_MODIFIED_SAMPLE_PRICE":
      return {
        ...state,
        modifiedSamplePrices: { ...state.modifiedSamplePrices, [action.payload.itemId]: action.payload.value },
      };
    case "SET_MODIFIED_HEADER_PRICE":
      return {
        ...state,
        modifiedHeaderPrices: { ...state.modifiedHeaderPrices, [action.payload.itemId]: action.payload.value },
      };
    case "SET_SAVING_APPROVAL":
      return { ...state, savingApproval: action.payload };
    case "RESET_MODIFICATIONS":
      return {
        ...state,
        modifiedPrices: {},
        modifiedSamplePrices: {},
        modifiedHeaderPrices: {},
      };
    default:
      return state;
  }
}

export function useLabOpenRequestsDialog() {
  const [state, dispatch] = useReducer(dialogReducer, initialState);

  const openDialog = useCallback((quote: Quote) => {
    dispatch({ type: "OPEN_DIALOG", payload: { quote } });
  }, []);

  const closeDialog = useCallback(() => {
    dispatch({ type: "CLOSE_DIALOG" });
  }, []);

  const setItemsLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_ITEMS_LOADING", payload: loading });
  }, []);

  const setQuoteItems = useCallback((items: QuoteItem[]) => {
    dispatch({ type: "SET_QUOTE_ITEMS", payload: items });
  }, []);

  const setResponseNotes = useCallback((notes: string) => {
    dispatch({ type: "SET_RESPONSE_NOTES", payload: notes });
  }, []);

  const setModifiedDiscount = useCallback((discount: string) => {
    dispatch({ type: "SET_MODIFIED_DISCOUNT", payload: discount });
  }, []);

  const handlePriceChange = useCallback((itemId: string, value: string) => {
    dispatch({ type: "SET_MODIFIED_PRICE", payload: { itemId, value } });
  }, []);

  const handleSamplePriceChange = useCallback((itemId: string, value: string) => {
    dispatch({ type: "SET_MODIFIED_SAMPLE_PRICE", payload: { itemId, value } });
  }, []);

  const handleHeaderPriceChange = useCallback((itemId: string, value: string) => {
    dispatch({ type: "SET_MODIFIED_HEADER_PRICE", payload: { itemId, value } });
  }, []);

  const setSavingApproval = useCallback((saving: boolean) => {
    dispatch({ type: "SET_SAVING_APPROVAL", payload: saving });
  }, []);

  const resetModifications = useCallback(() => {
    dispatch({ type: "RESET_MODIFICATIONS" });
  }, []);

  return {
    state,
    actions: {
      openDialog,
      closeDialog,
      setItemsLoading,
      setQuoteItems,
      setResponseNotes,
      setModifiedDiscount,
      handlePriceChange,
      handleSamplePriceChange,
      handleHeaderPriceChange,
      setSavingApproval,
      resetModifications,
    },
  };
}

export type { Quote, QuoteItem, DialogState };
