---
sidebar_position: 1
---

# Architecture Overview

Kiến trúc tổng quan của My Lingerie Shop.

## System Architecture

\\\
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │
│   Next.js   │─────▶│   Express   │─────▶│ PostgreSQL  │
│  Frontend   │      │   Backend   │      │  Database   │
│             │      │             │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
                           │
                           ▼
                     ┌─────────────┐
                     │    Redis    │
                     │    Cache    │
                     └─────────────┘
\\\

(Chi tiết đang cập nhật)
