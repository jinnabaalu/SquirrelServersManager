import { Button, Modal, Tabs, TabsProps } from 'antd';
import React from 'react';
import ConfigurationFormSSH from '@/pages/Admin/Inventory/components/ConfigurationFormSSH';
import { API } from 'ssm-shared-lib';

export type ConfigurationModalProps = {
  updateModalOpen: boolean;
  handleUpdateModalOpen: any;
  values: Partial<API.DeviceItem>;
};

const ConfigurationModal: React.FC<ConfigurationModalProps> = (props) => {
  const items: TabsProps['items'] = [
    {
      key: '1',
      label: 'SSH',
      children: <ConfigurationFormSSH values={props.values} />,
    },
  ];

  return (
    <Modal
      style={{ padding: '32px 40px 48px' }}
      width={1000}
      destroyOnClose
      title={`${props.values.hostname} (${props.values.ip})`}
      open={props.updateModalOpen}
      onCancel={() => {
        props.handleUpdateModalOpen(false);
      }}
      footer={() => <div />}
    >
      <Tabs
        onChange={(key: string) => {
          console.log(key);
        }}
        type="card"
        items={items}
      />
    </Modal>
  );
};

export default ConfigurationModal;
