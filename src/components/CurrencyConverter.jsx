import { useMemo, useState } from "react";

const SOURCE_CURRENCIES = ["USD", "EUR", "GBP"];

export default function CurrencyConverter() {
  const [sourceCurrency, setSourceCurrency] = useState("USD");
  const [sourceAmount, setSourceAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("129");

  const convertedKes = useMemo(() => {
    const amount = Number(sourceAmount);
    const rate = Number(exchangeRate);

    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(rate) ||
      amount < 0 ||
      rate <= 0
    ) {
      return null;
    }

    return amount * rate;
  }, [sourceAmount, exchangeRate]);

  return (
    <section className="currency-converter-panel">
      <div className="currency-converter-heading">
        <div>
          <p className="eyebrow">CURRENCY CONVERTER</p>
          <h2>Convert to Kenyan shillings</h2>
          <p className="muted">
            Enter an amount in another currency and convert it to KES.
          </p>
        </div>

        <span className="kes-badge">RESULT: KES</span>
      </div>

      <div className="currency-converter-form">
        <label>
          Source currency
          <select
            value={sourceCurrency}
            onChange={(event) => {
              setSourceCurrency(event.target.value);
              setSourceAmount("");
            }}
          >
            {SOURCE_CURRENCIES.map((currency) => (
              <option value={currency} key={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount in {sourceCurrency}
          <input
            type="number"
            min="0"
            step="0.01"
            value={sourceAmount}
            onChange={(event) =>
              setSourceAmount(event.target.value)
            }
            placeholder={`Example: 10 ${sourceCurrency}`}
          />
        </label>

        <label>
          Exchange rate
          <span className="field-help">
            1 {sourceCurrency} equals how many KES?
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={exchangeRate}
            onChange={(event) =>
              setExchangeRate(event.target.value)
            }
            placeholder="Example: 129"
          />
        </label>
      </div>

      <div className="currency-rate-line">
        <strong>
          1 {sourceCurrency} ={" "}
          {exchangeRate ? `${exchangeRate} KES` : "___ KES"}
        </strong>
      </div>

      <div className="currency-converter-result">
        {convertedKes === null ? (
          <p>
            Enter an amount and exchange rate to see the KES result.
          </p>
        ) : (
          <>
            <span>Converted amount</span>

            <strong>
              {convertedKes.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              KES
            </strong>

            <small>
              {Number(sourceAmount).toLocaleString()}{" "}
              {sourceCurrency} × {Number(exchangeRate)} KES
            </small>
          </>
        )}
      </div>
    </section>
  );
}

