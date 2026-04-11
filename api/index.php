<?php
/**
 * CMS2 REST API - Connects to MySQL Database
 * Serves news/blog data to the frontend
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database configuration
$dbConfig = [
    'host' => '127.0.0.1',
    'port' => 3306,
    'dbname' => 'cms2',
    'username' => 'cms2',
    'password' => 'SuperCN$168@',
];

try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};port={$dbConfig['port']};dbname={$dbConfig['dbname']};charset=utf8mb4",
        $dbConfig['username'],
        $dbConfig['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'message' => $e->getMessage()]);
    exit;
}

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^/api/#', '', $path);
$segments = explode('/', trim($path, '/'));
$resource = $segments[0] ?? '';
$id = isset($segments[1]) && is_numeric($segments[1]) ? $segments[1] : null;

// Handle image serving
if ($resource === 'image' && isset($id)) {
    $stmt = $pdo->prepare("SELECT filename FROM cms_images WHERE id = ?");
    $stmt->execute([$id]);
    $img = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($img) {
        $filepath = dirname(__DIR__) . '/uploads/img/' . $img['filename'];
        if (file_exists($filepath)) {
            header('Content-Type: image/png');
            readfile($filepath);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Image not found']);
    exit;
}

// Response helpers
function sendJSON($status, $data) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function tableHasColumn($pdo, $table, $column) {
    static $cache = [];
    $key = $table . '.' . $column;
    if (array_key_exists($key, $cache)) {
        return $cache[$key];
    }

    $stmt = $pdo->prepare("
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        LIMIT 1
    ");
    $stmt->execute([$table, $column]);
    $cache[$key] = (bool)$stmt->fetchColumn();
    return $cache[$key];
}

/** Main HTML body for API: prefer builder_html when present (visual builder). */
function mapDocumentsLangRowToLangPayload($row) {
    $main = '';
    if (isset($row['builder_html']) && $row['builder_html'] !== null && $row['builder_html'] !== '') {
        $main = $row['builder_html'];
    } else {
        $main = $row['content'] ?? '';
    }
    return [
        'title' => $row['title'] ?? '',
        'subtitle' => $row['subtitle'] ?? '',
        'content' => $main,
        'subcontent' => $row['subcontent'] ?? '',
        'meta_title' => $row['meta_title'] ?? '',
        'meta_description' => $row['meta_description'] ?? '',
        'meta_keywords' => $row['meta_keywords'] ?? '',
    ];
}

/** How to split body between content vs builder_html on write. */
function pickDocumentsLangBodyForWrite(array $content, $pageTemplate, $hasBuilderHtml) {
    $ct = $content['content'] ?? '';
    if (!$hasBuilderHtml) {
        return ['content' => $ct, 'builder_html' => null];
    }
    $pt = strtolower((string)($pageTemplate ?? 'standard'));
    if ($pt === 'grapesjs') {
        $bh = $content['builder_html'] ?? '';
        if ($bh === '') {
            $bh = $ct;
        }
        return ['content' => '', 'builder_html' => $bh];
    }
    return ['content' => $ct, 'builder_html' => null];
}

// Map database blog to API news format
function mapBlogToNews($blog, $langData = [], $images = []) {
    return [
        'id' => (string)$blog['id'],
        'slug' => $blog['slug'] ?? '',
        'status' => ($blog['is_published'] ?? false) ? 'Published' : 'Draft',
        'isFeatured' => (bool)($blog['featured'] ?? false),
        'isPublished' => (bool)($blog['is_published'] ?? false),
        'isMemberOnly' => (bool)($blog['is_member_only'] ?? false),
        'postDate' => $blog['post_date'] ?? '',
        'author' => $blog['author'] ?? 'Admin',
        'categoryId' => $blog['blog_category_id'] ?? '',
        'youtubeLink' => $blog['youtube_link'] ?? '',
        'views' => (int)($blog['views'] ?? 0),
        'summary' => $blog['summary'] ?? '',
        'modifiedAt' => $blog['modified_at'] ?? $blog['updated_at'] ?? null,
        'content' => [
            'en' => [
                'title' => $langData['en']['title'] ?? $blog['title'] ?? '',
                'content' => $langData['en']['content'] ?? $blog['content'] ?? '',
                'excerpt' => $langData['en']['meta_description'] ?? '',
                'tags' => [],
            ],
            'zh_TW' => [
                'title' => $langData['zh_TW']['title'] ?? '',
                'content' => $langData['zh_TW']['content'] ?? '',
                'excerpt' => $langData['zh_TW']['meta_description'] ?? '',
                'tags' => [],
            ],
            'zh_CN' => [
                'title' => $langData['zh_CN']['title'] ?? '',
                'content' => $langData['zh_CN']['content'] ?? '',
                'excerpt' => $langData['zh_CN']['meta_description'] ?? '',
                'tags' => [],
            ],
        ],
        'images' => array_map(function($img) {
            return [
                'id' => (string)$img['id'],
                'image_id' => (string)$img['image_id'],
                'ordering' => (int)$img['ordering'],
            ];
        }, $images),
    ];
}

function mapCategory($cat) {
    return [
        'id' => (string)$cat['id'],
        'slug' => $cat['slug'] ?? '',
        'name' => $cat['name_en'] ?? '',
        'nameZhTw' => $cat['name_zh'] ?? '',
        'nameZhCn' => $cat['name_cn'] ?? '',
        'displayOrder' => (int)($cat['display_order'] ?? 10),
        'active' => (bool)($cat['active'] ?? true),
    ];
}

// Routes
switch ($resource) {
    case 'news':
    case 'blogs':
        handleNews($pdo, $method, $id);
        break;
    case 'blog-categories':
    case 'categories':
        handleCategories($pdo, $method, $id);
        break;
    case 'content':
    case 'pages':
    case 'documents':
        handlePages($pdo, $method, $id);
        break;
    case 'upload':
        handleUpload($pdo, $method);
        break;
    case 'products':
        handleProducts($pdo, $method, $id);
        break;
    case 'brands':
        handleBrands($pdo, $method, $id);
        break;
    case 'warehouses':
        handleWarehouses($pdo, $method, $id);
        break;
    case 'orders':
        handleOrders($pdo, $method, $id);
        break;
    case 'members':
        handleMembers($pdo, $method, $id);
        break;
    case 'suppliers':
        handleSuppliers($pdo, $method, $id);
        break;
    case 'users':
        handleUsers($pdo, $method, $id);
        break;
    case 'stats':
        handleStats($pdo, $method);
        break;
    default:
        sendJSON(404, ['error' => "Resource '$resource' not found"]);
}

function handleNews($pdo, $method, $id) {
    $lang = $_GET['lang'] ?? 'en';
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // Get single news item
                $stmt = $pdo->prepare("SELECT * FROM blogs WHERE id = ?");
                $stmt->execute([$id]);
                $blog = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$blog) {
                    sendJSON(404, ['error' => 'Item not found']);
                }
                
                // Get lang data
                $stmt = $pdo->prepare("SELECT * FROM blog_lang WHERE blogid = ?");
                $stmt->execute([$id]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'],
                        'content' => $row['content'],
                        'meta_description' => $row['meta_description'],
                    ];
                }
                
                // Get images
                $stmt = $pdo->prepare("SELECT * FROM blog_images WHERE blogid = ? ORDER BY ordering");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendJSON(200, mapBlogToNews($blog, $langData, $images));
            } else {
                // Get all news
                $page = (int)($_GET['_page'] ?? 1);
                $limit = (int)($_GET['_limit'] ?? 10);
                $search = $_GET['q'] ?? null;
                
                $where = '';
                $params = [];
                if ($search) {
                    $where = "AND (b.title LIKE ? OR bl.content LIKE ?)";
                    $params = ["%$search%", "%$search%"];
                }
                
                // Count total
                $countSql = "SELECT COUNT(DISTINCT b.id) as total FROM blogs b LEFT JOIN blog_lang bl ON bl.blogid = b.id WHERE 1=1 $where";
                $stmt = $pdo->prepare($countSql);
                $stmt->execute($params);
                $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
                
                // Get paginated data
                $offset = ($page - 1) * $limit;
                $sql = "SELECT DISTINCT b.* FROM blogs b LEFT JOIN blog_lang bl ON bl.blogid = b.id WHERE 1=1 $where ORDER BY b.post_date DESC LIMIT $limit OFFSET $offset";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get lang data for all
                $blogIds = array_column($blogs, 'id');
                $langDataMap = [];
                $imagesMap = [];
                if ($blogIds) {
                    $placeholders = str_repeat('?,', count($blogIds) - 1) . '?';
                    $stmt = $pdo->prepare("SELECT * FROM blog_lang WHERE blogid IN ($placeholders)");
                    $stmt->execute($blogIds);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $langDataMap[$row['blogid']][$row['lang']] = [
                            'title' => $row['title'],
                            'content' => $row['content'],
                            'meta_description' => $row['meta_description'],
                        ];
                    }
                    
                    $stmt = $pdo->prepare("SELECT * FROM blog_images WHERE blogid IN ($placeholders) ORDER BY ordering");
                    $stmt->execute($blogIds);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $imagesMap[$row['blogid']][] = $row;
                    }
                }
                
                $data = array_map(function($blog) use ($langDataMap, $imagesMap) {
                    return mapBlogToNews($blog, $langDataMap[$blog['id']] ?? [], $imagesMap[$blog['id']] ?? []);
                }, $blogs);
                
                sendJSON(200, [
                    'data' => $data,
                    'total' => (int)$total,
                    'page' => $page,
                    'limit' => $limit
                ]);
            }
            break;
            
        case 'POST':
            $input = getInput();
            $hasModifiedAt = tableHasColumn($pdo, 'blogs', 'modified_at');
            
            // Insert blog
            $columns = "slug, title, author, youtube_link, content, post_date, is_published, summary, is_member_only, featured, views";
            $placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
            if ($hasModifiedAt) {
                $columns .= ", modified_at";
                $placeholders .= ", NOW()";
            }
            $sql = "INSERT INTO blogs ($columns) VALUES ($placeholders)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['slug'] ?? '',
                $input['title'] ?? $input['content']['en']['title'] ?? '',
                $input['author'] ?? 'Admin',
                $input['youtube_link'] ?? null,
                $input['content']['en']['content'] ?? $input['content'] ?? '',
                $input['post_date'] ?? date('Y-m-d H:i:s'),
                $input['is_published'] ?? 0,
                $input['summary'] ?? '',
                $input['is_member_only'] ?? 0,
                $input['featured'] ?? 0,
                0
            ]);
            $blogId = $pdo->lastInsertId();
            
            // Insert lang data
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    $stmt = $pdo->prepare("INSERT INTO blog_lang (blogid, lang, title, content, meta_description) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $blogId,
                        $lang,
                        $content['title'] ?? '',
                        $content['content'] ?? '',
                        $content['excerpt'] ?? ''
                    ]);
                }
            }
            
            // Insert images
            if (isset($input['images_data'])) {
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO blog_images (blogid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$blogId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            
            sendJSON(201, ['id' => (string)$blogId, 'message' => 'News article created successfully']);
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            
            $input = getInput();
            
            // Update blog
            $sql = "UPDATE blogs SET 
                    slug = COALESCE(?, slug),
                    title = COALESCE(?, title),
                    author = COALESCE(?, author),
                    youtube_link = COALESCE(?, youtube_link),
                    content = COALESCE(?, content),
                    post_date = COALESCE(?, post_date),
                    is_published = COALESCE(?, is_published),
                    summary = COALESCE(?, summary),
                    is_member_only = COALESCE(?, is_member_only),
                    featured = COALESCE(?, featured)" .
                    (tableHasColumn($pdo, 'blogs', 'modified_at') ? ",
                    modified_at = NOW()" : "") . "
                    WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['slug'] ?? null,
                $input['title'] ?? $input['content']['en']['title'] ?? null,
                $input['author'] ?? null,
                $input['youtube_link'] ?? null,
                $input['content']['en']['content'] ?? $input['content'] ?? null,
                $input['post_date'] ?? null,
                $input['is_published'] ?? null,
                $input['summary'] ?? null,
                $input['is_member_only'] ?? null,
                $input['featured'] ?? null,
                $id
            ]);
            
            // Update lang data
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    // Check if exists
                    $stmt = $pdo->prepare("SELECT id FROM blog_lang WHERE blogid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();
                    
                    if ($exists) {
                        $sql = "UPDATE blog_lang SET title = ?, content = ?, meta_description = ? WHERE blogid = ? AND lang = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $content['title'] ?? '',
                            $content['content'] ?? '',
                            $content['excerpt'] ?? '',
                            $id,
                            $lang
                        ]);
                    } else {
                        $sql = "INSERT INTO blog_lang (blogid, lang, title, content, meta_description) VALUES (?, ?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $id,
                            $lang,
                            $content['title'] ?? '',
                            $content['content'] ?? '',
                            $content['excerpt'] ?? ''
                        ]);
                    }
                }
            }
            
            // Update images
            if (isset($input['images_data'])) {
                $pdo->prepare("DELETE FROM blog_images WHERE blogid = ?")->execute([$id]);
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO blog_images (blogid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            
            sendJSON(200, ['message' => 'News article updated successfully']);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            
            // Delete related records first
            $pdo->prepare("DELETE FROM blog_lang WHERE blogid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM blog_images WHERE blogid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM blogs WHERE id = ?")->execute([$id]);
            
            sendJSON(200, ['success' => true]);
            break;
            
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleCategories($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM blog_categories WHERE id = ?");
                $stmt->execute([$id]);
                $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$cat) {
                    sendJSON(404, ['error' => 'Category not found']);
                }
                
                sendJSON(200, mapCategory($cat));
            } else {
                $stmt = $pdo->query("SELECT * FROM blog_categories ORDER BY display_order ASC");
                $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map('mapCategory', $categories);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
            
        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO blog_categories (slug, name_en, name_zh, name_cn, display_order, active) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['slug'] ?? '',
                $input['name_en'] ?? $input['name'] ?? '',
                $input['name_zh'] ?? '',
                $input['name_cn'] ?? '',
                $input['display_order'] ?? 10,
                $input['active'] ?? 1
            ]);
            sendJSON(201, ['id' => (string)$pdo->lastInsertId(), 'message' => 'Category created successfully']);
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE blog_categories SET 
                    slug = COALESCE(?, slug),
                    name_en = COALESCE(?, name_en),
                    name_zh = COALESCE(?, name_zh),
                    name_cn = COALESCE(?, name_cn),
                    display_order = COALESCE(?, display_order),
                    active = COALESCE(?, active)
                    WHERE id = ?");
            $stmt->execute([
                $input['slug'] ?? null,
                $input['name_en'] ?? $input['name'] ?? null,
                $input['name_zh'] ?? null,
                $input['name_cn'] ?? null,
                $input['display_order'] ?? null,
                $input['active'] ?? null,
                $id
            ]);
            sendJSON(200, ['message' => 'Category updated successfully']);
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $stmt = $pdo->prepare("DELETE FROM blog_categories WHERE id = ?");
            $stmt->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;

        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function mapDocumentToPage($doc, $langData = [], $images = []) {
    return [
        'id' => (string)$doc['id'],
        'slug' => $doc['slug'] ?? '',
        'status' => ($doc['is_published'] ?? false) ? 'Published' : 'Draft',
        'isPublished' => (bool)($doc['is_published'] ?? false),
        'inHeader' => (bool)($doc['in_header'] ?? false),
        'inFooter' => (bool)($doc['in_footer'] ?? false),
        'ordering' => (int)($doc['ordering'] ?? 0),
        'footerOrdering' => $doc['footer_ordering'] ?? null,
        'footerGroupId' => $doc['footer_group_id'] ?? null,
        'parentMenuId' => $doc['parent_menuid'] ?? null,
        'modifiedAt' => $doc['modified_at'] ?? $doc['updated_at'] ?? null,
        'pageTemplate' => $doc['page_template'] ?? 'standard',
        'content' => [
            'en' => [
                'title' => $langData['en']['title'] ?? '',
                'subtitle' => $langData['en']['subtitle'] ?? '',
                'content' => $langData['en']['content'] ?? '',
                'subcontent' => $langData['en']['subcontent'] ?? '',
                'meta_title' => $langData['en']['meta_title'] ?? '',
                'meta_description' => $langData['en']['meta_description'] ?? '',
                'meta_keywords' => $langData['en']['meta_keywords'] ?? '',
            ],
            'zh_TW' => [
                'title' => $langData['zh_TW']['title'] ?? '',
                'subtitle' => $langData['zh_TW']['subtitle'] ?? '',
                'content' => $langData['zh_TW']['content'] ?? '',
                'subcontent' => $langData['zh_TW']['subcontent'] ?? '',
                'meta_title' => $langData['zh_TW']['meta_title'] ?? '',
                'meta_description' => $langData['zh_TW']['meta_description'] ?? '',
                'meta_keywords' => $langData['zh_TW']['meta_keywords'] ?? '',
            ],
            'zh_CN' => [
                'title' => $langData['zh_CN']['title'] ?? '',
                'subtitle' => $langData['zh_CN']['subtitle'] ?? '',
                'content' => $langData['zh_CN']['content'] ?? '',
                'subcontent' => $langData['zh_CN']['subcontent'] ?? '',
                'meta_title' => $langData['zh_CN']['meta_title'] ?? '',
                'meta_description' => $langData['zh_CN']['meta_description'] ?? '',
                'meta_keywords' => $langData['zh_CN']['meta_keywords'] ?? '',
            ],
        ],
        'images' => array_map(function($img) {
            return [
                'id' => (string)$img['id'],
                'image_id' => (string)$img['image_id'],
                'ordering' => (int)$img['ordering'],
            ];
        }, $images),
    ];
}

function handlePages($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM documents WHERE id = ?");
                $stmt->execute([$id]);
                $doc = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$doc) {
                    sendJSON(404, ['error' => 'Page not found']);
                }
                
                $stmt = $pdo->prepare("SELECT * FROM documents_lang WHERE docid = ?");
                $stmt->execute([$id]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = mapDocumentsLangRowToLangPayload($row);
                }
                
                $stmt = $pdo->prepare("SELECT * FROM documents_images WHERE docid = ? ORDER BY ordering");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendJSON(200, mapDocumentToPage($doc, $langData, $images));
            } else {
                $stmt = $pdo->query("SELECT * FROM documents ORDER BY ordering ASC");
                $docs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $docIds = array_column($docs, 'id');
                $langDataMap = [];
                $imagesMap = [];
                
                if ($docIds) {
                    $placeholders = str_repeat('?,', count($docIds) - 1) . '?';
                    
                    $stmt = $pdo->prepare("SELECT * FROM documents_lang WHERE docid IN ($placeholders)");
                    $stmt->execute($docIds);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $langDataMap[$row['docid']][$row['lang']] = mapDocumentsLangRowToLangPayload($row);
                    }
                    
                    $stmt = $pdo->prepare("SELECT * FROM documents_images WHERE docid IN ($placeholders) ORDER BY ordering");
                    $stmt->execute($docIds);
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $imagesMap[$row['docid']][] = $row;
                    }
                }
                
                $data = array_map(function($doc) use ($langDataMap, $imagesMap) {
                    return mapDocumentToPage($doc, $langDataMap[$doc['id']] ?? [], $imagesMap[$doc['id']] ?? []);
                }, $docs);
                
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
            
        case 'POST':
            $input = getInput();
            $hasModifiedAt = tableHasColumn($pdo, 'documents', 'modified_at');
            $hasPageTemplate = tableHasColumn($pdo, 'documents', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'documents_lang', 'builder_html');
            $pageTemplate = $input['page_template'] ?? 'standard';

            $pdo->beginTransaction();
            try {
                $columns = "parent_menuid, footer_group_id, is_published, in_header, in_footer, slug, ordering, footer_ordering";
                $placeholders = "?, ?, ?, ?, ?, ?, ?, ?";
                $execVals = [
                    $input['parent_menuid'] ?? 0,
                    $input['footer_group_id'] ?? 0,
                    $input['is_published'] ?? 0,
                    $input['in_header'] ?? 0,
                    $input['in_footer'] ?? 0,
                    $input['slug'] ?? '',
                    $input['ordering'] ?? 1,
                    $input['footer_ordering'] ?? 10,
                ];
                if ($hasModifiedAt) {
                    $columns .= ", modified_at";
                    $placeholders .= ", NOW()";
                }
                if ($hasPageTemplate) {
                    $columns .= ", page_template";
                    $placeholders .= ", ?";
                    $execVals[] = $pageTemplate;
                }
                $sql = "INSERT INTO documents ($columns) VALUES ($placeholders)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($execVals);
                $docId = $pdo->lastInsertId();

                if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                    foreach ($input['lang_data'] as $lang => $content) {
                        if (!is_array($content)) {
                            continue;
                        }
                        $pick = pickDocumentsLangBodyForWrite($content, $pageTemplate, $hasBuilderHtml);
                        if ($hasBuilderHtml) {
                            $stmt = $pdo->prepare("INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords, builder_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmt->execute([
                                $docId,
                                $lang,
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                                $pick['builder_html'],
                            ]);
                        } else {
                            $stmt = $pdo->prepare("INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmt->execute([
                                $docId,
                                $lang,
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                            ]);
                        }
                    }
                }

                if (isset($input['images_data']) && is_array($input['images_data'])) {
                    foreach ($input['images_data'] as $img) {
                        $imageId = isset($img['image_id']) ? (int)$img['image_id'] : 0;
                        if ($imageId <= 0) {
                            continue;
                        }
                        $stmt = $pdo->prepare("INSERT INTO documents_images (docid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                        $stmt->execute([$docId, $imageId, $img['ordering'] ?? 0]);
                    }
                }

                $pdo->commit();
                sendJSON(201, ['id' => (string)$docId, 'message' => 'Page created successfully']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to create page', 'message' => $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            
            $input = getInput();
            $hasModifiedAt = tableHasColumn($pdo, 'documents', 'modified_at');
            $hasPageTemplate = tableHasColumn($pdo, 'documents', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'documents_lang', 'builder_html');

            $pdo->beginTransaction();
            try {
            $sql = "UPDATE documents SET 
                    parent_menuid = COALESCE(?, parent_menuid),
                    footer_group_id = COALESCE(?, footer_group_id),
                    is_published = COALESCE(?, is_published),
                    in_header = COALESCE(?, in_header),
                    in_footer = COALESCE(?, in_footer),
                    slug = COALESCE(?, slug),
                    ordering = COALESCE(?, ordering),
                    footer_ordering = COALESCE(?, footer_ordering)";
            if ($hasModifiedAt) {
                $sql .= ", modified_at = NOW()";
            }
            if ($hasPageTemplate) {
                $sql .= ", page_template = COALESCE(?, page_template)";
            }
            $sql .= " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $params = [
                $input['parent_menuid'] ?? null,
                $input['footer_group_id'] ?? null,
                $input['is_published'] ?? null,
                $input['in_header'] ?? null,
                $input['in_footer'] ?? null,
                $input['slug'] ?? null,
                $input['ordering'] ?? null,
                $input['footer_ordering'] ?? null,
            ];
            if ($hasPageTemplate) {
                $params[] = $input['page_template'] ?? null;
            }
            $params[] = $id;
            $stmt->execute($params);
            
            if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                $effectiveTemplate = $input['page_template'] ?? null;
                if ($effectiveTemplate === null && $hasPageTemplate) {
                    $stPt = $pdo->prepare("SELECT page_template FROM documents WHERE id = ?");
                    $stPt->execute([$id]);
                    $ptRow = $stPt->fetch(PDO::FETCH_ASSOC);
                    $effectiveTemplate = $ptRow['page_template'] ?? 'standard';
                }
                $effectiveTemplate = $effectiveTemplate ?? 'standard';
                
                foreach ($input['lang_data'] as $lang => $content) {
                    if (!is_array($content)) {
                        continue;
                    }
                    $pick = pickDocumentsLangBodyForWrite($content, $effectiveTemplate, $hasBuilderHtml);
                    $stmt = $pdo->prepare("SELECT id FROM documents_lang WHERE docid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();
                    
                    if ($exists) {
                        if ($hasBuilderHtml) {
                            $sql = "UPDATE documents_lang SET title = ?, subtitle = ?, content = ?, subcontent = ?, meta_title = ?, meta_description = ?, meta_keywords = ?, builder_html = ? WHERE docid = ? AND lang = ?";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                                $pick['builder_html'],
                                $id,
                                $lang
                            ]);
                        } else {
                            $sql = "UPDATE documents_lang SET title = ?, subtitle = ?, content = ?, subcontent = ?, meta_title = ?, meta_description = ?, meta_keywords = ? WHERE docid = ? AND lang = ?";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                                $id,
                                $lang
                            ]);
                        }
                    } else {
                        if ($hasBuilderHtml) {
                            $sql = "INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords, builder_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                                $pick['builder_html'],
                            ]);
                        } else {
                            $sql = "INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $content['subtitle'] ?? '',
                                $pick['content'],
                                $content['subcontent'] ?? '',
                                $content['meta_title'] ?? '',
                                $content['meta_description'] ?? '',
                                $content['meta_keywords'] ?? '',
                            ]);
                        }
                    }
                }
            }
            
            if (isset($input['images_data']) && is_array($input['images_data'])) {
                $pdo->prepare("DELETE FROM documents_images WHERE docid = ?")->execute([$id]);
                foreach ($input['images_data'] as $img) {
                    $imageId = isset($img['image_id']) ? (int)$img['image_id'] : 0;
                    if ($imageId <= 0) {
                        continue;
                    }
                    $stmt = $pdo->prepare("INSERT INTO documents_images (docid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$id, $imageId, $img['ordering'] ?? 0]);
                }
            }

            $pdo->commit();
            sendJSON(200, ['message' => 'Page updated successfully']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to update page', 'message' => $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            
            $pdo->prepare("DELETE FROM documents_lang WHERE docid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM documents_images WHERE docid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM documents WHERE id = ?")->execute([$id]);
            
            sendJSON(200, ['success' => true]);
            break;
            
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleUpload($pdo, $method) {
    if ($method !== 'POST') {
        sendJSON(405, ['error' => 'Method not allowed']);
    }
    
    $input = getInput();
    
    if (empty($input['image'])) {
        sendJSON(400, ['error' => 'No image data provided']);
    }
    
    $imageData = $input['image'];
    $decoded = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageData));
    
    if ($decoded === false) {
        sendJSON(400, ['error' => 'Invalid image data']);
    }
    
    $hash = bin2hex(random_bytes(16));
    $ext = '.jpg';
    if (preg_match('#^data:image/(\w+);#i', $imageData, $matches)) {
        $ext = $matches[1] === 'jpeg' ? '.jpg' : '.' . $matches[1];
    }
    
    $filename = $hash . $ext;
    $uploadDir = dirname(__DIR__) . '/uploads/img/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $filepath = $uploadDir . $filename;
    file_put_contents($filepath, $decoded);
    
    $stmt = $pdo->prepare("INSERT INTO cms_images (filename) VALUES (?)");
    $stmt->execute([$filename]);
    $imageId = $pdo->lastInsertId();
    
    sendJSON(201, ['data' => [
        'id' => (string)$imageId,
        'filename' => $filename,
        'url' => '/image/' . $imageId
    ]]);
}

// =====================================================
// Additional API Endpoints for migrated data
// =====================================================

// Products
if ($resource === 'products') {
    handleProducts($pdo, $method, $id);
}

// Categories
if ($resource === 'categories') {
    handleCategoriesGeneral($pdo, $method, $id);
}

// Brands
if ($resource === 'brands') {
    handleBrands($pdo, $method, $id);
}

// Warehouses
if ($resource === 'warehouses') {
    handleWarehouses($pdo, $method, $id);
}

// Orders
if ($resource === 'orders') {
    handleOrders($pdo, $method, $id);
}

// Members
if ($resource === 'members') {
    handleMembers($pdo, $method, $id);
}

// Suppliers
if ($resource === 'suppliers') {
    handleSuppliers($pdo, $method, $id);
}

// Users (Admin)
if ($resource === 'users') {
    handleUsers($pdo, $method, $id);
}

// Stats
if ($resource === 'stats') {
    handleStats($pdo, $method);
}

// =====================================================
// Handler Functions
// =====================================================

function handleProducts($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT p.*, c.name as category_name, b.name as brand_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN brands b ON p.brand_id = b.id WHERE p.id = ?");
                $stmt->execute([$id]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$product) sendJSON(404, ['error' => 'Product not found']);
                
                // Get lang data
                $stmt = $pdo->prepare("SELECT * FROM product_lang WHERE product_id = ?");
                $stmt->execute([$id]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'name' => $row['name'],
                        'tags' => json_decode($row['tags'] ?? '[]', true),
                        'content' => $row['content'],
                    ];
                }
                
                // Get attributes
                $stmt = $pdo->prepare("SELECT * FROM product_attributes WHERE product_id = ?");
                $stmt->execute([$id]);
                $attributes = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $attributes[] = $row;
                }
                
                // Get stock levels
                $stmt = $pdo->prepare("SELECT sl.*, w.name as warehouse_name FROM stock_levels sl LEFT JOIN warehouses w ON sl.warehouse_id = w.id WHERE sl.product_id = ?");
                $stmt->execute([$id]);
                $stockLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendJSON(200, formatProduct($product, $langData, $attributes, $stockLevels));
            } else {
                $page = (int)($_GET['_page'] ?? 1);
                $limit = (int)($_GET['_limit'] ?? 20);
                $search = $_GET['q'] ?? null;
                $category = $_GET['category'] ?? null;
                
                $where = "1=1";
                $params = [];
                if ($search) {
                    $where .= " AND (p.sku LIKE ? OR pl.name LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                if ($category) {
                    $where .= " AND p.category_id = ?";
                    $params[] = $category;
                }
                
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p LEFT JOIN product_lang pl ON p.id = pl.product_id AND pl.lang = 'en' WHERE $where");
                $countStmt->execute($params);
                $total = $countStmt->fetchColumn();
                
                $offset = ($page - 1) * $limit;
                $stmt = $pdo->prepare("SELECT DISTINCT p.* FROM products p LEFT JOIN product_lang pl ON p.id = pl.product_id AND pl.lang = 'en' WHERE $where ORDER BY p.id DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $data = array_map('formatProduct', $products);
                sendJSON(200, ['data' => $data, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
            }
            break;
            
        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO products (sku, is_published, is_featured, track_inventory, category_id, brand_id, barcode, purchase_price, whole_price, retail_price, web_price, discount, weight, dimensions, related_skus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['sku'] ?? '',
                (int)(bool)($input['isPublished'] ?? false),
                (int)(bool)($input['isFeatured'] ?? false),
                (int)(bool)($input['trackInventory'] ?? true),
                $input['categoryId'] ?? null,
                $input['brandId'] ?? null,
                $input['barcode'] ?? '',
                $input['purchasePrice'] ?? 0,
                $input['wholePrice'] ?? 0,
                $input['retailPrice'] ?? 0,
                $input['webPrice'] ?? 0,
                $input['discount'] ?? 0,
                $input['weight'] ?? '',
                $input['dimensions'] ?? '',
                json_encode($input['relatedSkus'] ?? [])
            ]);
            $productId = $pdo->lastInsertId();
            
            // Insert lang data
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $c) {
                    $stmt = $pdo->prepare("INSERT INTO product_lang (product_id, lang, name, tags, content) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$productId, $lang, $c['name'] ?? '', json_encode($c['tags'] ?? []), $c['content'] ?? '']);
                }
            }
            
            sendJSON(201, ['id' => (string)$productId, 'message' => 'Product created successfully']);
            break;
            
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE products SET sku=COALESCE(?,sku), is_published=COALESCE(?,is_published), is_featured=COALESCE(?,is_featured), track_inventory=COALESCE(?,track_inventory), category_id=COALESCE(?,category_id), brand_id=COALESCE(?,brand_id), barcode=COALESCE(?,barcode), purchase_price=COALESCE(?,purchase_price), whole_price=COALESCE(?,whole_price), retail_price=COALESCE(?,retail_price), web_price=COALESCE(?,web_price), discount=COALESCE(?,discount), weight=COALESCE(?,weight), dimensions=COALESCE(?,dimensions), related_skus=COALESCE(?,related_skus) WHERE id=?");
            $stmt->execute([
                $input['sku'] ?? null,
                isset($input['isPublished']) ? (int)(bool)$input['isPublished'] : null,
                isset($input['isFeatured']) ? (int)(bool)$input['isFeatured'] : null,
                isset($input['trackInventory']) ? (int)(bool)$input['trackInventory'] : null,
                $input['categoryId'] ?? null,
                $input['brandId'] ?? null,
                $input['barcode'] ?? null,
                $input['purchasePrice'] ?? null,
                $input['wholePrice'] ?? null,
                $input['retailPrice'] ?? null,
                $input['webPrice'] ?? null,
                $input['discount'] ?? null,
                $input['weight'] ?? null,
                $input['dimensions'] ?? null,
                isset($input['relatedSkus']) ? json_encode($input['relatedSkus']) : null,
                $id
            ]);
            sendJSON(200, ['message' => 'Product updated successfully']);
            break;
            
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM product_lang WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM product_attributes WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM stock_levels WHERE product_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
            
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatProduct($p, $langData = [], $attributes = [], $stockLevels = []) {
    return [
        'id' => (string)$p['id'],
        'sku' => $p['sku'] ?? '',
        'isPublished' => (bool)($p['is_published'] ?? false),
        'isFeatured' => (bool)($p['is_featured'] ?? false),
        'trackInventory' => (bool)($p['track_inventory'] ?? true),
        'categoryId' => $p['category_id'] ?? '',
        'brandId' => $p['brand_id'] ?? '',
        'barcode' => $p['barcode'] ?? '',
        'purchasePrice' => (float)($p['purchase_price'] ?? 0),
        'wholePrice' => (float)($p['whole_price'] ?? 0),
        'retailPrice' => (float)($p['retail_price'] ?? 0),
        'webPrice' => (float)($p['web_price'] ?? 0),
        'discount' => (float)($p['discount'] ?? 0),
        'weight' => $p['weight'] ?? '',
        'dimensions' => $p['dimensions'] ?? '',
        'relatedSkus' => json_decode($p['related_skus'] ?? '[]', true),
        'content' => $langData ?: ['en' => ['name' => '', 'tags' => [], 'content' => '']],
        'attributes' => $attributes,
        'stockLevels' => $stockLevels,
    ];
}

function handleCategoriesGeneral($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = ?");
                $stmt->execute([$id]);
                $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$cat) sendJSON(404, ['error' => 'Category not found']);
                sendJSON(200, formatCategory($cat));
            } else {
                $stmt = $pdo->query("SELECT * FROM categories ORDER BY display_order ASC");
                $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map('formatCategory', $cats);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO categories (slug, name, name_zh_tw, name_zh_cn, product_count, active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['slug'] ?? '',
                $input['name'] ?? '',
                $input['nameZhTw'] ?? '',
                $input['nameZhCn'] ?? '',
                $input['productCount'] ?? 0,
                (int)(bool)($input['active'] ?? true),
                $input['displayOrder'] ?? 10
            ]);
            sendJSON(201, ['id' => (string)$pdo->lastInsertId()]);
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE categories SET slug=COALESCE(?,slug), name=COALESCE(?,name), name_zh_tw=COALESCE(?,name_zh_tw), name_zh_cn=COALESCE(?,name_zh_cn), product_count=COALESCE(?,product_count), active=COALESCE(?,active), display_order=COALESCE(?,display_order) WHERE id=?");
            $stmt->execute([
                $input['slug'] ?? null,
                $input['name'] ?? null,
                $input['nameZhTw'] ?? null,
                $input['nameZhCn'] ?? null,
                $input['productCount'] ?? null,
                isset($input['active']) ? (int)(bool)$input['active'] : null,
                $input['displayOrder'] ?? null,
                $id
            ]);
            sendJSON(200, ['message' => 'Category updated successfully']);
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatCategory($c) {
    return [
        'id' => (string)$c['id'],
        'slug' => $c['slug'] ?? '',
        'name' => $c['name'] ?? '',
        'nameZhTw' => $c['name_zh_tw'] ?? '',
        'nameZhCn' => $c['name_zh_cn'] ?? '',
        'productCount' => (int)($c['product_count'] ?? 0),
        'active' => (bool)($c['active'] ?? true),
        'displayOrder' => (int)($c['display_order'] ?? 10),
    ];
}

function handleBrands($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM brands WHERE id = ?");
                $stmt->execute([$id]);
                $brand = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$brand) sendJSON(404, ['error' => 'Brand not found']);
                sendJSON(200, ['id' => (string)$brand['id'], 'name' => $brand['name'] ?? '', 'slug' => $brand['slug'] ?? '', 'active' => (bool)$brand['active']]);
            } else {
                $stmt = $pdo->query("SELECT * FROM brands ORDER BY name ASC");
                $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map(fn($b) => ['id' => (string)$b['id'], 'name' => $b['name'] ?? '', 'slug' => $b['slug'] ?? '', 'active' => (bool)$b['active']], $brands);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO brands (slug, name, active) VALUES (?, ?, ?)");
            $stmt->execute([$input['slug'] ?? '', $input['name'] ?? '', (int)(bool)($input['active'] ?? true)]);
            sendJSON(201, ['id' => (string)$pdo->lastInsertId()]);
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE brands SET slug=COALESCE(?,slug), name=COALESCE(?,name), active=COALESCE(?,active) WHERE id=?");
            $stmt->execute([$input['slug'] ?? null, $input['name'] ?? null, isset($input['active']) ? (int)(bool)$input['active'] : null, $id]);
            sendJSON(200, ['message' => 'Brand updated successfully']);
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM brands WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleWarehouses($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM warehouses WHERE id = ?");
                $stmt->execute([$id]);
                $wh = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$wh) sendJSON(404, ['error' => 'Warehouse not found']);
                sendJSON(200, ['id' => (string)$wh['id'], 'name' => $wh['name'] ?? '', 'slug' => $wh['slug'] ?? '', 'active' => (bool)$wh['active']]);
            } else {
                $stmt = $pdo->query("SELECT * FROM warehouses ORDER BY name ASC");
                $whs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map(fn($w) => ['id' => (string)$w['id'], 'name' => $w['name'] ?? '', 'slug' => $w['slug'] ?? '', 'active' => (bool)$w['active']], $whs);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO warehouses (slug, name, active) VALUES (?, ?, ?)");
            $stmt->execute([$input['slug'] ?? '', $input['name'] ?? '', (int)(bool)($input['active'] ?? true)]);
            sendJSON(201, ['id' => (string)$pdo->lastInsertId()]);
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE warehouses SET slug=COALESCE(?,slug), name=COALESCE(?,name), active=COALESCE(?,active) WHERE id=?");
            $stmt->execute([$input['slug'] ?? null, $input['name'] ?? null, isset($input['active']) ? (int)(bool)$input['active'] : null, $id]);
            sendJSON(200, ['message' => 'Warehouse updated successfully']);
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM warehouses WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleOrders($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
                $stmt->execute([$id]);
                $order = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$order) sendJSON(404, ['error' => 'Order not found']);
                
                $stmt = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
                $stmt->execute([$id]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendJSON(200, formatOrder($order, $items));
            } else {
                $page = (int)($_GET['_page'] ?? 1);
                $limit = (int)($_GET['_limit'] ?? 20);
                $status = $_GET['status'] ?? null;
                
                $where = "1=1";
                $params = [];
                if ($status) {
                    $where .= " AND status = ?";
                    $params[] = $status;
                }
                
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE $where");
                $countStmt->execute($params);
                $total = $countStmt->fetchColumn();
                
                $offset = ($page - 1) * $limit;
                $stmt = $pdo->prepare("SELECT * FROM orders WHERE $where ORDER BY order_date DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $data = array_map(fn($o) => formatOrder($o, []), $orders);
                sendJSON(200, ['data' => $data, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
            }
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE orders SET status=COALESCE(?,status), payment_status=COALESCE(?,payment_status), delivery_courier=COALESCE(?,delivery_courier), delivery_tracking_no=COALESCE(?,delivery_tracking_no) WHERE id=?");
            $stmt->execute([
                $input['status'] ?? null,
                $input['paymentStatus'] ?? null,
                $input['deliveryCourier'] ?? null,
                $input['deliveryTrackingNo'] ?? null,
                $id
            ]);
            sendJSON(200, ['message' => 'Order updated successfully']);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatOrder($o, $items = []) {
    return [
        'id' => (string)$o['id'],
        'orderId' => $o['order_id'] ?? '',
        'customerId' => $o['customer_id'] ?? '',
        'customerName' => $o['customer_name'] ?? '',
        'customerEmail' => $o['customer_email'] ?? '',
        'phone' => $o['phone'] ?? '',
        'totalAmount' => (float)($o['total_amount'] ?? 0),
        'status' => $o['status'] ?? 'Pending',
        'paymentStatus' => $o['payment_status'] ?? 'Pending',
        'orderDate' => $o['order_date'] ?? '',
        'deliveryDetails' => [
            'recipient' => $o['delivery_recipient'] ?? '',
            'phone' => $o['delivery_phone'] ?? '',
            'address' => $o['delivery_address'] ?? '',
            'courier' => $o['delivery_courier'] ?? '',
            'trackingNo' => $o['delivery_tracking_no'] ?? '',
        ],
        'items' => array_map(fn($i) => [
            'sku' => $i['sku'] ?? '',
            'name' => $i['name'] ?? '',
            'qty' => (int)($i['qty'] ?? 0),
            'unitPrice' => (float)($i['unit_price'] ?? 0),
            'subtotal' => (float)($i['subtotal'] ?? 0),
        ], $items),
        'customerRemarks' => $o['customer_remarks'] ?? '',
        'internalRemarks' => $o['internal_remarks'] ?? '',
        'tags' => json_decode($o['tags'] ?? '[]', true),
    ];
}

function handleMembers($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM members WHERE id = ?");
                $stmt->execute([$id]);
                $member = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$member) sendJSON(404, ['error' => 'Member not found']);
                sendJSON(200, formatMember($member));
            } else {
                $page = (int)($_GET['_page'] ?? 1);
                $limit = (int)($_GET['_limit'] ?? 20);
                $search = $_GET['q'] ?? null;
                
                $where = "1=1";
                $params = [];
                if ($search) {
                    $where .= " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }
                
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM members WHERE $where");
                $countStmt->execute($params);
                $total = $countStmt->fetchColumn();
                
                $offset = ($page - 1) * $limit;
                $stmt = $pdo->prepare("SELECT * FROM members WHERE $where ORDER BY id DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $data = array_map('formatMember', $members);
                sendJSON(200, ['data' => $data, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
            }
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatMember($m) {
    return [
        'id' => (string)$m['id'],
        'name' => $m['name'] ?? '',
        'email' => $m['email'] ?? '',
        'phone' => $m['phone'] ?? '',
        'level' => $m['level'] ?? 'Bronze',
        'totalSpent' => (float)($m['total_spent'] ?? 0),
        'joinDate' => $m['join_date'] ?? '',
        'status' => $m['status'] ?? 'Active',
        'ordersCount' => (int)($m['orders_count'] ?? 0),
        'credits' => (float)($m['credits'] ?? 0),
        'balance' => (float)($m['balance'] ?? 0),
    ];
}

function handleSuppliers($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = ?");
                $stmt->execute([$id]);
                $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$supplier) sendJSON(404, ['error' => 'Supplier not found']);
                sendJSON(200, formatSupplier($supplier));
            } else {
                $stmt = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC");
                $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map('formatSupplier', $suppliers);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatSupplier($s) {
    return [
        'id' => (string)$s['id'],
        'name' => $s['name'] ?? '',
        'contact' => $s['contact'] ?? '',
        'email' => $s['email'] ?? '',
        'phone' => $s['phone'] ?? '',
        'address' => $s['address'] ?? '',
        'productsSupplied' => json_decode($s['products_supplied'] ?? '[]', true),
        'status' => $s['status'] ?? 'Active',
    ];
}

function handleUsers($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmt->execute([$id]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$user) sendJSON(404, ['error' => 'User not found']);
                sendJSON(200, formatUser($user));
            } else {
                $stmt = $pdo->query("SELECT * FROM users ORDER BY username ASC");
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = array_map('formatUser', $users);
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function formatUser($u) {
    return [
        'id' => (string)$u['id'],
        'username' => $u['username'] ?? '',
        'name' => $u['name'] ?? '',
        'email' => $u['email'] ?? '',
        'role' => $u['role'] ?? 'admin',
        'lastLogin' => $u['last_login'] ?? '',
        'status' => $u['status'] ?? 'Active',
    ];
}

function handleStats($pdo, $method) {
    if ($method !== 'GET') sendJSON(405, ['error' => 'Method not allowed']);
    
    $stmt = $pdo->query("SELECT stat_key, stat_value FROM stats");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stats = [];
    foreach ($rows as $row) {
        $stats[$row['stat_key']] = json_decode($row['stat_value'], true);
    }
    
    sendJSON(200, ['data' => $stats, 'total' => count($stats)]);
}
