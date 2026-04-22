import { FlowableService } from './flowable.service';
import { HttpException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlowableService', () => {
  let service: FlowableService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FlowableService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startRenewalProcess', () => {
    it('should return process data on success', async () => {
      const mockData = {
        processInstanceId: 'proc-123',
        processDefinitionKey: 'id-renewal-process',
        status: 'running',
      };
      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: mockData });

      const result = await service.startRenewalProcess(
        'req-1',
        'John',
        'Doe',
        'EG-1234',
      );
      expect(result.processInstanceId).toBe('proc-123');
    });

    it('should throw HttpException when flowable is unavailable', async () => {
      mockedAxios.post = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        service.startRenewalProcess('req-1', 'John', 'Doe', 'EG-1234'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getSupervisorTasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      mockedAxios.get = jest.fn().mockResolvedValueOnce({ data: { data: [] } });
      const result = await service.getSupervisorTasks();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should throw HttpException when service is unavailable', async () => {
      mockedAxios.get = jest
        .fn()
        .mockRejectedValueOnce(new Error('connection refused'));
      await expect(service.getSupervisorTasks()).rejects.toThrow(HttpException);
    });
  });

  describe('completeTask', () => {
    it('should resolve without error on success', async () => {
      mockedAxios.post = jest.fn().mockResolvedValueOnce({ data: {} });
      await expect(
        service.completeTask('task-1', true),
      ).resolves.toBeUndefined();
    });

    it('should throw HttpException when complete fails', async () => {
      mockedAxios.post = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'));
      await expect(service.completeTask('task-1', false)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
