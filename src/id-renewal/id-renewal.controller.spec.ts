import { Test, TestingModule } from '@nestjs/testing';
import { IdRenewalController } from './id-renewal.controller';
import { IdRenewalService } from './id-renewal.service';
import { GoRulesService } from '../gorules/gorules.service';
import { FlowableService } from '../flowable/flowable.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RenewalRequestEntity } from './renewal-request.entity';

describe('IdRenewalController', () => {
  let controller: IdRenewalController;

  const mockRequest = {
    id: 'test-id',
    firstName: 'John',
    lastName: 'Doe',
    nationalId: 'EG-1234567890',
    status: 'PENDING',
    workflowId: 'test-123',
    submittedAt: new Date(),
    updatedAt: new Date(),
    rejectionReason: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdRenewalController],
      providers: [
        IdRenewalService,
        {
          provide: getRepositoryToken(RenewalRequestEntity),
          useValue: {
            create: jest.fn().mockReturnValue(mockRequest),
            save: jest.fn().mockResolvedValue(mockRequest),
            find: jest.fn().mockResolvedValue([mockRequest]),
            findOne: jest.fn().mockResolvedValue(mockRequest),
          },
        },
        {
          provide: GoRulesService,
          useValue: {
            validateName: jest.fn().mockResolvedValue({
              status: 'ACCEPT',
              reason: 'Name is valid',
            }),
          },
        },
        {
          provide: FlowableService,
          useValue: {
            startRenewalProcess: jest.fn().mockResolvedValue({
              processInstanceId: 'test-123',
              processDefinitionKey: 'id-renewal-process',
              status: 'running',
            }),
            deployProcess: jest.fn().mockResolvedValue(undefined),
            getSupervisorTasks: jest.fn().mockResolvedValue([]),
            getTaskById: jest.fn().mockResolvedValue({
              processInstanceId: 'test-123',
            }),
            completeTask: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<IdRenewalController>(IdRenewalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should submit a renewal request successfully', async () => {
    const dto = {
      firstName: 'John',
      lastName: 'Doe',
      nationalId: 'EG-1234567890',
    };
    const result = await controller.submitRequest(dto);
    expect(result.status).toBe('PENDING');
    expect(result.firstName).toBe('John');
  });

  it('should deploy process successfully', async () => {
    const result = await controller.deployProcess();
    expect(result.message).toBe('Process deployed successfully');
  });

  it('should return all requests', async () => {
    const result = await controller.findAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should find one request by id', async () => {
    const result = await controller.findOne('test-id');
    expect(result.id).toBe('test-id');
  });
});
