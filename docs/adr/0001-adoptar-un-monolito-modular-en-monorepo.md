---
status: accepted
---

# Adoptar un monolito modular en un monorepo

El sistema se construirá como un monolito modular en un único repositorio, con frontend React/Vite y backend NestJS comunicados mediante REST y desplegados como una sola solución. Esta forma preserva límites internos por capacidad de negocio y permite trabajo coordinado entre dos integrantes sin asumir el costo operativo, transaccional y de despliegue de microservicios, que no se justifica por el volumen ni la concurrencia esperados.
