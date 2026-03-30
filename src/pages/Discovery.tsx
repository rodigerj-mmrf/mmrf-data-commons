import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Center, Select, Tabs, Text } from '@mantine/core';
import {
  type DiscoveryConfig,
  type FooterProps,
  type HeaderMetadata,
  type HeaderProps,
  DiscoveryIndexPanel,
  NavPageLayout,
  DiscoveryPageGetServerSideProps as getServerSideProps,
  DiscoveryCellRendererFactory,
  registerDiscoveryDefaultCellRenderers,
} from '@gen3/frontend';
import { GEN3_FENCE_API, useGetMDSQuery } from '@gen3/core';


registerDiscoveryDefaultCellRenderers();

const DemoManifestCellRenderer = ({ value }: { value: unknown }) => {
  if (!Array.isArray(value)) return <Text>0</Text>;
  if (value.length === 0) return <Text>0</Text>;
  const firstEntry = value[0];
  if (!Array.isArray(firstEntry)) return <Text>{value.length}</Text>;
  return <Text>{firstEntry.length}</Text>;
};

DiscoveryCellRendererFactory.registerCellRendererCatalog({
  manifest: {
    default: DemoManifestCellRenderer,
    inline: DemoManifestCellRenderer,
  },
});

type DiscoveryRouteProps = {
  headerProps: HeaderProps;
  footerProps: FooterProps;
  discoveryConfig?: DiscoveryConfig;
};

type DiscoveryIndexConfig = DiscoveryConfig['metadataConfig'][number];

const EmptyHeader = () => null;
const ABSTRACT_FIELD_NAME = 'study_description';
const ABSTRACT_LABEL = 'Abstract';
const DETAIL_PANEL_CELL_SELECTOR = '.mantine-Table-tr-detail-panel > td';
const DETAIL_PANEL_HEADER_ATTRIBUTE = 'data-discovery-abstract-header';
const DETAIL_PANEL_OBSERVER_DEBOUNCE_MS = 100;
const DRAWER_CONTENT_SELECTOR = '.mantine-Drawer-content';
const ACCESS_BANNER_BASE_CLASS =
  'flex w-full items-center rounded-sm border-2 py-3 px-1';
const ACCESS_GRANTED_TEXT = 'You have access to this data.';
const ACCESS_DENIED_TEXT = 'You do not have access to this data.';

type DiscoveryStudyRecord = Record<string, unknown>;

const extractLabel = (config: DiscoveryIndexConfig, index: number): string => {
  const pageTitle = config.features?.pageTitle as
    | { title?: string; text?: string }
    | undefined;
  return config.label ?? pageTitle?.title ?? pageTitle?.text ?? `Index ${index + 1}`;
};

const renameStudyDescriptionField = <
  T extends {
    field?: string;
    name?: string;
  } | undefined,
>(
  fieldConfig: T,
): T =>
  fieldConfig?.field === ABSTRACT_FIELD_NAME
    ? ({ ...fieldConfig, name: ABSTRACT_LABEL } as T)
    : fieldConfig;

const patchDiscoveryIndexLabels = (
  config: DiscoveryIndexConfig,
): DiscoveryIndexConfig => ({
  ...config,
  studyPreviewField: renameStudyDescriptionField(config.studyPreviewField),
  simpleDetailsView: config.simpleDetailsView
    ? {
        ...config.simpleDetailsView,
        fieldsToShow: config.simpleDetailsView.fieldsToShow?.map((group) => ({
          ...group,
          fields: group.fields?.map(renameStudyDescriptionField),
        })),
      }
    : config.simpleDetailsView,
});

const shouldHideSelectionColumn = (config?: DiscoveryIndexConfig): boolean =>
  !config?.tableConfig?.selectableRows &&
  !config?.tableConfig?.selectableRowConfiguration;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractStudyRecordsFromMDSResponse = (
  response: unknown,
  studyField: string,
): Array<DiscoveryStudyRecord> => {
  if (!isRecord(response) || !isRecord(response.data)) {
    return [];
  }

  return Object.values(response.data).reduce<Array<DiscoveryStudyRecord>>(
    (acc, entry) => {
      if (!isRecord(entry)) {
        return acc;
      }

      const studyRecord = entry[studyField];
      if (isRecord(studyRecord)) {
        acc.push(studyRecord);
      }

      return acc;
    },
    [],
  );
};

const getFirstDownloadGuid = (study: DiscoveryStudyRecord): string | undefined => {
  const downloadLinks = study.data_download_links;
  if (!Array.isArray(downloadLinks) || downloadLinks.length === 0) {
    return undefined;
  }

  const firstDownloadLink = downloadLinks[0];
  if (!isRecord(firstDownloadLink)) {
    return undefined;
  }

  const guid = firstDownloadLink.guid;
  return typeof guid === 'string' && guid.length > 0 ? guid : undefined;
};

const getVisibleDiscoveryDrawer = (): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>(DRAWER_CONTENT_SELECTOR)).find(
    (drawer) => {
      const { width, height } = drawer.getBoundingClientRect();
      return width > 0 && height > 0;
    },
  ) ?? null;

const getDrawerAccessBanner = (drawer: HTMLElement): HTMLDivElement | null =>
  Array.from(drawer.querySelectorAll<HTMLDivElement>('div')).find((element) => {
    const text = element.textContent?.trim();
    return text === ACCESS_GRANTED_TEXT || text === ACCESS_DENIED_TEXT;
  }) ?? null;

const setDrawerAccessBannerState = (
  banner: HTMLDivElement,
  hasDownloadAccess: boolean,
) => {
  banner.className = `${ACCESS_BANNER_BASE_CLASS} ${
    hasDownloadAccess
      ? 'bg-green-100 border-green-500 text-black pl-2'
      : 'bg-yellow-100 border-yellow-500 text-black pl-2'
  }`;
  banner.textContent = hasDownloadAccess ? ACCESS_GRANTED_TEXT : ACCESS_DENIED_TEXT;
};

const probeDownloadAccess = async (
  guid: string,
): Promise<boolean | undefined> => {
  try {
    const response = await fetch(
      `${GEN3_FENCE_API}/data/download/${encodeURIComponent(
        guid,
      )}?redirect=true&expires_in=900`,
      {
        method: 'GET',
        credentials: 'include',
        redirect: 'manual',
        cache: 'no-store',
      },
    );

    if (response.type === 'opaqueredirect') {
      return true;
    }

    if (response.status >= 200 && response.status < 400) {
      return true;
    }

    if ([401, 403, 404].includes(response.status)) {
      return false;
    }
  } catch (error) {
    console.error('Unable to verify discovery file download access', error);
  }

  return undefined;
};

const addAbstractHeadersToDetailPanels = () => {
  document
    .querySelectorAll<HTMLTableCellElement>(DETAIL_PANEL_CELL_SELECTOR)
    .forEach((cell) => {
      if (cell.querySelector(`[${DETAIL_PANEL_HEADER_ATTRIBUTE}]`)) {
        return;
      }

      const header = document.createElement('div');
      header.setAttribute(DETAIL_PANEL_HEADER_ATTRIBUTE, 'true');
      header.textContent = ABSTRACT_LABEL;
      header.style.fontSize = 'var(--mantine-font-size-sm)';
      header.style.fontWeight = '400';
      header.style.marginBottom = '0.25rem';

      cell.prepend(header);
    });
};

const renderDiscoveryIndexPanel = (
  config: DiscoveryIndexConfig,
  indexSelector: React.ReactNode | null,
) => (
  <div
    className="w-full"
    data-hide-selection-column={
      shouldHideSelectionColumn(config) ? 'true' : undefined
    }
  >
    <DiscoveryIndexPanel discoveryConfig={config} indexSelector={indexSelector} />
  </div>
);

const Discovery = ({
  headerProps,
  footerProps,
  discoveryConfig,
}: DiscoveryRouteProps) => {
  const discoveryContainerRef = useRef<HTMLDivElement | null>(null);
  const metadataConfig = Array.isArray(discoveryConfig?.metadataConfig)
    ? discoveryConfig.metadataConfig
    : [];
  const patchedMetadataConfig = useMemo(
    () => metadataConfig.map(patchDiscoveryIndexLabels),
    [metadataConfig],
  );
  const [metadataIndex, setMetadataIndex] = useState('0');
  const downloadAccessCache = useRef<Record<string, boolean>>({});
  const downloadAccessRequests = useRef<
    Record<string, Promise<boolean | undefined>>
  >({});
  const menuItems = useMemo(
    () =>
      patchedMetadataConfig.map((config, index) => ({
        value: index.toString(),
        label: extractLabel(config, index),
      })),
    [patchedMetadataConfig],
  );
  const selectedMetadataConfig =
    patchedMetadataConfig[Number.parseInt(metadataIndex, 10)] ??
    patchedMetadataConfig[0];
  const selectedStudyField = selectedMetadataConfig?.studyField ?? 'gen3_discovery';
  const selectedStudyTitleField =
    selectedMetadataConfig?.simpleDetailsView?.header?.field ?? 'study_title';
  const { data: discoveryMetadata } = useGetMDSQuery(
    {
      guidType: selectedMetadataConfig?.guidType ?? 'discovery_metadata',
      studyField: selectedStudyField,
      offset: 0,
      pageSize: selectedMetadataConfig?.maxStudies ?? 10000,
    },
    {
      skip: !selectedMetadataConfig,
    },
  );
  const firstDownloadGuidByStudyTitle = useMemo(() => {
    const studyRecords = extractStudyRecordsFromMDSResponse(
      discoveryMetadata,
      selectedStudyField,
    );

    return studyRecords.reduce<Map<string, string>>((acc, study) => {
      const title = study[selectedStudyTitleField];
      const guid = getFirstDownloadGuid(study);

      if (typeof title === 'string' && title.length > 0 && guid) {
        acc.set(title, guid);
      }

      return acc;
    }, new Map<string, string>());
  }, [discoveryMetadata, selectedStudyField, selectedStudyTitleField]);

  const syncDiscoveryAccessBanner = useCallback(() => {
    const drawer = getVisibleDiscoveryDrawer();
    if (!drawer) {
      return;
    }

    const drawerTitle = drawer.querySelector('h1')?.textContent?.trim();
    const accessBanner = getDrawerAccessBanner(drawer);
    if (!drawerTitle || !accessBanner) {
      return;
    }

    const firstDownloadGuid = firstDownloadGuidByStudyTitle.get(drawerTitle);
    if (!firstDownloadGuid) {
      return;
    }

    const cachedAccess = downloadAccessCache.current[firstDownloadGuid];
    if (cachedAccess !== undefined) {
      setDrawerAccessBannerState(accessBanner, cachedAccess);
      return;
    }

    if (!downloadAccessRequests.current[firstDownloadGuid]) {
      downloadAccessRequests.current[firstDownloadGuid] = probeDownloadAccess(
        firstDownloadGuid,
      ).then((hasAccess) => {
        if (hasAccess !== undefined) {
          downloadAccessCache.current[firstDownloadGuid] = hasAccess;
        }
        delete downloadAccessRequests.current[firstDownloadGuid];
        return hasAccess;
      });
    }

    void downloadAccessRequests.current[firstDownloadGuid]?.then((hasAccess) => {
      if (hasAccess === undefined) {
        return;
      }

      const activeDrawer = getVisibleDiscoveryDrawer();
      if (!activeDrawer) {
        return;
      }

      const activeBanner = getDrawerAccessBanner(activeDrawer);
      const activeTitle = activeDrawer.querySelector('h1')?.textContent?.trim();
      if (!activeBanner || activeTitle !== drawerTitle) {
        return;
      }

      setDrawerAccessBannerState(activeBanner, hasAccess);
    });
  }, [firstDownloadGuidByStudyTitle]);

  useEffect(() => {
    document.body.dataset.discoveryPage = 'true';
    addAbstractHeadersToDetailPanels();
    syncDiscoveryAccessBanner();

    const observerTarget = discoveryContainerRef.current;
    let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
    const handleMutation = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        addAbstractHeadersToDetailPanels();
        syncDiscoveryAccessBanner();
      }, DETAIL_PANEL_OBSERVER_DEBOUNCE_MS);
    };
    const observer = observerTarget ? new MutationObserver(handleMutation) : null;
    const drawerObserver = new MutationObserver(handleMutation);

    if (observerTarget && observer) {
      observer.observe(observerTarget, {
        childList: true,
        subtree: true,
      });
    }

    drawerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer?.disconnect();
      drawerObserver.disconnect();
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      delete document.body.dataset.discoveryPage;
    };
  }, [syncDiscoveryAccessBanner]);

  useEffect(() => {
    syncDiscoveryAccessBanner();
  }, [syncDiscoveryAccessBanner]);

  if (!discoveryConfig || !Array.isArray(discoveryConfig.metadataConfig)) {
    return (
      <Center maw={400} h={100} mx="auto">
        <div>Discovery config is not defined. Page disabled</div>
      </Center>
    );
  }

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
      CustomFooterComponent={EmptyHeader}
    >
      <div ref={discoveryContainerRef} className="w-full">
        {menuItems.length === 0 ? (
          <Center maw={400} h={100} mx="auto">
            <div>No discovery configuration</div>
          </Center>
        ) : menuItems.length === 1 ? (
          renderDiscoveryIndexPanel(patchedMetadataConfig[0], null)
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
                  {renderDiscoveryIndexPanel(
                    patchedMetadataConfig[Number.parseInt(item.value, 10)],
                    menuItems.length > 1 ? (
                      <Select
                        label="Metadata:"
                        data={menuItems}
                        value={metadataIndex}
                        onChange={(value) => setMetadataIndex(value ?? '0')}
                      />
                    ) : null,
                  )}
                </Tabs.Panel>
              ))}
            </Tabs>
          </div>
        )}
      </div>
    </NavPageLayout>
  );
};

export default Discovery;

export { getServerSideProps };
