# Management Frontend

This repository contains the user interface for the `Management` back-office system. Built as a decoupled, static client, it is designed to securely and efficiently consume the backend REST API.

## Architecture & Core Stack
The frontend is architected as a lightweight Single Page Application (SPA) leveraging the following modern tools and standards:

* **Cloudflare Pages:** Automated static hosting and deployment on the Edge network, ensuring high availability and minimal latency.
* **Native JavaScript (ES6+) & Fetch API:** A framework-less approach utilizing standard web APIs to communicate asynchronously with the backend, eliminating the overhead of heavy JavaScript ecosystems.
* **Tailwind CSS & DaisyUI:** Used for quick, clean, and responsive UI layout styling, ensuring a professional dark-mode dashboard tailored for administration systems.

## Ecosystem Integration
This repository serves as the official presentation layer for the core backend system, seamlessly interfacing with a production-ready stack:

* **API Layer:** Consumes 20+ secure endpoints exposed by **FastAPI**.
* **Data & Infrastructure:** Integrates with backend processes powered by **SQLAlchemy** / **Alembic** migrations, **Poetry** dependency management, and an **AWS Aurora** database.
* **Deployment:** Communicates with the containerized backend running on **Docker** and orchestrated via **Amazon ECS**.

## Purpose
The main goal of this client is to provide a clean, visual dashboard to showcase the capabilities of the underlying backend infrastructure (inventory control, order workflows, and back-office administration) while demonstrating a fully decoupled, production-grade architecture.

## Architecture 
The system remains feature-first, divided by modules

```
management-front/
├── index.html              # Login page
├── dashboard.html          # Main layout shell (sidebar + top navigation)
│
├── views/
│   ├── inventory.html      # Just the inventory table code
│   └── orders.html         # Just the orders list code
│
└── js/                   
    ├── app.js              # Global API config 
    ├── inventory/
    │   └── inventory.js    # Logic to fetch inventory and insert it into tables
    └── orders/
        └── orders.js       # Logic to process orders
```