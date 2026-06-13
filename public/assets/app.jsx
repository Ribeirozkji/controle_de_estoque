const { useEffect, useMemo, useState } = React;

const api = {
  async get(resource) {
    const response = await fetch(`/api/index.php?resource=${resource}`);
    return parseResponse(response);
  },

  async post(resource, data, action = "") {
    const suffix = action ? `&action=${action}` : "";
    const response = await fetch(`/api/index.php?resource=${resource}${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseResponse(response);
  },
};

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

function App() {
  const [tab, setTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState("");

  async function loadAll() {
    setError("");
    try {
      const [dash, supplierList, productList, movementList] = await Promise.all([
        api.get("dashboard"),
        api.get("suppliers"),
        api.get("products"),
        api.get("movements"),
      ]);

      setDashboard(dash);
      setSuppliers(supplierList);
      setProducts(productList);
      setMovements(movementList);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const tabs = [
    ["dashboard", "Dashboard"],
    ["suppliers", "Fornecedores"],
    ["products", "Produtos"],
    ["movements", "Movimentacoes"],
  ];

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1 className="title">Controle de Estoque</h1>
          <p className="subtitle">React no front, PHP puro no back.</p>
        </div>
        <button className="btn" onClick={loadAll}>Atualizar</button>
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

      {tab === "dashboard" && <Dashboard data={dashboard} movements={movements} />}
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

function Dashboard({ data, movements }) {
  if (!data) {
    return <section className="panel">Carregando...</section>;
  }

  const cards = [
    ["Valor em estoque", money(data.stock_value)],
    ["Produtos", data.total_products],
    ["Fornecedores", data.total_suppliers],
    ["Estoque baixo", data.low_stock],
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

