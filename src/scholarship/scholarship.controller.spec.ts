import { Test, TestingModule } from '@nestjs/testing';
import { ScholarshipController } from './scholarship.controller';
import { ScholarshipService } from './scholarship.service';

describe('ScholarshipController', () => {
  let controller: ScholarshipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScholarshipController],
      providers: [
        {
          provide: ScholarshipService,
          useValue: {
            createDraft: jest.fn(),
            addBeneficiaries: jest.fn(),
            addFinancials: jest.fn(),
            submitApplication: jest.fn(),
            getMyRequests: jest.fn(),
            getSupervisorTasks: jest.fn(),
            findOne: jest.fn(),
            getApplicationStatus: jest.fn(),
            reviewApplication: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ScholarshipController>(ScholarshipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
