import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Steps } from 'antd';
import { useActionResultStoreShallow } from '@refly-packages/ai-workspace-common/stores/action-result';
import getClient from '@refly-packages/ai-workspace-common/requests/proxiedRequest';
import { Artifact } from '@refly/openapi-schema';
import { FileText, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Markdown } from '@refly-packages/ai-workspace-common/components/markdown';
import './skill-response.scss';
import { IconCheckCircle, IconLoading } from '@arco-design/web-react/icon';
import { cn } from '@refly-packages/utils/cn';
import { ContextItem } from '@refly-packages/ai-workspace-common/components/copilot/copilot-operation-module/context-manager/context-item';
import { useProcessContextItems } from '@refly-packages/ai-workspace-common/components/copilot/copilot-operation-module/context-manager/hooks/use-process-context-items';
import { useCanvasControl } from '@refly-packages/ai-workspace-common/hooks/use-canvas-control';
import { genUniqueId } from '@refly-packages/utils/id';
import { CanvasNode } from '@refly-packages/ai-workspace-common/components/canvas/nodes';
import { SelectionContext } from '@refly-packages/ai-workspace-common/components/selection-context';

interface SkillResponseNodePreviewProps {
  resultId: string;
}

const getArtifactIcon = (artifact: Artifact) => {
  switch (artifact.type) {
    case 'document':
      return <FileText className="w-4 h-4" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
};

export const SkillResponseNodePreview = ({ resultId }: SkillResponseNodePreviewProps) => {
  const { t } = useTranslation();
  const { result, updateActionResult } = useActionResultStoreShallow((state) => ({
    result: state.resultMap[resultId],
    updateActionResult: state.updateActionResult,
  }));
  const [logBoxCollapsed, setLogBoxCollapsed] = useState(false);
  const { nodes, setSelectedNode } = useCanvasControl();

  const fetchActionResult = async (resultId: string) => {
    const { data, error } = await getClient().getActionResult({
      query: { resultId },
    });

    if (error || !data?.success) {
      return;
    }

    updateActionResult(resultId, data.data);
  };

  const buildNodeData = (text: string) => {
    const id = genUniqueId();

    const node: CanvasNode = {
      id,
      type: 'skillResponse',
      position: { x: 0, y: 0 },
      data: {
        entityId: result.resultId ?? '',
        title: result.title ?? 'Selected Content',
        metadata: {
          contentPreview: text,
          selectedContent: text,
          xPath: id,
          sourceType: 'skillResponseSelection',
        },
      },
    };

    return node;
  };

  useEffect(() => {
    if (!result) {
      fetchActionResult(resultId);
    }
  }, [resultId]);

  useEffect(() => {
    const container = document.body.querySelector('.preview-container');
    if (result?.status === 'executing' && container) {
      const { scrollHeight, clientHeight } = container;
      container.scroll({
        behavior: 'smooth',
        top: scrollHeight - clientHeight + 50,
      });
    }
  }, [result?.status, result?.content]);

  useEffect(() => {
    if (result?.status === 'finish') {
      setLogBoxCollapsed(true);
    } else if (result?.status === 'executing') {
      setLogBoxCollapsed(false);
    }
  }, [result?.status]);

  const { invokeParam, actionMeta } = result ?? {};
  const { input, context } = invokeParam ?? {};

  const { processContextItemsFromMessage } = useProcessContextItems();
  const contextItems = processContextItemsFromMessage(context);

  return (
    <div className="flex flex-col space-y-4 p-4">
      <div>
        {actionMeta?.icon?.value}
        {actionMeta?.name}
      </div>

      <div className="m-6 border border-solid border-gray-200 rounded-lg p-2 flex items-center space-x-2">
        <div>
          {contextItems.length > 0 && (
            <div className="context-items-container">
              {contextItems.map((item) => (
                <ContextItem
                  canNotRemove={true}
                  key={item.id}
                  item={item}
                  isLimit={false}
                  isActive={false}
                  onToggle={() => {}}
                />
              ))}
            </div>
          )}
        </div>
        <div>{input?.query}</div>
      </div>

      <div
        className={cn('m-6 p-4 border border-solid border-gray-200 rounded-lg transition-all', {
          'px-4 py-2 cursor-pointer hover:bg-gray-50': logBoxCollapsed,
          'relative pb-0': !logBoxCollapsed,
        })}
      >
        {logBoxCollapsed ? (
          <div
            className="text-gray-500 text-sm flex items-center justify-between"
            onClick={() => setLogBoxCollapsed(false)}
          >
            <div>
              <IconCheckCircle /> {t('canvas.skillResponse.skillCompleted')}
            </div>
            <div className="flex items-center">
              <ChevronDown className="w-6 h-6" />
            </div>
          </div>
        ) : (
          <>
            <Steps
              direction="vertical"
              current={result.logs?.length ?? 0}
              size="small"
              items={result.logs?.map((log, index) => ({
                title: log,
                description: 'This is a description.',
              }))}
            />
            <Button
              type="text"
              icon={<ChevronUp />}
              onClick={() => setLogBoxCollapsed(true)}
              className="absolute right-2 top-2"
            />
          </>
        )}
      </div>

      {result.content && (
        <div className="m-6 text-gray-600 text-base skill-response-content">
          <Markdown content={result.content} />
          <SelectionContext
            containerClass="skill-response-content"
            getNodeData={(text) => buildNodeData(text)}
          ></SelectionContext>
        </div>
      )}

      {result.artifacts?.map((artifact) => (
        <div
          className="border border-solid border-gray-200 rounded-lg m-6 px-4 py-2 h-12 flex items-center justify-between space-x-2 cursor-pointer hover:bg-gray-50"
          onClick={() => {
            const node = nodes.find((node) => node.data.entityId === artifact.entityId);
            if (node) {
              setSelectedNode(node);
            }
          }}
        >
          <div className="flex items-center space-x-2">
            {getArtifactIcon(artifact)}
            <span className="text-gray-600 max-w-[200px] truncate inline-block">{artifact.title}</span>
          </div>
          <div
            className={cn('flex items-center space-x-1 text-xs', {
              'text-yellow-500': artifact.status === 'generating',
              'text-green-500': artifact.status === 'finish',
            })}
          >
            {artifact.status === 'generating' && (
              <>
                <IconLoading />
                <span>{t('artifact.generating')}</span>
              </>
            )}
            {artifact.status === 'finish' && (
              <>
                <IconCheckCircle />
                <span>{t('artifact.completed')}</span>
              </>
            )}
          </div>
        </div>
      ))}

      {result.tokenUsage?.length > 0 && (
        <>
          <Divider />
          <div className="flex items-center space-x-2 text-gray-500 text-sm m-6">
            {result.tokenUsage?.map((usage) => (
              <span key={usage.modelName}>
                {usage.modelName}: {usage.inputTokens + usage.outputTokens} Tokens
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
