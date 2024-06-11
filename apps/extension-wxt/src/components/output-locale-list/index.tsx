import { useTranslation } from 'react-i18next';
import { Dropdown, Menu, Typography, Message as message } from '@arco-design/web-react';
import { useUserStore } from '@/stores/user';
import { safeStringifyJSON } from '@refly/ai-workspace-common/utils/parse';
import { LOCALE } from '@/types';
// request
import { type OutputLocale, enLocale, localeToLanguageName } from '@/utils/i18n';
// styles
import './index.scss';
import { apiRequest } from '../../requests/apiRequest';

export const OutputLocaleList = (props: { children: any }) => {
  // i18n
  const { t, i18n } = useTranslation();
  const uiLocale = i18n?.languages?.[0] as LOCALE;

  const userStore = useUserStore();
  const { outputLocale } = userStore?.localSettings || {};

  const changeLang = async (lng: OutputLocale) => {
    const { localSettings } = useUserStore.getState();

    userStore.setLocalSettings({ ...localSettings, outputLocale: lng });

    // await storage.setItem(
    //   "refly-local-settings",
    //   safeStringifyJSON({ ...localSettings, outputLocale: lng })
    // );

    // 不阻塞写回用户配置
    const res = await apiRequest({
      name: 'putUserInfo',
      method: 'PUT',
      body: { outputLocale: lng, uiLocale: localSettings.uiLocale },
    });

    if (!res.success) {
      message.error(t('settings.action.putErrorNotify'));
    }
  };

  console.log('用户当前的模型输出语言', outputLocale);

  const dropList = (
    <Menu
      className={'output-locale-list-menu'}
      onClickMenuItem={(key) => changeLang(key as OutputLocale)}
      style={{ width: 240 }}
    >
      <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
        {t('settings.outputLocale.title')}
      </Typography.Text>
      {enLocale.map((item: OutputLocale) => (
        <Menu.Item key={item}>{localeToLanguageName?.[uiLocale]?.[item]}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown droplist={dropList} position="bl">
      {props.children}
    </Dropdown>
  );
};
