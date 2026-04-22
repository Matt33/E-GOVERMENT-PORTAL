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
import { IdRenewalService } from './id-renewal.service';
import { CreateRenewalDto } from './dto/create-renewal.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { SupervisorDecisionDto } from './dto/supervisor-decision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
  user: Record<string, unknown>;
}

@ApiTags('ID Renewal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('id-renewal')
export class IdRenewalController {
  constructor(private readonly idRenewalService: IdRenewalService) {}

  @Post('deploy')
  @Roles('admin')
  @ApiOperation({ summary: 'Deploy ID renewal BPMN process (admin only)' })
  @ApiResponse({ status: 201, description: 'Process deployed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Failed to deploy process' })
  async deployProcess() {
    await this.idRenewalService.deployProcess();
    return { message: 'Process deployed successfully' };
  }

  @Post()
  @Roles('citizen')
  @ApiOperation({ summary: 'Submit a new ID renewal request' })
  @ApiResponse({ status: 201, description: 'Request submitted successfully' })
  @ApiResponse({ status: 422, description: 'Name validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitRequest(
    @Body() dto: CreateRenewalDto,
    @Request() req: RequestWithUser,
  ) {
    const citizenId = (req.user?.sub as string) || '';
    return this.idRenewalService.submitRequest(dto, citizenId);
  }

  @Get('my-requests')
  @Roles('citizen')
  @ApiOperation({ summary: "Get logged-in citizen's ID renewal requests" })
  @ApiResponse({ status: 200, description: "List of citizen's requests" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRequests(@Request() req: RequestWithUser) {
    const citizenId = (req.user?.sub as string) || '';
    return this.idRenewalService.getMyRequests(citizenId);
  }

  @Get('supervisor/tasks')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Get all pending supervisor review tasks' })
  @ApiResponse({ status: 200, description: 'List of pending tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSupervisorTasks() {
    return this.idRenewalService.getSupervisorTasks();
  }

  @Get('supervisor/pending')
  @Roles('supervisor', 'admin')
  @ApiOperation({
    summary: 'Get pending renewal requests from database (fallback when workflow task is unavailable)',
  })
  @ApiResponse({ status: 200, description: 'List of pending renewal requests' })
  getPendingSupervisorRequests() {
    return this.idRenewalService.getPendingSupervisorRequests();
  }

  @Post('tasks/:taskId/complete')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Approve or reject a renewal request' })
  @ApiResponse({ status: 200, description: 'Task completed, request updated' })
  @ApiResponse({ status: 404, description: 'Task or request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.idRenewalService.completeTask(taskId, dto);
  }

  @Patch(':id/complete')
  @Roles('supervisor', 'admin')
  @ApiOperation({
    summary:
      'Approve or reject a renewal request by request id (works with or without workflow task id)',
  })
  @ApiResponse({ status: 200, description: 'Request updated' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async completeByRequestId(
    @Param('id') id: string,
    @Body() dto: SupervisorDecisionDto,
  ) {
    return this.idRenewalService.completeByRequestId(id, dto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all renewal requests (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all requests' })
  findAll() {
    return this.idRenewalService.findAll();
  }

  @Get(':id')
  @Roles('citizen', 'admin', 'supervisor')
  @ApiOperation({ summary: 'Get a specific renewal request by ID' })
  @ApiResponse({ status: 200, description: 'Request found' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  findOne(@Param('id') id: string) {
    return this.idRenewalService.findOne(id);
  }
}
