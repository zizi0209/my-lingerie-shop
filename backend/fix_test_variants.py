#!/usr/bin/env python3
"""
Fix ProductVariant test data - add missing 'size' field
"""

import re
import sys

def fix_variant_data(content):
    """Add size field to ProductVariant.create() calls that are missing it"""

    # Pattern to match ProductVariant.create with baseSize but no size
    # We'll add size field before baseSize

    lines = content.split('\n')
    fixed_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check if this line has baseSize but previous lines don't have size
        if 'baseSize:' in line:
            # Extract the size value
            match = re.search(r"baseSize:\s*['\"]([^'\"]+)['\"]", line)
            if match:
                size_value = match.group(1)
                indent = len(line) - len(line.lstrip())

                # Check if 'size:' already exists nearby
                has_size = False
                for j in range(max(0, i-5), min(len(lines), i+2)):
                    if 'size:' in lines[j] and 'baseSize' not in lines[j]:
                        has_size = True
                        break

                # If no size field, add it before baseSize
                if not has_size:
                    size_line = ' ' * indent + f"size: '{size_value}',"
                    fixed_lines.append(size_line)

        fixed_lines.append(line)
        i += 1

    return '\n'.join(fixed_lines)

def remove_duplicate_size_lines(content):
    """Remove duplicate consecutive 'size:' lines"""
    lines = content.split('\n')
    fixed_lines = []
    prev_was_size = False

    for line in lines:
        stripped = line.strip()
        is_size = stripped.startswith('size:') and 'baseSize' not in stripped

        # Skip if this is a duplicate size line
        if is_size and prev_was_size:
            continue

        fixed_lines.append(line)
        prev_was_size = is_size

    return '\n'.join(fixed_lines)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: fix_test_variants.py <file>")
        sys.exit(1)

    filename = sys.argv[1]

    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix missing size fields
    content = fix_variant_data(content)

    # Remove duplicates
    content = remove_duplicate_size_lines(content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Fixed {filename}")
