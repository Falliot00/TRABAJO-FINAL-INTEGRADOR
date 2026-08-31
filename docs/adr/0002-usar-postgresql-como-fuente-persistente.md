---
status: accepted
---

# Usar PostgreSQL como fuente persistente

PostgreSQL será la única base de datos y Prisma la frontera principal de persistencia. El modelo relacional sostendrá identidades, relaciones, restricciones y transacciones técnicas y financieras, mientras JSONB se reservará para snapshots documentales autocontenidos; se descarta una base NoSQL adicional porque agrega coordinación sin aportar una ventaja proporcional al dominio.
