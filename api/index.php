<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbPath = __DIR__ . '/db.json';
$db = json_decode(file_get_contents($dbPath), true);

$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

preg_match('/^\/api\/(\w+)(?:\/(\d+))?/', $requestUri, $matches);

if (!$matches) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

[, $resource, $idStr] = $matches;
$id = $idStr ? (int)$idStr : null;

if (!isset($db[$resource])) {
    http_response_code(404);
    echo json_encode(['error' => "Resource '$resource' not found"]);
    exit;
}

function sendJSON($status, $data) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function generateId($collection) {
    if (count($collection) === 0) return 1;
    $ids = array_map(function($item) { return $item['id'] ?? 0; }, $collection);
    return max($ids) + 1;
}

function updateDB($db, $dbPath) {
    file_put_contents($dbPath, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function mapOrder($o) {
    return [
        'id' => (string)$o['id'],
        'orderNumber' => $o['orderId'] ?? $o['orderNumber'] ?? '',
        'customerId' => '',
        'customerName' => $o['customer'] ?? $o['customerName'] ?? '',
        'customerEmail' => $o['email'] ?? $o['customerEmail'] ?? '',
        'totalAmount' => $o['amount'] ?? $o['totalAmount'] ?? 0,
        'status' => strtolower($o['status'] ?? 'pending'),
        'orderDate' => $o['date'] ?? $o['orderDate'] ?? '',
        'deliveryDetails' => [
            'recipient' => $o['customer'] ?? '',
            'phone' => $o['phone'] ?? '',
            'address' => $o['shippingAddress'] ?? '',
            'courier' => '',
            'trackingNo' => '',
        ],
        'items' => array_map(function($item) {
            return [
                'sku' => $item['sku'] ?? '',
                'name' => $item['name'] ?? '',
                'qty' => $item['qty'] ?? 0,
                'unitPrice' => $item['price'] ?? $item['unitPrice'] ?? 0,
                'subtotal' => ($item['qty'] ?? 0) * ($item['price'] ?? $item['unitPrice'] ?? 0),
            ];
        }, $o['items'] ?? []),
        'customerRemarks' => '',
        'internalRemarks' => '',
        'tags' => [],
    ];
}

function mapMember($m) {
    return [
        'id' => (string)$m['id'],
        'name' => $m['name'] ?? '',
        'email' => $m['email'] ?? '',
        'phone' => $m['phone'] ?? '',
        'level' => $m['level'] ?? 'Bronze',
        'totalSpend' => $m['totalSpent'] ?? $m['totalSpend'] ?? 0,
        'joinDate' => $m['joinDate'] ?? '',
        'status' => $m['status'] ?? 'Active',
        'ordersCount' => $m['ordersCount'] ?? 0,
        'credits' => 0,
        'balance' => 0,
        'address' => '',
        'password' => '',
    ];
}

function mapSupplier($s) {
    return [
        'id' => (string)$s['id'],
        'name' => $s['name'] ?? '',
        'contact' => $s['contact'] ?? $s['contactPerson'] ?? '',
        'contactPerson' => $s['contact'] ?? $s['contactPerson'] ?? '',
        'email' => $s['email'] ?? '',
        'phone' => $s['phone'] ?? '',
        'address' => $s['address'] ?? '',
        'productsSupplied' => $s['productsSupplied'] ?? [],
        'status' => $s['status'] ?? 'Active',
    ];
}

function mapProduct($p) {
    return [
        'id' => (string)$p['id'],
        'sku' => $p['sku'] ?? '',
        'isPublished' => $p['isPublished'] ?? true,
        'isFeatured' => $p['isFeatured'] ?? false,
        'trackInventory' => $p['trackInventory'] ?? true,
        'categoryId' => $p['categoryId'] ?? '',
        'brandId' => $p['brandId'] ?? '',
        'barcode' => $p['barcode'] ?? '',
        'purchasePrice' => $p['purchasePrice'] ?? 0,
        'wholePrice' => $p['wholePrice'] ?? 0,
        'retailPrice' => $p['retailPrice'] ?? 0,
        'webPrice' => $p['webPrice'] ?? 0,
        'discount' => $p['discount'] ?? 0,
        'weight' => $p['weight'] ?? '',
        'dimensions' => $p['dimensions'] ?? '',
        'stockLevels' => $p['stockLevels'] ?? [],
        'images' => $p['images'] ?? [],
        'content' => $p['content'] ?? [],
        'relatedSkus' => $p['relatedSkus'] ?? [],
        'attributes' => $p['attributes'] ?? [],
    ];
}

function mapItem($item, $resource) {
    switch ($resource) {
        case 'orders': return mapOrder($item);
        case 'retailOrders': return mapOrder($item);
        case 'members': return mapMember($item);
        case 'suppliers': return mapSupplier($item);
        case 'products': return mapProduct($item);
        case 'wholesaleOrders': return $item;
        case 'purchaseOrders': return $item;
        default: return $item;
    }
}

switch ($method) {
    case 'GET':
        if ($id !== null) {
            $item = null;
            foreach ($db[$resource] as $i) {
                if ($i['id'] == $id) { $item = $i; break; }
            }
            if (!$item) { sendJSON(404, ['error' => 'Item not found']); }
            sendJSON(200, mapItem($item, $resource));
        }

        $items = $db[$resource];
        $page = isset($_GET['_page']) ? (int)$_GET['_page'] : 1;
        $limit = isset($_GET['_limit']) ? (int)$_GET['_limit'] : count($items);
        $sort = $_GET['_sort'] ?? null;
        $order = $_GET['_order'] ?? 'asc';
        $search = $_GET['q'] ?? null;

        if ($search) {
            $searchLower = strtolower($search);
            $items = array_filter($items, function($item) use ($searchLower) {
                foreach ($item as $val) {
                    if (is_string($val) && strpos(strtolower($val), $searchLower) !== false) return true;
                    if (is_array($val)) {
                        foreach ($val as $v) {
                            if (is_string($v) && strpos(strtolower($v), $searchLower) !== false) return true;
                        }
                    }
                }
                return false;
            });
            $items = array_values($items);
        }

        if ($sort) {
            usort($items, function($a, $b) use ($sort, $order) {
                $aVal = $a[$sort] ?? '';
                $bVal = $b[$sort] ?? '';
                $cmp = $aVal < $bVal ? -1 : ($aVal > $bVal ? 1 : 0);
                return $order === 'desc' ? -$cmp : $cmp;
            });
        }

        $total = count($items);
        $start = ($page - 1) * $limit;
        $paginated = array_slice($items, $start, $limit);
        $mapped = array_map(function($item) use ($resource) { return mapItem($item, $resource); }, $paginated);

        sendJSON(200, [
            'data' => $mapped,
            'total' => $total,
            'page' => $page,
            'limit' => $limit
        ]);
        break;

    case 'POST':
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $newItem = ['id' => generateId($db[$resource])];
        $newItem = array_merge($newItem, $body);
        $db[$resource][] = $newItem;
        updateDB($db, $dbPath);
        sendJSON(201, $newItem);
        break;

    case 'PUT':
    case 'PATCH':
        if ($id === null) { sendJSON(400, ['error' => 'ID required']); }
        $found = false;
        foreach ($db[$resource] as $i => $item) {
            if ($item['id'] == $id) { $found = true; break; }
        }
        if (!$found) { sendJSON(404, ['error' => 'Item not found']); }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        foreach ($db[$resource] as $i => $item) {
            if ($item['id'] == $id) {
                $db[$resource][$i] = array_merge($item, $body);
                break;
            }
        }
        updateDB($db, $dbPath);
        sendJSON(200, $db[$resource][$i]);
        break;

    case 'DELETE':
        if ($id === null) { sendJSON(400, ['error' => 'ID required']); }
        $found = false;
        foreach ($db[$resource] as $i => $item) {
            if ($item['id'] == $id) { $found = true; unset($db[$resource][$i]); break; }
        }
        if (!$found) { sendJSON(404, ['error' => 'Item not found']); }
        $db[$resource] = array_values($db[$resource]);
        updateDB($db, $dbPath);
        sendJSON(200, ['success' => true]);
        break;

    default:
        sendJSON(405, ['error' => 'Method not allowed']);
}
