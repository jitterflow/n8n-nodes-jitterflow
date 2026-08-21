import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { jitterflowApiRequest } from './GenericFunctions';

export class Jitterflow implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Jitterflow',
    name: 'jitterflow',
    icon: 'file:jitterflow.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Send webhooks through jittered, rate-limited delivery and manage the dead-letter queue',
    defaults: { name: 'Jitterflow' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'jitterflowApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Webhook', value: 'webhook' },
          { name: 'DLQ', value: 'dlq' },
        ],
        default: 'webhook',
      },

      // --- Webhook ---------------------------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['webhook'] } },
        options: [
          {
            name: 'Send',
            value: 'send',
            description: 'Queue a webhook for jittered, rate-limited delivery',
            action: 'Send a webhook',
          },
        ],
        default: 'send',
      },
      {
        displayName: 'Endpoint Key',
        name: 'endpointKey',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['webhook'], operation: ['send'] } },
        description: 'The endpoint key from your Jitterflow dashboard (Endpoints -> Endpoint Key)',
      },
      {
        displayName: 'Target Identifier',
        name: 'targetIdentifier',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['webhook'], operation: ['send'] } },
        description:
          'Optional — paces delivery per this identifier (e.g. a mailbox or lead ID) instead of per endpoint. Defaults server-side to the endpoint key if left blank.',
      },
      {
        displayName: 'Idempotency Key',
        name: 'idempotencyKey',
        type: 'string',
        default: '={{$execution.id}}-{{$itemIndex}}',
        displayOptions: { show: { resource: ['webhook'], operation: ['send'] } },
        description:
          'Repeating the same key returns the original job instead of creating a second one, so a workflow retry never double-sends. Defaults to the execution ID + item index.',
      },
      {
        displayName: 'Payload',
        name: 'payload',
        type: 'json',
        default: '={{ $json }}',
        displayOptions: { show: { resource: ['webhook'], operation: ['send'] } },
        description:
          "The JSON body to deliver to the endpoint's destination URL. Defaults to the whole input item.",
      },

      // --- DLQ ---------------------------------------------------------
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['dlq'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            description: 'List dead-letter queue entries',
            action: 'List DLQ entries',
          },
          {
            name: 'Replay',
            value: 'replay',
            description: 'Re-enqueue a failed job for immediate delivery',
            action: 'Replay a DLQ job',
          },
          {
            name: 'Resolve',
            value: 'resolve',
            description: 'Mark a DLQ entry resolved without retrying it',
            action: 'Resolve a DLQ entry',
          },
        ],
        default: 'list',
      },
      {
        displayName: 'Filter',
        name: 'resolvedFilter',
        type: 'options',
        displayOptions: { show: { resource: ['dlq'], operation: ['list'] } },
        options: [
          { name: 'All', value: 'all' },
          { name: 'Unresolved Only', value: 'unresolved' },
          { name: 'Resolved Only', value: 'resolved' },
        ],
        default: 'unresolved',
      },
      {
        displayName: 'Job ID',
        name: 'jobId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['dlq'], operation: ['replay', 'resolve'] } },
        description: 'The WebhookJob ID to replay or resolve (from a prior List DLQ Entries call)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: IDataObject | IDataObject[];

        if (resource === 'webhook' && operation === 'send') {
          const endpointKey = this.getNodeParameter('endpointKey', i) as string;
          const targetIdentifier = this.getNodeParameter('targetIdentifier', i) as string;
          const idempotencyKey = this.getNodeParameter('idempotencyKey', i) as string;
          const payloadRaw = this.getNodeParameter('payload', i);
          const payload = (
            typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw
          ) as IDataObject;

          const body: IDataObject = { payload };
          if (targetIdentifier) body.targetIdentifier = targetIdentifier;
          if (idempotencyKey) body.idempotencyKey = idempotencyKey;

          responseData = (await jitterflowApiRequest.call(
            this,
            'POST',
            `/v1/ingest/${endpointKey}`,
            body,
          )) as IDataObject;
        } else if (resource === 'dlq' && operation === 'list') {
          const resolvedFilter = this.getNodeParameter('resolvedFilter', i) as string;
          const qs: IDataObject = {};
          if (resolvedFilter === 'resolved') qs.resolved = 'true';
          if (resolvedFilter === 'unresolved') qs.resolved = 'false';

          responseData = (await jitterflowApiRequest.call(
            this,
            'GET',
            '/v1/dlq',
            undefined,
            qs,
          )) as IDataObject[];
        } else if (resource === 'dlq' && operation === 'replay') {
          const jobId = this.getNodeParameter('jobId', i) as string;
          responseData = (await jitterflowApiRequest.call(
            this,
            'POST',
            `/v1/dlq/${jobId}/retry`,
          )) as IDataObject;
        } else if (resource === 'dlq' && operation === 'resolve') {
          const jobId = this.getNodeParameter('jobId', i) as string;
          responseData = (await jitterflowApiRequest.call(
            this,
            'POST',
            `/v1/dlq/${jobId}/resolve`,
          )) as IDataObject;
        } else {
          throw new NodeApiError(this.getNode(), {
            message: `Unknown resource/operation combination: ${resource}/${operation}`,
          });
        }

        if (Array.isArray(responseData)) {
          returnData.push(...responseData.map((entry) => ({ json: entry, pairedItem: { item: i } })));
        } else {
          returnData.push({ json: responseData, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
