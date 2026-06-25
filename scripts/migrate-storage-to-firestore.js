const fs = require("node:fs");
const path = require("node:path");
const { initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const rootDir = path.resolve(__dirname, "..");
const storagePath = path.join(rootDir, "data", "storage.json");
const serviceAccountPath = path.join(rootDir, "service-account.json");

const credential = fs.existsSync(serviceAccountPath)
  ? cert(require(serviceAccountPath))
  : applicationDefault();

initializeApp({ credential });

const db = getFirestore();
const store = JSON.parse(fs.readFileSync(storagePath, "utf8"));

function asTimestamp(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function normalizeProduct(product) {
  return {
    legacyId: String(product.id),
    sku: String(product.sku || "").trim(),
    name: String(product.name || "").trim(),
    category: String(product.category || "Outros").trim(),
    supplierId: product.supplier_id ? String(product.supplier_id) : "",
    costPrice: Number(product.cost_price || 0),
    salePrice: Number(product.sale_price || 0),
    stock: Number.parseInt(product.stock || 0, 10),
    minStock: Number.parseInt(product.min_stock || 0, 10),
    unit: String(product.unit || "un").trim(),
    active: true,
    createdAt: asTimestamp(product.created_at),
    updatedAt: asTimestamp(product.created_at),
  };
}

function normalizeSupplier(supplier) {
  return {
    legacyId: String(supplier.id),
    name: String(supplier.name || "").trim(),
    cnpj: String(supplier.cnpj || "").trim(),
    phone: String(supplier.phone || "").trim(),
    email: String(supplier.email || "").trim(),
    city: String(supplier.city || "").trim(),
    createdAt: asTimestamp(supplier.created_at),
  };
}

function normalizeMovement(movement) {
  return {
    legacyId: String(movement.id),
    productId: String(movement.product_id || ""),
    productName: String(movement.product_name || "").trim(),
    type: movement.type === "entry" ? "entry" : "exit",
    quantity: Number.parseInt(movement.quantity || 0, 10),
    reason: String(movement.reason || "Ajuste").trim(),
    date: String(movement.date || "").trim(),
    createdAt: asTimestamp(movement.created_at),
  };
}

function normalizeCommand(command) {
  return {
    legacyId: String(command.id),
    tableNumber: String(command.table_number || command.tableNumber || "").trim(),
    customerName: String(command.customer_name || command.customerName || "").trim(),
    status: command.status || "open",
    totalValue: Number(command.total_value || command.totalValue || 0),
    itemCount: (command.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    createdAt: asTimestamp(command.created_at || command.createdAt),
    updatedAt: asTimestamp(command.created_at || command.createdAt),
    billRequestedAt: asTimestamp(command.bill_requested_at || command.billRequestedAt),
    closedAt: asTimestamp(command.closed_at || command.closedAt),
  };
}

function normalizeCommandItem(item) {
  return {
    legacyId: String(item.id),
    productId: String(item.product_id || item.productId || ""),
    productName: String(item.product_name || item.productName || "").trim(),
    quantity: Number.parseInt(item.quantity || 0, 10),
    unitPrice: Number(item.unit_price || item.unitPrice || 0),
    status: item.status || "pending",
    notes: String(item.notes || "").trim(),
    createdAt: asTimestamp(item.created_at || item.createdAt),
    readyAt: asTimestamp(item.ready_at || item.readyAt),
    deliveredAt: asTimestamp(item.delivered_at || item.deliveredAt),
  };
}

async function setCollection(collectionName, items, normalize) {
  for (const item of items || []) {
    const id = String(item.id);
    await db.collection(collectionName).doc(id).set(normalize(item), { merge: true });
    console.log(`Migrado ${collectionName}/${id}`);
  }
}

async function migrateCommands(commands) {
  for (const command of commands || []) {
    const commandId = String(command.id);
    const commandRef = db.collection("commands").doc(commandId);
    await commandRef.set(normalizeCommand(command), { merge: true });
    console.log(`Migrado commands/${commandId}`);

    for (const item of command.items || []) {
      const itemId = String(item.id);
      await commandRef.collection("items").doc(itemId).set(normalizeCommandItem(item), { merge: true });
      console.log(`Migrado commands/${commandId}/items/${itemId}`);
    }
  }
}

async function main() {
  await setCollection("suppliers", store.suppliers, normalizeSupplier);
  await setCollection("products", store.products, normalizeProduct);
  await setCollection("stockMovements", store.movements, normalizeMovement);
  await migrateCommands(store.commands || []);

  console.log("Migracao concluida.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
