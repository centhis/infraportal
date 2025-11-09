#!/bin/bash

alembic revision --autogenerate
alembic upgrade head
uv run main.py