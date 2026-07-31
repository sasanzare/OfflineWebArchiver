# Application Service Knowledge

The local Application Service validates contract 1.3.0, authorizes local transports, orchestrates Project/Profile persistence and Scope Engine 1, revalidates Queue ownership/revisions/Scope identity, calls the Queue repository port, translates stable errors, emits safe events, and preserves correlation/operation identifiers. Queue use cases are local durable state operations; they do not dispatch network or crawl work.
