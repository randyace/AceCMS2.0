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

switch ($method) {
    case 'GET':
        if ($id !== null) {
            $item = null;
            foreach ($db[$resource] as $i) {
                if ($i['id'] == $id) { $item = $i; break; }
            }
            if (!$item) { sendJSON(404, ['error' => 'Item not found']); }
            sendJSON(200, $item);
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

        sendJSON(200, [
            'data' => $paginated,
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
