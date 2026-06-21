# Minigraf Playground

An interactive, browser-based tutorial for [Minigraf](https://github.com/project-minigraf/minigraf) —
a tiny embedded graph database with Datalog querying and bi-temporal time travel.

**[Open the Playground →](https://minigraf-playground.vercel.app)**

## What's inside

Five tutorials, each building toward progressively more advanced Datalog:

- **Basic Datalog** — facts, rules, and simple graph queries
- **Marketplace** — multi-hop paths and recursive reachability
- **Org Chart** — hierarchies, recursive ancestry, and negation
- **Sports League** — bi-temporal contracts, transfer chains, and aggregates
- **City Transit** — timetable queries, reachability under constraints, and negation

Plus a **Sandbox** mode — write your own facts and rules against a persistent local graph,
with the AI tutor available as you explore.

Each tutorial has an AI tutor (powered by your own API key or a free Groq fallback)
that can answer questions and explain your results.

## Privacy

Your API key never leaves your browser. All graph state and conversation history
are stored locally in IndexedDB. Nothing is sent to this app's servers.
