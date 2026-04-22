import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlowableTaskService {
  private readonly logger = new Logger(FlowableTaskService.name);
  private readonly flowableUrl = process.env.FLOWABLE_URL || 'http://localhost:8081';
  private readonly auth = {
    username: 'admin',
    password: 'test',
  };

  // Get all pending tasks for a specific process instance
  async getTasks(processInstanceId: string) {
    try {
      const response = await axios.get(
        `${this.flowableUrl}/flowable-rest/service/runtime/tasks?processInstanceId=${processInstanceId}`,
        { auth: this.auth },
      );

      this.logger.log(`Found ${response.data.data.length} tasks`);
      return response.data.data;

    } catch (error) {
      this.logger.error('Error fetching tasks', error.message);
      throw new Error('Failed to fetch tasks');
    }
  }

  // Complete a task (Officer/Supervisor approves)
  async completeTask(taskId: string, approved: boolean, comment?: string) {
    try {
      const payload = {
        action: 'complete',
        variables: [
          {
            name: 'approved',
            value: approved,
          },
          {
            name: 'comment',
            value: comment || '',
          },
        ],
      };

      await axios.post(
        `${this.flowableUrl}/flowable-rest/service/runtime/tasks/${taskId}`,
        payload,
        { auth: this.auth },
      );

      this.logger.log(`Task ${taskId} completed. Approved: ${approved}`);

      return {
        taskId,
        status: approved ? 'APPROVED' : 'REJECTED',
      };

    } catch (error) {
      this.logger.error('Error completing task', error.message);
      throw new Error('Failed to complete task');
    }
  }
}