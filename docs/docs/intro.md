---
sidebar_position: 1
---

# Vigilant

:::warning
**UNDER DEVELOPMENT**: This project is currently under development and **not ready for use**. This documentation serves as a development guide and project tracking resource.
:::

## Overview
**Vigilant** is an advanced interview integrity and management suite designed to provide high-performance monitoring and secure technical assessment environments.

## Tech Stack
The platform is built using a robust, high-performance stack:
* **Electron**: For the native desktop monitoring interface.
* **Go**: Powering the high-concurrency backend and system-level workers.
* **Docker & Docker Compose**: Used for seamless service orchestration and sandboxing.

## Server Requirements
To deploy the backend infrastructure, ensure your **VPS** has the following installed:
* **Docker**: Required for running containerized workers.
* **Docker Compose**: Required to manage the multi-container environment.

## Integration Progress
Communication and notifications are handled via:
* **Amazon SES**: Fully integrated for transactional emails.
* **Twilio**: Integration in progress.

## VPS Minimum Requirements
To ensure **Vigilant** runs smoothly in a production or staging environment, we recommend the following minimum specifications:

| Component | Minimum | Recommended |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU | 4 vCPU (for concurrent executions) |
| **RAM** | 2 GB | 4 GB+ (to handle Docker & sandboxed workers) |
| **Storage** | 20 GB SSD | 50 GB NVMe (for fast Docker image I/O) |
| **OS** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| **Network** | 100 Mbps | 1 Gbps (for real-time SSE & monitoring) |

> **Note:** Since Go binaries are statically linked, you don't need to install the Go compiler on the VPS. Just ensure **Docker** and **Docker Compose** are active.

## Upcoming Features & Roadmap
- [x] Initial system monitoring engine
- [x] Go-based execution workers
- [x] Amazon SES email integration
- [ ] ~**Twilio Integration**~
- [x] **Livkit Integration**
- [x] Process-level heuristics

---