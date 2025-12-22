#!/bin/bash
set -x  # Show commands as they execute

export PATH="$HOME/.cargo/bin:$PATH"

echo "=== Checking arcup ==="
ls -la ~/.cargo/bin/arcup || echo "arcup not found"

echo "=== arcup version ==="
~/.cargo/bin/arcup --version 2>&1 || echo "arcup version failed"

echo "=== Installing arcium ==="
~/.cargo/bin/arcup install 2>&1 || echo "arcup install failed"

echo "=== Checking arcium ==="
~/.cargo/bin/arcium --version 2>&1 || echo "arcium not found"

echo "=== Done ==="








