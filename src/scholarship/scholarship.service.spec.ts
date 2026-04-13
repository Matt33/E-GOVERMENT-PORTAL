import { Test, TestingModule } from '@nestjs/testing';
import { ScholarshipService } from './scholarship.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScholarshipApplicationEntity } from './entities/scholarship-application.entity';
import { ScholarshipBeneficiaryEntity } from './entities/scholarship-beneficiary.entity';
import { ScholarshipFinancialEntity } from './entities/scholarship-financial.entity';
import { ScholarshipRulesService } from './scholarship-rules.service';
import { BusinessLicenseService } from '../business-license/business-license.service';
import { FlowableService } from '../flowable/flowable.service';

describe('ScholarshipService', () => {
  let service: ScholarshipService;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScholarshipService,
        { provide: getRepositoryToken(ScholarshipApplicationEntity), useValue: mockRepo },
        { provide: getRepositoryToken(ScholarshipBeneficiaryEntity), useValue: mockRepo },
        { provide: getRepositoryToken(ScholarshipFinancialEntity), useValue: mockRepo },
        { provide: ScholarshipRulesService, useValue: {} },
        { provide: BusinessLicenseService, useValue: {} },
        { provide: FlowableService, useValue: {} },
      ],
    }).compile();

    service = module.get<ScholarshipService>(ScholarshipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
