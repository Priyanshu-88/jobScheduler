import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WsEvent, WsJobEvent, WsWorkerEvent } from '@job-scheduler/shared';

@Injectable()
export class WebsocketService {
  constructor(private gateway: WebsocketGateway) {}

  emitJobCreated(event: WsJobEvent) {
    this.gateway.server.emit(WsEvent.JOB_CREATED, event);
  }

  emitJobStatusChanged(event: WsJobEvent) {
    this.gateway.server.emit(WsEvent.JOB_STATUS_CHANGED, event);
  }

  emitWorkerHeartbeat(event: WsWorkerEvent) {
    this.gateway.server.emit(WsEvent.WORKER_HEARTBEAT, event);
  }

  emitWorkerStatusChanged(event: WsWorkerEvent) {
    this.gateway.server.emit(WsEvent.WORKER_STATUS_CHANGED, event);
  }
  
  emitQueueStatsUpdated(queueId: string) {
    this.gateway.server.emit(WsEvent.QUEUE_STATS_UPDATED, { queueId });
  }
}
