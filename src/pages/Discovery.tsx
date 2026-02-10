import React, { useMemo, useState } from 'react';
import { Center, Select, Tabs, Text } from '@mantine/core';
import {
  type DiscoveryConfig,
  type FooterProps,
  type HeaderMetadata,
  type HeaderProps,
} from '@gen3/frontend';
import DiscoveryIndexPanel from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/DiscoveryIndexPanel';
import NavPageLayout from '../../node_modules/@gen3/frontend/dist/dts/features/Navigation/NavPageLayout';
import { DiscoveryPageGetServerSideProps as getServerSideProps } from '../../node_modules/@gen3/frontend/dist/dts/pages/Discovery/data';
import { registerDiscoveryDataLoader } from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/DataLoaders/registeredDataLoaders';
import type { DiscoveryDataLoader } from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/DataLoaders/registeredDataLoaders';
import { DiscoveryCellRendererFactory } from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/TableRenderers/CellRendererFactory';
import {
  registerDiscoveryDefaultCellRenderers,
} from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/TableRenderers/CellRenderers';
import {
  registerDiscoveryDefaultStudyPreviewRenderers,
} from '../../node_modules/@gen3/frontend/dist/dts/features/Discovery/TableRenderers/RowRendererFactory';

registerDiscoveryDefaultCellRenderers();
registerDiscoveryDefaultStudyPreviewRenderers();

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

type DiscoveryDataLoaderParams = {
  pagination: {
    offset: number;
    pageSize: number;
  };
  searchTerms: {
    keyword?: {
      keywords?: string[];
    };
  };
  discoveryConfig: DiscoveryIndexConfig;
};

type DiscoverySummaryStatistic = {
  name: string;
  field: string;
  type: 'sum' | 'count';
  value: unknown;
};

type DiscoveryDataLoaderResponse = {
  data: Array<Record<string, unknown>>;
  hits: number;
  advancedSearchFilterValues: Array<{
    key: string;
    keyDisplayName?: string;
    valueDisplayNames?: Record<string, string>;
  }>;
  dataRequestStatus: {
    isFetching: boolean;
    isLoading: boolean;
    isUninitialized: boolean;
    isSuccess: boolean;
    isError: boolean;
  };
  summaryStatistics: DiscoverySummaryStatistic[];
  charts: Record<string, unknown>;
  suggestions: string[];
  clearSearch?: () => void;
};

const DEMO_DISCOVERY_DATA_LOADER = 'MMRFDemoDiscoveryDataLoader';

const DEMO_DISCOVERY_RECORDS: Array<Record<string, unknown>> = [
  {
    _hdp_uid: 'NCT01454297',
    _unique_id: 'NCT01454297',
    full_name:
      'Comprehensive molecular profiling of multiple myeloma identifies refined copy number and expression subtypes',
    study_title:
      'Comprehensive molecular profiling of multiple myeloma identifies refined copy number and expression subtypes',
    study_description:
      "Multiple myeloma is a treatable, but currently incurable, hematological malignancy of plasma cells characterized by diverse and complex tumor genetics for which precision medicine approaches to treatment are lacking. The Multiple Myeloma Research Foundation's Relating Clinical Outcomes in Multiple Myeloma to Personal Assessment of Genetic Profile study (NCT01454297) is a longitudinal, observational clinical study of newly diagnosed patients with multiple myeloma (n=1,143) where tumor samples are characterized using whole-genome sequencing, whole-exome sequencing and RNA sequencing at diagnosis and progression, and clinical data are collected every 3 months. Analyses of the baseline cohort identified genes that are the target of recurrent gain-of-function and loss-of-function events. Consensus clustering identified 8 and 12 unique copy number and expression subtypes of myeloma, respectively, identifying high-risk genetic subtypes and elucidating many of the molecular underpinnings of these unique biological groups. Analysis of serial samples showed that 25.5% of patients transition to a high-risk expression subtype at progression. We observed robust expression of immunotherapy targets in this subtype, suggesting a potential therapeutic option.",
    source: 'ClinicalTrials.gov',
    link: 'https://clinicaltrials.gov/study/NCT01454297',
    project_id: 'NCT01454297',
    subjects_count: 1143,
    data_files_count: 0,
    __manifest: [],
    data_download_links: [],
    funding: 'Multiple Myeloma Research Foundation',
    authz: ['/open'],
    __accessible: true,
  },
  {
    _hdp_uid: 's43018-025-01072-4',
    _unique_id: 's43018-025-01072-4',
    full_name:
      'A single-cell atlas characterizes dysregulation of the bone marrow immune microenvironment associated with outcomes in multiple myeloma',
    study_title:
      'A single-cell atlas characterizes dysregulation of the bone marrow immune microenvironment associated with outcomes in multiple myeloma',
    study_description:
      'Multiple myeloma (MM) remains incurable despite advances in treatment options. Although tumor subtypes and specific DNA abnormalities are linked to worse prognosis, the impact of immune dysfunction on disease emergence and/or treatment sensitivity remains unclear. We developed an Immune Atlas of MM by generating profiles of 1,397,272 single cells from the bone marrow (BM) of 337 newly diagnosed participants and characterized immune and hematopoietic cell populations. Cytogenetic risk-based analysis revealed heterogeneous associations with T cells of BM, with 17p13 deletion showing distinct enrichment of a type 1 interferon signature. The disease progression-based analysis revealed the presence of a proinflammatory immune senescence-associated secretory phenotype in rapidly progressing participants. Furthermore, signaling analyses suggested active intercellular communication involving a proliferation-inducing ligand and B cell maturation antigen, potentially promoting tumor growth and survival. Lastly, using independent discovery and validation cohorts, we demonstrated that integrating immune cell signatures with known tumor cytogenetics and individual characteristics significantly improves stratification for the prediction of survival.',
    source: 'Nature Cancer',
    link: 'https://www.nature.com/articles/s43018-025-01072-4',
    project_id: 's43018-025-01072-4',
    subjects_count: 337,
    data_files_count: 0,
    __manifest: [],
    data_download_links: [],
    funding: 'Multiple Myeloma Research Foundation',
    authz: ['/open'],
    __accessible: true,
  },
];

const getFieldValue = (record: Record<string, unknown>, field: string): unknown => {
  if (field in record) return record[field];
  if (!field.includes('.')) return undefined;
  return field.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc === 'object' && acc !== null && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
};

const toSearchableString = (value: unknown): string => {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(' ');
  if (value === undefined || value === null) return '';
  return String(value);
};

const useDemoDiscoveryDataLoader = ({
  pagination,
  searchTerms,
  discoveryConfig,
}: DiscoveryDataLoaderParams): DiscoveryDataLoaderResponse => {
  const searchableFields =
    discoveryConfig.features?.search?.searchBar?.searchableTextFields ?? [
      'study_description',
      '_unique_id',
      'full_name',
    ];

  const normalizedSearch = (searchTerms.keyword?.keywords ?? [])
    .join(' ')
    .trim()
    .toLowerCase();

  const filteredData = useMemo(() => {
    if (!normalizedSearch) return DEMO_DISCOVERY_RECORDS;
    return DEMO_DISCOVERY_RECORDS.filter((record) => {
      const haystack = searchableFields
        .map((field) => toSearchableString(getFieldValue(record, field)))
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, searchableFields]);

  const paginatedData = useMemo(
    () => filteredData.slice(pagination.offset, pagination.offset + pagination.pageSize),
    [filteredData, pagination.offset, pagination.pageSize],
  );

  const summaryStatistics = useMemo<DiscoverySummaryStatistic[]>(
    () =>
      (discoveryConfig.aggregations ?? []).map((aggregation) => ({
        ...aggregation,
        value: aggregation.type === 'count' ? filteredData.length : 0,
      })),
    [discoveryConfig.aggregations, filteredData.length],
  );

  return {
    data: paginatedData,
    hits: filteredData.length,
    advancedSearchFilterValues: [],
    dataRequestStatus: {
      isFetching: false,
      isLoading: false,
      isUninitialized: false,
      isSuccess: true,
      isError: false,
    },
    summaryStatistics,
    charts: {},
    suggestions: [],
  };
};

registerDiscoveryDataLoader(
  DEMO_DISCOVERY_DATA_LOADER,
  useDemoDiscoveryDataLoader as unknown as DiscoveryDataLoader,
);

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

  const demoDiscoveryConfig = useMemo<DiscoveryConfig>(
    () => ({
      ...discoveryConfig,
      metadataConfig: discoveryConfig.metadataConfig.map((indexConfig) => ({
        ...indexConfig,
        features: {
          ...indexConfig.features,
          dataLoader: {
            ...(indexConfig.features?.dataLoader ?? {}),
            dataFetchFunction: DEMO_DISCOVERY_DATA_LOADER,
            sortingAndPagination: 'client',
          },
        },
      })),
    }),
    [discoveryConfig],
  );

  const [metadataIndex, setMetadataIndex] = useState('0');
  const menuItems = useMemo(
    () =>
      demoDiscoveryConfig.metadataConfig.map((config, index) => ({
        value: index.toString(),
        label: extractLabel(config, index),
      })),
    [demoDiscoveryConfig.metadataConfig],
  );

  const headerMetadata: HeaderMetadata = {
    title: 'Gen3 Discovery Page',
    content: 'Discovery Data',
    key: 'gen3-discovery-page',
    ...(demoDiscoveryConfig.headerMetadata ?? {}),
  };

  return (
    <NavPageLayout
      headerProps={headerProps}
      footerProps={footerProps}
      headerMetadata={headerMetadata}
      CustomHeaderComponent={EmptyHeader}
      CustomFooterComponent={EmptyHeader}
    >
      <div className="w-full">
        {menuItems.length === 0 ? (
          <Center maw={400} h={100} mx="auto">
            <div>No discovery configuration</div>
          </Center>
        ) : menuItems.length === 1 ? (
          <DiscoveryIndexPanel
            discoveryConfig={demoDiscoveryConfig.metadataConfig[0]}
            indexSelector={null}
          />
        ) : (
          <div className="flex flex-col items-center p-4 w-full bg-base-lightest">
            <Tabs
              className="w-full"
              value={metadataIndex}
              variant={demoDiscoveryConfig.metadataConfig[0]?.tabType}
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
                      demoDiscoveryConfig.metadataConfig[Number.parseInt(item.value, 10)]
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
      </div>
    </NavPageLayout>
  );
};

export default Discovery;

export { getServerSideProps };
