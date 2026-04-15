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

/** Prefer builder_html for visual-builder body (same rules as documents). */
function mapBlogLangRowToPayload($row) {
    $main = '';
    if (isset($row['builder_html']) && $row['builder_html'] !== null && $row['builder_html'] !== '') {
        $main = $row['builder_html'];
    } else {
        $main = $row['content'] ?? '';
    }
    return [
        'title' => $row['title'] ?? '',
        'content' => $main,
        'meta_description' => $row['meta_description'] ?? '',
    ];
}

// Map database blog to API news format
function mapBlogToNews($blog, $langData = [], $images = []) {
    $pt = strtolower((string)($blog['page_template'] ?? 'standard'));
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
        'pageTemplate' => $pt === 'grapesjs' ? 'grapesjs' : 'standard',
        'page_template' => $blog['page_template'] ?? 'standard',
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
        handleCategories($pdo, $method, $id);
        break;
    case 'product-categories':
        handleProductCategories($pdo, $method, $id);
        break;
    case 'services':
        handleServices($pdo, $method, $id);
        break;
    case 'service-categories':
        handleServiceCategories($pdo, $method, $id);
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
    case 'attribute-groups':
        handleAttributeGroups($pdo, $method, $id);
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
                    $langData[$row['lang']] = mapBlogLangRowToPayload($row);
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
                        $langDataMap[$row['blogid']][$row['lang']] = mapBlogLangRowToPayload($row);
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
            $hasPageTemplate = tableHasColumn($pdo, 'blogs', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'blog_lang', 'builder_html');
            $pageTemplate = $input['page_template'] ?? 'standard';
            $enBlock = $input['content']['en'] ?? [];
            $enPick = pickDocumentsLangBodyForWrite($enBlock, $pageTemplate, $hasBuilderHtml);
            
            // Insert blog
            $columns = "slug, title, author, youtube_link, content, post_date, is_published, summary, is_member_only, featured, views";
            $placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
            $execParams = [
                $input['slug'] ?? '',
                $input['title'] ?? $input['content']['en']['title'] ?? '',
                $input['author'] ?? 'Admin',
                $input['youtube_link'] ?? null,
                $enPick['content'],
                $input['post_date'] ?? date('Y-m-d H:i:s'),
                $input['is_published'] ?? 0,
                $input['summary'] ?? '',
                $input['is_member_only'] ?? 0,
                $input['featured'] ?? 0,
                0
            ];
            if ($hasPageTemplate) {
                $columns .= ", page_template";
                $placeholders .= ", ?";
                $execParams[] = $pageTemplate;
            }
            if ($hasModifiedAt) {
                $columns .= ", modified_at";
                $placeholders .= ", NOW()";
            }
            $sql = "INSERT INTO blogs ($columns) VALUES ($placeholders)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($execParams);
            $blogId = $pdo->lastInsertId();
            
            // Insert lang data
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    $pick = pickDocumentsLangBodyForWrite($content, $pageTemplate, $hasBuilderHtml);
                    if ($hasBuilderHtml) {
                        $stmt = $pdo->prepare("INSERT INTO blog_lang (blogid, lang, title, content, meta_description, builder_html) VALUES (?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $blogId,
                            $lang,
                            $content['title'] ?? '',
                            $pick['content'],
                            $content['excerpt'] ?? '',
                            $pick['builder_html'],
                        ]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO blog_lang (blogid, lang, title, content, meta_description) VALUES (?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $blogId,
                            $lang,
                            $content['title'] ?? '',
                            $pick['content'],
                            $content['excerpt'] ?? ''
                        ]);
                    }
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
            $hasPageTemplate = tableHasColumn($pdo, 'blogs', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'blog_lang', 'builder_html');
            $pageTemplate = $input['page_template'] ?? null;
            if ($pageTemplate === null && $hasPageTemplate) {
                $stPt = $pdo->prepare("SELECT page_template FROM blogs WHERE id = ?");
                $stPt->execute([$id]);
                $ptRow = $stPt->fetch(PDO::FETCH_ASSOC);
                $pageTemplate = $ptRow['page_template'] ?? 'standard';
            }
            if ($pageTemplate === null) {
                $pageTemplate = 'standard';
            }
            $blogsMainContent = null;
            if (isset($input['content']['en'])) {
                $enPick = pickDocumentsLangBodyForWrite($input['content']['en'], $pageTemplate, $hasBuilderHtml);
                $blogsMainContent = $enPick['content'];
            }
            
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
                    featured = COALESCE(?, featured)";
            $putParams = [
                $input['slug'] ?? null,
                $input['title'] ?? ($input['content']['en']['title'] ?? null),
                $input['author'] ?? null,
                $input['youtube_link'] ?? null,
                $blogsMainContent,
                $input['post_date'] ?? null,
                $input['is_published'] ?? null,
                $input['summary'] ?? null,
                $input['is_member_only'] ?? null,
                $input['featured'] ?? null,
            ];
            if ($hasPageTemplate) {
                $sql .= ", page_template = COALESCE(?, page_template)";
                $putParams[] = $input['page_template'] ?? null;
            }
            if (tableHasColumn($pdo, 'blogs', 'modified_at')) {
                $sql .= ", modified_at = NOW()";
            }
            $sql .= " WHERE id = ?";
            $putParams[] = $id;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($putParams);
            
            // Update lang data
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    $pick = pickDocumentsLangBodyForWrite($content, $pageTemplate, $hasBuilderHtml);
                    // Check if exists
                    $stmt = $pdo->prepare("SELECT id FROM blog_lang WHERE blogid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();
                    
                    if ($exists) {
                        if ($hasBuilderHtml) {
                            $sql = "UPDATE blog_lang SET title = ?, content = ?, meta_description = ?, builder_html = ? WHERE blogid = ? AND lang = ?";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $content['title'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? '',
                                $pick['builder_html'],
                                $id,
                                $lang
                            ]);
                        } else {
                            $sql = "UPDATE blog_lang SET title = ?, content = ?, meta_description = ? WHERE blogid = ? AND lang = ?";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $content['title'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? '',
                                $id,
                                $lang
                            ]);
                        }
                    } else {
                        if ($hasBuilderHtml) {
                            $sql = "INSERT INTO blog_lang (blogid, lang, title, content, meta_description, builder_html) VALUES (?, ?, ?, ?, ?, ?)";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? '',
                                $pick['builder_html'],
                            ]);
                        } else {
                            $sql = "INSERT INTO blog_lang (blogid, lang, title, content, meta_description) VALUES (?, ?, ?, ?, ?)";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? ''
                            ]);
                        }
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

function mapServiceLangRowToPayload($row) {
    $main = '';
    if (isset($row['builder_html']) && $row['builder_html'] !== null && $row['builder_html'] !== '') {
        $main = $row['builder_html'];
    } else {
        $main = isset($row['content']) ? (string)$row['content'] : '';
    }
    return [
        'title' => $row['title'] ?? '',
        'content' => $main,
        'excerpt' => isset($row['subcontent']) ? (string)$row['subcontent'] : '',
    ];
}

function mapServiceToPayload($service, $langData = [], $images = []) {
    $pt = strtolower((string)($service['page_template'] ?? 'standard'));
    return [
        'id' => (string)$service['id'],
        'slug' => $service['slug'] ?? '',
        'status' => ($service['is_published'] ?? false) ? 'Published' : 'Draft',
        'isPublished' => (bool)($service['is_published'] ?? false),
        'isFeatured' => (bool)($service['featured'] ?? 0),
        'postDate' => $service['post_date'] ?? '',
        'author' => $service['author'] ?? 'Admin',
        'categoryId' => $service['service_categoryid'] ?? '',
        'summary' => $service['summary'] ?? '',
        'modifiedAt' => $service['modified_at'] ?? null,
        'pageTemplate' => $pt === 'grapesjs' ? 'grapesjs' : 'standard',
        'page_template' => $service['page_template'] ?? 'standard',
        'content' => [
            'en' => [
                'title' => $langData['en']['title'] ?? $service['title'] ?? '',
                'content' => $langData['en']['content'] ?? (string)($service['content'] ?? ''),
                'excerpt' => $langData['en']['excerpt'] ?? '',
                'tags' => [],
            ],
            'zh_TW' => [
                'title' => $langData['zh_TW']['title'] ?? '',
                'content' => $langData['zh_TW']['content'] ?? '',
                'excerpt' => $langData['zh_TW']['excerpt'] ?? '',
                'tags' => [],
            ],
            'zh_CN' => [
                'title' => $langData['zh_CN']['title'] ?? '',
                'content' => $langData['zh_CN']['content'] ?? '',
                'excerpt' => $langData['zh_CN']['excerpt'] ?? '',
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

function mapServiceCategoryToPayload($cat, $langData = [], $images = []) {
    return [
        'id' => (string)$cat['id'],
        'slug' => $cat['slug'] ?? '',
        'isPublished' => (bool)($cat['is_published'] ?? 0),
        'title' => $cat['title'] ?? '',
        'content' => $cat['content'] ?? '',
        'lang_data' => [
            'en' => [
                'title' => $langData['en']['title'] ?? '',
                'content' => $langData['en']['content'] ?? '',
                'subcontent' => $langData['en']['subcontent'] ?? '',
            ],
            'zh_TW' => [
                'title' => $langData['zh_TW']['title'] ?? '',
                'content' => $langData['zh_TW']['content'] ?? '',
                'subcontent' => $langData['zh_TW']['subcontent'] ?? '',
            ],
            'zh_CN' => [
                'title' => $langData['zh_CN']['title'] ?? '',
                'content' => $langData['zh_CN']['content'] ?? '',
                'subcontent' => $langData['zh_CN']['subcontent'] ?? '',
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

function handleServices($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM services WHERE id = ?");
                $stmt->execute([$id]);
                $service = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$service) {
                    sendJSON(404, ['error' => 'Service not found']);
                }
                $stmt = $pdo->prepare("SELECT * FROM service_lang WHERE serviceid = ?");
                $stmt->execute([$id]);
                $langRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $langData = [];
                foreach ($langRows as $row) {
                    $langData[$row['lang']] = mapServiceLangRowToPayload($row);
                }
                $stmt = $pdo->prepare("SELECT * FROM service_images WHERE serviceid = ? ORDER BY ordering ASC");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendJSON(200, mapServiceToPayload($service, $langData, $images));
            } else {
                $page = (int)($_GET['_page'] ?? 1);
                $limit = (int)($_GET['_limit'] ?? 20);
                $search = $_GET['q'] ?? null;
                $offset = ($page - 1) * $limit;

                $where = "1=1";
                $params = [];
                if ($search) {
                    $where .= " AND (s.slug LIKE ? OR s.title LIKE ? OR s.author LIKE ?)";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                    $params[] = "%$search%";
                }

                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM services s WHERE $where");
                $countStmt->execute($params);
                $total = $countStmt->fetchColumn();

                $stmt = $pdo->prepare("SELECT s.* FROM services s WHERE $where ORDER BY s.post_date DESC LIMIT $limit OFFSET $offset");
                $stmt->execute($params);
                $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $data = [];
                foreach ($services as $service) {
                    $serviceId = $service['id'];
                    $stmt = $pdo->prepare("SELECT * FROM service_lang WHERE serviceid = ?");
                    $stmt->execute([$serviceId]);
                    $langRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $langData = [];
                    foreach ($langRows as $row) {
                        $langData[$row['lang']] = mapServiceLangRowToPayload($row);
                    }

                    $stmt = $pdo->prepare("SELECT * FROM service_images WHERE serviceid = ? ORDER BY ordering ASC");
                    $stmt->execute([$serviceId]);
                    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $data[] = mapServiceToPayload($service, $langData, $images);
                }
                sendJSON(200, ['data' => $data, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
            }
            break;

        case 'POST':
            $input = getInput();
            $hasPageTemplate = tableHasColumn($pdo, 'services', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'service_lang', 'builder_html');
            $pageTemplate = $input['page_template'] ?? 'standard';
            $enBlock = $input['content']['en'] ?? [];
            $enPick = pickDocumentsLangBodyForWrite($enBlock, $pageTemplate, $hasBuilderHtml);

            $columns = "service_categoryid, slug, title, author, youtube_link, content, post_date, is_published, summary, trainerid";
            $placeholders = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?";
            $execParams = [
                $input['service_categoryid'] ?? null,
                $input['slug'] ?? '',
                $input['title'] ?? ($input['content']['en']['title'] ?? ''),
                $input['author'] ?? 'Admin',
                $input['youtube_link'] ?? null,
                $enPick['content'],
                $input['post_date'] ?? date('Y-m-d H:i:s'),
                $input['is_published'] ?? 0,
                $input['summary'] ?? '',
                $input['trainerid'] ?? 0,
            ];
            if ($hasPageTemplate) {
                $columns .= ", page_template";
                $placeholders .= ", ?";
                $execParams[] = $pageTemplate;
            }
            if (tableHasColumn($pdo, 'services', 'featured')) {
                $columns .= ", featured";
                $placeholders .= ", ?";
                $execParams[] = $input['featured'] ?? 0;
            }
            if (tableHasColumn($pdo, 'services', 'modified_at')) {
                $columns .= ", modified_at";
                $placeholders .= ", NOW()";
            }

            $stmt = $pdo->prepare("INSERT INTO services ($columns) VALUES ($placeholders)");
            $stmt->execute($execParams);
            $serviceId = $pdo->lastInsertId();

            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    $pick = pickDocumentsLangBodyForWrite($content, $pageTemplate, $hasBuilderHtml);
                    if ($hasBuilderHtml) {
                        $stmt = $pdo->prepare("INSERT INTO service_lang (serviceid, lang, title, location, content, subcontent, youtube_link, builder_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $serviceId,
                            $lang,
                            $content['title'] ?? '',
                            $content['location'] ?? '',
                            $pick['content'],
                            $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                            $content['youtube_link'] ?? null,
                            $pick['builder_html'],
                        ]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO service_lang (serviceid, lang, title, location, content, subcontent, youtube_link) VALUES (?, ?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $serviceId,
                            $lang,
                            $content['title'] ?? '',
                            $content['location'] ?? '',
                            $pick['content'],
                            $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                            $content['youtube_link'] ?? null,
                        ]);
                    }
                }
            }

            if (isset($input['images_data'])) {
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO service_images (serviceid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$serviceId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }

            sendJSON(201, ['id' => (string)$serviceId, 'message' => 'Service created successfully']);
            break;

        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $input = getInput();
            $hasPageTemplate = tableHasColumn($pdo, 'services', 'page_template');
            $hasBuilderHtml = tableHasColumn($pdo, 'service_lang', 'builder_html');
            $pageTemplate = $input['page_template'] ?? null;
            if ($pageTemplate === null && $hasPageTemplate) {
                $stPt = $pdo->prepare("SELECT page_template FROM services WHERE id = ?");
                $stPt->execute([$id]);
                $ptRow = $stPt->fetch(PDO::FETCH_ASSOC);
                $pageTemplate = $ptRow['page_template'] ?? 'standard';
            }
            if ($pageTemplate === null) $pageTemplate = 'standard';

            $mainContent = null;
            if (isset($input['content']['en'])) {
                $enPick = pickDocumentsLangBodyForWrite($input['content']['en'], $pageTemplate, $hasBuilderHtml);
                $mainContent = $enPick['content'];
            }

            $sql = "UPDATE services SET 
                    service_categoryid = COALESCE(?, service_categoryid),
                    slug = COALESCE(?, slug),
                    title = COALESCE(?, title),
                    author = COALESCE(?, author),
                    youtube_link = COALESCE(?, youtube_link),
                    content = COALESCE(?, content),
                    post_date = COALESCE(?, post_date),
                    is_published = COALESCE(?, is_published),
                    summary = COALESCE(?, summary),
                    trainerid = COALESCE(?, trainerid)";
            $putParams = [
                $input['service_categoryid'] ?? null,
                $input['slug'] ?? null,
                $input['title'] ?? ($input['content']['en']['title'] ?? null),
                $input['author'] ?? null,
                $input['youtube_link'] ?? null,
                $mainContent,
                $input['post_date'] ?? null,
                $input['is_published'] ?? null,
                $input['summary'] ?? null,
                $input['trainerid'] ?? null,
            ];
            if (tableHasColumn($pdo, 'services', 'featured')) {
                $sql .= ", featured = COALESCE(?, featured)";
                $putParams[] = $input['featured'] ?? null;
            }
            if ($hasPageTemplate) {
                $sql .= ", page_template = COALESCE(?, page_template)";
                $putParams[] = $input['page_template'] ?? null;
            }
            if (tableHasColumn($pdo, 'services', 'modified_at')) {
                $sql .= ", modified_at = NOW()";
            }
            $sql .= " WHERE id = ?";
            $putParams[] = $id;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($putParams);

            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $content) {
                    $pick = pickDocumentsLangBodyForWrite($content, $pageTemplate, $hasBuilderHtml);
                    $stmt = $pdo->prepare("SELECT id FROM service_lang WHERE serviceid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();

                    if ($exists) {
                        if ($hasBuilderHtml) {
                            $stmt = $pdo->prepare("UPDATE service_lang SET title = ?, location = ?, content = ?, subcontent = ?, youtube_link = ?, builder_html = ? WHERE serviceid = ? AND lang = ?");
                            $stmt->execute([
                                $content['title'] ?? '',
                                $content['location'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                                $content['youtube_link'] ?? null,
                                $pick['builder_html'],
                                $id,
                                $lang,
                            ]);
                        } else {
                            $stmt = $pdo->prepare("UPDATE service_lang SET title = ?, location = ?, content = ?, subcontent = ?, youtube_link = ? WHERE serviceid = ? AND lang = ?");
                            $stmt->execute([
                                $content['title'] ?? '',
                                $content['location'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                                $content['youtube_link'] ?? null,
                                $id,
                                $lang,
                            ]);
                        }
                    } else {
                        if ($hasBuilderHtml) {
                            $stmt = $pdo->prepare("INSERT INTO service_lang (serviceid, lang, title, location, content, subcontent, youtube_link, builder_html) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $content['location'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                                $content['youtube_link'] ?? null,
                                $pick['builder_html'],
                            ]);
                        } else {
                            $stmt = $pdo->prepare("INSERT INTO service_lang (serviceid, lang, title, location, content, subcontent, youtube_link) VALUES (?, ?, ?, ?, ?, ?, ?)");
                            $stmt->execute([
                                $id,
                                $lang,
                                $content['title'] ?? '',
                                $content['location'] ?? '',
                                $pick['content'],
                                $content['excerpt'] ?? ($content['subcontent'] ?? ''),
                                $content['youtube_link'] ?? null,
                            ]);
                        }
                    }
                }
            }

            if (isset($input['images_data'])) {
                $pdo->prepare("DELETE FROM service_images WHERE serviceid = ?")->execute([$id]);
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO service_images (serviceid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            sendJSON(200, ['message' => 'Service updated successfully']);
            break;

        case 'DELETE':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $pdo->prepare("DELETE FROM service_lang WHERE serviceid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM service_images WHERE serviceid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM services WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;

        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleServiceCategories($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM service_categories WHERE id = ?");
                $stmt->execute([$id]);
                $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$cat) {
                    sendJSON(404, ['error' => 'Service category not found']);
                }
                $stmt = $pdo->prepare("SELECT * FROM service_category_lang WHERE service_categoryid = ?");
                $stmt->execute([$id]);
                $langRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $langData = [];
                foreach ($langRows as $row) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'] ?? '',
                        'content' => isset($row['content']) ? (string)$row['content'] : '',
                        'subcontent' => isset($row['subcontent']) ? (string)$row['subcontent'] : '',
                    ];
                }
                $stmt = $pdo->prepare("SELECT * FROM service_category_images WHERE service_categoryid = ? ORDER BY ordering ASC");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendJSON(200, mapServiceCategoryToPayload($cat, $langData, $images));
            } else {
                $stmt = $pdo->query("SELECT * FROM service_categories ORDER BY id DESC");
                $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = [];
                foreach ($cats as $cat) {
                    $catId = $cat['id'];
                    $stmt = $pdo->prepare("SELECT * FROM service_category_lang WHERE service_categoryid = ?");
                    $stmt->execute([$catId]);
                    $langRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $langData = [];
                    foreach ($langRows as $row) {
                        $langData[$row['lang']] = [
                            'title' => $row['title'] ?? '',
                            'content' => isset($row['content']) ? (string)$row['content'] : '',
                            'subcontent' => isset($row['subcontent']) ? (string)$row['subcontent'] : '',
                        ];
                    }
                    $stmt = $pdo->prepare("SELECT * FROM service_category_images WHERE service_categoryid = ? ORDER BY ordering ASC");
                    $stmt->execute([$catId]);
                    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    $data[] = mapServiceCategoryToPayload($cat, $langData, $images);
                }
                sendJSON(200, ['data' => $data, 'total' => count($data)]);
            }
            break;

        case 'POST':
            $input = getInput();
            $stmt = $pdo->prepare("INSERT INTO service_categories (slug, title, content, is_published) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $input['slug'] ?? '',
                $input['title'] ?? ($input['lang_data']['en']['title'] ?? ''),
                $input['content'] ?? ($input['lang_data']['en']['content'] ?? ''),
                $input['is_published'] ?? 1,
            ]);
            $catId = $pdo->lastInsertId();

            if (isset($input['lang_data'])) {
                foreach ($input['lang_data'] as $lang => $c) {
                    $stmt = $pdo->prepare("INSERT INTO service_category_lang (service_categoryid, lang, title, location, content, subcontent) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $catId,
                        $lang,
                        $c['title'] ?? '',
                        $c['location'] ?? '',
                        $c['content'] ?? '',
                        $c['subcontent'] ?? '',
                    ]);
                }
            }

            if (isset($input['images_data'])) {
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO service_category_images (service_categoryid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$catId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }

            sendJSON(201, ['id' => (string)$catId, 'message' => 'Service category created successfully']);
            break;

        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $input = getInput();
            $stmt = $pdo->prepare("UPDATE service_categories SET slug = COALESCE(?, slug), title = COALESCE(?, title), content = COALESCE(?, content), is_published = COALESCE(?, is_published) WHERE id = ?");
            $stmt->execute([
                $input['slug'] ?? null,
                $input['title'] ?? ($input['lang_data']['en']['title'] ?? null),
                $input['content'] ?? ($input['lang_data']['en']['content'] ?? null),
                $input['is_published'] ?? null,
                $id,
            ]);

            if (isset($input['lang_data'])) {
                foreach ($input['lang_data'] as $lang => $c) {
                    $stmt = $pdo->prepare("SELECT id FROM service_category_lang WHERE service_categoryid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();
                    if ($exists) {
                        $stmt = $pdo->prepare("UPDATE service_category_lang SET title = ?, location = ?, content = ?, subcontent = ? WHERE service_categoryid = ? AND lang = ?");
                        $stmt->execute([
                            $c['title'] ?? '',
                            $c['location'] ?? '',
                            $c['content'] ?? '',
                            $c['subcontent'] ?? '',
                            $id,
                            $lang,
                        ]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO service_category_lang (service_categoryid, lang, title, location, content, subcontent) VALUES (?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $id,
                            $lang,
                            $c['title'] ?? '',
                            $c['location'] ?? '',
                            $c['content'] ?? '',
                            $c['subcontent'] ?? '',
                        ]);
                    }
                }
            }

            if (isset($input['images_data'])) {
                $pdo->prepare("DELETE FROM service_category_images WHERE service_categoryid = ?")->execute([$id]);
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO service_category_images (service_categoryid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            sendJSON(200, ['message' => 'Service category updated successfully']);
            break;

        case 'DELETE':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            $pdo->prepare("DELETE FROM service_category_lang WHERE service_categoryid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM service_category_images WHERE service_categoryid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM service_categories WHERE id = ?")->execute([$id]);
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
        if (!mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
            sendJSON(500, ['error' => 'Failed to create upload directory', 'dir' => $uploadDir]);
        }
    }
    
    $filepath = $uploadDir . $filename;
    if (!is_writable($uploadDir)) {
        sendJSON(500, ['error' => 'Upload directory is not writable', 'dir' => $uploadDir]);
    }
    $bytes = @file_put_contents($filepath, $decoded);
    if ($bytes === false || $bytes <= 0) {
        sendJSON(500, ['error' => 'Failed to write image file', 'path' => $filepath]);
    }
    
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
// Handler Functions
// =====================================================

function handleProducts($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $product = loadProductById($pdo, $id);
                if (!$product) sendJSON(404, ['error' => 'Product not found']);
                sendJSON(200, $product);
            }

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

            $countStmt = $pdo->prepare("SELECT COUNT(DISTINCT p.id) FROM products p LEFT JOIN product_lang pl ON p.id = pl.product_id AND pl.lang = 'en' WHERE $where");
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();

            $offset = ($page - 1) * $limit;
            $stmt = $pdo->prepare("SELECT DISTINCT p.id FROM products p LEFT JOIN product_lang pl ON p.id = pl.product_id AND pl.lang = 'en' WHERE $where ORDER BY p.id DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            $ids = array_map(fn($r) => (string)$r['id'], $stmt->fetchAll(PDO::FETCH_ASSOC));

            $data = [];
            foreach ($ids as $pid) {
                $row = loadProductById($pdo, $pid);
                if ($row) $data[] = $row;
            }
            sendJSON(200, ['data' => $data, 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
            break;
            
        case 'POST':
            $input = getInput();
            $pdo->beginTransaction();
            try {
            $stmt = $pdo->prepare("INSERT INTO products (sku, is_published, is_featured, track_inventory, category_id, brand_id, barcode, purchase_price, whole_price, retail_price, web_price, discount, weight, dimensions, related_skus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['sku'] ?? '',
                (int)(bool)($input['isPublished'] ?? false),
                (int)(bool)($input['isFeatured'] ?? false),
                (int)(bool)($input['trackInventory'] ?? true),
                array_key_exists('categoryId', $input) ? (($input['categoryId'] === '' || $input['categoryId'] === null) ? null : $input['categoryId']) : null,
                array_key_exists('brandId', $input) ? (($input['brandId'] === '' || $input['brandId'] === null) ? null : $input['brandId']) : null,
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
            
            if (isset($input['content'])) {
                foreach ($input['content'] as $lang => $c) {
                    $stmt = $pdo->prepare("INSERT INTO product_lang (product_id, lang, name, tags, content) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$productId, $lang, $c['name'] ?? '', json_encode($c['tags'] ?? []), $c['content'] ?? '']);
                }
            }
            if (isset($input['stockLevels']) && is_array($input['stockLevels'])) {
                foreach ($input['stockLevels'] as $sl) {
                    $stmt = $pdo->prepare("INSERT INTO stock_levels (product_id, warehouse_id, qty) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qty = VALUES(qty)");
                    $wid = $sl['warehouseId'] ?? ($sl['warehouse_id'] ?? 0);
                    $stmt->execute([$productId, (int)$wid, (int)($sl['qty'] ?? 0)]);
                }
            }
            if (isset($input['attrRows'])) {
                $stmt = $pdo->prepare("UPDATE products SET attr_rows_json = ? WHERE id = ?");
                $stmt->execute([json_encode($input['attrRows']), $productId]);
            }
            if (isset($input['childSkuOverrides'])) {
                $stmt = $pdo->prepare("UPDATE products SET child_sku_overrides_json = ? WHERE id = ?");
                $stmt->execute([json_encode($input['childSkuOverrides']), $productId]);
            }
            $pdo->commit();
            $created = loadProductById($pdo, $productId);
            sendJSON(201, $created ?: ['id' => (string)$productId, 'message' => 'Product created successfully']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to create product', 'message' => $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $pdo->beginTransaction();
            try {
            $stmt = $pdo->prepare("UPDATE products SET sku=COALESCE(?,sku), is_published=COALESCE(?,is_published), is_featured=COALESCE(?,is_featured), track_inventory=COALESCE(?,track_inventory), category_id=COALESCE(?,category_id), brand_id=COALESCE(?,brand_id), barcode=COALESCE(?,barcode), purchase_price=COALESCE(?,purchase_price), whole_price=COALESCE(?,whole_price), retail_price=COALESCE(?,retail_price), web_price=COALESCE(?,web_price), discount=COALESCE(?,discount), weight=COALESCE(?,weight), dimensions=COALESCE(?,dimensions), related_skus=COALESCE(?,related_skus) WHERE id=?");
            $stmt->execute([
                $input['sku'] ?? null,
                isset($input['isPublished']) ? (int)(bool)$input['isPublished'] : null,
                isset($input['isFeatured']) ? (int)(bool)$input['isFeatured'] : null,
                isset($input['trackInventory']) ? (int)(bool)$input['trackInventory'] : null,
                array_key_exists('categoryId', $input) ? (($input['categoryId'] === '' || $input['categoryId'] === null) ? null : $input['categoryId']) : null,
                array_key_exists('brandId', $input) ? (($input['brandId'] === '' || $input['brandId'] === null) ? null : $input['brandId']) : null,
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
            if (isset($input['content']) && is_array($input['content'])) {
                foreach ($input['content'] as $lang => $c) {
                    $check = $pdo->prepare("SELECT id FROM product_lang WHERE product_id = ? AND lang = ?");
                    $check->execute([$id, $lang]);
                    if ($check->fetch()) {
                        $stmt = $pdo->prepare("UPDATE product_lang SET name = ?, tags = ?, content = ? WHERE product_id = ? AND lang = ?");
                        $stmt->execute([$c['name'] ?? '', json_encode($c['tags'] ?? []), $c['content'] ?? '', $id, $lang]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO product_lang (product_id, lang, name, tags, content) VALUES (?, ?, ?, ?, ?)");
                        $stmt->execute([$id, $lang, $c['name'] ?? '', json_encode($c['tags'] ?? []), $c['content'] ?? '']);
                    }
                }
            }
            if (isset($input['stockLevels']) && is_array($input['stockLevels'])) {
                $pdo->prepare("DELETE FROM stock_levels WHERE product_id = ?")->execute([$id]);
                foreach ($input['stockLevels'] as $sl) {
                    $stmt = $pdo->prepare("INSERT INTO stock_levels (product_id, warehouse_id, qty) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qty = VALUES(qty)");
                    $wid = $sl['warehouseId'] ?? ($sl['warehouse_id'] ?? 0);
                    $stmt->execute([$id, (int)$wid, (int)($sl['qty'] ?? 0)]);
                }
            }
            if (array_key_exists('attrRows', $input)) {
                $stmt = $pdo->prepare("UPDATE products SET attr_rows_json = ? WHERE id = ?");
                $stmt->execute([json_encode($input['attrRows'] ?? []), $id]);
            }
            if (array_key_exists('childSkuOverrides', $input)) {
                $stmt = $pdo->prepare("UPDATE products SET child_sku_overrides_json = ? WHERE id = ?");
                $stmt->execute([json_encode($input['childSkuOverrides'] ?? new stdClass()), $id]);
            }
            $pdo->commit();
            $updated = loadProductById($pdo, $id);
            sendJSON(200, $updated ?: ['message' => 'Product updated successfully']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to update product', 'message' => $e->getMessage()]);
            }
            break;

        case 'PATCH':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $allowed = [
                'isPublished' => 'is_published',
                'isFeatured' => 'is_featured',
                'trackInventory' => 'track_inventory',
                'categoryId' => 'category_id',
                'brandId' => 'brand_id',
                'webPrice' => 'web_price',
                'wholePrice' => 'whole_price',
                'retailPrice' => 'retail_price',
                'purchasePrice' => 'purchase_price',
                'discount' => 'discount',
                'barcode' => 'barcode',
            ];
            $sets = [];
            $params = [];
            foreach ($allowed as $apiKey => $dbCol) {
                if (array_key_exists($apiKey, $input)) {
                    $sets[] = "$dbCol = ?";
                    $val = $input[$apiKey];
                    if (in_array($apiKey, ['isPublished', 'isFeatured', 'trackInventory'], true)) {
                        $val = (int)(bool)$val;
                    }
                    if (in_array($apiKey, ['categoryId', 'brandId'], true)) {
                        $val = ($val === '' || $val === null) ? null : $val;
                    }
                    $params[] = $val;
                }
            }
            if (!$sets) sendJSON(400, ['error' => 'No patch fields']);
            $params[] = $id;
            $stmt = $pdo->prepare("UPDATE products SET " . implode(', ', $sets) . " WHERE id = ?");
            $stmt->execute($params);
            $patched = loadProductById($pdo, $id);
            sendJSON(200, $patched ?: ['message' => 'Product patched']);
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

function loadProductById($pdo, $id) {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$product) return null;

    $stmt = $pdo->prepare("SELECT * FROM product_lang WHERE product_id = ?");
    $stmt->execute([$id]);
    $langData = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $langData[$row['lang']] = [
            'name' => $row['name'] ?? '',
            'tags' => json_decode($row['tags'] ?? '[]', true) ?: [],
            'content' => $row['content'] ?? '',
        ];
    }

    $stmt = $pdo->prepare("SELECT sl.*, w.name as warehouse_name FROM stock_levels sl LEFT JOIN warehouses w ON sl.warehouse_id = w.id WHERE sl.product_id = ?");
    $stmt->execute([$id]);
    $stockLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return formatProduct($product, $langData, [], $stockLevels);
}

function formatProduct($p, $langData = [], $attributes = [], $stockLevels = []) {
    $attrRows = json_decode($p['attr_rows_json'] ?? '[]', true);
    if (!is_array($attrRows)) $attrRows = [];
    $childSkuOverrides = json_decode($p['child_sku_overrides_json'] ?? '{}', true);
    if (!is_array($childSkuOverrides)) $childSkuOverrides = [];

    $normalizedContent = [
        'en' => ['name' => '', 'tags' => [], 'content' => ''],
        'zh_TW' => ['name' => '', 'tags' => [], 'content' => ''],
        'zh_CN' => ['name' => '', 'tags' => [], 'content' => ''],
    ];
    foreach ($normalizedContent as $lang => $_v) {
        if (isset($langData[$lang])) {
            $normalizedContent[$lang] = [
                'name' => $langData[$lang]['name'] ?? '',
                'tags' => $langData[$lang]['tags'] ?? [],
                'content' => $langData[$lang]['content'] ?? '',
            ];
        }
    }

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
        'content' => $normalizedContent,
        'attributes' => $attributes,
        'attrRows' => $attrRows,
        'childSkuOverrides' => $childSkuOverrides,
        'stockLevels' => $stockLevels,
    ];
}

function mapProductCategoryToPayload($cat, $langData = [], $images = []) {
    return [
        'id' => (string)$cat['id'],
        'slug' => $cat['slug'] ?? '',
        'isPublished' => (bool)($cat['is_published'] ?? 0),
        'title' => $cat['title'] ?? '',
        'content' => $cat['content'] ?? '',
        'lang_data' => [
            'en' => [
                'title' => $langData['en']['title'] ?? '',
                'content' => $langData['en']['content'] ?? '',
                'subcontent' => $langData['en']['subcontent'] ?? '',
            ],
            'zh_TW' => [
                'title' => $langData['zh_TW']['title'] ?? '',
                'content' => $langData['zh_TW']['content'] ?? '',
                'subcontent' => $langData['zh_TW']['subcontent'] ?? '',
            ],
            'zh_CN' => [
                'title' => $langData['zh_CN']['title'] ?? '',
                'content' => $langData['zh_CN']['content'] ?? '',
                'subcontent' => $langData['zh_CN']['subcontent'] ?? '',
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

function handleProductCategories($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM product_categories WHERE id = ?");
                $stmt->execute([$id]);
                $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$cat) sendJSON(404, ['error' => 'Product category not found']);
                $stmt = $pdo->prepare("SELECT * FROM product_category_lang WHERE product_categoryid = ?");
                $stmt->execute([$id]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'] ?? '',
                        'content' => $row['content'] ?? '',
                        'subcontent' => $row['subcontent'] ?? '',
                    ];
                }
                $stmt = $pdo->prepare("SELECT * FROM product_category_images WHERE product_categoryid = ? ORDER BY ordering ASC");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendJSON(200, mapProductCategoryToPayload($cat, $langData, $images));
            }
            $stmt = $pdo->query("SELECT * FROM product_categories ORDER BY id DESC");
            $cats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = [];
            foreach ($cats as $cat) {
                $catId = $cat['id'];
                $stmt = $pdo->prepare("SELECT * FROM product_category_lang WHERE product_categoryid = ?");
                $stmt->execute([$catId]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'] ?? '',
                        'content' => $row['content'] ?? '',
                        'subcontent' => $row['subcontent'] ?? '',
                    ];
                }
                $stmt = $pdo->prepare("SELECT * FROM product_category_images WHERE product_categoryid = ? ORDER BY ordering ASC");
                $stmt->execute([$catId]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data[] = mapProductCategoryToPayload($cat, $langData, $images);
            }
            sendJSON(200, ['data' => $data, 'total' => count($data)]);
            break;
        case 'POST':
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO product_categories (slug, title, content, is_published) VALUES (?, ?, ?, ?)");
                $stmt->execute([
                $input['slug'] ?? '',
                $input['title'] ?? ($input['lang_data']['en']['title'] ?? ''),
                $input['content'] ?? ($input['lang_data']['en']['content'] ?? ''),
                $input['is_published'] ?? 1,
                ]);
                $catId = $pdo->lastInsertId();
                if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                    foreach ($input['lang_data'] as $lang => $c) {
                        $stmt = $pdo->prepare("INSERT INTO product_category_lang (product_categoryid, lang, title, content, subcontent) VALUES (?, ?, ?, ?, ?)");
                        $stmt->execute([$catId, $lang, $c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '']);
                    }
                }
                if (isset($input['images_data']) && is_array($input['images_data'])) {
                    foreach ($input['images_data'] as $img) {
                        $stmt = $pdo->prepare("INSERT INTO product_category_images (product_categoryid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                        $stmt->execute([$catId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                    }
                }
                $pdo->commit();
                sendJSON(201, ['id' => (string)$catId, 'message' => 'Product category created']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to create product category', 'message' => $e->getMessage()]);
            }
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE product_categories SET slug=COALESCE(?,slug), title=COALESCE(?,title), content=COALESCE(?,content), is_published=COALESCE(?,is_published) WHERE id=?");
                $stmt->execute([
                $input['slug'] ?? null,
                $input['title'] ?? ($input['lang_data']['en']['title'] ?? null),
                $input['content'] ?? ($input['lang_data']['en']['content'] ?? null),
                $input['is_published'] ?? null,
                $id
                ]);
                if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                    foreach ($input['lang_data'] as $lang => $c) {
                        $stmt = $pdo->prepare("SELECT id FROM product_category_lang WHERE product_categoryid = ? AND lang = ?");
                        $stmt->execute([$id, $lang]);
                        if ($stmt->fetch()) {
                            $stmt = $pdo->prepare("UPDATE product_category_lang SET title = ?, content = ?, subcontent = ? WHERE product_categoryid = ? AND lang = ?");
                            $stmt->execute([$c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '', $id, $lang]);
                        } else {
                            $stmt = $pdo->prepare("INSERT INTO product_category_lang (product_categoryid, lang, title, content, subcontent) VALUES (?, ?, ?, ?, ?)");
                            $stmt->execute([$id, $lang, $c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '']);
                        }
                    }
                }
                if (isset($input['images_data']) && is_array($input['images_data'])) {
                    $pdo->prepare("DELETE FROM product_category_images WHERE product_categoryid = ?")->execute([$id]);
                    foreach ($input['images_data'] as $img) {
                        $stmt = $pdo->prepare("INSERT INTO product_category_images (product_categoryid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                        $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                    }
                }
                $pdo->commit();
                sendJSON(200, ['message' => 'Product category updated']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to update product category', 'message' => $e->getMessage()]);
            }
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM product_category_lang WHERE product_categoryid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM product_category_images WHERE product_categoryid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM product_categories WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleBrands($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM brands WHERE id = ?");
                $stmt->execute([$id]);
                $brand = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$brand) sendJSON(404, ['error' => 'Brand not found']);
                $stmt = $pdo->prepare("SELECT * FROM brand_lang WHERE brandid = ?");
                $stmt->execute([$id]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'] ?? '',
                        'content' => $row['content'] ?? '',
                        'subcontent' => $row['subcontent'] ?? '',
                    ];
                }
                $stmt = $pdo->prepare("SELECT * FROM brand_images WHERE brandid = ? ORDER BY ordering ASC");
                $stmt->execute([$id]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                sendJSON(200, mapProductCategoryToPayload($brand, $langData, $images));
            }
            $stmt = $pdo->query("SELECT * FROM brands ORDER BY id DESC");
            $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = [];
            foreach ($brands as $brand) {
                $stmt = $pdo->prepare("SELECT * FROM brand_lang WHERE brandid = ?");
                $stmt->execute([$brand['id']]);
                $langData = [];
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $langData[$row['lang']] = [
                        'title' => $row['title'] ?? '',
                        'content' => $row['content'] ?? '',
                        'subcontent' => $row['subcontent'] ?? '',
                    ];
                }
                $stmt = $pdo->prepare("SELECT * FROM brand_images WHERE brandid = ? ORDER BY ordering ASC");
                $stmt->execute([$brand['id']]);
                $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data[] = mapProductCategoryToPayload($brand, $langData, $images);
            }
            sendJSON(200, ['data' => $data, 'total' => count($data)]);
            break;
        case 'POST':
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $name = $input['name'] ?? ($input['title'] ?? ($input['lang_data']['en']['title'] ?? ''));
                $stmt = $pdo->prepare("INSERT INTO brands (slug, name, title, content, is_published, active) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $input['slug'] ?? '',
                    $name,
                    $input['title'] ?? ($input['lang_data']['en']['title'] ?? ''),
                    $input['content'] ?? ($input['lang_data']['en']['content'] ?? ''),
                    $input['is_published'] ?? 1,
                    isset($input['active']) ? (int)(bool)$input['active'] : 1,
                ]);
                $brandId = $pdo->lastInsertId();
                if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                    foreach ($input['lang_data'] as $lang => $c) {
                        $stmt = $pdo->prepare("INSERT INTO brand_lang (brandid, lang, title, content, subcontent) VALUES (?, ?, ?, ?, ?)");
                        $stmt->execute([$brandId, $lang, $c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '']);
                    }
                }
                if (isset($input['images_data']) && is_array($input['images_data'])) {
                    foreach ($input['images_data'] as $img) {
                        $stmt = $pdo->prepare("INSERT INTO brand_images (brandid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                        $stmt->execute([$brandId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                    }
                }
                $pdo->commit();
                sendJSON(201, ['id' => (string)$brandId]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to create brand', 'message' => $e->getMessage()]);
            }
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $name = $input['name'] ?? ($input['title'] ?? ($input['lang_data']['en']['title'] ?? null));
                $stmt = $pdo->prepare("UPDATE brands SET slug=COALESCE(?,slug), name=COALESCE(?,name), title=COALESCE(?,title), content=COALESCE(?,content), is_published=COALESCE(?,is_published), active=COALESCE(?,active) WHERE id=?");
                $stmt->execute([
                    $input['slug'] ?? null,
                    $name,
                    $input['title'] ?? ($input['lang_data']['en']['title'] ?? null),
                    $input['content'] ?? ($input['lang_data']['en']['content'] ?? null),
                    $input['is_published'] ?? null,
                    array_key_exists('active', $input) ? (int)(bool)$input['active'] : null,
                    $id,
                ]);
                if (isset($input['lang_data']) && is_array($input['lang_data'])) {
                    foreach ($input['lang_data'] as $lang => $c) {
                        $stmt = $pdo->prepare("SELECT id FROM brand_lang WHERE brandid = ? AND lang = ?");
                        $stmt->execute([$id, $lang]);
                        if ($stmt->fetch()) {
                            $stmt = $pdo->prepare("UPDATE brand_lang SET title = ?, content = ?, subcontent = ? WHERE brandid = ? AND lang = ?");
                            $stmt->execute([$c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '', $id, $lang]);
                        } else {
                            $stmt = $pdo->prepare("INSERT INTO brand_lang (brandid, lang, title, content, subcontent) VALUES (?, ?, ?, ?, ?)");
                            $stmt->execute([$id, $lang, $c['title'] ?? '', $c['content'] ?? '', $c['subcontent'] ?? '']);
                        }
                    }
                }
                if (isset($input['images_data']) && is_array($input['images_data'])) {
                    $pdo->prepare("DELETE FROM brand_images WHERE brandid = ?")->execute([$id]);
                    foreach ($input['images_data'] as $img) {
                        $stmt = $pdo->prepare("INSERT INTO brand_images (brandid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                        $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                    }
                }
                $pdo->commit();
                sendJSON(200, ['message' => 'Brand updated successfully']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to update brand', 'message' => $e->getMessage()]);
            }
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM brand_lang WHERE brandid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM brand_images WHERE brandid = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM brands WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function handleAttributeGroups($pdo, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM attribute_groups WHERE id = ?");
                $stmt->execute([$id]);
                $group = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$group) sendJSON(404, ['error' => 'Attribute group not found']);
                sendJSON(200, loadAttributeGroupPayload($pdo, $group));
            }
            $stmt = $pdo->query("SELECT * FROM attribute_groups ORDER BY sort_order ASC, id ASC");
            $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = array_map(fn($g) => loadAttributeGroupPayload($pdo, $g), $groups);
            sendJSON(200, ['data' => $data, 'total' => count($data)]);
            break;
        case 'POST':
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("INSERT INTO attribute_groups (sort_order) VALUES (?)");
                $stmt->execute([(int)($input['sortOrder'] ?? 99)]);
                $groupId = $pdo->lastInsertId();
                saveAttributeGroupLang($pdo, $groupId, $input['lang_data'] ?? []);
                saveAttributeDefs($pdo, $groupId, $input['attributes'] ?? []);
                $pdo->commit();
                sendJSON(201, ['id' => (string)$groupId]);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to create attribute group', 'message' => $e->getMessage()]);
            }
            break;
        case 'PUT':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $input = getInput();
            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("UPDATE attribute_groups SET sort_order = COALESCE(?, sort_order) WHERE id = ?");
                $stmt->execute([isset($input['sortOrder']) ? (int)$input['sortOrder'] : null, $id]);
                saveAttributeGroupLang($pdo, $id, $input['lang_data'] ?? []);
                $pdo->prepare("DELETE FROM attribute_defs WHERE attribute_groupid = ?")->execute([$id]);
                $pdo->prepare("DELETE FROM attribute_def_lang WHERE attribute_defid NOT IN (SELECT id FROM attribute_defs)")->execute();
                saveAttributeDefs($pdo, $id, $input['attributes'] ?? []);
                $pdo->commit();
                sendJSON(200, ['message' => 'Attribute group updated']);
            } catch (Throwable $e) {
                $pdo->rollBack();
                sendJSON(500, ['error' => 'Failed to update attribute group', 'message' => $e->getMessage()]);
            }
            break;
        case 'DELETE':
            if (!$id) sendJSON(400, ['error' => 'ID required']);
            $pdo->prepare("DELETE FROM attribute_groups WHERE id = ?")->execute([$id]);
            sendJSON(200, ['success' => true]);
            break;
        default:
            sendJSON(405, ['error' => 'Method not allowed']);
    }
}

function saveAttributeGroupLang($pdo, $groupId, $langData) {
    if (!is_array($langData)) return;
    foreach ($langData as $lang => $v) {
        $stmt = $pdo->prepare("SELECT id FROM attribute_group_lang WHERE attribute_groupid = ? AND lang = ?");
        $stmt->execute([$groupId, $lang]);
        if ($stmt->fetch()) {
            $stmt = $pdo->prepare("UPDATE attribute_group_lang SET name = ? WHERE attribute_groupid = ? AND lang = ?");
            $stmt->execute([$v['name'] ?? '', $groupId, $lang]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO attribute_group_lang (attribute_groupid, lang, name) VALUES (?, ?, ?)");
            $stmt->execute([$groupId, $lang, $v['name'] ?? '']);
        }
    }
}

function saveAttributeDefs($pdo, $groupId, $defs) {
    if (!is_array($defs)) return;
    foreach ($defs as $def) {
        $stmt = $pdo->prepare("INSERT INTO attribute_defs (attribute_groupid, short_code) VALUES (?, ?)");
        $stmt->execute([$groupId, $def['shortCode'] ?? '']);
        $defId = $pdo->lastInsertId();
        $langData = $def['lang_data'] ?? [];
        if (is_array($langData)) {
            foreach ($langData as $lang => $v) {
                $stmt = $pdo->prepare("INSERT INTO attribute_def_lang (attribute_defid, lang, name) VALUES (?, ?, ?)");
                $stmt->execute([$defId, $lang, $v['name'] ?? '']);
            }
        }
    }
}

function loadAttributeGroupPayload($pdo, $group) {
    $groupId = $group['id'];
    $stmt = $pdo->prepare("SELECT * FROM attribute_group_lang WHERE attribute_groupid = ?");
    $stmt->execute([$groupId]);
    $groupLang = ['en' => ['name' => ''], 'zh_TW' => ['name' => ''], 'zh_CN' => ['name' => '']];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $groupLang[$row['lang']] = ['name' => $row['name'] ?? ''];
    }

    $stmt = $pdo->prepare("SELECT * FROM attribute_defs WHERE attribute_groupid = ? ORDER BY id ASC");
    $stmt->execute([$groupId]);
    $defs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $attrs = [];
    foreach ($defs as $def) {
        $stmt = $pdo->prepare("SELECT * FROM attribute_def_lang WHERE attribute_defid = ?");
        $stmt->execute([$def['id']]);
        $defLang = ['en' => ['name' => ''], 'zh_TW' => ['name' => ''], 'zh_CN' => ['name' => '']];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $defLang[$row['lang']] = ['name' => $row['name'] ?? ''];
        }
        $attrs[] = [
            'id' => (string)$def['id'],
            'shortCode' => $def['short_code'] ?? '',
            'lang_data' => $defLang,
        ];
    }

    return [
        'id' => (string)$groupId,
        'sortOrder' => (int)($group['sort_order'] ?? 99),
        'lang_data' => $groupLang,
        'attributes' => $attrs,
    ];
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
