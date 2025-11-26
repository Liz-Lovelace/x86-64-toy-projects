OUTPUT_ARCH(riscv)
ENTRY(_start)

SECTIONS
{
    . = 0x80000000;  /* QEMU virt machine starts here */
    
    .text : {
        *(.text)
    }
    
    .data : {
        *(.data)
    }
    
    .bss : {
        *(.bss)
    }
}
