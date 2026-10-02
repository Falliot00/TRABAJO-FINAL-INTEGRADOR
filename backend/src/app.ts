import "reflect-metadata";
import {
  Controller,
  Get,
  Inject,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { readConfig } from "./common/config";
import { createDatabase } from "./common/database";
import { SafeExceptionFilter } from "./common/errors";
import { Security } from "./common/security";
import { IdentityService } from "./modules/identity/identity.service";
import { AuthController } from "./modules/identity/auth.controller";
import { UsersController } from "./modules/identity/users.controller";
import { UsersService } from "./modules/identity/users.service";
import { AuditController } from "./modules/audit/audit.controller";
import { AuditService } from "./modules/audit/audit.service";

@Controller("health")
class HealthController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}
  @Get()
  @ApiOkResponse({
    schema: {
      type: "object",
      required: ["status"],
      properties: { status: { type: "string", enum: ["ok"] } },
    },
  })
  async health() {
    try {
      await this.identity.db.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        "Servicio temporalmente no disponible.",
      );
    }
    return { status: "ok" };
  }
}

export async function createApplication(env: NodeJS.ProcessEnv = process.env) {
  const config = readConfig(env);
  const db = createDatabase(config.databaseUrl);
  const audit = new AuditService(db);
  const identity = new IdentityService(db, config, audit);
  const security = new Security(config);
  @Module({
    controllers: [
      AuthController,
      UsersController,
      AuditController,
      HealthController,
    ],
    providers: [
      { provide: IdentityService, useValue: identity },
      { provide: UsersService, useValue: new UsersService(identity, audit) },
      { provide: AuditService, useValue: audit },
      { provide: Security, useValue: security },
      {
        provide: "DatabaseLifecycle",
        useValue: { onModuleDestroy: () => db.$disconnect() },
      },
    ],
  })
  class ApplicationModule {}

  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: env.NODE_ENV === "test" ? false : ["error", "warn", "log"],
      bodyParser: true,
    },
  );
  app.setGlobalPrefix("api");
  app.disable("x-powered-by");
  app.set("trust proxy", config.production ? 1 : false);
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    (
      req: import("express").Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      res.setHeader("Cache-Control", "no-store");
      if (config.production && !req.secure && req.path !== "/api/health") {
        res.status(400).json({
          statusCode: 400,
          message: "Se requiere una conexión HTTPS.",
        });
        return;
      }
      next();
    },
  );
  app.enableCors({
    origin: config.origin,
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  });
  app.useGlobalFilters(new SafeExceptionFilter());
  if (!config.production && env.NODE_ENV !== "test") {
    const spec = new DocumentBuilder()
      .setTitle("CILGAS API")
      .setVersion("0.1.0")
      .addCookieAuth(security.sessionCookie)
      .build();
    SwaggerModule.setup(
      "api/docs",
      app,
      SwaggerModule.createDocument(app, spec),
    );
  }
  app.enableShutdownHooks();
  return app;
}
