#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

rm -f tmp/main.o tmp/main

# Compile with NASM
if nasm -f elf64 src/main.asm -o tmp/main.o 2>&1; then
    echo -e "${GREEN}✓ assembly${NC}"
    
    # Link
    if ld tmp/main.o -o tmp/main 2>&1; then
        echo -e "${GREEN}✓ linking${NC}"
        echo ""
        
        # Run with timeout (1 second)
        # if timeout 1s tmp/main; then
        if timeout 100s sh -c "tmp/main | aplay -f U8 -r 2000 -c 1"; then
            exit_code=$?
            echo ""
            echo ""
            echo -e "${GREEN}✓ exit code: $exit_code${NC}"
        else
            exit_code=$?
            echo ""
            if [ $exit_code -eq 124 ]; then
                echo -e "${RED}✗ Program killed (timeout after 1 second)${NC}"
            else
                echo -e "${RED}✗ Program failed (exit code: $exit_code)${NC}"
            fi
        fi
    else
        echo -e "${RED}✗ Linking failed${NC}"
    fi
else
    echo -e "${RED}✗ Assembly failed${NC}"
fi
echo ""
