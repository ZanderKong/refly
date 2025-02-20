import { Modal } from '@arco-design/web-react';
import { Menu, Divider, Splitter } from 'antd';
import { HiLink } from 'react-icons/hi';
import {
  ImportResourceMenuItem,
  useImportResourceStore,
} from '@refly-packages/ai-workspace-common/stores/import-resource';

import { ImportFromWeblink } from './intergrations/import-from-weblink';
import { ImportFromText } from './intergrations/import-from-text';
import { useTranslation } from 'react-i18next';

import './index.scss';
import { useEffect } from 'react';
import { getPopupContainer } from '@refly-packages/ai-workspace-common/utils/ui';
import { getRuntime } from '@refly-packages/ai-workspace-common/utils/env';
import MultilingualSearch from '@refly-packages/ai-workspace-common/modules/multilingual-search';
import { TbClipboard, TbWorldSearch } from 'react-icons/tb';
import { IconImportResource } from '@refly-packages/ai-workspace-common/components/common/icon';

const MenuItem = Menu.Item;

export const ImportResourceModal = () => {
  const { t } = useTranslation();
  const importResourceStore = useImportResourceStore((state) => ({
    importResourceModalVisible: state.importResourceModalVisible,
    setImportResourceModalVisible: state.setImportResourceModalVisible,
    selectedMenuItem: state.selectedMenuItem,
    setSelectedMenuItem: state.setSelectedMenuItem,
    setInsertNodePosition: state.setInsertNodePosition,
  }));

  const runtime = getRuntime();
  const isWeb = runtime === 'web';

  useEffect(() => {
    return () => {
      importResourceStore.setInsertNodePosition(null);
    };
  }, []);

  return (
    <Modal
      visible={importResourceStore.importResourceModalVisible}
      footer={null}
      onCancel={() => {
        importResourceStore.setImportResourceModalVisible(false);
      }}
      getPopupContainer={getPopupContainer}
      className="import-resource-modal"
      style={{
        height: '70%',
        minHeight: 500,
        maxHeight: 660,
        width: '65%',
        minWidth: '300px',
        maxWidth: '1050px',
      }}
    >
      <div className="import-resource-container">
        <Splitter>
          <Splitter.Panel collapsible={false} resizable={false} defaultSize={180}>
            {isWeb ? (
              <div className="import-resource-left-panel">
                <div className="left-panel-header">
                  <div className="left-panel-header-title">
                    <IconImportResource className="text-2xl" />
                    <span className="left-panel-header-title-text">
                      {t('resource.import.title')}
                    </span>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <Menu
                    selectedKeys={[importResourceStore.selectedMenuItem]}
                    onClick={(info) => {
                      importResourceStore.setSelectedMenuItem(info.key as ImportResourceMenuItem);
                    }}
                  >
                    <MenuItem key="import-from-web-search">
                      <span className="flex items-center justify-center mr-2">
                        <TbWorldSearch className="text-base" />
                      </span>
                      {t('resource.import.fromWebSearch')}
                    </MenuItem>
                    <MenuItem key="import-from-weblink">
                      <span className="flex items-center justify-center mr-2">
                        <HiLink className="text-base" />
                      </span>
                      {t('resource.import.fromWeblink')}
                    </MenuItem>
                    <MenuItem key="import-from-paste-text">
                      <span className="flex items-center justify-center mr-2">
                        <TbClipboard className="text-base" />
                      </span>
                      {t('resource.import.fromText')}
                    </MenuItem>
                  </Menu>
                </div>
              </div>
            ) : null}
          </Splitter.Panel>
          <Splitter.Panel collapsible={false} resizable={false}>
            <div className="import-resource-right-panel">
              {importResourceStore.selectedMenuItem === 'import-from-weblink' ? (
                <ImportFromWeblink />
              ) : null}
              {importResourceStore.selectedMenuItem === 'import-from-paste-text' ? (
                <ImportFromText />
              ) : null}
              {importResourceStore.selectedMenuItem === 'import-from-web-search' ? (
                <MultilingualSearch />
              ) : null}
            </div>
          </Splitter.Panel>
        </Splitter>
      </div>
    </Modal>
  );
};
