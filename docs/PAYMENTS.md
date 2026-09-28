# Pagos: Shory Pro

Suscripción de App Store a través de RevenueCat. Apple exige su compra dentro de la app (guía 3.1.1), así que no hay pasarela externa.

## Planes

| | Gratis | Shory Pro |
|---|---|---|
| Historias en foto | Sí, con marca de agua pequeña | Sin marca de agua |
| Video 4K y fondos de video | — | Sí |
| Widgets | Música (Player) | + Clima y Partido (datos reales) |
| Plantillas | La primera | Todas |

Precio sugerido: USD 2.99/mes o USD 19.99/año (el anual con 7 días gratis).

## Cómo funciona

- **App** (`src/services/purchases`, `src/providers/SubscriptionProvider.tsx`, `src/components/Paywall.tsx`): RevenueCat con el id de usuario de Supabase. `requirePro(feature)` abre el paywall en lo bloqueado.
- **Servidor** (Supabase):
  - Tabla `subscriptions`: la app solo lee su fila (RLS); nadie puede escribirse Pro.
  - `revenuecat-webhook`: RevenueCat avisa cada compra/renovación/cancelación (encabezado `Authorization` secreto). La función vuelve a leer el estado en RevenueCat antes de guardarlo.
  - `subscription`: la app la llama tras comprar/restaurar para ver Pro al instante.
  - `football` solo responde a Pro (`is_pro`).
- Secretos en Supabase: `REVENUECAT_SECRET_KEY` (v1), `REVENUECAT_WEBHOOK_AUTH`. Nunca en el repo.

## RevenueCat (proyecto `proj7c8e1604`)

Ya configurado:
- Entitlement `pro`.
- Productos Test Store (creados en el panel, con precio fijo):
  - `shory_pro_monthly`: USD 2.99 al mes.
  - `shory_pro_annual`: USD 19.99 al año, prueba gratis de 1 semana para quien nunca compró.
- Offering `default` (current) con `$rc_annual` → `shory_pro_annual` y `$rc_monthly` → `shory_pro_monthly`.
- Webhook → `https://fqkkiehcjekogizwsayw.supabase.co/functions/v1/revenuecat-webhook`.

En Test Store el precio y la prueba no se pueden editar después de crear el producto: para cambiarlos hay que crear un producto nuevo y asociarlo a `pro` y al paquete.

Pendiente: **App Store** (con el Apple Developer Program): crear en App Store Connect las suscripciones `shory_pro_monthly` y `shory_pro_annual` en un grupo "Shory Pro", con la oferta de introducción gratis de 1 semana en el anual; agregar la app de App Store en RevenueCat con su App Store Connect API key; asociar esos productos a `pro` y a los paquetes; poner la llave `appl_…` en `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (EAS). El build de producción se niega a usar la llave `test_`.
