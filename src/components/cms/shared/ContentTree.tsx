import React, { useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { GripVertical, FileText, Folder, ChevronRight, ChevronDown, Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';

interface TreeNode {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
  inHeader: boolean;
  inFooter: boolean;
  parentPage?: string | null;
  order?: number;
  updatedAt?: string;
  children?: TreeNode[];
}

interface ContentTreeProps {
  data: TreeNode[];
  onCreate: (parentId: string | null, type: 'root' | 'sub') => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (nodeId: string) => void;
  onMove: (dragIds: string[], parentId: string | null, index: number) => void;
  onTogglePublished: (nodeId: string) => void;
  onToggleHeader: (nodeId: string) => void;
  onToggleFooter: (nodeId: string) => void;
  loading?: boolean;
}

interface TreeCallbacks {
  onEdit: (node: TreeNode) => void;
  onDelete: (nodeId: string) => void;
  onTogglePublished: (nodeId: string) => void;
  onToggleHeader: (nodeId: string) => void;
  onToggleFooter: (nodeId: string) => void;
}

const TreeCallbacksContext = createContext<TreeCallbacks | null>(null);

function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + (node.children ? countNodes(node.children) : 0), 0);
}

function formatModifiedAt(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const TreeRowComponent = ({ node, style, dragHandle, ...props }: { node: NodeApi<TreeNode>; style: React.CSSProperties; dragHandle?: (el: HTMLDivElement | null) => void }) => {
  const hasChildren = node.children && node.children.length > 0;
  const level = node.level;
  const callbacks = useContext(TreeCallbacksContext);
  const dragRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (dragHandle && dragRef.current) {
      dragHandle(dragRef.current);
    }
  }, [dragHandle]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    callbacks?.onEdit(node.data);
  }, [callbacks, node.data]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${node.data.name}"?`)) {
      callbacks?.onDelete(node.data.id);
    }
  }, [callbacks, node.data]);
  
  const handleTogglePublished = useCallback((checked: boolean) => {
    if (checked !== node.data.isPublished) callbacks?.onTogglePublished(node.data.id);
  }, [callbacks, node.data.id, node.data.isPublished]);

  const handleToggleHeader = useCallback((checked: boolean) => {
    if (checked !== node.data.inHeader) callbacks?.onToggleHeader(node.data.id);
  }, [callbacks, node.data.id, node.data.inHeader]);

  const handleToggleFooter = useCallback((checked: boolean) => {
    if (checked !== node.data.inFooter) callbacks?.onToggleFooter(node.data.id);
  }, [callbacks, node.data.id, node.data.inFooter]);

  const paddingLeft = level * 24;

  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', height: 44 }}
      className="group border-b border-border hover:bg-muted/30 transition-colors"
      {...props}
    >
      <div className="flex items-center gap-1 flex-shrink-0 w-16 px-1">
        <div ref={dragRef} className="cursor-grab active:cursor-grabbing hover:bg-muted rounded p-0.5">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          {hasChildren ? (
            node.isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )
          ) : (
            <div className="w-3.5" />
          )}
        </button>
        {hasChildren ? (
          <Folder className="w-3.5 h-3.5 text-[#cec18a]" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-[#0f2942]" />
        )}
      </div>

      <div className="flex-shrink-0 w-14 text-center px-1">
        {hasChildren ? (
          <span className="px-1 py-0.5 rounded bg-[#0f2942]/10 text-[#0f2942] text-[10px]">
            Sub
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      <div className="flex-shrink-0 w-44 px-1">
        <span className="text-xs text-muted-foreground font-mono truncate block">
          {node.data.slug || '—'}
        </span>
      </div>

      <div className="flex-1 min-w-0 px-1">
        <div className="flex items-center gap-2" style={{ paddingLeft: paddingLeft }}>
          <span className="truncate text-sm">
            {node.data.name || <span className="text-muted-foreground italic">Untitled</span>}
          </span>
          {node.data.isPublished === false && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 w-20 px-1 text-center leading-[16px]" style={{ lineHeight: '16px' }}>
        <span className="text-xs leading-[16px] text-muted-foreground">
          {formatModifiedAt(node.data.updatedAt)}
        </span>
      </div>

      <div className="flex-shrink-0 w-20 px-1 flex justify-center">
        <Switch checked={node.data.isPublished} onCheckedChange={handleTogglePublished} />
      </div>
      <div className="flex-shrink-0 w-20 px-1 flex justify-center">
        <Switch checked={node.data.inHeader} onCheckedChange={handleToggleHeader} />
      </div>
      <div className="flex-shrink-0 w-20 px-1 flex justify-center">
        <Switch checked={node.data.inFooter} onCheckedChange={handleToggleFooter} />
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 pr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-7 w-7 p-0 hover:bg-[#0f2942]/10 hover:text-[#0f2942]"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export function ContentTree({
  data,
  onCreate,
  onEdit,
  onDelete,
  onMove,
  onTogglePublished,
  onToggleHeader,
  onToggleFooter,
  loading
}: ContentTreeProps) {
  const treeRef = useRef<any>(null);

  const handleCreateRoot = () => {
    onCreate(null, 'root');
  };

  const handleCreateSub = () => {
    if (data.length > 0) {
      onCreate(data[0].id, 'sub');
    } else {
      onCreate(null, 'root');
    }
  };

  const handleMove = useCallback((
    args: { dragIds: string[]; parentId: string | null; index: number }
  ) => {
    onMove(args.dragIds, args.parentId, args.index);
  }, [onMove]);

  const handleDelete = useCallback((args: { ids: string[]; nodes: NodeApi<TreeNode>[] }) => {
    args.ids.forEach(id => onDelete(id));
  }, [onDelete]);

  const totalNodes = useMemo(() => countNodes(data), [data]);
  const treeHeight = useMemo(() => Math.max(400, totalNodes * 44 + 44), [totalNodes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TreeCallbacksContext.Provider value={{ onEdit, onDelete, onTogglePublished, onToggleHeader, onToggleFooter }}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto border border-border rounded-lg bg-white">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Folder className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">No pages yet</p>
              <p className="text-xs mt-1">Click "Add Root Menu" to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center border-b border-border bg-muted/50 h-11 px-2 text-xs font-medium text-muted-foreground" style={{ minWidth: 1040 }}>
                <div className="flex items-center gap-1 w-16 flex-shrink-0 px-1">
                  <span>Drag</span>
                </div>
                <div className="w-14 text-center flex-shrink-0 px-1">Parent?</div>
                <div className="w-44 flex-shrink-0 px-1">Slug</div>
                <div className="flex-1 px-1">Title</div>
                <div className="w-20 flex-shrink-0 px-1 text-center">Modified</div>
                <div className="w-20 flex-shrink-0 px-1 text-center">Published</div>
                <div className="w-20 flex-shrink-0 px-1 text-center">Header</div>
                <div className="w-20 flex-shrink-0 px-1 text-center">Footer</div>
                <div className="w-14 flex-shrink-0 pr-3 text-center">Actions</div>
              </div>
              <div style={{ minWidth: 1040 }}>
                <Tree
                  ref={treeRef}
                  data={data}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  disableEdit={true}
                  disableDrag={false}
                  disableDrop={false}
                  openByDefault={true}
                  indent={24}
                  rowHeight={44}
                  width="100%"
                  height={treeHeight}
                >
                  {TreeRowComponent as any}
                </Tree>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4 border-t mt-4">
          <Button onClick={handleCreateRoot} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Root Menu
          </Button>
          <Button onClick={handleCreateSub} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Root Sub Menu
          </Button>
        </div>
      </div>
    </TreeCallbacksContext.Provider>
  );
}
