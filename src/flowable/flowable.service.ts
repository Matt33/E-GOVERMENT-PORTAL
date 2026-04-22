import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

export interface FlowableProcess {
  id: string;
  processInstanceId?: string;
  processDefinitionKey: string;
  status?: string;
}

export interface FlowableTask {
  id: string;
  name: string;
  assignee: string | null;
  processInstanceId: string;
  taskDefinitionKey: string;
  created: string;
  variables: Record<string, string | number | boolean>;
}

@Injectable()
export class FlowableService implements OnModuleInit {
  private readonly logger = new Logger(FlowableService.name);

  private get flowableUrl(): string {
    return process.env.FLOWABLE_URL || 'http://localhost:8082';
  }

  private get flowableUser(): string {
    return process.env.FLOWABLE_USER || 'rest-admin';
  }

  private get flowablePass(): string {
    return process.env.FLOWABLE_PASS || 'test';
  }

  private get auth() {
    return { username: this.flowableUser, password: this.flowablePass };
  }

  private buildFlowableUrl(endpoint: string): string {
    const base = this.flowableUrl.replace(/\/$/, '');
    if (
      base.includes('/flowable-task/process-api') ||
      base.includes('/flowable-rest/service')
    ) {
      return `${base}${endpoint}`;
    }
    return `${base}/flowable-task/process-api${endpoint}`;
  }

  private extractError(err: unknown, fallback: string): string {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const data = err.response?.data;
      const msg = typeof data === 'object' && data !== null ? JSON.stringify(data) : err.message;
      this.logger.error(`Flowable HTTP ${status ?? 'N/A'}: ${msg}`);
      if (status === 401) return 'Flowable authentication failed';
      if (status === 404) return 'Flowable resource not found';
      return msg || fallback;
    }

    if (err instanceof Error) {
      this.logger.error(err.message);
      return err.message;
    }

    return fallback;
  }

  async onModuleInit(): Promise<void> {
    const bpmnDir = path.join(process.cwd(), 'flowable');
    if (!fs.existsSync(bpmnDir)) {
      return;
    }

    const files = fs.readdirSync(bpmnDir).filter((file) => file.endsWith('.bpmn20.xml'));
    for (const file of files) {
      const fullPath = path.join(bpmnDir, file);
      try {
        await this.deployProcessDefinition(fullPath, file);
      } catch (error) {
        const message = this.extractError(error, `Failed to auto-deploy ${file}`);
        this.logger.warn(message);
      }
    }
  }

  async deployProcess(): Promise<void> {
    const candidates = [
      path.join(process.cwd(), 'flowable', 'id-renewal-process.bpmn20.xml'),
      path.join(process.cwd(), 'flowable', 'gov-portal-workflow.bpmn20.xml'),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));

    if (!filePath) {
      throw new HttpException('No BPMN file found to deploy', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    await this.deployProcessDefinition(filePath, path.basename(filePath));
  }

  async deployProcessDefinition(filePath: string, deploymentName: string) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: 'application/xml',
      });
      form.append('deploymentName', deploymentName);

      const response = await axios.post(this.buildFlowableUrl('/repository/deployments'), form, {
        auth: this.auth,
        headers: form.getHeaders(),
      });

      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Failed to deploy process definition');
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async startRenewalProcess(
    requestId: string,
    firstName: string,
    lastName: string,
    nationalId: string,
  ): Promise<FlowableProcess> {
    return this.startProcessInstance('id-renewal-process', {
      requestId,
      firstName,
      lastName,
      nationalId,
    });
  }

  async startProcessInstance(
    processDefinitionKey: string,
    variables: Record<string, unknown> = {},
  ): Promise<FlowableProcess> {
    try {
      const flowableVariables = Object.entries(variables).map(([name, value]) => ({ name, value }));
      const response = await axios.post<FlowableProcess>(
        this.buildFlowableUrl('/runtime/process-instances'),
        {
          processDefinitionKey,
          variables: flowableVariables,
        },
        { auth: this.auth },
      );

      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Flowable workflow service unavailable');
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async getProcessStatus(processInstanceId: string): Promise<FlowableProcess> {
    return this.getProcessInstance(processInstanceId);
  }

  async getProcessInstance(processInstanceId: string): Promise<FlowableProcess> {
    try {
      const response = await axios.get<FlowableProcess>(
        this.buildFlowableUrl(`/runtime/process-instances/${processInstanceId}`),
        { auth: this.auth },
      );
      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Process instance not found');
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
  }

  async getSupervisorTasks(): Promise<FlowableTask[]> {
    try {
      const response = await axios.get<{
        data: Array<
          Omit<FlowableTask, 'variables'> & {
            variables?: Array<{ name: string; value: string | number | boolean }>;
          }
        >;
      }>(
        this.buildFlowableUrl('/runtime/tasks?candidateGroup=supervisor&includeProcessVariables=true'),
        { auth: this.auth },
      );

      return (response.data.data ?? []).map((task) => {
        const vars: Record<string, string | number | boolean> = {};
        for (const variable of task.variables ?? []) {
          vars[variable.name] = variable.value;
        }

        return {
          ...task,
          variables: {
            ...vars,
            citizenName: `${String(vars.firstName ?? '')} ${String(vars.lastName ?? '')}`.trim(),
          },
        };
      });
    } catch (error) {
      const message = this.extractError(error, 'Flowable workflow service unavailable');
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async getTaskById(taskId: string): Promise<FlowableTask> {
    try {
      const response = await axios.get<FlowableTask>(this.buildFlowableUrl(`/runtime/tasks/${taskId}`), {
        auth: this.auth,
      });
      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Task not found');
      throw new HttpException(message, HttpStatus.NOT_FOUND);
    }
  }

  async getTasksForProcessInstance(processInstanceId: string) {
    try {
      const response = await axios.get<{ data: FlowableTask[] }>(this.buildFlowableUrl('/runtime/tasks'), {
        auth: this.auth,
        params: { processInstanceId },
      });
      return response.data.data ?? [];
    } catch (error) {
      const message = this.extractError(error, 'Failed to fetch process tasks');
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async completeTask(taskId: string, approvedOrVariables: boolean | Record<string, unknown>): Promise<void> {
    const variables =
      typeof approvedOrVariables === 'boolean'
        ? [{ name: 'approved', value: approvedOrVariables, type: 'boolean' }]
        : Object.entries(approvedOrVariables).map(([name, value]) => ({ name, value }));

    try {
      await axios.post(
        this.buildFlowableUrl(`/runtime/tasks/${taskId}`),
        {
          action: 'complete',
          variables,
        },
        { auth: this.auth },
      );
    } catch (error) {
      const message = this.extractError(error, 'Failed to complete task');
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTaskVariables(taskId: string) {
    try {
      const response = await axios.get(this.buildFlowableUrl(`/runtime/tasks/${taskId}/variables`), {
        auth: this.auth,
      });
      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Failed to get task variables');
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async setTaskVariable(taskId: string, name: string, value: unknown) {
    try {
      const response = await axios.put(
        this.buildFlowableUrl(`/runtime/tasks/${taskId}/variables/${name}`),
        { value },
        { auth: this.auth },
      );
      return response.data;
    } catch (error) {
      const message = this.extractError(error, 'Failed to set task variable');
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
