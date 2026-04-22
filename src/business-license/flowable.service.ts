import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlowableService {
  private readonly logger = new Logger(FlowableService.name);
  private readonly flowableUrl = process.env.FLOWABLE_URL || 'http://localhost:8081';
  private readonly flowableUser = 'admin';
  private readonly flowablePassword = 'test';

  async startBusinessLicenseProcess(
    applicationId: string,
    requireHealthReview: boolean,
    requireFinanceReview: boolean,
  ) {
    try {
      const payload = {
        processDefinitionKey: 'businessLicenseProcess',
        businessKey: applicationId,
        variables: [
          {
            name: 'requireHealthReview',
            value: requireHealthReview,
          },
          {
            name: 'requireFinanceReview',
            value: requireFinanceReview,
          },
          {
            name: 'officer',
            value: 'admin',
          },
          {
            name: 'financeOfficer',
            value: 'admin',
          },
          {
            name: 'healthOfficer',
            value: 'admin',
          },
          {
            name: 'supervisor',
            value: 'admin',
          },
        ],
      };

      this.logger.log(`Starting Flowable process for application: ${applicationId}`);

      const response = await axios.post(
        `${this.flowableUrl}/flowable-rest/service/runtime/process-instances`,
        payload,
        {
          auth: {
            username: this.flowableUser,
            password: this.flowablePassword,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Process started successfully. Instance ID: ${response.data.id}`);

      return {
        processInstanceId: response.data.id,
        status: 'STARTED',
      };

    } catch (error) {
      this.logger.error('Error starting Flowable process', error.message);
      throw new Error('Failed to start business license workflow');
    }
  }
}