import cors from "cors";
import express from "express";
import admin from "firebase-admin";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3001);
const APP_CHECK_REQUIRED = process.env.APP_CHECK_REQUIRED === "true";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:5000,http://localhost:5000,https://stockapp-28944.web.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const firebaseInitialized = initializeFirebase();
const db = firebaseInitialized ? admin.firestore() : null;
const app = express();
const rateBuckets = new Map();

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(rateLimit);
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origem nao permitida."));
  },
  credentials: false,
}));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", verifyAppCheck, authenticate);

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    const [products, suppliers, movements] = await Promise.all([
      listProducts(),
      listSuppliers(),
      listMovements(),
    ]);

    const stockValue = products.reduce((sum, product) => sum + product.cost_price * product.stock, 0);
    res.json({
      stock_value: stockValue,
      total_products: products.length,
      total_suppliers: suppliers.length,
      low_stock: products.filter((product) => product.stock <= product.min_stock).length,
      entries: movements.filter((movement) => movement.type === "entry").reduce((sum, movement) => sum + movement.quantity, 0),
      exits: movements.filter((movement) => movement.type === "exit").reduce((sum, movement) => sum + movement.quantity, 0),
      latest_movements: movements.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/suppliers", async (_req, res, next) => {
  try {
    res.json(await listSuppliers());
  } catch (error) {
    next(error);
  }
});

app.post("/api/suppliers", requireRole(["admin", "staff"]), async (req, res, next) => {
  try {
    const name = shortString(req.body.name);

    if (!name) {
      throw httpError(422, "Nome do fornecedor e obrigatorio.");
    }

    const payload = {
      name,
      cnpj: shortString(req.body.cnpj, 32),
      phone: shortString(req.body.phone, 32),
      email: shortString(req.body.email, 160),
      city: shortString(req.body.city, 120),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("suppliers").add(payload);
    await audit(req, "supplier.create", "suppliers", ref.id, { name });
    res.status(201).json({ id: ref.id, ...mapSupplier(ref.id, payload) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", async (_req, res, next) => {
  try {
    res.json(await listProducts());
  } catch (error) {
    next(error);
  }
});

app.post("/api/products", requireRole(["admin", "staff"]), async (req, res, next) => {
  try {
    const sku = shortString(req.body.sku, 80);
    const name = shortString(req.body.name, 160);

    if (!sku || !name) {
      throw httpError(422, "SKU e nome sao obrigatorios.");
    }

    const duplicated = await db.collection("products").where("sku", "==", sku).limit(1).get();

    if (!duplicated.empty) {
      throw httpError(422, "SKU ja cadastrado.");
    }

    const payload = {
      sku,
      name,
      category: shortString(req.body.category, 120) || "Outros",
      supplierId: cleanString(req.body.supplier_id || req.body.supplierId),
      costPrice: money(req.body.cost_price ?? req.body.costPrice),
      salePrice: money(req.body.sale_price ?? req.body.salePrice),
      stock: nonNegativeInt(req.body.stock),
      minStock: nonNegativeInt(req.body.min_stock ?? req.body.minStock),
      unit: shortString(req.body.unit, 24) || "un",
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("products").add(payload);
    await audit(req, "product.create", "products", ref.id, { sku, name });
    res.status(201).json({ id: ref.id, ...mapProduct(ref.id, payload) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/movements", async (_req, res, next) => {
  try {
    res.json(await listMovements());
  } catch (error) {
    next(error);
  }
});

app.post("/api/movements", requireRole(["admin", "staff"]), async (req, res, next) => {
  try {
    const productId = cleanString(req.body.product_id || req.body.productId);
    const type = req.body.type === "entry" ? "entry" : "exit";
    const quantity = positiveInt(req.body.quantity);
    const reason = shortString(req.body.reason, 200) || "Ajuste";

    if (!productId) {
      throw httpError(422, "Produto obrigatorio.");
    }

    await db.runTransaction(async (transaction) => {
      const productRef = db.collection("products").doc(productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw httpError(404, "Produto nao encontrado.");
      }

      const product = productSnap.data();
      const delta = type === "entry" ? quantity : -quantity;

      if (Number(product.stock || 0) + delta < 0) {
        throw httpError(422, "Estoque insuficiente.");
      }

      transaction.update(productRef, {
        stock: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      transaction.set(db.collection("stockMovements").doc(), {
        productId,
        productName: product.name,
        type,
        quantity,
        reason,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: req.user.uid,
      });
    });

    await audit(req, "stock.adjust", "products", productId, { type, quantity, reason });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/tables", requireRole(["admin", "staff"]), async (_req, res, next) => {
  try {
    const snapshot = await db.collection("tables").orderBy("number", "asc").get();
    res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    next(error);
  }
});

app.post("/api/tables", requireRole(["admin", "staff"]), async (req, res, next) => {
  try {
    const number = shortString(req.body.number || req.body.table_number, 32);

    if (!number) {
      throw httpError(422, "Numero da mesa e obrigatorio.");
    }

    const duplicated = await db.collection("tables").where("number", "==", number).limit(1).get();

    if (!duplicated.empty) {
      throw httpError(422, "Mesa ja cadastrada.");
    }

    const token = crypto.randomBytes(24).toString("hex");
    const payload = {
      number,
      token,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("tables").add(payload);
    await audit(req, "table.create", "tables", ref.id, { number });
    res.status(201).json({ id: ref.id, ...payload });
  } catch (error) {
    next(error);
  }
});

app.get("/api/commands", async (req, res, next) => {
  try {
    const commandId = cleanString(req.query.id);

    if (commandId) {
      res.json(await getCommand(commandId));
      return;
    }

    res.json(await listCommands());
  } catch (error) {
    next(error);
  }
});

app.post("/api/commands", async (req, res, next) => {
  try {
    const action = cleanString(req.query.action);

    if (!action) {
      res.status(201).json(await createCommand(req));
      return;
    }

    if (action === "add-item") {
      res.status(201).json(await addCommandItem(req));
      return;
    }

    if (action === "remove-item") {
      res.json(await removeCommandItem(req));
      return;
    }

    if (action === "request-bill") {
      res.json(await updateCommandStatus(req, "bill_requested", { billRequestedAt: admin.firestore.FieldValue.serverTimestamp() }));
      return;
    }

    if (action === "close") {
      requireOneOfRoles(req, ["admin", "staff"]);
      res.json(await updateCommandStatus(req, "closed", { closedAt: admin.firestore.FieldValue.serverTimestamp() }));
      return;
    }

    if (action === "mark-ready") {
      requireOneOfRoles(req, ["admin", "staff", "kitchen"]);
      res.json(await updateCommandItemStatus(req, "ready", "readyAt"));
      return;
    }

    if (action === "mark-delivered") {
      requireOneOfRoles(req, ["admin", "staff", "kitchen"]);
      res.json(await updateCommandItemStatus(req, "delivered", "deliveredAt"));
      return;
    }

    throw httpError(404, "Acao nao encontrada.");
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "JSON invalido." });
    return;
  }

  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? "Erro interno no servidor." : error.message,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
  });
}

async function audit(req, action, resource, resourceId, details = {}) {
  await db.collection("auditLogs").add({
    action,
    resource,
    resourceId,
    details,
    userId: req.user?.uid || "",
    userEmail: req.user?.email || "",
    userRole: req.user?.role || "customer",
    ip: req.ip || "",
    userAgent: req.get("user-agent") || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function initializeFirebase() {
  if (admin.apps.length) return true;

  if (process.env.NODE_ENV === "test") {
    return false;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const localServiceAccount = path.resolve(currentDir, "..", "service-account.json");

  if (fs.existsSync(localServiceAccount)) {
    const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccount, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return true;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG) {
    admin.initializeApp();
    return true;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  return true;
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

function rateLimit(req, res, next) {
  if (req.path === "/health") {
    next();
    return;
  }

  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 180;
  const key = req.ip || "unknown";
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (bucket.count > maxRequests) {
    res.status(429).json({ error: "Muitas requisicoes. Tente novamente em instantes." });
    return;
  }

  next();
}

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.match(/^Bearer (.+)$/) || [];

    if (!token) {
      throw httpError(401, "Token ausente.");
    }

    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    next(error.status ? error : httpError(401, "Token invalido."));
  }
}

async function verifyAppCheck(req, _res, next) {
  try {
    if (!APP_CHECK_REQUIRED) {
      next();
      return;
    }

    const token = req.header("X-Firebase-AppCheck");

    if (!token) {
      throw httpError(401, "App Check ausente.");
    }

    await admin.appCheck().verifyToken(token);
    next();
  } catch (error) {
    next(error.status ? error : httpError(401, "App Check invalido."));
  }
}

function requireRole(roles) {
  return (req, _res, next) => {
    try {
      requireOneOfRoles(req, roles);
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireOneOfRoles(req, roles) {
  const role = req.user?.role;

  if (!roles.includes(role)) {
    throw httpError(403, "Permissao insuficiente.");
  }
}

async function listSuppliers() {
  const snapshot = await db.collection("suppliers").orderBy("name", "asc").get();
  return snapshot.docs.map((doc) => mapSupplier(doc.id, doc.data()));
}

async function listProducts() {
  const [productsSnapshot, suppliers] = await Promise.all([
    db.collection("products").orderBy("name", "asc").get(),
    listSuppliers(),
  ]);
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  return productsSnapshot.docs.map((doc) => {
    const product = mapProduct(doc.id, doc.data());
    product.supplier_name = supplierById.get(product.supplier_id) || "";
    return product;
  });
}

async function listMovements() {
  const snapshot = await db.collection("stockMovements").orderBy("createdAt", "desc").limit(200).get();
  return snapshot.docs.map((doc) => mapMovement(doc.id, doc.data()));
}

async function listCommands() {
  const snapshot = await db.collection("commands").orderBy("createdAt", "desc").limit(100).get();
  return Promise.all(snapshot.docs.map((doc) => getCommand(doc.id, doc.data())));
}

async function getCommand(commandId, commandData = null) {
  let data = commandData;

  if (!data) {
    const doc = await db.collection("commands").doc(commandId).get();

    if (!doc.exists) {
      throw httpError(404, "Comanda nao encontrada.");
    }

    data = doc.data();
  }

  const itemsSnapshot = await db.collection("commands").doc(commandId).collection("items").orderBy("createdAt", "asc").get();
  const items = itemsSnapshot.docs.map((doc) => mapCommandItem(doc.id, doc.data()));
  return mapCommand(commandId, data, items);
}

async function createCommand(req) {
  const tableNumber = shortString(req.body.table_number || req.body.tableNumber, 32);
  const tableToken = shortString(req.body.table_token || req.body.tableToken, 128);
  const customerName = shortString(req.body.customer_name || req.body.customerName, 160);

  if (!tableNumber && !customerName) {
    throw httpError(422, "Informe a mesa ou o nome do cliente.");
  }

  if (tableNumber) {
    await validateTableAccess(tableNumber, tableToken);

    const existing = await db
      .collection("commands")
      .where("tableNumber", "==", tableNumber)
      .where("status", "in", ["open", "bill_requested"])
      .limit(1)
      .get();

    if (!existing.empty) {
      return getCommand(existing.docs[0].id, existing.docs[0].data());
    }
  }

  const ref = db.collection("commands").doc();
  await ref.set({
    tableNumber,
    customerName,
    customerUid: req.user.uid,
    status: "open",
    totalValue: 0,
    itemCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    billRequestedAt: null,
    closedAt: null,
  });

  await audit(req, "command.create", "commands", ref.id, { tableNumber, customerName });
  return getCommand(ref.id);
}

async function validateTableAccess(tableNumber, tableToken) {
  const tableSnapshot = await db.collection("tables").where("number", "==", tableNumber).limit(1).get();

  if (tableSnapshot.empty) {
    return;
  }

  const table = tableSnapshot.docs[0].data();

  if (!table.active) {
    throw httpError(403, "Mesa inativa.");
  }

  if (!tableToken || table.token !== tableToken) {
    throw httpError(403, "Token da mesa invalido.");
  }
}

async function addCommandItem(req) {
  const commandId = cleanString(req.body.command_id || req.body.commandId);
  const productId = cleanString(req.body.product_id || req.body.productId);
  const quantity = positiveInt(req.body.quantity);
  const notes = shortString(req.body.notes, 240);

  if (!commandId || !productId) {
    throw httpError(422, "Comanda e produto sao obrigatorios.");
  }

  await db.runTransaction(async (transaction) => {
    const commandRef = db.collection("commands").doc(commandId);
    const productRef = db.collection("products").doc(productId);
    const itemRef = commandRef.collection("items").doc();
    const movementRef = db.collection("stockMovements").doc();
    const [commandSnap, productSnap] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(productRef),
    ]);

    if (!commandSnap.exists) {
      throw httpError(404, "Comanda nao encontrada.");
    }

    if (!productSnap.exists) {
      throw httpError(404, "Produto nao encontrado.");
    }

    const command = commandSnap.data();
    const product = productSnap.data();

    if (command.status === "closed") {
      throw httpError(422, "Comanda fechada nao aceita novos itens.");
    }

    if (Number(product.stock || 0) < quantity) {
      throw httpError(422, "Estoque insuficiente.");
    }

    const unitPrice = Number(product.salePrice || 0);
    transaction.set(itemRef, {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      status: "pending",
      notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readyAt: null,
      deliveredAt: null,
      userId: req.user.uid,
    });
    transaction.update(productRef, {
      stock: admin.firestore.FieldValue.increment(-quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(commandRef, {
      totalValue: admin.firestore.FieldValue.increment(quantity * unitPrice),
      itemCount: admin.firestore.FieldValue.increment(quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(movementRef, {
      productId,
      productName: product.name,
      type: "exit",
      quantity,
      reason: `Comanda ${commandId}`,
      commandId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid,
    });
  });

  await audit(req, "command.item.add", "commands", commandId, { productId, quantity });
  return getCommand(commandId);
}

async function removeCommandItem(req) {
  const commandId = cleanString(req.body.command_id || req.body.commandId);
  const itemId = cleanString(req.body.item_id || req.body.itemId);

  if (!commandId || !itemId) {
    throw httpError(422, "Comanda e item sao obrigatorios.");
  }

  await db.runTransaction(async (transaction) => {
    const commandRef = db.collection("commands").doc(commandId);
    const itemRef = commandRef.collection("items").doc(itemId);
    const [commandSnap, itemSnap] = await Promise.all([
      transaction.get(commandRef),
      transaction.get(itemRef),
    ]);

    if (!commandSnap.exists) {
      throw httpError(404, "Comanda nao encontrada.");
    }

    if (!itemSnap.exists) {
      throw httpError(404, "Item nao encontrado.");
    }

    const command = commandSnap.data();
    const item = itemSnap.data();

    if (command.status === "closed") {
      throw httpError(422, "Nao e possivel remover item de comanda fechada.");
    }

    const quantity = Number(item.quantity || 0);
    const total = quantity * Number(item.unitPrice || 0);
    const productRef = db.collection("products").doc(item.productId);

    transaction.delete(itemRef);
    transaction.update(productRef, {
      stock: admin.firestore.FieldValue.increment(quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.update(commandRef, {
      totalValue: admin.firestore.FieldValue.increment(-total),
      itemCount: admin.firestore.FieldValue.increment(-quantity),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(db.collection("stockMovements").doc(), {
      productId: item.productId,
      productName: item.productName,
      type: "entry",
      quantity,
      reason: `Remocao da comanda ${commandId}`,
      commandId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid,
    });
  });

  await audit(req, "command.item.remove", "commands", commandId, { itemId });
  return getCommand(commandId);
}

async function updateCommandStatus(req, status, extra) {
  const commandId = cleanString(req.body.command_id || req.body.commandId);

  if (!commandId) {
    throw httpError(422, "Comanda obrigatoria.");
  }

  await db.collection("commands").doc(commandId).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  });

  await audit(req, `command.${status}`, "commands", commandId);
  return getCommand(commandId);
}

async function updateCommandItemStatus(req, status, timestampField) {
  const commandId = cleanString(req.body.command_id || req.body.commandId);
  const itemId = cleanString(req.body.item_id || req.body.itemId);

  if (!commandId || !itemId) {
    throw httpError(422, "Comanda e item sao obrigatorios.");
  }

  await db.collection("commands").doc(commandId).collection("items").doc(itemId).update({
    status,
    [timestampField]: admin.firestore.FieldValue.serverTimestamp(),
  });

  await audit(req, `command.item.${status}`, "commands", commandId, { itemId });
  return getCommand(commandId);
}

function mapProduct(id, data) {
  return {
    id,
    sku: data.sku || "",
    name: data.name || "",
    category: data.category || "Outros",
    supplier_id: data.supplierId || "",
    supplier_name: data.supplierName || "",
    cost_price: Number(data.costPrice || 0),
    sale_price: Number(data.salePrice || 0),
    stock: Number(data.stock || 0),
    min_stock: Number(data.minStock || 0),
    unit: data.unit || "un",
    created_at: toIso(data.createdAt),
  };
}

function mapSupplier(id, data) {
  return {
    id,
    name: data.name || "",
    cnpj: data.cnpj || "",
    phone: data.phone || "",
    email: data.email || "",
    city: data.city || "",
    created_at: toIso(data.createdAt),
  };
}

function mapMovement(id, data) {
  return {
    id,
    product_id: data.productId || "",
    product_name: data.productName || "",
    type: data.type || "exit",
    quantity: Number(data.quantity || 0),
    reason: data.reason || "Ajuste",
    date: toIso(data.createdAt)?.slice(0, 10) || "",
    created_at: toIso(data.createdAt),
  };
}

function mapCommand(id, data, items) {
  return {
    id,
    table_number: data.tableNumber || "",
    customer_name: data.customerName || "",
    status: data.status || "open",
    items,
    total_value: Number(data.totalValue || 0),
    created_at: toIso(data.createdAt),
    closed_at: toIso(data.closedAt),
    bill_requested_at: toIso(data.billRequestedAt),
  };
}

function mapCommandItem(id, data) {
  return {
    id,
    product_id: data.productId || "",
    product_name: data.productName || "",
    quantity: Number(data.quantity || 0),
    unit_price: Number(data.unitPrice || 0),
    status: data.status || "pending",
    notes: data.notes || "",
    created_at: toIso(data.createdAt),
    ready_at: toIso(data.readyAt),
    delivered_at: toIso(data.deliveredAt),
  };
}

function cleanString(value) {
  return String(value || "").trim().slice(0, 500);
}

function shortString(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function nonNegativeInt(value) {
  const number = Number.parseInt(value || 0, 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function positiveInt(value) {
  const number = Number.parseInt(value || 1, 10);
  return Number.isFinite(number) && number > 0 ? Math.min(number, 9999) : 1;
}

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export { app };
