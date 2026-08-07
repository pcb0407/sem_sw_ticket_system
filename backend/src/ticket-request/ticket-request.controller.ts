import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  ControllerSoftwareRequestPayload,
  CreateMasterDataOptionInput,
  PumpTestRigRequestPayload,
  TicketRequestSubmissionResponse,
  UpdateMasterDataOptionInput,
} from "@ticket-system/shared";
import { MASTER_DATA_GROUPS } from "./ticket-request.types";
import { TicketRequestService } from "./ticket-request.service";

const VALID_GROUPS = new Set(Object.values(MASTER_DATA_GROUPS));

@ApiTags("Ticket Requests")
@Controller("ticket-requests")
export class TicketRequestController {
  constructor(private readonly ticketRequestService: TicketRequestService) {}

  @Get("master-data")
  @ApiOperation({ summary: "Get master data for Ticket Request forms" })
  async getMasterData() {
    return this.ticketRequestService.getMasterData();
  }

  @Post("pump-test-rig")
  @ApiOperation({ summary: "Submit Pump Test Rig Request" })
  async submitPumpTestRigRequest(
    @Body() payload: PumpTestRigRequestPayload,
  ): Promise<TicketRequestSubmissionResponse> {
    return this.ticketRequestService.submitPumpTestRigRequest(payload);
  }

  @Post("controller-software")
  @ApiOperation({ summary: "Submit Controller Software Request" })
  async submitControllerSoftwareRequest(
    @Body() payload: ControllerSoftwareRequestPayload,
  ): Promise<TicketRequestSubmissionResponse> {
    return this.ticketRequestService.submitControllerSoftwareRequest(payload);
  }

  // --- Settings endpoints ---

  @Get("settings/options")
  @ApiOperation({ summary: "List master data options for a group" })
  getOptionsByGroup(@Query("group") group: string) {
    if (!group || !VALID_GROUPS.has(group as never)) {
      return [];
    }
    return this.ticketRequestService.getOptionsByGroup(group);
  }

  @Post("settings/options")
  @ApiOperation({ summary: "Create a master data option" })
  createOption(@Body() input: CreateMasterDataOptionInput) {
    return this.ticketRequestService.createOption(input);
  }

  @Put("settings/options/:id")
  @ApiOperation({ summary: "Update a master data option" })
  updateOption(@Param("id") id: string, @Body() input: UpdateMasterDataOptionInput) {
    return this.ticketRequestService.updateOption(id, input);
  }

  @Delete("settings/options/:id")
  @ApiOperation({ summary: "Delete a master data option" })
  deleteOption(@Param("id") id: string) {
    return this.ticketRequestService.deleteOption(id);
  }

  @Patch("settings/options/:id/toggle")
  @ApiOperation({ summary: "Toggle active status of a master data option" })
  toggleOptionActive(@Param("id") id: string) {
    return this.ticketRequestService.toggleOptionActive(id);
  }
}
