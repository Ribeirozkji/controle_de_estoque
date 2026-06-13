<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function json_response(mixed $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function request_body(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }

    $data = json_decode($raw, true);

    if (!is_array($data)) {
        json_response(['error' => 'JSON invalido.'], 400);
    }

    return $data;
}

function load_store(): array
{
    if (!file_exists(STORAGE_FILE)) {
        save_store(default_store());
    }

    $json = file_get_contents(STORAGE_FILE);
    $data = json_decode((string) $json, true);

    if (!is_array($data)) {
        return default_store();
    }

    return array_merge(default_store(), $data);
}

function save_store(array $store): void
{
    $dir = dirname(STORAGE_FILE);

    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    file_put_contents(
        STORAGE_FILE,
        json_encode($store, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

function default_store(): array
{
    return [
        'suppliers' => [],
        'products' => [],
        'movements' => [],
        'invoices' => [],
        'counters' => [
            'suppliers' => 0,
            'products' => 0,
            'movements' => 0,
            'invoices' => 0,
        ],
    ];
}

function next_id(array &$store, string $key): int
{
    $store['counters'][$key] = (int) ($store['counters'][$key] ?? 0) + 1;

    return $store['counters'][$key];
}

function require_fields(array $data, array $fields): void
{
    $missing = [];

    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
            $missing[] = $field;
        }
    }

    if ($missing !== []) {
        json_response(['error' => 'Campos obrigatorios: ' . implode(', ', $missing)], 422);
    }
}

function find_index_by_id(array $items, int $id): int
{
    foreach ($items as $index => $item) {
        if ((int) ($item['id'] ?? 0) === $id) {
            return $index;
        }
    }

    return -1;
}

