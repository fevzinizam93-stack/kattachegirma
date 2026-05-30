import { router } from "../_core/trpc";
import { ownerProcedure } from "./_shared";
import { getDb } from "../db";
import { orders, quickOrders } from "../../drizzle/schema";

/** Normalize phone to last 9 digits for grouping */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-9);
}

export const customersRouter = router({
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("No DB connection");

    const [allOrders, allQuickOrders] = await Promise.all([
      db.select().from(orders),
      db.select().from(quickOrders),
    ]);

    // Map: normalizedPhone → customer aggregation
    const map = new Map<string, {
      phone: string;
      name: string;
      ordersCount: number;
      totalSpent: number;
      firstOrderAt: number;
      lastOrderAt: number;
      orders: Array<{
        id: number;
        source: "order" | "quick";
        date: number;
        items: Array<{ name: string; price: number; quantity: number }>;
        total: number;
        address: string;
        phone: string;
        status: string;
      }>;
    }>();

    // Process regular orders
    for (const o of allOrders) {
      const key = normalizePhone(o.customerPhone);
      if (!map.has(key)) {
        map.set(key, {
          phone: o.customerPhone,
          name: o.customerName,
          ordersCount: 0,
          totalSpent: 0,
          firstOrderAt: o.createdAt.getTime(),
          lastOrderAt: o.createdAt.getTime(),
          orders: [],
        });
      }
      const c = map.get(key)!;
      c.ordersCount += 1;
      c.totalSpent += Number(o.totalAmount);
      const ts = o.createdAt.getTime();
      if (ts < c.firstOrderAt) c.firstOrderAt = ts;
      if (ts > c.lastOrderAt) {
        c.lastOrderAt = ts;
        c.name = o.customerName; // keep most recent name
        c.phone = o.customerPhone;
      }
      c.orders.push({
        id: o.id,
        source: "order",
        date: ts,
        items: (o.items ?? []).map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
        total: Number(o.totalAmount),
        address: o.deliveryAddress,
        phone: o.customerPhone,
        status: o.status,
      });
    }

    // Process quick orders (1-click)
    for (const q of allQuickOrders) {
      const key = normalizePhone(q.customerPhone);
      if (!map.has(key)) {
        map.set(key, {
          phone: q.customerPhone,
          name: q.customerName,
          ordersCount: 0,
          totalSpent: 0,
          firstOrderAt: q.createdAt.getTime(),
          lastOrderAt: q.createdAt.getTime(),
          orders: [],
        });
      }
      const c = map.get(key)!;
      c.ordersCount += 1;
      const ts = q.createdAt.getTime();
      if (ts < c.firstOrderAt) c.firstOrderAt = ts;
      if (ts > c.lastOrderAt) {
        c.lastOrderAt = ts;
        c.name = q.customerName;
        c.phone = q.customerPhone;
      }
      const price = q.productPrice ? Number(q.productPrice.replace(/[^\d.]/g, "")) : 0;
      c.orders.push({
        id: q.id,
        source: "quick",
        date: ts,
        items: [{ name: q.productName, price, quantity: 1 }],
        total: price,
        address: "",
        phone: q.customerPhone,
        status: q.status,
      });
    }

    // Sort each customer's orders descending
    const customers = Array.from(map.values()).map((c) => ({
      ...c,
      orders: c.orders.sort((a, b) => b.date - a.date),
    }));

    // Sort customers by lastOrderAt descending
    customers.sort((a, b) => b.lastOrderAt - a.lastOrderAt);

    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const totalOrders = customers.reduce((s, c) => s + c.ordersCount, 0);

    return {
      customers,
      summary: {
        totalCustomers: customers.length,
        totalOrders,
        totalRevenue,
      },
    };
  }),
});
