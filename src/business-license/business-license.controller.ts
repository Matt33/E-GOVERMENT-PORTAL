import {
  Controller,
  Post,
  Get,
  Param,
  Patch,
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
import { BusinessLicenseService } from './business-license.service';
import { CreateBusinessLicenseDto } from './dto/create-business-license.dto';
import { CompleteBusinessLicenseTaskDto } from './dto/complete-business-license.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser extends Request {
  user: Record<string, unknown>;
}

@ApiTags('Business License')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('business-license')
export class BusinessLicenseController {
  constructor(
    private readonly businessLicenseService: BusinessLicenseService,
  ) {}

  @Post()
  @Roles('citizen')
  @ApiOperation({ summary: 'Submit a new business license request' })
  @ApiResponse({ status: 201, description: 'Request submitted successfully' })
  @ApiResponse({ status: 422, description: 'Name validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitRequest(
    @Body() dto: CreateBusinessLicenseDto,
    @Request() req: RequestWithUser,
  ) {
    const citizenId = (req.user?.sub as string) || '';
    return this.businessLicenseService.submitRequest(dto, citizenId);
  }

  @Get('my-requests')
  @Roles('citizen')
  @ApiOperation({
    summary: "Get logged-in citizen's business license requests",
  })
  @ApiResponse({ status: 200, description: "List of citizen's requests" })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyRequests(@Request() req: RequestWithUser) {
    const citizenId = (req.user?.sub as string) || '';
    return this.businessLicenseService.getMyRequests(citizenId);
  }

  @Get('supervisor/tasks')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Get all pending supervisor review tasks' })
  @ApiResponse({ status: 200, description: 'List of pending tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSupervisorTasks() {
    return this.businessLicenseService.getSupervisorTasks();
  }

  @Get('supervisor/pending')
  @Roles('supervisor', 'admin')
  @ApiOperation({
    summary: 'Get pending business license requests from database (fallback when workflow task is unavailable)',
  })
  @ApiResponse({ status: 200, description: 'List of pending business license requests' })
  getPendingSupervisorRequests() {
    return this.businessLicenseService.getPendingSupervisorRequests();
  }

  @Patch(':id/complete')
  @Roles('supervisor', 'admin')
  @ApiOperation({ summary: 'Approve or reject a business license request' })
  @ApiResponse({ status: 200, description: 'Task completed, request updated' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteBusinessLicenseTaskDto,
  ) {
    return this.businessLicenseService.completeTask(id, dto);
  }

  @Get(':id')
  @Roles('citizen', 'supervisor')
  @ApiOperation({ summary: 'Get a specific business license request' })
  @ApiResponse({ status: 200, description: 'Request found' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  findOne(@Param('id') id: string) {
    return this.businessLicenseService.findOne(id);
  }
}
