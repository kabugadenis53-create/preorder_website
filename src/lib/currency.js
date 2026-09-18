const CURRENCY_ALIASES = {
  KSHS: "KES",
  KES: "KES",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
};

export function normalizeCurrency(currency) {
  const value = String(currency || "KES")
    .trim()
    .toUpperCase();

  return CURRENCY_ALIASES[value] || "KES";
}

export function formatMoney(value, currency = "KES") {
  const safeCurrency = normalizeCurrency(currency);
  const numericValue = Number(value || 0);

  if (safeCurrency === "KES") {
    return `KES ${numericValue.toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
  }).format(numericValue);
}

export const supportedCurrencies = [
  {
    code: "KES",
    label: "Kenyan Shilling (KES)",
  },
  {
    code: "USD",
    label: "US Dollar (USD)",
  },
  {
    code: "EUR",
    label: "Euro (EUR)",
  },
  {
    code: "GBP",
    label: "British Pound (GBP)",
  },
];
