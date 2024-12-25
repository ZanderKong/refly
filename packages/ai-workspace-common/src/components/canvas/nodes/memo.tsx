import { Position, useReactFlow } from '@xyflow/react';
import { CanvasNode, CanvasNodeData, MemoNodeProps } from './types';
import { Node } from '@xyflow/react';
import { CustomHandle } from './custom-handle';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useCanvasControl } from '@refly-packages/ai-workspace-common/hooks/use-canvas-control';
import { useEdgeStyles } from '../constants';
import { getNodeCommonStyles } from './index';
import { ActionButtons } from './action-buttons';
import { useTranslation } from 'react-i18next';
import { useAddToContext } from '@refly-packages/ai-workspace-common/hooks/use-add-to-context';
import { useDeleteNode } from '@refly-packages/ai-workspace-common/hooks/use-delete-node';
import { PiNotePencilLight } from 'react-icons/pi';
import { Input } from 'antd';

import { time } from '@refly-packages/ai-workspace-common/utils/time';
import { LOCALE } from '@refly/common-types';
import { useCanvasStoreShallow } from '@refly-packages/ai-workspace-common/stores/canvas';
import Moveable from 'react-moveable';
import classNames from 'classnames';
import { useEditor, EditorContent } from '@tiptap/react';
import { Markdown as MarkdownPreview } from '@refly-packages/ai-workspace-common/components/markdown';
import { Markdown } from 'tiptap-markdown';
import StarterKit from '@tiptap/starter-kit';
import './memo.scss';
import { useThrottledCallback } from 'use-debounce';
import { EditorInstance } from '@refly-packages/ai-workspace-common/components/editor/core/components';
import {
  cleanupNodeEvents,
  createNodeEventName,
  nodeActionEmitter,
} from '@refly-packages/ai-workspace-common/events/nodeActions';
import { useInsertToDocument } from '@refly-packages/ai-workspace-common/hooks/use-insert-to-document';

type MemoNode = Node<CanvasNodeData, 'memo'>;

export const MemoNode = ({
  data,
  selected,
  id,
  isPreview = false,
  hideActions = false,
  hideHandles = false,
  onNodeClick,
}: MemoNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { edges, setNodeDataByEntity } = useCanvasControl();
  const { setEdges } = useReactFlow();
  const { i18n, t } = useTranslation();
  const language = i18n.languages?.[0];
  const [title, setTitle] = useState(data.title);

  const { getNode } = useReactFlow();
  const node = getNode(id);
  const targetRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: node?.measured?.width ?? 288,
    height: node?.measured?.height ?? 384,
  });
  const { operatingNodeId } = useCanvasStoreShallow((state) => ({
    operatingNodeId: state.operatingNodeId,
  }));

  const isOperating = operatingNodeId === id;

  // Check if node has any connections
  const isTargetConnected = edges?.some((edge) => edge.target === id);
  const isSourceConnected = edges?.some((edge) => edge.source === id);

  const edgeStyles = useEdgeStyles();

  // Handle node hover events
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === id || edge.target === id) {
          return {
            ...edge,
            style: edgeStyles.hover,
          };
        }
        return edge;
      }),
    );
  }, [id, setEdges, edgeStyles]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === id || edge.target === id) {
          return {
            ...edge,
            style: edgeStyles.default,
          };
        }
        return edge;
      }),
    );
  }, [id, setEdges, edgeStyles]);

  const handleAddToContext = useAddToContext(
    {
      id,
      type: 'memo',
      data,
      position: { x: 0, y: 0 },
    } as CanvasNode,
    'memo',
  );

  const handleDelete = useDeleteNode(
    {
      id,
      type: 'memo',
      data,
      position: { x: 0, y: 0 },
    } as CanvasNode,
    'memo',
  );

  const insertToDoc = useInsertToDocument(data.entityId);
  const handleInsertToDoc = useCallback(async () => {
    await insertToDoc('insertBlow', data?.contentPreview);
  }, [insertToDoc, data.entityId, data]);

  // Add event handling
  useEffect(() => {
    // Create node-specific event handlers
    const handleNodeAddToContext = () => handleAddToContext();
    const handleNodeDelete = () => handleDelete();
    const handleNodeInsertToDoc = () => handleInsertToDoc();

    // Register events with node ID
    nodeActionEmitter.on(createNodeEventName(id, 'addToContext'), handleNodeAddToContext);
    nodeActionEmitter.on(createNodeEventName(id, 'delete'), handleNodeDelete);
    nodeActionEmitter.on(createNodeEventName(id, 'insertToDoc'), handleNodeInsertToDoc);

    return () => {
      // Cleanup events when component unmounts
      nodeActionEmitter.off(createNodeEventName(id, 'addToContext'), handleNodeAddToContext);
      nodeActionEmitter.off(createNodeEventName(id, 'delete'), handleNodeDelete);
      nodeActionEmitter.off(createNodeEventName(id, 'insertToDoc'), handleNodeInsertToDoc);

      // Clean up all node events
      cleanupNodeEvents(id);
    };
  }, [id, handleAddToContext, handleDelete, handleInsertToDoc]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
      }),
    ],
    content: data?.contentPreview ?? '',
    editable: true,
    onUpdate: ({ editor }) => {
      debouncedUpdates(editor);
    },
    editorProps: {
      attributes: {
        class: classNames('max-w-none', 'focus:outline-none', {
          'pointer-events-none': !isOperating,
        }),
      },
    },
  });

  const debouncedUpdates = useThrottledCallback(async (editor: EditorInstance) => {
    const markdown = editor.storage.markdown.getMarkdown();

    setNodeDataByEntity(
      {
        entityId: data?.entityId,
        type: 'memo',
      },
      {
        contentPreview: markdown,
      },
    );
  }, 500);
  const onTitleChange = useThrottledCallback((value: string) => {
    setNodeDataByEntity(
      {
        entityId: data?.entityId,
        type: 'memo',
      },
      {
        title: value,
      },
    );
  }, 500);

  useEffect(() => {
    onTitleChange(title);
  }, [title, setTitle]);

  return (
    <div className={classNames({ nowheel: isOperating })}>
      <div
        ref={targetRef}
        className={`relative group ${onNodeClick ? 'cursor-pointer' : ''}`}
        onMouseEnter={!isPreview ? handleMouseEnter : undefined}
        onMouseLeave={!isPreview ? handleMouseLeave : undefined}
        onClick={onNodeClick}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          userSelect: isOperating ? 'text' : 'none',
          cursor: isOperating ? 'text' : 'grab',
        }}
      >
        {!isPreview && !hideActions && <ActionButtons type="memo" nodeId={id} />}

        <div
          className={`
            relative
            h-full
            ${getNodeCommonStyles({ selected: !isPreview && selected, isHovered })}
          `}
        >
          <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
          {!isPreview && !hideHandles && (
            <>
              <CustomHandle
                type="target"
                position={Position.Left}
                isConnected={isTargetConnected}
                isNodeHovered={isHovered}
                nodeType="document"
              />
              <CustomHandle
                type="source"
                position={Position.Right}
                isConnected={isSourceConnected}
                isNodeHovered={isHovered}
                nodeType="document"
              />
            </>
          )}
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="
                    w-6 
                    h-6 
                    rounded 
                    bg-[#00968F]
                    shadow-[0px_2px_4px_-2px_rgba(16,24,60,0.06),0px_4px_8px_-2px_rgba(16,24,60,0.1)]
                    flex 
                    items-center 
                    justify-center
                    flex-shrink-0
                  "
                >
                  <PiNotePencilLight className="w-4 h-4 text-white" />
                </div>
                {!isPreview ? (
                  <Input
                    className="text-sm font-medium leading-normal border-none focus:border-none hover:bg-gray-100"
                    placeholder="Enter The Title"
                    value={title}
                    style={{ paddingLeft: 6 }}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                ) : (
                  <div className="text-sm font-medium leading-normal">{title}</div>
                )}
              </div>
            </div>

            <div className="relative flex-grow overflow-y-auto pr-2 -mr-2">
              {!isPreview ? (
                <EditorContent
                  editor={editor}
                  className={classNames(
                    'text-xs memo-node-editor h-full w-full',
                    { 'pointer-events-auto': isOperating },
                    { 'pointer-events-none': !isOperating },
                  )}
                />
              ) : (
                <MarkdownPreview content={data?.contentPreview ?? ''} />
              )}
            </div>

            <div className="flex justify-end items-center flex-shrink-0 mt-2 text-[10px] text-gray-400 z-20">
              {time(data.createdAt, language as LOCALE)
                ?.utc()
                ?.fromNow()}
            </div>
          </div>
        </div>
      </div>

      {!isPreview && selected && (
        <Moveable
          target={targetRef}
          resizable={true}
          edge={false}
          throttleResize={1}
          renderDirections={['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']}
          onResizeStart={({ setOrigin, dragStart }) => {
            setOrigin(['%', '%']);
            if (dragStart && dragStart instanceof MouseEvent) {
              dragStart.preventDefault();
            }
          }}
          onResize={({ target, width, height, direction }) => {
            const newWidth = Math.max(100, width);
            const newHeight = Math.max(80, height);

            let newLeft = (target as HTMLElement).offsetLeft;
            let newTop = (target as HTMLElement).offsetTop;

            if (direction[0] === -1) {
              newLeft = (target as HTMLElement).offsetLeft - (newWidth - (target as HTMLElement).offsetWidth);
            }
            if (direction[1] === -1) {
              newTop = (target as HTMLElement).offsetTop - (newHeight - (target as HTMLElement).offsetHeight);
            }

            target.style.width = `${newWidth}px`;
            target.style.height = `${newHeight}px`;
            target.style.left = `${newLeft}px`;
            target.style.top = `${newTop}px`;

            setSize({ width: newWidth, height: newHeight });
          }}
          hideDefaultLines={true}
          className={`!pointer-events-auto ${!isHovered ? 'moveable-control-hidden' : 'moveable-control-show'}`}
        />
      )}
    </div>
  );
};
