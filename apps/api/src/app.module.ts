import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { QueuesModule } from './queues/queues.module';
import { JobsModule } from './jobs/jobs.module';
import { MetricsModule } from './metrics/metrics.module';
import { WebsocketModule } from './websocket/websocket.module';
import { WorkersModule } from './workers/workers.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    QueuesModule,
    JobsModule,
    MetricsModule,
    WebsocketModule,
    WorkersModule,
    // Serve the static HTML/CSS/JS frontend dashboard
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web'),
      exclude: ['/api/(.*)'],
    }),
  ],
})
export class AppModule {}
