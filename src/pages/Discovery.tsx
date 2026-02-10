import React, { useMemo, useState } from 'react';
import { Center, Select, Tabs } from '@mantine/core';
import {
  DiscoveryIndexPanel,
  DiscoveryPageGetServerSideProps as getServerSideProps,
  NavPageLayout,
  type DiscoveryConfig,
  type FooterProps,
  type HeaderMetadata,
  type HeaderProps,
} from '@gen3/frontend';
import { registerDiscoveryCustomCellRenderers } from '@/lib/Discovery/CustomCellRenderers';
import { registerDiscoveryStudyPreviewRenderers } from '@/lib/Discovery/CustomRowRenderers';

registerDiscoveryCustomCellRenderers();
registerDiscoveryStudyPreviewRenderers();

type DiscoveryRouteProps = {
  headerProps: HeaderProps;
  footerProps: FooterProps;
  discoveryConfig?: DiscoveryConfig;
};

type DiscoveryIndexConfig = DiscoveryConfig['metadataConfig'][number];

const EmptyHeader = () => null;

const extractLabel = (config: DiscoveryIndexConfig, index: number): string => {
  const pageTitle = config.features?.pageTitle as
    | { title?: string; text?: string }
    | undefined;
  return config.label ?? pageTitle?.title ?? pageTitle?.text ?? `Index ${index + 1}`;
};

const Discovery = ({
  headerProps,
  footerProps,
  discoveryConfig,
}: DiscoveryRouteProps) => {
  if (!discoveryConfig || !Array.isArray(discoveryConfig.metadataConfig)) {
    return (
      <Center maw={400} h={100} mx="auto">
        <div>Discovery config is not defined. Page disabled</div>
      </Center>
    );
  }

  const [metadataIndex, setMetadataIndex] = useState('0');
  const menuItems = useMemo(
    () =>
      discoveryConfig.metadataConfig.map((config, index) => ({
        value: index.toString(),
        label: extractLabel(config, index),
      })),
    [discoveryConfig.metadataConfig],
  );

  const headerMetadata: HeaderMetadata = {
    title: 'Gen3 Discovery Page',
    content: 'Discovery Data',
    key: 'gen3-discovery-page',
    ...(discoveryConfig.headerMetadata ?? {}),
  };

  return (
    <NavPageLayout
      headerProps={headerProps}
      footerProps={footerProps}
      headerMetadata={headerMetadata}
      CustomHeaderComponent={EmptyHeader}
    >
      {menuItems.length === 0 ? (
        <Center maw={400} h={100} mx="auto">
          <div>No discovery configuration</div>
        </Center>
      ) : menuItems.length === 1 ? (
        <DiscoveryIndexPanel
          discoveryConfig={discoveryConfig.metadataConfig[0]}
          indexSelector={null}
        />
      ) : (
        <div className="flex flex-col items-center p-4 w-full bg-base-lightest">
          <Tabs
            className="w-full"
            value={metadataIndex}
            variant={discoveryConfig.metadataConfig[0]?.tabType}
            onChange={(value) => setMetadataIndex(value ?? '0')}
          >
            <Tabs.List>
              {menuItems.map((item) => (
                <Tabs.Tab key={item.value} value={item.value}>
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {menuItems.map((item) => (
              <Tabs.Panel key={item.value} value={item.value}>
                <DiscoveryIndexPanel
                  discoveryConfig={
                    discoveryConfig.metadataConfig[Number.parseInt(item.value)]
                  }
                  indexSelector={
                    menuItems.length > 1 ? (
                      <Select
                        label="Metadata:"
                        data={menuItems}
                        value={metadataIndex}
                        onChange={(value) => setMetadataIndex(value ?? '0')}
                      />
                    ) : null
                  }
                />
              </Tabs.Panel>
            ))}
          </Tabs>
        </div>
      )}
    </NavPageLayout>
  );
};

export default Discovery;

export { getServerSideProps };
