// components
import { Message } from '@arco-design/web-react';

// requests
import getClient from '@refly-packages/ai-workspace-common/requests/proxiedRequest';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { editorEmitter } from '@refly-packages/utils/event-emitter/editor';
import { useJumpNewPath } from '@refly-packages/ai-workspace-common/hooks/use-jump-new-path';
import { useDocumentStoreShallow } from '@refly-packages/ai-workspace-common/stores/document';
import { useProjectTabs } from '@refly-packages/ai-workspace-common/hooks/use-project-tabs';
import { useDebouncedCallback } from 'use-debounce';

interface CreateCanvasParams {
  content?: string;
  title?: string;
  projectId?: string;
}

export const useAINote = (shouldInitListener = false) => {
  const { t } = useTranslation();
  const canvasStore = useDocumentStoreShallow((state) => ({
    isCreatingNewCanvasOnHumanMessage: state.isCreatingNewCanvasOnHumanMessage,
    updateNewNoteCreating: state.updateNewCanvasCreating,
    updateNotePanelVisible: state.updateCanvasPanelVisible,
    updateIsCreatingNewCanvasOnHumanMessage: state.updateIsCreatingNewCanvasOnHumanMessage,
  }));
  const { jumpToCanvas } = useJumpNewPath();
  const { handleAddTab: handleAddProjectTab } = useProjectTabs();

  const handleInitEmptyNote = async ({
    content,
    title: canvasTitle,
    projectId: relatedProjectId,
  }: CreateCanvasParams) => {
    canvasStore.updateNewNoteCreating(true);

    const res = await getClient().createCanvas({
      body: {
        title: canvasTitle || t('knowledgeBase.note.defaultTitle'),
        initialContent: content || '',
        projectId: relatedProjectId,
      },
    });

    if (!res?.data?.success) {
      Message.error(t('knowledgeBase.note.createNoteFailed'));
      throw new Error(t('knowledgeBase.note.createNoteFailed'));
    }

    canvasStore.updateNewNoteCreating(false);

    const { canvasId, title, projectId } = res?.data?.data;
    jumpToCanvas({
      canvasId,
      // @ts-ignore
      projectId: res?.data?.data?.projectId, // TODO: 这里需要补充 canvas 的 projectId
    });
    handleAddProjectTab({
      projectId,
      key: canvasId,
      title,
      type: 'canvas',
    });
  };

  const debouncedHandleInitEmptyNote = useDebouncedCallback(
    (params: { content: string }) => {
      return handleInitEmptyNote(params);
    },
    300,
    { leading: true },
  );

  useEffect(() => {
    if (shouldInitListener) {
      const handler = async (content: string) => {
        if (canvasStore.isCreatingNewCanvasOnHumanMessage) {
          return;
        }
        canvasStore.updateIsCreatingNewCanvasOnHumanMessage(true);
        try {
          await debouncedHandleInitEmptyNote({ content });
        } catch (error) {
          console.error('Failed to create note:', error);
        }
        canvasStore.updateIsCreatingNewCanvasOnHumanMessage(false);
      };

      editorEmitter.on('createNewNote', handler);

      // 添加清理函数
      return () => {
        editorEmitter.off('createNewNote', handler);
      };
    }
  }, [shouldInitListener]);

  return {
    handleInitEmptyNote,
  };
};
