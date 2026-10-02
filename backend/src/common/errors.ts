import { ArgumentsHost, Catch, HttpException, Logger } from "@nestjs/common";
import type { ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("API");
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    let message = "No se pudo completar la operación.";
    if (error instanceof HttpException) {
      message = status === 404 ? "Recurso no encontrado." : error.message;
    } else {
      // Avoid serializing DB errors, request bodies, headers or connection strings.
      this.logger.error(
        "Error interno de la API; no se registraron datos de la solicitud.",
      );
    }
    res.status(status).json({ statusCode: status, message });
  }
}
