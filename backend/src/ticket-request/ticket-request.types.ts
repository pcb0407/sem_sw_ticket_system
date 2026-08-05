export const MASTER_DATA_GROUPS = {
  products: "products",
  controllerTypes: "controller-types",
  rigTypes: "rig-types",
  requestSources: "request-sources",
  categories: "categories",
  issueTypes: "issue-types",
  issuedSites: "issued-sites",
  priorities: "priorities",
  softwareMainVersions: "software-main-versions",
  softwareSubVersions: "software-sub-versions",
} as const;

export type MasterDataGroupKey = keyof typeof MASTER_DATA_GROUPS;
