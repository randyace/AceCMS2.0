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
                    $langData[$row['lang']] = [
                        'title' => $row['title'],
                        'subtitle' => $row['subtitle'],
                        'content' => $row['content'],
                        'subcontent' => $row['subcontent'],
                        'meta_title' => $row['meta_title'],
                        'meta_description' => $row['meta_description'],
                        'meta_keywords' => $row['meta_keywords'],
                    ];
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
                        $langDataMap[$row['docid']][$row['lang']] = [
                            'title' => $row['title'],
                            'subtitle' => $row['subtitle'],
                            'content' => $row['content'],
                            'subcontent' => $row['subcontent'],
                            'meta_title' => $row['meta_title'],
                            'meta_description' => $row['meta_description'],
                            'meta_keywords' => $row['meta_keywords'],
                        ];
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
            
            $columns = "parent_menuid, footer_group_id, is_published, in_header, in_footer, slug, ordering, footer_ordering";
            $placeholders = "?, ?, ?, ?, ?, ?, ?, ?";
            if ($hasModifiedAt) {
                $columns .= ", modified_at";
                $placeholders .= ", NOW()";
            }
            $sql = "INSERT INTO documents ($columns) VALUES ($placeholders)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['parent_menuid'] ?? 0,
                $input['footer_group_id'] ?? 0,
                $input['is_published'] ?? 0,
                $input['in_header'] ?? 0,
                $input['in_footer'] ?? 0,
                $input['slug'] ?? '',
                $input['ordering'] ?? 1,
                $input['footer_ordering'] ?? 10,
            ]);
            $docId = $pdo->lastInsertId();
            
            if (isset($input['lang_data'])) {
                foreach ($input['lang_data'] as $lang => $content) {
                    $stmt = $pdo->prepare("INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([
                        $docId,
                        $lang,
                        $content['title'] ?? '',
                        $content['subtitle'] ?? '',
                        $content['content'] ?? '',
                        $content['subcontent'] ?? '',
                        $content['meta_title'] ?? '',
                        $content['meta_description'] ?? '',
                        $content['meta_keywords'] ?? '',
                    ]);
                }
            }
            
            if (isset($input['images_data'])) {
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO documents_images (docid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$docId, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            
            sendJSON(201, ['id' => (string)$docId, 'message' => 'Page created successfully']);
            break;
            
        case 'PUT':
            if (!$id) {
                sendJSON(400, ['error' => 'ID required']);
            }
            
            $input = getInput();
            
            $sql = "UPDATE documents SET 
                    parent_menuid = COALESCE(?, parent_menuid),
                    footer_group_id = COALESCE(?, footer_group_id),
                    is_published = COALESCE(?, is_published),
                    in_header = COALESCE(?, in_header),
                    in_footer = COALESCE(?, in_footer),
                    slug = COALESCE(?, slug),
                    ordering = COALESCE(?, ordering),
                    footer_ordering = COALESCE(?, footer_ordering)" .
                    (tableHasColumn($pdo, 'documents', 'modified_at') ? ",
                    modified_at = NOW()" : "") . "
                    WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $input['parent_menuid'] ?? null,
                $input['footer_group_id'] ?? null,
                $input['is_published'] ?? null,
                $input['in_header'] ?? null,
                $input['in_footer'] ?? null,
                $input['slug'] ?? null,
                $input['ordering'] ?? null,
                $input['footer_ordering'] ?? null,
                $id
            ]);
            
            if (isset($input['lang_data'])) {
                foreach ($input['lang_data'] as $lang => $content) {
                    $stmt = $pdo->prepare("SELECT id FROM documents_lang WHERE docid = ? AND lang = ?");
                    $stmt->execute([$id, $lang]);
                    $exists = $stmt->fetch();
                    
                    if ($exists) {
                        $sql = "UPDATE documents_lang SET title = ?, subtitle = ?, content = ?, subcontent = ?, meta_title = ?, meta_description = ?, meta_keywords = ? WHERE docid = ? AND lang = ?";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $content['title'] ?? '',
                            $content['subtitle'] ?? '',
                            $content['content'] ?? '',
                            $content['subcontent'] ?? '',
                            $content['meta_title'] ?? '',
                            $content['meta_description'] ?? '',
                            $content['meta_keywords'] ?? '',
                            $id,
                            $lang
                        ]);
                    } else {
                        $sql = "INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([
                            $id,
                            $lang,
                            $content['title'] ?? '',
                            $content['subtitle'] ?? '',
                            $content['content'] ?? '',
                            $content['subcontent'] ?? '',
                            $content['meta_title'] ?? '',
                            $content['meta_description'] ?? '',
                            $content['meta_keywords'] ?? '',
                        ]);
                    }
                }
            }
            
            if (isset($input['images_data'])) {
                $pdo->prepare("DELETE FROM documents_images WHERE docid = ?")->execute([$id]);
                foreach ($input['images_data'] as $img) {
                    $stmt = $pdo->prepare("INSERT INTO documents_images (docid, image_id, ordering, is_published) VALUES (?, ?, ?, 1)");
                    $stmt->execute([$id, $img['image_id'] ?? 0, $img['ordering'] ?? 0]);
                }
            }
            
            sendJSON(200, ['message' => 'Page updated successfully']);
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
