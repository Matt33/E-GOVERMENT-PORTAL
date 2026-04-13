import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ScholarshipService } from './scholarship.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { AddBeneficiariesDto } from './dto/add-beneficiaries.dto';
import { AddFinancialsDto } from './dto/add-financials.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { AdminDecisionDto } from './dto/admin-decision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
  user: Record<string, unknown>;
}

@ApiTags('Scholarship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scholarship')
export class ScholarshipController {
  constructor(private readonly scholarshipService: ScholarshipService) {}

  // ── Citizen: Step 1 – Create Draft ─────────────────────────────────

  @Post()
  @Roles('citizen')
  @ApiOperation({ summary: 'Step 1 – Create a new draft scholarship application' })
  @ApiResponse({ status: 201, description: 'Draft application created' })
  async createDraft(
    @Body() dto: CreateApplicationDto,
    @Request() req: RequestWithUser,
  ) {
    const businessId = (req.user?.sub as string) || '';
    return this.scholarshipService.createDraft(dto, businessId);
  }

  // ── Citizen: Step 2 – Add Beneficiaries ────────────────────────────

  @Patch(':id/beneficiaries')
  @Roles('citizen')
  @ApiOperation({ summary: 'Step 2 – Add employee beneficiaries to a draft application' })
  @ApiResponse({ status: 200, description: 'Beneficiaries added' })
  async addBeneficiaries(
    @Param('id') id: string,
    @Body() dto: AddBeneficiariesDto,
    @Request() req: RequestWithUser,
  ) {
    const businessId = (req.user?.sub as string) || '';
    return this.scholarshipService.addBeneficiaries(id, dto, businessId);
  }

  // ── Citizen: Step 3 – Add Financials ───────────────────────────────

  @Patch(':id/financials')
  @Roles('citizen')
  @ApiOperation({ summary: 'Step 3 – Add financial breakdown to a draft application' })
  @ApiResponse({ status: 200, description: 'Financials added' })
  async addFinancials(
    @Param('id') id: string,
    @Body() dto: AddFinancialsDto,
    @Request() req: RequestWithUser,
  ) {
    const businessId = (req.user?.sub as string) || '';
    return this.scholarshipService.addFinancials(id, dto, businessId);
  }

  // ── Citizen: Step 4 – Submit ───────────────────────────────────────

  @Post(':id/submit')
  @Roles('citizen')
  @ApiOperation({
    summary: 'Step 4 – Submit the application (GoRules runs as advisory, status → PENDING)',
  })
  @ApiResponse({ status: 200, description: 'Application submitted for admin review' })
  async submitApplication(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const businessId = (req.user?.sub as string) || '';
    return this.scholarshipService.submitApplication(id, businessId);
  }

  // ── Citizen: Read ──────────────────────────────────────────────────

  @Get('my-requests')
  @Roles('citizen')
  @ApiOperation({ summary: "Get the business owner's scholarship applications" })
  @ApiResponse({ status: 200, description: 'List of applications' })
  async getMyRequests(@Request() req: RequestWithUser) {
    const businessId = (req.user?.sub as string) || '';
    return this.scholarshipService.getMyRequests(businessId);
  }

  // ── Admin: Review Workflow ─────────────────────────────────────────

  @Get('admin/pending')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Get all PENDING and UNDER_REVIEW applications' })
  @ApiResponse({ status: 200, description: 'List of applications awaiting review' })
  getAdminPending() {
    return this.scholarshipService.getAdminPendingApplications();
  }

  @Patch('admin/:id/start-review')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Move a PENDING application to UNDER_REVIEW' })
  @ApiResponse({ status: 200, description: 'Application moved to UNDER_REVIEW' })
  async startReview(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const adminId = (req.user?.sub as string) || '';
    return this.scholarshipService.startReview(id, adminId);
  }

  @Patch('admin/:id/decide')
  @Roles('admin', 'supervisor')
  @ApiOperation({
    summary: 'Approve or reject an application with final coverage override',
  })
  @ApiResponse({ status: 200, description: 'Decision recorded' })
  async adminDecide(
    @Param('id') id: string,
    @Body() dto: AdminDecisionDto,
    @Request() req: RequestWithUser,
  ) {
    const adminId = (req.user?.sub as string) || '';
    return this.scholarshipService.adminDecide(id, dto, adminId);
  }

  // ── Supervisor: Flowable Tasks ─────────────────────────────────────

  @Get('supervisor/tasks')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Get all pending Flowable review tasks' })
  @ApiResponse({ status: 200, description: 'List of pending Flowable tasks' })
  getSupervisorTasks() {
    return this.scholarshipService.getSupervisorTasks();
  }

  // ── Shared: Single Application ─────────────────────────────────────

  @Get(':id')
  @Roles('citizen', 'supervisor', 'admin')
  @ApiOperation({ summary: 'Get a specific scholarship application by ID' })
  @ApiResponse({ status: 200, description: 'Application found' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  findOne(@Param('id') id: string) {
    return this.scholarshipService.findOne(id);
  }

  @Get(':id/status')
  @Roles('citizen', 'supervisor', 'admin')
  @ApiOperation({ summary: 'Get the status and decision details of an application' })
  @ApiResponse({ status: 200, description: 'Status details returned' })
  getStatus(@Param('id') id: string) {
    return this.scholarshipService.getApplicationStatus(id);
  }

  // ── Legacy: Supervisor review (backward compatible) ────────────────

  @Patch(':id/review')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Review a scholarship application (legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'Application reviewed' })
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @Request() req: RequestWithUser,
  ) {
    const reviewerId = (req.user?.sub as string) || '';
    return this.scholarshipService.reviewApplication(id, dto, reviewerId);
  }
}
