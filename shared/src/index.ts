export interface MasterDataOption {
	id: string;
	code: string;
	name: string;
	description?: string;
	sortOrder: number;
	isActive: boolean;
}

export interface TicketRequestMasterData {
	products: MasterDataOption[];
	controllerTypes: MasterDataOption[];
	rigTypes: MasterDataOption[];
	requestSources: MasterDataOption[];
	categories: MasterDataOption[];
	issueTypes: MasterDataOption[];
	issuedSites: MasterDataOption[];
	priorities: MasterDataOption[];
	softwareMainVersions: MasterDataOption[];
	softwareSubVersions: MasterDataOption[];
}

export interface TicketAttachmentInput {
	fileName: string;
	sizeBytes: number;
	contentType: string;
}

export interface RequestInformationInput {
	requester: string;
	title: string;
	priorityId: string;
	productId: string;
	requestSourceId: string;
	dateFound?: string;
	categoryId: string;
}

export interface PumpTestRigRequestPayload extends RequestInformationInput {
	rigTypeId: string;
	issueTypeId: string;
	issuedSiteId: string;
	descriptionHtml: string;
	stepsToReproduceHtml: string;
	additionalCategoryId?: string;
	attachments: TicketAttachmentInput[];
}

export interface ControllerSoftwareRequestPayload extends RequestInformationInput {
	controllerTypeId: string;
	mainVersionId: string;
	mainVersionOther?: string;
	subVersionId: string;
	subVersionOther?: string;
	descriptionHtml: string;
	stepsToReproduceHtml: string;
	additionalCategoryId?: string;
	attachments: TicketAttachmentInput[];
}

export interface TicketRequestSubmissionResponse {
	requestId: string;
	jiraIssueKey?: string;
	createdAtUtc: string;
	status: "queued" | "accepted";
	message: string;
}

export interface TicketRequestMasterDataRepository {
	getMasterData(): Promise<TicketRequestMasterData>;
}

export interface JiraTicketGateway {
	createIssue(payload: PumpTestRigRequestPayload | ControllerSoftwareRequestPayload): Promise<{ issueKey: string }>;
	uploadAttachments(issueKey: string, attachments: TicketAttachmentInput[]): Promise<void>;
	updateIssue(issueKey: string, payload: unknown): Promise<void>;
	syncStatus(issueKey: string): Promise<{ status: string }>;
	getComments(issueKey: string): Promise<Array<{ author: string; body: string; createdAtUtc: string }>>;
}

export interface CreateMasterDataOptionInput {
	optionGroup: string;
	code: string;
	name: string;
	description?: string;
	sortOrder: number;
	isActive: boolean;
}

export interface UpdateMasterDataOptionInput {
	code: string;
	name: string;
	description?: string;
	sortOrder: number;
	isActive: boolean;
}
