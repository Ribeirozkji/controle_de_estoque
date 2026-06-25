import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { backendReady } from "./services/firebaseClient.js";

const api = {
  async get(resource, params = {}) {
    const backend = await getFirebaseBackend();

    if (backend) {
      return backend.get(resource, params);
    }

    const search = new URLSearchParams({ resource, ...cleanParams(params) });
    const response = await fetch(`/api/index.php?${search.toString()}`);
    return parseResponse(response);
  },

  async post(resource, data, action = "") {
    const backend = await getFirebaseBackend();

    if (backend) {
      return backend.post(resource, data, action);
    }

    const suffix = action ? `&action=${action}` : "";
    const response = await fetch(`/api/index.php?resource=${resource}${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseResponse(response);
  },
};

async function getFirebaseBackend() {
  return backendReady.catch(() => null);
}

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

async function parseResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao comunicar com o servidor.");
  }

  return data;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function statusLabel(status) {
  const labels = {
    open: "Aberta",
    bill_requested: "Conta solicitada",
    closed: "Fechada",
    pending: "Pendente",
    ready: "Pronto",
    delivered: "Entregue",
  };

  return labels[status] || status;
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("view") === "client" ? "client" : "dashboard";
  const [tab, setTab] = useState(initialTab);
  const [dashboard, setDashboard] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [commands, setCommands] = useState([]);
  const [error, setError] = useState("");
  const [backendName, setBackendName] = useState("PHP");
  const [authUser, setAuthUser] = useState(null);

  async function loadAll() {
    setError("");
    try {
      const [dash, supplierList, productList, movementList, commandList] = await Promise.all([
        api.get("dashboard"),
        api.get("suppliers"),
        api.get("products"),
        api.get("movements"),
        api.get("commands"),
      ]);

      setDashboard(dash);
      setSuppliers(supplierList);
      setProducts(productList);
      setMovements(movementList);
      setCommands(commandList);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let stop = null;
    let timer = null;
    let cancelled = false;

    function handleUnhandledRejection(event) {
      event.preventDefault();
      setError(event.reason?.message || "Erro inesperado na operacao.");
    }

    async function boot() {
      const backend = await getFirebaseBackend();

      if (cancelled) return;

      if (backend?.subscribeAll) {
        setBackendName("Firebase");
        setAuthUser(await backend.getAuthUser?.());
        stop = backend.subscribeAll((state) => {
          setDashboard(state.dashboard);
          setSuppliers(state.suppliers);
          setProducts(state.products);
          setMovements(state.movements);
          setCommands(state.commands);
          setError("");
        }, (err) => setError(err.message));
        return;
      }

      setBackendName("PHP");
      loadAll();
      timer = window.setInterval(loadAll, 7000);
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    boot();

    return () => {
      cancelled = true;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      if (stop) stop();
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const tabs = [
    ["dashboard", "Dashboard"],
    ["client", "Cliente"],
    ["commands", "Comandas"],
    ["kitchen", "Pendentes"],
    ["history", "Historico"],
    ["suppliers", "Fornecedores"],
    ["products", "Produtos"],
    ["movements", "Movimentacoes"],
  ];

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1 className="title">Controle de Estoque</h1>
          <p className="subtitle">Comandas digitais, estoque e atendimento em uma tela. Backend: {backendName}.</p>
        </div>
        <div className="topbar-actions">
          <SessionPanel user={authUser} onChange={setAuthUser} />
          <button className="btn" onClick={loadAll}>Atualizar</button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <div className="error">{error}</div>}

      {tab === "dashboard" && <Dashboard data={dashboard} movements={movements} commands={commands} />}
      {tab === "client" && <ClientCommand products={products} onChange={loadAll} />}
      {tab === "commands" && <CommandAdmin commands={commands} onChange={loadAll} />}
      {tab === "kitchen" && <Kitchen commands={commands} onChange={loadAll} />}
      {tab === "history" && <CommandHistory commands={commands} />}
      {tab === "suppliers" && <Suppliers suppliers={suppliers} onChange={loadAll} />}
      {tab === "products" && (
        <Products products={products} suppliers={suppliers} onChange={loadAll} />
      )}
      {tab === "movements" && (
        <Movements products={products} movements={movements} onChange={loadAll} />
      )}
    </main>
  );
}

function SessionPanel({ user, onChange }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function backend() {
    const instance = await getFirebaseBackend();

    if (!instance?.signInWithEmail) {
      throw new Error("Login Firebase indisponivel.");
    }

    return instance;
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const instance = await backend();
      const signed = await instance.signInWithEmail(email, password);
      onChange(signed);
      setPassword("");
      setOpen(false);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");

    try {
      const instance = await backend();
      onChange(await instance.signOut());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="session">
      <div className="session-summary">
        <span className="muted">{user?.isAnonymous ? "Cliente anonimo" : user?.email || "Sessao"}</span>
        {user?.role && <strong>{user.role}</strong>}
      </div>
      <div className="session-actions">
        <button className="btn" onClick={() => setOpen(!open)} disabled={busy}>
          Entrar
        </button>
        {!user?.isAnonymous && (
          <button className="btn danger" onClick={logout} disabled={busy}>
            Sair
          </button>
        )}
      </div>
      {open && (
        <form className="login-box" onSubmit={submit}>
          <input type="email" placeholder="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input type="password" placeholder="senha" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="btn primary" disabled={busy}>Entrar</button>
          {message && <p className="bad">{message}</p>}
        </form>
      )}
    </div>
  );
}

function Dashboard({ data, movements, commands }) {
  if (!data) {
    return <section className="panel">Carregando...</section>;
  }

  const openCommands = commands.filter((command) => command.status !== "closed");
  const requestedBills = commands.filter((command) => command.status === "bill_requested");
  const cards = [
    ["Valor em estoque", money(data.stock_value)],
    ["Produtos", data.total_products],
    ["Comandas abertas", openCommands.length],
    ["Contas solicitadas", requestedBills.length],
  ];

  return (
    <section>
      <div className="grid">
        {cards.map(([label, value]) => (
          <div className="card" key={label}>
            <p className="card-label">{label}</p>
            <p className="card-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Ultimas movimentacoes</h2>
        <div className="list">
          {movements.slice(0, 5).map((movement) => (
            <MovementRow key={movement.id} movement={movement} />
          ))}
          {movements.length === 0 && <p className="muted">Nenhuma movimentacao ainda.</p>}
        </div>
      </div>
    </section>
  );
}

function ClientCommand({ products, onChange }) {
  const params = new URLSearchParams(window.location.search);
  const [command, setCommand] = useState(null);
  const [identity, setIdentity] = useState({
    table_number: params.get("mesa") || params.get("table") || "",
    table_token: params.get("token") || "",
    customer_name: "",
  });
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState({});
  const categories = [...new Set(products.map((product) => product.category || "Outros"))];

  async function identify(event) {
    event.preventDefault();
    const created = await api.post("commands", identity);
    setCommand(created);
    onChange();
  }

  async function reloadCommand() {
    if (!command) return;
    const fresh = await api.get("commands", { id: command.id });
    setCommand(fresh);
  }

  useEffect(() => {
    if (!command) return undefined;
    const timer = window.setInterval(reloadCommand, 5000);
    return () => window.clearInterval(timer);
  }, [command && command.id]);

  async function addItem(product) {
    const quantity = quantities[product.id] || "1";
    const updated = await api.post("commands", {
      command_id: command.id,
      product_id: product.id,
      quantity,
      notes: notes[product.id] || "",
    }, "add-item");
    setCommand(updated);
    setQuantities({ ...quantities, [product.id]: "1" });
    setNotes({ ...notes, [product.id]: "" });
    onChange();
  }

  async function removeItem(item) {
    const updated = await api.post("commands", {
      command_id: command.id,
      item_id: item.id,
    }, "remove-item");
    setCommand(updated);
    onChange();
  }

  async function requestBill() {
    const updated = await api.post("commands", { command_id: command.id }, "request-bill");
    setCommand(updated);
    onChange();
  }

  if (!command) {
    return (
      <section className="mobile-shell">
        <form className="panel form" onSubmit={identify}>
          <h2>Entrar na comanda</h2>
          <Input label="Mesa" value={identity.table_number} onChange={(table_number) => setIdentity({ ...identity, table_number })} />
          <Input label="Nome" value={identity.customer_name} onChange={(customer_name) => setIdentity({ ...identity, customer_name })} />
          <button className="btn primary">Abrir comanda</button>
        </form>
      </section>
    );
  }

  return (
    <section className="client-layout">
      <div className="client-catalog">
        {categories.map((category) => (
          <div className="panel" key={category}>
            <h2>{category}</h2>
            <div className="catalog-grid">
              {products.filter((product) => (product.category || "Outros") === category).map((product) => (
                <div className="product-card" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <p className="muted">{money(product.sale_price)} - estoque {product.stock}</p>
                  </div>
                  <Input label="Qtd." type="number" value={quantities[product.id] || "1"} onChange={(value) => setQuantities({ ...quantities, [product.id]: value })} />
                  <Input label="Observacao" value={notes[product.id] || ""} onChange={(value) => setNotes({ ...notes, [product.id]: value })} />
                  <button className="btn primary" onClick={() => addItem(product)} disabled={Number(product.stock) <= 0}>
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <aside className="panel command-summary">
        <div className="summary-head">
          <div>
            <h2>Comanda #{command.id}</h2>
            <p className="muted">Mesa {command.table_number || "-"} - {statusLabel(command.status)}</p>
          </div>
          <strong>{money(command.total_value)}</strong>
        </div>
        <div className="list">
          {command.items.map((item) => (
            <div className="row compact" key={item.id}>
              <div>
                <strong>{item.quantity}x {item.product_name}</strong>
                <div className="muted">{statusLabel(item.status)} {item.notes && `- ${item.notes}`}</div>
              </div>
              {command.status !== "closed" && (
                <button className="btn danger" onClick={() => removeItem(item)}>Remover</button>
              )}
            </div>
          ))}
          {command.items.length === 0 && <p className="muted">Nenhum item adicionado.</p>}
        </div>
        <button className="btn primary full" onClick={requestBill} disabled={command.status === "closed"}>
          Solicitar conta
        </button>
      </aside>
    </section>
  );
}

function CommandAdmin({ commands, onChange }) {
  const active = commands.filter((command) => command.status !== "closed");

  async function closeCommand(command) {
    await api.post("commands", { command_id: command.id }, "close");
    onChange();
  }

  return (
    <section className="list">
      {active.map((command) => (
        <div className="panel" key={command.id}>
          <div className="summary-head">
            <div>
              <h2>Comanda #{command.id} - Mesa {command.table_number || "-"}</h2>
              <p className="muted">{command.customer_name || "Cliente sem nome"} - {statusLabel(command.status)}</p>
            </div>
            <strong>{money(command.total_value)}</strong>
          </div>
          <CommandItems command={command} onChange={onChange} />
          <button className="btn primary" onClick={() => closeCommand(command)}>Fechar comanda</button>
        </div>
      ))}
      {active.length === 0 && <section className="panel">Nenhuma comanda aberta.</section>}
    </section>
  );
}

function Kitchen({ commands, onChange }) {
  const pending = commands.flatMap((command) =>
    command.items
      .filter((item) => item.status !== "delivered")
      .map((item) => ({ ...item, command }))
  );

  async function mark(item, action) {
    await api.post("commands", {
      command_id: item.command.id,
      item_id: item.id,
    }, action);
    onChange();
  }

  return (
    <section className="list">
      {pending.map((item) => (
        <div className="row" key={`${item.command.id}-${item.id}`}>
          <div>
            <strong>{item.quantity}x {item.product_name}</strong>
            <div className="muted">Mesa {item.command.table_number || "-"} - {statusLabel(item.status)} {item.notes && `- ${item.notes}`}</div>
          </div>
          <div className="actions">
            {item.status === "pending" && <button className="btn primary" onClick={() => mark(item, "mark-ready")}>Pronto</button>}
            {item.status === "ready" && <button className="btn" onClick={() => mark(item, "mark-delivered")}>Entregue</button>}
          </div>
        </div>
      ))}
      {pending.length === 0 && <section className="panel">Nenhum item pendente.</section>}
    </section>
  );
}

function CommandHistory({ commands }) {
  const closed = commands.filter((command) => command.status === "closed");
  const byHour = closed.reduce((acc, command) => {
    const hour = new Date(command.created_at).getHours().toString().padStart(2, "0");
    acc[hour] = (acc[hour] || 0) + Number(command.total_value || 0);
    return acc;
  }, {});

  return (
    <section className="layout">
      <div className="panel">
        <h2>Consumo por horario</h2>
        <div className="list">
          {Object.entries(byHour).map(([hour, total]) => (
            <div className="row compact" key={hour}>
              <strong>{hour}:00</strong>
              <span>{money(total)}</span>
            </div>
          ))}
          {Object.keys(byHour).length === 0 && <p className="muted">Sem dados para grafico ainda.</p>}
        </div>
      </div>
      <div className="list">
        {closed.map((command) => (
          <div className="row" key={command.id}>
            <div>
              <strong>Comanda #{command.id} - Mesa {command.table_number || "-"}</strong>
              <div className="muted">{command.customer_name || "Cliente sem nome"} - {command.items.length} itens</div>
            </div>
            <strong>{money(command.total_value)}</strong>
          </div>
        ))}
        {closed.length === 0 && <section className="panel">Nenhuma comanda fechada.</section>}
      </div>
    </section>
  );
}

function CommandItems({ command, onChange }) {
  async function markReady(item) {
    await api.post("commands", {
      command_id: command.id,
      item_id: item.id,
    }, "mark-ready");
    onChange();
  }

  return (
    <div className="list spaced">
      {command.items.map((item) => (
        <div className="row compact" key={item.id}>
          <div>
            <strong>{item.quantity}x {item.product_name}</strong>
            <div className="muted">{statusLabel(item.status)} {item.notes && `- ${item.notes}`}</div>
          </div>
          {item.status === "pending" && (
            <button className="btn" onClick={() => markReady(item)}>Marcar pronto</button>
          )}
        </div>
      ))}
      {command.items.length === 0 && <p className="muted">Sem itens.</p>}
    </div>
  );
}

function Suppliers({ suppliers, onChange }) {
  const [form, setForm] = useState({ name: "", cnpj: "", phone: "", email: "", city: "" });

  async function submit(event) {
    event.preventDefault();
    await api.post("suppliers", form);
    setForm({ name: "", cnpj: "", phone: "", email: "", city: "" });
    onChange();
  }

  return (
    <section className="layout">
      <form className="panel form" onSubmit={submit}>
        <h2>Novo fornecedor</h2>
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="CNPJ" value={form.cnpj} onChange={(cnpj) => setForm({ ...form, cnpj })} />
        <Input label="Telefone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Input label="Cidade" value={form.city} onChange={(city) => setForm({ ...form, city })} />
        <button className="btn primary">Salvar fornecedor</button>
      </form>

      <div className="list">
        {suppliers.map((supplier) => (
          <div className="row" key={supplier.id}>
            <div>
              <strong>{supplier.name}</strong>
              <div className="muted">{supplier.city || "Sem cidade"} {supplier.phone && `- ${supplier.phone}`}</div>
            </div>
            <span className="muted">#{supplier.id}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Products({ products, suppliers, onChange }) {
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "Outros",
    supplier_id: "",
    cost_price: "",
    sale_price: "",
    stock: "0",
    min_stock: "0",
    unit: "un",
  });

  async function submit(event) {
    event.preventDefault();
    await api.post("products", form);
    setForm({ ...form, sku: "", name: "", cost_price: "", sale_price: "", stock: "0", min_stock: "0" });
    onChange();
  }

  return (
    <section className="layout">
      <form className="panel form" onSubmit={submit}>
        <h2>Novo produto</h2>
        <Input label="SKU" value={form.sku} onChange={(sku) => setForm({ ...form, sku })} />
        <Input label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Input label="Categoria" value={form.category} onChange={(category) => setForm({ ...form, category })} />
        <label>
          Fornecedor
          <select value={form.supplier_id} onChange={(event) => setForm({ ...form, supplier_id: event.target.value })}>
            <option value="">Sem fornecedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </label>
        <Input label="Preco custo" type="number" value={form.cost_price} onChange={(cost_price) => setForm({ ...form, cost_price })} />
        <Input label="Preco venda" type="number" value={form.sale_price} onChange={(sale_price) => setForm({ ...form, sale_price })} />
        <Input label="Estoque inicial" type="number" value={form.stock} onChange={(stock) => setForm({ ...form, stock })} />
        <Input label="Estoque minimo" type="number" value={form.min_stock} onChange={(min_stock) => setForm({ ...form, min_stock })} />
        <button className="btn primary">Salvar produto</button>
      </form>

      <div className="list">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function Movements({ products, movements, onChange }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [form, setForm] = useState({
    product_id: "",
    type: "entry",
    quantity: "1",
    reason: "Ajuste",
    date: today,
  });

  async function submit(event) {
    event.preventDefault();
    await api.post("movements", form);
    setForm({ ...form, quantity: "1", reason: "Ajuste" });
    onChange();
  }

  return (
    <section className="layout">
      <form className="panel form" onSubmit={submit}>
        <h2>Nova movimentacao</h2>
        <label>
          Produto
          <select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })}>
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="entry">Entrada</option>
            <option value="exit">Saida</option>
          </select>
        </label>
        <Input label="Quantidade" type="number" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} />
        <Input label="Motivo" value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
        <Input label="Data" type="date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        <button className="btn primary">Registrar</button>
      </form>

      <div className="list">
        {movements.map((movement) => (
          <MovementRow key={movement.id} movement={movement} />
        ))}
      </div>
    </section>
  );
}

function ProductRow({ product }) {
  const low = Number(product.stock) <= Number(product.min_stock);

  return (
    <div className="row">
      <div>
        <strong>{product.name}</strong>
        <div className="muted">{product.sku} - {product.category} - {product.supplier_name || "Sem fornecedor"}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <strong className={low ? "warn" : "ok"}>{product.stock} {product.unit}</strong>
        <div className="muted">{money(product.sale_price)}</div>
      </div>
    </div>
  );
}

function MovementRow({ movement }) {
  const isEntry = movement.type === "entry";

  return (
    <div className="row">
      <div>
        <strong>{movement.product_name}</strong>
        <div className="muted">{movement.reason} - {movement.date}</div>
      </div>
      <strong className={isEntry ? "ok" : "bad"}>
        {isEntry ? "+" : "-"}{movement.quantity}
      </strong>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
