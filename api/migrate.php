<?php
/**
 * Migration script to move data from db.json to MySQL
 */

$dbPath = __DIR__ . '/../db.json';
$db = json_decode(file_get_contents($dbPath), true);

$dbConfig = [
    'host' => '127.0.0.1',
    'port' => 3306,
    'dbname' => 'cms2',
    'username' => 'cms2',
    'password' => 'SuperCN$168@',
];

$pdo = new PDO(
    "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset=utf8mb4",
    $dbConfig['username'],
    $dbConfig['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "Starting migration...\n\n";

// Categories
if (!empty($db['categories'])) {
    $count = 0;
    foreach ($db['categories'] as $cat) {
        $stmt = $pdo->prepare("INSERT INTO categories (id, slug, name, name_zh_tw, name_zh_cn, product_count) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            substr($cat['id'], 1),
            preg_replace('/[^a-z0-9]+/', '-', strtolower($cat['name'])),
            $cat['name'],
            $cat['nameZhTw'] ?? '',
            $cat['nameZhCn'] ?? '',
            $cat['productCount'] ?? 0
        ]);
        $count++;
    }
    echo "Categories: {$count} migrated\n";
}

// Brands
if (!empty($db['brands'])) {
    $count = 0;
    foreach ($db['brands'] as $brand) {
        $stmt = $pdo->prepare("INSERT INTO brands (id, slug, name) VALUES (?, ?, ?)");
        $stmt->execute([
            substr($brand['id'], 1),
            preg_replace('/[^a-z0-9]+/', '-', strtolower($brand['name'])),
            $brand['name']
        ]);
        $count++;
    }
    echo "Brands: {$count} migrated\n";
}

// Warehouses
if (!empty($db['warehouses'])) {
    $count = 0;
    foreach ($db['warehouses'] as $wh) {
        $stmt = $pdo->prepare("INSERT INTO warehouses (id, slug, name) VALUES (?, ?, ?)");
        $stmt->execute([
            substr($wh['id'], 1),
            preg_replace('/[^a-z0-9]+/', '-', strtolower($wh['name'])),
            $wh['name']
        ]);
        $count++;
    }
    echo "Warehouses: {$count} migrated\n";
}

// Members
if (!empty($db['members'])) {
    $count = 0;
    foreach ($db['members'] as $m) {
        $stmt = $pdo->prepare("INSERT INTO members (id, name, email, phone, level, total_spent, join_date, status, orders_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $m['id'],
            $m['name'] ?? '',
            $m['email'] ?? '',
            $m['phone'] ?? '',
            $m['level'] ?? 'Bronze',
            $m['totalSpent'] ?? 0,
            $m['joinDate'] ?? null,
            $m['status'] ?? 'Active',
            $m['ordersCount'] ?? 0
        ]);
        $count++;
    }
    echo "Members: {$count} migrated\n";
}

// Suppliers
if (!empty($db['suppliers'])) {
    $count = 0;
    foreach ($db['suppliers'] as $s) {
        $stmt = $pdo->prepare("INSERT INTO suppliers (id, name, contact, email, phone, address, products_supplied, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $s['id'],
            $s['name'] ?? '',
            $s['contact'] ?? '',
            $s['email'] ?? '',
            $s['phone'] ?? '',
            $s['address'] ?? '',
            json_encode($s['productsSupplied'] ?? []),
            $s['status'] ?? 'Active'
        ]);
        $count++;
    }
    echo "Suppliers: {$count} migrated\n";
}

// Users
if (!empty($db['users'])) {
    $count = 0;
    foreach ($db['users'] as $u) {
        $stmt = $pdo->prepare("INSERT INTO users (id, username, name, email, password, role, last_login, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $u['id'],
            $u['username'] ?? '',
            $u['name'] ?? '',
            $u['email'] ?? '',
            password_hash($u['password'] ?? 'password', PASSWORD_DEFAULT),
            $u['role'] ?? 'admin',
            $u['lastLogin'] ?? null,
            $u['status'] ?? 'Active'
        ]);
        $count++;
    }
    echo "Users: {$count} migrated\n";
}

// Products (complex with multilingual)
if (!empty($db['products'])) {
    $count = 0;
    foreach ($db['products'] as $p) {
        // Products table has AUTO_INCREMENT id, so we pass NULL to get auto ID
        $stmt = $pdo->prepare("INSERT INTO products (id, sku, is_published, is_featured, track_inventory, category_id, brand_id, barcode, purchase_price, whole_price, retail_price, web_price, discount, weight, dimensions, related_skus) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $p['sku'] ?? '',
            isset($p['isPublished']) ? (int)(bool)$p['isPublished'] : 0,
            isset($p['isFeatured']) ? (int)(bool)$p['isFeatured'] : 0,
            isset($p['trackInventory']) ? (int)(bool)$p['trackInventory'] : 1,
            is_numeric($p['categoryId'] ?? '') ? substr($p['categoryId'], 1) : null,
            is_numeric($p['brandId'] ?? '') ? substr($p['brandId'], 1) : null,
            $p['barcode'] ?? '',
            $p['purchasePrice'] ?? 0,
            $p['wholePrice'] ?? 0,
            $p['retailPrice'] ?? 0,
            $p['webPrice'] ?? 0,
            $p['discount'] ?? 0,
            $p['weight'] ?? '',
            $p['dimensions'] ?? '',
            json_encode($p['relatedSkus'] ?? [])
        ]);
        
        $actualId = $pdo->lastInsertId();
        
        // Product language content
        if (isset($p['content'])) {
            foreach ($p['content'] as $lang => $c) {
                $stmt = $pdo->prepare("INSERT INTO product_lang (product_id, lang, name, tags, content) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([
                    $actualId,
                    $lang,
                    $c['name'] ?? '',
                    json_encode($c['tags'] ?? []),
                    $c['content'] ?? ''
                ]);
            }
        }
        
        // Attributes
        if (isset($p['attributes'])) {
            foreach ($p['attributes'] as $attr) {
                if (isset($attr['content'])) {
                    foreach ($attr['content'] as $lang => $ac) {
                        $stmt = $pdo->prepare("INSERT INTO product_attributes (product_id, lang, name, value) VALUES (?, ?, ?, ?)");
                        $stmt->execute([
                            $actualId,
                            $lang,
                            $ac['name'] ?? '',
                            $ac['value'] ?? ''
                        ]);
                    }
                }
            }
        }
        
        // Stock levels
        if (isset($p['stockLevels'])) {
            foreach ($p['stockLevels'] as $sl) {
                $whId = $sl['warehouseId'] ?? '';
                $whNum = null;
                if (preg_match('/(\d+)$/', (string)$whId, $matches)) {
                    $whNum = (int)$matches[1];
                }
                $stmt = $pdo->prepare("INSERT INTO stock_levels (product_id, warehouse_id, qty) VALUES (?, ?, ?)");
                $stmt->execute([
                    $actualId,
                    $whNum,
                    $sl['qty'] ?? 0
                ]);
            }
        }
        
        $count++;
    }
    echo "Products: {$count} migrated\n";
}

// Orders
if (!empty($db['orders'])) {
    $count = 0;
    foreach ($db['orders'] as $o) {
        $stmt = $pdo->prepare("INSERT INTO orders (id, order_id, customer_name, customer_email, phone, total_amount, status, payment_status, order_date, delivery_recipient, delivery_phone, delivery_address, delivery_courier, delivery_tracking_no, customer_remarks, internal_remarks, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $o['id'],
            $o['orderId'] ?? $o['orderNumber'] ?? '',
            $o['customerName'] ?? $o['customer'] ?? '',
            $o['customerEmail'] ?? $o['email'] ?? '',
            $o['phone'] ?? '',
            $o['totalAmount'] ?? $o['amount'] ?? 0,
            $o['status'] ?? 'Pending',
            $o['paymentStatus'] ?? 'Pending',
            $o['orderDate'] ?? $o['date'] ?? null,
            $o['deliveryDetails']['recipient'] ?? '',
            $o['deliveryDetails']['phone'] ?? '',
            $o['deliveryDetails']['address'] ?? '',
            $o['deliveryDetails']['courier'] ?? '',
            $o['deliveryDetails']['trackingNo'] ?? '',
            $o['customerRemarks'] ?? '',
            $o['internalRemarks'] ?? '',
            json_encode($o['tags'] ?? [])
        ]);
        
        // Order items
        if (isset($o['items'])) {
            foreach ($o['items'] as $item) {
                $stmt = $pdo->prepare("INSERT INTO order_items (order_id, sku, name, qty, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $o['id'],
                    $item['sku'] ?? '',
                    $item['name'] ?? '',
                    $item['qty'] ?? 1,
                    $item['unitPrice'] ?? $item['price'] ?? 0,
                    $item['subtotal'] ?? 0
                ]);
            }
        }
        
        $count++;
    }
    echo "Orders: {$count} migrated\n";
}

// Stats
if (!empty($db['stats'])) {
    $count = 0;
    foreach ($db['stats'] as $key => $value) {
        $stmt = $pdo->prepare("INSERT INTO stats (stat_key, stat_value) VALUES (?, ?)");
        $stmt->execute([$key, json_encode($value)]);
        $count++;
    }
    echo "Stats: {$count} migrated\n";
}

// Settings
if (!empty($db['settings'])) {
    $count = 0;
    foreach ($db['settings'] as $key => $value) {
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->execute([$key, json_encode($value)]);
        $count++;
    }
    echo "Settings: {$count} migrated\n";
}

echo "\nMigration complete!\n";
