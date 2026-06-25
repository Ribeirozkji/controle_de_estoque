<?php

declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$resource = $_GET['resource'] ?? 'dashboard';
$action = $_GET['action'] ?? null;
$store = load_store();

try {
    match ($resource) {
        'dashboard' => handle_dashboard($store),
        'suppliers' => handle_suppliers($store, $method),
        'products' => handle_products($store, $method),
        'movements' => handle_movements($store, $method),
        'invoices' => handle_invoices($store, $method, $action),
        'commands' => handle_commands($store, $method, $action),
        default => json_response(['error' => 'Recurso nao encontrado.'], 404),
    };
} catch (Throwable $exception) {
    json_response(['error' => 'Erro interno no servidor.'], 500);
}

function handle_dashboard(array $store): void
{
    $products = $store['products'];
    $movements = $store['movements'];

    $stockValue = array_reduce(
        $products,
        fn (float $sum, array $product): float => $sum + ((float) $product['cost_price'] * (int) $product['stock']),
        0.0
    );

    $entries = array_reduce(
        array_filter($movements, fn (array $movement): bool => $movement['type'] === 'entry'),
        fn (int $sum, array $movement): int => $sum + (int) $movement['quantity'],
        0
    );

    $exits = array_reduce(
        array_filter($movements, fn (array $movement): bool => $movement['type'] === 'exit'),
        fn (int $sum, array $movement): int => $sum + (int) $movement['quantity'],
        0
    );

    json_response([
        'stock_value' => $stockValue,
        'total_products' => count($products),
        'total_suppliers' => count($store['suppliers']),
        'low_stock' => count(array_filter($products, fn (array $product): bool => (int) $product['stock'] <= (int) $product['min_stock'])),
        'entries' => $entries,
        'exits' => $exits,
        'latest_movements' => array_slice(array_reverse($movements), 0, 5),
    ]);
}

function handle_suppliers(array $store, string $method): void
{
    if ($method === 'GET') {
        json_response(array_values($store['suppliers']));
    }

    if ($method !== 'POST') {
        json_response(['error' => 'Metodo nao permitido.'], 405);
    }

    $data = request_body();
    require_fields($data, ['name']);

    $supplier = [
        'id' => next_id($store, 'suppliers'),
        'name' => trim((string) $data['name']),
        'cnpj' => trim((string) ($data['cnpj'] ?? '')),
        'phone' => trim((string) ($data['phone'] ?? '')),
        'email' => trim((string) ($data['email'] ?? '')),
        'city' => trim((string) ($data['city'] ?? '')),
        'created_at' => date('c'),
    ];

    $store['suppliers'][] = $supplier;
    save_store($store);

    json_response($supplier, 201);
}

function handle_products(array $store, string $method): void
{
    if ($method === 'GET') {
        $products = array_map(function (array $product) use ($store): array {
            $supplierIndex = find_index_by_id($store['suppliers'], (int) ($product['supplier_id'] ?? 0));
            $product['supplier_name'] = $supplierIndex >= 0 ? $store['suppliers'][$supplierIndex]['name'] : '';

            return $product;
        }, $store['products']);

        json_response(array_values($products));
    }

    if ($method !== 'POST') {
        json_response(['error' => 'Metodo nao permitido.'], 405);
    }

    $data = request_body();
    require_fields($data, ['name', 'sku']);

    foreach ($store['products'] as $product) {
        if (strtolower((string) $product['sku']) === strtolower((string) $data['sku'])) {
            json_response(['error' => 'SKU ja cadastrado.'], 422);
        }
    }

    $product = [
        'id' => next_id($store, 'products'),
        'sku' => trim((string) $data['sku']),
        'name' => trim((string) $data['name']),
        'category' => trim((string) ($data['category'] ?? 'Outros')),
        'supplier_id' => (int) ($data['supplier_id'] ?? 0),
        'cost_price' => max(0, (float) ($data['cost_price'] ?? 0)),
        'sale_price' => max(0, (float) ($data['sale_price'] ?? 0)),
        'stock' => max(0, (int) ($data['stock'] ?? 0)),
        'min_stock' => max(0, (int) ($data['min_stock'] ?? 0)),
        'unit' => trim((string) ($data['unit'] ?? 'un')),
        'created_at' => date('c'),
    ];

    $store['products'][] = $product;
    save_store($store);

    json_response($product, 201);
}

function handle_movements(array $store, string $method): void
{
    if ($method === 'GET') {
        json_response(array_values(array_reverse($store['movements'])));
    }

    if ($method !== 'POST') {
        json_response(['error' => 'Metodo nao permitido.'], 405);
    }

    $data = request_body();
    require_fields($data, ['product_id', 'type', 'quantity']);

    $productIndex = find_index_by_id($store['products'], (int) $data['product_id']);

    if ($productIndex < 0) {
        json_response(['error' => 'Produto nao encontrado.'], 404);
    }

    $type = (string) $data['type'];
    $quantity = max(1, (int) $data['quantity']);

    if (!in_array($type, ['entry', 'exit'], true)) {
        json_response(['error' => 'Tipo deve ser entry ou exit.'], 422);
    }

    $currentStock = (int) $store['products'][$productIndex]['stock'];
    $newStock = $type === 'entry' ? $currentStock + $quantity : $currentStock - $quantity;

    if ($newStock < 0) {
        json_response(['error' => 'Estoque insuficiente para registrar saida.'], 422);
    }

    $store['products'][$productIndex]['stock'] = $newStock;

    $movement = [
        'id' => next_id($store, 'movements'),
        'product_id' => (int) $data['product_id'],
        'product_name' => $store['products'][$productIndex]['name'],
        'type' => $type,
        'quantity' => $quantity,
        'reason' => trim((string) ($data['reason'] ?? 'Ajuste')),
        'date' => trim((string) ($data['date'] ?? date('Y-m-d'))),
        'created_at' => date('c'),
    ];

    $store['movements'][] = $movement;
    save_store($store);

    json_response($movement, 201);
}

function handle_invoices(array $store, string $method, ?string $action): void
{
    if ($method === 'GET') {
        json_response(array_values(array_reverse($store['invoices'])));
    }

    if ($method !== 'POST') {
        json_response(['error' => 'Metodo nao permitido.'], 405);
    }

    $data = request_body();

    if ($action === 'cancel') {
        require_fields($data, ['id', 'reason']);
        $index = find_index_by_id($store['invoices'], (int) $data['id']);

        if ($index < 0) {
            json_response(['error' => 'Nota nao encontrada.'], 404);
        }

        $store['invoices'][$index]['status'] = 'cancelada';
        $store['invoices'][$index]['cancel_reason'] = trim((string) $data['reason']);
        $store['invoices'][$index]['cancelled_at'] = date('c');
        save_store($store);

        json_response($store['invoices'][$index]);
    }

    require_fields($data, ['customer_name']);

    $items = $data['items'] ?? [];

    if (!is_array($items) || $items === []) {
        json_response(['error' => 'Informe ao menos um item.'], 422);
    }

    $total = 0.0;
    $cleanItems = [];

    foreach ($items as $item) {
        $quantity = max(1, (int) ($item['quantity'] ?? 1));
        $unitPrice = max(0, (float) ($item['unit_price'] ?? 0));
        $total += $quantity * $unitPrice;

        $cleanItems[] = [
            'description' => trim((string) ($item['description'] ?? 'Item')),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
        ];
    }

    $invoice = [
        'id' => next_id($store, 'invoices'),
        'number' => str_pad((string) ($store['counters']['invoices']), 6, '0', STR_PAD_LEFT),
        'status' => 'autorizada',
        'customer_name' => trim((string) $data['customer_name']),
        'items' => $cleanItems,
        'total' => $total,
        'created_at' => date('c'),
    ];

    $store['invoices'][] = $invoice;
    save_store($store);

    json_response($invoice, 201);
}

function handle_commands(array $store, string $method, ?string $action): void
{
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

        if ($id > 0) {
            $index = find_index_by_id($store['commands'], $id);

            if ($index < 0) {
                json_response(['error' => 'Comanda nao encontrada.'], 404);
            }

            json_response(normalize_command($store['commands'][$index]));
        }

        $status = trim((string) ($_GET['status'] ?? ''));
        $commands = array_map('normalize_command', $store['commands']);

        if ($status !== '') {
            $commands = array_values(array_filter(
                $commands,
                fn (array $command): bool => $command['status'] === $status
            ));
        }

        usort($commands, fn (array $a, array $b): int => strcmp($b['created_at'], $a['created_at']));
        json_response($commands);
    }

    if ($method !== 'POST') {
        json_response(['error' => 'Metodo nao permitido.'], 405);
    }

    $data = request_body();

    match ($action) {
        'add-item' => command_add_item($store, $data),
        'remove-item' => command_remove_item($store, $data),
        'request-bill' => command_request_bill($store, $data),
        'close' => command_close($store, $data),
        'mark-ready' => command_mark_item_status($store, $data, 'ready'),
        'mark-delivered' => command_mark_item_status($store, $data, 'delivered'),
        default => command_create($store, $data),
    };
}

function command_create(array $store, array $data): void
{
    $tableNumber = trim((string) ($data['table_number'] ?? ''));
    $customerName = trim((string) ($data['customer_name'] ?? ''));

    if ($tableNumber === '' && $customerName === '') {
        json_response(['error' => 'Informe a mesa ou o nome do cliente.'], 422);
    }

    foreach ($store['commands'] as $command) {
        $sameTable = $tableNumber !== '' && ($command['table_number'] ?? '') === $tableNumber;
        $sameCustomer = $customerName !== '' && strcasecmp((string) ($command['customer_name'] ?? ''), $customerName) === 0;

        if (($command['status'] ?? '') !== 'closed' && ($sameTable || $sameCustomer)) {
            json_response(normalize_command($command), 200);
        }
    }

    $command = [
        'id' => next_id($store, 'commands'),
        'table_number' => $tableNumber,
        'customer_name' => $customerName,
        'status' => 'open',
        'items' => [],
        'total_value' => 0,
        'created_at' => date('c'),
        'closed_at' => null,
        'bill_requested_at' => null,
    ];

    $store['commands'][] = $command;
    save_store($store);

    json_response($command, 201);
}

function command_add_item(array $store, array $data): void
{
    require_fields($data, ['command_id', 'product_id', 'quantity']);

    $commandIndex = find_index_by_id($store['commands'], (int) $data['command_id']);
    $productIndex = find_index_by_id($store['products'], (int) $data['product_id']);

    if ($commandIndex < 0) {
        json_response(['error' => 'Comanda nao encontrada.'], 404);
    }

    if ($productIndex < 0) {
        json_response(['error' => 'Produto nao encontrado.'], 404);
    }

    if (($store['commands'][$commandIndex]['status'] ?? '') === 'closed') {
        json_response(['error' => 'Comanda fechada nao aceita novos itens.'], 422);
    }

    $quantity = max(1, (int) $data['quantity']);
    $currentStock = (int) ($store['products'][$productIndex]['stock'] ?? 0);

    if ($currentStock < $quantity) {
        json_response(['error' => 'Estoque insuficiente para adicionar este item.'], 422);
    }

    $store['products'][$productIndex]['stock'] = $currentStock - $quantity;
    $product = $store['products'][$productIndex];

    $item = [
        'id' => next_id($store, 'command_items'),
        'product_id' => (int) $data['product_id'],
        'product_name' => $product['name'],
        'quantity' => $quantity,
        'unit_price' => max(0, (float) ($product['sale_price'] ?? 0)),
        'status' => 'pending',
        'notes' => trim((string) ($data['notes'] ?? '')),
        'created_at' => date('c'),
        'ready_at' => null,
        'delivered_at' => null,
    ];

    $store['commands'][$commandIndex]['items'][] = $item;
    $store['commands'][$commandIndex] = normalize_command($store['commands'][$commandIndex]);

    $movement = [
        'id' => next_id($store, 'movements'),
        'product_id' => (int) $data['product_id'],
        'product_name' => $product['name'],
        'type' => 'exit',
        'quantity' => $quantity,
        'reason' => 'Comanda #' . $store['commands'][$commandIndex]['id'],
        'date' => date('Y-m-d'),
        'created_at' => date('c'),
    ];

    $store['movements'][] = $movement;
    save_store($store);

    json_response($store['commands'][$commandIndex], 201);
}

function command_remove_item(array $store, array $data): void
{
    require_fields($data, ['command_id', 'item_id']);

    $commandIndex = find_index_by_id($store['commands'], (int) $data['command_id']);

    if ($commandIndex < 0) {
        json_response(['error' => 'Comanda nao encontrada.'], 404);
    }

    if (($store['commands'][$commandIndex]['status'] ?? '') === 'closed') {
        json_response(['error' => 'Nao e possivel remover item de comanda fechada.'], 422);
    }

    $itemIndex = find_index_by_id($store['commands'][$commandIndex]['items'] ?? [], (int) $data['item_id']);

    if ($itemIndex < 0) {
        json_response(['error' => 'Item nao encontrado.'], 404);
    }

    $item = $store['commands'][$commandIndex]['items'][$itemIndex];
    $productIndex = find_index_by_id($store['products'], (int) $item['product_id']);

    if ($productIndex >= 0) {
        $store['products'][$productIndex]['stock'] = (int) $store['products'][$productIndex]['stock'] + (int) $item['quantity'];
    }

    $store['movements'][] = [
        'id' => next_id($store, 'movements'),
        'product_id' => (int) $item['product_id'],
        'product_name' => $item['product_name'],
        'type' => 'entry',
        'quantity' => (int) $item['quantity'],
        'reason' => 'Remocao da comanda #' . $store['commands'][$commandIndex]['id'],
        'date' => date('Y-m-d'),
        'created_at' => date('c'),
    ];

    array_splice($store['commands'][$commandIndex]['items'], $itemIndex, 1);
    $store['commands'][$commandIndex] = normalize_command($store['commands'][$commandIndex]);
    save_store($store);

    json_response($store['commands'][$commandIndex]);
}

function command_request_bill(array $store, array $data): void
{
    require_fields($data, ['command_id']);

    $commandIndex = find_index_by_id($store['commands'], (int) $data['command_id']);

    if ($commandIndex < 0) {
        json_response(['error' => 'Comanda nao encontrada.'], 404);
    }

    if (($store['commands'][$commandIndex]['status'] ?? '') !== 'closed') {
        $store['commands'][$commandIndex]['status'] = 'bill_requested';
        $store['commands'][$commandIndex]['bill_requested_at'] = date('c');
    }

    $store['commands'][$commandIndex] = normalize_command($store['commands'][$commandIndex]);
    save_store($store);

    json_response($store['commands'][$commandIndex]);
}

function command_close(array $store, array $data): void
{
    require_fields($data, ['command_id']);

    $commandIndex = find_index_by_id($store['commands'], (int) $data['command_id']);

    if ($commandIndex < 0) {
        json_response(['error' => 'Comanda nao encontrada.'], 404);
    }

    $store['commands'][$commandIndex]['status'] = 'closed';
    $store['commands'][$commandIndex]['closed_at'] = date('c');
    $store['commands'][$commandIndex] = normalize_command($store['commands'][$commandIndex]);
    save_store($store);

    json_response($store['commands'][$commandIndex]);
}

function command_mark_item_status(array $store, array $data, string $status): void
{
    require_fields($data, ['command_id', 'item_id']);

    $commandIndex = find_index_by_id($store['commands'], (int) $data['command_id']);

    if ($commandIndex < 0) {
        json_response(['error' => 'Comanda nao encontrada.'], 404);
    }

    $itemIndex = find_index_by_id($store['commands'][$commandIndex]['items'] ?? [], (int) $data['item_id']);

    if ($itemIndex < 0) {
        json_response(['error' => 'Item nao encontrado.'], 404);
    }

    $store['commands'][$commandIndex]['items'][$itemIndex]['status'] = $status;

    if ($status === 'ready') {
        $store['commands'][$commandIndex]['items'][$itemIndex]['ready_at'] = date('c');
    }

    if ($status === 'delivered') {
        $store['commands'][$commandIndex]['items'][$itemIndex]['delivered_at'] = date('c');
    }

    $store['commands'][$commandIndex] = normalize_command($store['commands'][$commandIndex]);
    save_store($store);

    json_response($store['commands'][$commandIndex]);
}

function normalize_command(array $command): array
{
    $items = array_values($command['items'] ?? []);
    $total = array_reduce(
        $items,
        fn (float $sum, array $item): float => $sum + ((int) $item['quantity'] * (float) $item['unit_price']),
        0.0
    );

    $command['items'] = $items;
    $command['total_value'] = $total;
    $command['status'] = $command['status'] ?? 'open';
    $command['table_number'] = $command['table_number'] ?? '';
    $command['customer_name'] = $command['customer_name'] ?? '';
    $command['created_at'] = $command['created_at'] ?? date('c');
    $command['closed_at'] = $command['closed_at'] ?? null;
    $command['bill_requested_at'] = $command['bill_requested_at'] ?? null;

    return $command;
}

