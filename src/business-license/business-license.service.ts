import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoRulesService } from '../gorules/gorules.service';
import { FlowableService, FlowableTask } from '../flowable/flowable.service';
import { BusinessLicenseEntity } from './entities/business-license.entity';
import { CreateBusinessLicenseDto } from './dto/create-business-license.dto';
import { CompleteBusinessLicenseTaskDto } from './dto/complete-business-license.dto';

@Injectable()
export class BusinessLicenseService {
  constructor(
    @InjectRepository(BusinessLicenseEntity)
    private readonly licenseRepository: Repository<BusinessLicenseEntity>,
    private readonly goRulesService: GoRulesService,
    private readonly flowableService: FlowableService,
  ) {}

  async submitRequest(
    dto: CreateBusinessLicenseDto,
    citizenId: string,
  ): Promise<BusinessLicenseEntity> {
    // Split ownerName into firstName/lastName for GoRules validation
    const parts = dto.ownerName.trim().split(' ');
    const firstName = parts[0] ?? dto.ownerName;
    const lastName = parts.slice(1).join(' ') || firstName;

    const validation = this.goRulesService.validateName(firstName, lastName);
    if (validation.status === 'REJECT') {
      throw new UnprocessableEntityException(validation.reason);
    }

    const license = this.licenseRepository.create({
      ownerName: dto.ownerName,
      businessName: dto.businessName,
      nationalId: dto.nationalId,
      businessType: dto.businessType,
      status: 'PENDING',
      citizenId,
    });

    const saved = await this.licenseRepository.save(license);

    try {
      const process = await this.flowableService.startProcessInstance(
        'business-license-process',
        {
          licenseId: saved.id,
          ownerName: saved.ownerName,
          businessName: saved.businessName,
          nationalId: saved.nationalId,
          businessType: saved.businessType,
        },
      );
      saved.flowableProcessInstanceId = process.id;
      await this.licenseRepository.save(saved);
    } catch {
      saved.flowableProcessInstanceId = 'process-unavailable';
      await this.licenseRepository.save(saved);
    }

    return saved;
  }

  async getMyRequests(citizenId: string): Promise<BusinessLicenseEntity[]> {
    return this.licenseRepository.find({
      where: { citizenId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BusinessLicenseEntity> {
    const license = await this.licenseRepository.findOne({ where: { id } });
    if (!license) {
      throw new NotFoundException(`Business license '${id}' not found`);
    }
    return license;
  }

  async findAll(): Promise<BusinessLicenseEntity[]> {
    return this.licenseRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getSupervisorTasks(): Promise<FlowableTask[]> {
    const tasks = await this.flowableService.getSupervisorTasks();
    return tasks.filter((task) => {
      const licenseId = task.variables?.licenseId;
      return typeof licenseId === 'string' && licenseId.length > 0;
    });
  }

  async getPendingSupervisorRequests(): Promise<BusinessLicenseEntity[]> {
    return this.licenseRepository.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
    });
  }

  async completeTask(
    id: string,
    dto: CompleteBusinessLicenseTaskDto,
  ): Promise<BusinessLicenseEntity> {
    const license = await this.licenseRepository.findOne({
      where: { id },
    });

    if (!license) {
      throw new NotFoundException(`Business license '${id}' not found`);
    }

    try {
      const approved = dto.action === 'APPROVED';
      if (dto.taskId) {
        await this.flowableService.completeTask(dto.taskId, approved);
      }

      license.status = dto.action;
      return this.licenseRepository.save(license);
    } catch (error) {
      throw new UnprocessableEntityException(
        'Failed to complete task in workflow',
      );
    }
  }
}
