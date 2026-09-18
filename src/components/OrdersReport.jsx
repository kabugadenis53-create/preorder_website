import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { formatMoney } from "../lib/currency.js";

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateTime(value) {
  if (!value) {
    return "Not provided";
  }

  return new Date(value).toLocaleString();
}

export default function OrdersReport() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");

  async function loadReport() {
    setLoading(true);
    setErrorMessage("");

    const [
      { data: orderData, error: orderError },
      { data: itemData, error: itemError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("order_items")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (orderError || itemError) {
      setErrorMessage(
        orderError?.message ||
          itemError?.message ||
          "The order report could not be loaded.",
      );
      setLoading(false);
      return;
    }

    setOrders(orderData || []);
    setOrderItems(itemData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, []);

  const groupedCustomers = useMemo(() => {
    const itemsByOrder = new Map();

    for (const item of orderItems) {
      const currentItems = itemsByOrder.get(item.order_id) || [];
      currentItems.push(item);
      itemsByOrder.set(item.order_id, currentItems);
    }

    const customerMap = new Map();

    for (const order of orders) {
      const customerKey =
        order.user_id ||
        order.whatsapp_number ||
        order.contact ||
        order.customer_email ||
        order.client_name ||
        order.customer_name ||
        order.id;

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          key: customerKey,
          name:
            order.customer_name ||
            order.client_name ||
            "Not provided",
          email: order.customer_email || "",
          whatsapp:
            order.whatsapp_number ||
            order.contact ||
            "Not provided",
          orders: [],
        });
      }

      customerMap.get(customerKey).orders.push({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      });
    }

    return Array.from(customerMap.values());
  }, [orders, orderItems]);
  const reportTotals = useMemo(() => {
    let totalOrders = 0;
    let totalQuantity = 0;
    let totalShipping = 0;
    let totalSales = 0;

    for (const customer of groupedCustomers) {
      for (const order of customer.orders) {
        totalOrders += 1;
        totalShipping += Number(order.shipping_total || 0);
        totalSales += Number(order.grand_total || 0);

        for (const item of order.items) {
          totalQuantity += Number(item.quantity || 0);
        }
      }
    }

    return {
      totalOrders,
      totalQuantity,
      totalShipping,
      totalSales,
    };
  }, [groupedCustomers]);

  function toggleCustomer(customerKey) {
    setExpandedCustomers((current) => ({
      ...current,
      [customerKey]: !current[customerKey],
    }));
  }

  function downloadCsv() {
    const header = [
      "Account name",
      "Email",
      "WhatsApp number",
      "Order number",
      "Date",
      "Time",
      "Product",
      "Quantity",
      "Amount each (KES)",
      "Shipping each (KES)",
      "Line total (KES)",
      "Order total (KES)",
      "Status",
    ];

    const rows = [];

    for (const customer of filteredCustomers) {
      for (const order of customer.orders) {
        const orderDate = order.created_at
          ? new Date(order.created_at)
          : null;

        const items =
          order.items.length > 0
            ? order.items
            : [
                {
                  product_name: "No item details",
                  quantity: "",
                  unit_price: "",
                  estimated_shipping: "",
                  line_total: "",
                },
              ];

        for (const item of items) {
          rows.push([
            customer.name,
            customer.email,
            customer.whatsapp,
            order.order_number || order.id,
            orderDate
              ? orderDate.toLocaleDateString()
              : "",
            orderDate
              ? orderDate.toLocaleTimeString()
              : "",
            item.product_name,
            item.quantity,
            item.unit_price,
            item.estimated_shipping,
            item.line_total,
            order.grand_total,
            order.status,
          ]);
        }
      }
    }

    const csv = [
      header,
      ...rows,
    ]
      .map((row) => row.map(csvValue).join(","))
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `import-preorders-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return groupedCustomers;
    }

    return groupedCustomers.filter((customer) => {
      const searchableText = [
        customer.name,
        customer.email,
        customer.whatsapp,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [groupedCustomers, customerSearch]);
  return (
    <section className="orders-report-panel">
      <div className="orders-report-heading">
        <div>
          <p className="eyebrow">ADMIN REPORTS</p>
          <h2>Ordered products</h2>
          <p className="muted">
            Orders are grouped by customer account across all dates.
          </p>
        </div>

        <div className="orders-report-search">
          <label htmlFor="orders-report-search-input">
            Search orders
          </label>

          <input
            id="orders-report-search-input"
            type="search"
            value={customerSearch}
            onChange={(event) =>
              setCustomerSearch(event.target.value)
            }
            placeholder="Search by customer name or phone number"
          />

          {customerSearch && (
            <button
              className="clear-search-button"
              type="button"
              onClick={() => setCustomerSearch("")}
            >
              Clear
            </button>
          )}
        </div>
        <div className="orders-report-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={loadReport}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh report"}
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={downloadCsv}
            disabled={groupedCustomers.length === 0}
          >
            Download CSV
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="report-error">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          Loading order report...
        </div>
      ) : groupedCustomers.length === 0 ? (
        <div className="empty-state">
          No saved orders are available yet.
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="empty-state">
          No customers match this search.
        </div>
      ) : (
        <div className="orders-report-list">
          {filteredCustomers.map((customer) => {
            const isExpanded =
              expandedCustomers[customer.key] !== false;
return (
              <article
                className="customer-report-group"
                key={customer.key}
              >
                <button
                  className="customer-report-header"
                  type="button"
                  onClick={() =>
                    toggleCustomer(customer.key)
                  }
                >
                  <span>
                    <strong>{customer.name}</strong>
                    <small>
                      {customer.whatsapp}{" "}
                      {customer.email
                        ? `· ${customer.email}`
                        : ""}
                    </small>
                  </span>

                  <span>
                    {customer.orders.length} order
                    {customer.orders.length === 1
                      ? ""
                      : "s"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="customer-order-list">
                    {customer.orders.map((order) => (
                      <div
                        className="report-order-card"
                        key={order.id}
                      >
                        <div className="report-order-summary">
                          <div>
                            <strong>
                              {order.order_number ||
                                order.id}
                            </strong>
                            <small>
                              {formatDateTime(
                                order.created_at,
                              )}
                            </small>
                          </div>

                          <div>
                            <span className="report-status">
                              {order.status}
                            </span>
                            <strong>
                              {formatMoney(
                                order.grand_total,
                                "KES",
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="report-items">
                          {order.items.map((item) => (
                            <div
                              className="report-item-row"
                              key={item.id}
                            >
                              <span>
                                {item.product_name}
                              </span>

                              <span>
                                Qty: {item.quantity}
                              </span>

                              <span>
                                Each:{" "}
                                {formatMoney(
                                  item.unit_price,
                                  "KES",
                                )}
                              </span>

                              <strong>
                                {formatMoney(
                                  item.line_total,
                                  "KES",
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
        <footer className="report-overall-total">
          <div>
            <span>Total orders</span>
            <strong>{reportTotals.totalOrders}</strong>
          </div>

          <div>
            <span>Total quantities</span>
            <strong>{reportTotals.totalQuantity}</strong>
          </div>

          <div>
            <span>Total shipping</span>
            <strong>
              {formatMoney(
                reportTotals.totalShipping,
                "KES",
              )}
            </strong>
          </div>

          <div>
            <span>Total sales</span>
            <strong>
              {formatMoney(
                reportTotals.totalSales,
                "KES",
              )}
            </strong>
          </div>
        </footer>
    </section>
  );
}










